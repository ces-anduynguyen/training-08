# A11y CI Blueprint (Track B)

## Purpose & scope

This is the engineering spec for Track B from `training_session_plan.md`
("The Headless Automation + npm Command"): a Playwright/Puppeteer crawler
that runs `scripts/a11y-quick-check.js` across every route and gates CI on
the result. It is **not implemented** as of this writing — this doc exists
so whoever picks up Track B doesn't have to re-derive the design. Pair this
with the in-app dev overlay (`src/dev-tools/A11yOverlay.tsx`, implemented) —
the overlay gives fast feedback while coding; this gives a hard gate before
merge. They're complementary, not redundant.

## Tool choice

Recommend plain **Playwright** (the `playwright` package, not
`@playwright/test`) driven from a standalone Node script — this is a
one-shot crawl-and-report tool, not a test suite, so the test-runner
scaffolding isn't needed. Puppeteer is an equally valid alternative with a
near-identical API; pick whichever your team already has elsewhere in its
toolchain.

## Reuse decision — inject the original script unmodified

Track B should inject **`scripts/a11y-quick-check.js` as-is** via
`page.addScriptTag({ path: 'scripts/a11y-quick-check.js' })`, then read
`window.__a11y`, `window.__a11yHeadings`, `window.__a11yBritish` back via
`page.evaluate()`. This requires zero new porting work and keeps one
canonical implementation of the checks that both Track A (Chrome extension)
and Track B consume unmodified — do not point Track B at
`src/dev-tools/a11yChecker.ts` (the overlay's TS port); that module exists
for the in-app overlay only, and using it here would mean maintaining two
sources of truth and adding a build step to produce a browser-runnable
bundle from it. Revisit only as a deliberate follow-up, not the MVP path.

**The DOM-serialization gotcha** (same lesson already in the Track A
starter hints): each row/hit object carries a live `el: Element` reference,
which is not structured-clone-safe across the `page.evaluate()` boundary.
Strip `el` from every entry *inside* the evaluate callback before
returning:

```js
const raw = await page.evaluate(() => ({
  contrast: (window.__a11y || []).map(({ el, ...r }) => r),
  headings: (window.__a11yHeadings || []).map((h) => ({
    tag: h.tagName.toLowerCase(),
    text: h.textContent.trim().slice(0, 40),
  })),
  british: (window.__a11yBritish || []).map(({ el, ...r }) => r),
}))
```

## Script structure — `scripts/a11y-crawl.mjs` (pseudocode-level)

```js
import { chromium } from 'playwright'

const ROUTES = ['/', '/page-two', '/page-three', '/page-four']
// Keep this list in sync with the NavLink entries in src/App.tsx manually,
// or extract a shared src/routes.ts consumed by both as a follow-up.

const browser = await chromium.launch()
const page = await browser.newPage()
const report = { generatedAt: new Date().toISOString(), routes: [] }

for (const path of ROUTES) {
  await page.goto(`${BASE_URL}${path}`, { waitUntil: 'networkidle' })
  await page.addScriptTag({ path: 'scripts/a11y-quick-check.js' })
  const result = await page.evaluate(/* strip `el`, see above */)
  report.routes.push({ path, ...result })
}

await browser.close()
await fs.writeFile('reports/a11y-report.json', JSON.stringify(report, null, 2))

const contrastFails = report.routes.flatMap((r) => r.contrast.filter((c) => c.contrastFail !== '-'))
const headingFails = report.routes.flatMap((r) => r.headings /* + a ported h1/skip check, or re-derive from headings array */)
const strict = process.env.A11Y_STRICT === '1'
const sizeFails = report.routes.flatMap((r) => r.contrast.filter((c) => c.sizeIssue !== '-'))
const spellingHits = report.routes.flatMap((r) => r.british)

if (spellingHits.length || sizeFails.length) console.warn(/* non-blocking summary */)

const blocking = contrastFails.length > 0 || headingFails.length > 0 ||
  (strict && (sizeFails.length > 0 || spellingHits.length > 0))

process.exit(blocking ? 1 : 0)
```

Use a fresh full `page.goto()` navigation per route (not client-side
`NavLink` clicks) — deterministic, and matches the fixture pages' stateless
design.

## Pass/fail contract

- **Blocking** (exit 1): any contrast `FAIL`/`FAIL?bg`, or any heading
  structure issue (missing/duplicate `<h1>`, skipped level) — these are the
  WCAG-relevant categories.
- **Non-blocking / warning-only**: font-size fails and British-spelling
  hits — printed to the console summary but don't fail the build by
  default. The original script's own header comment calls font-size "a
  brand guideline, not a WCAG failure," and spelling is a style
  preference.
- **`A11Y_STRICT=1`** env var promotes font-size and spelling to blocking
  too, so teams can dial strictness up later without redesigning the
  contract.

## npm script wiring

```json
"scripts": {
  "a11y:check": "node scripts/a11y-crawl.mjs"
}
```

The script owns its own server lifecycle (below), so `npm run a11y:check`
works standalone with no separate "start the server first" step.

## Dev-server lifecycle

Crawl the **production build**, not `vite dev` — `vite build && vite preview`
serves the actual bundle users get, which doubles as a regression check
that the dev overlay never ships (see `src/dev-tools/A11yOverlay.tsx`):
optionally assert no `[data-a11y-overlay-root]` node exists on any crawled
page as an extra guard.

```js
import { spawn } from 'node:child_process'

const server = spawn('npx', ['vite', 'preview', '--port', '4173'], { stdio: 'pipe' })
try {
  await waitForPort('http://localhost:4173') // poll with fetch-retry, or the `wait-on` package
  const exitCode = await runCrawl('http://localhost:4173')
  process.exitCode = exitCode
} finally {
  server.kill() // always tears down, even if the crawl throws
}
```

Guarantee teardown via `try/finally` regardless of crawl outcome, and
propagate the crawler's exit code as the overall process exit code.

## GitHub Actions example

`.github/workflows/a11y.yml`:

```yaml
name: A11y check
on: [pull_request]
jobs:
  a11y:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npm run build
      - run: npm run a11y:check
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: a11y-report
          path: reports/a11y-report.json
```

The job fails naturally from the script's non-zero exit code — no extra
`if:` logic needed on the check step itself. `if: always()` on the upload
step keeps the report available even when the check fails.

## Open questions / follow-ups

- Single viewport only (desktop) for now — no responsive/mobile crawl.
- Sequential route crawling is fine at 4 routes; no need for parallelism
  until the route count grows much larger.
- Web-font loading races are a non-issue for this fixture (only the
  `system-ui` stack is used, no `@font-face`), but are a real gotcha for
  any future app using custom fonts — `page.evaluate(() =>
  document.fonts.ready)` before injecting the checker would be the fix
  there.
