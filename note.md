Beyond the two tracks already in the training plan (Chrome extension, headless CI crawl), here are a few other angles worth considering — each solves "stop manually pasting this" differently:

1. Approach: In-app dev overlay (*)
How it works: Import the checker as a React effect that auto-runs on every route change (import.meta.env.DEV gated), renders
results as a floating panel instead of console output
Tradeoff: Zero setup, fastest feedback loop, but only covers routes reachable while the dev server is running — no CI value
────────────────────────────────────────
2. Approach: Vite plugin / middleware
How it works: A Vite plugin injects the script into every served HTML page in dev mode automatically
Tradeoff: No app code changes needed, works for any project the plugin is added to — but still manual (console) unless paired
with the overlay idea
────────────────────────────────────────
3. Approach: Pre-commit / CI gate (Playwright)
How it works: Same as Track B but framed as a git hook or GitHub Action rather than an npm script participants run by hand
Tradeoff: Actually prevents regressions from merging (the highest-leverage fix) — but slower feedback than the overlay, and
needs CI infra buy-in
────────────────────────────────────────
4. Approach: Shift-left static lint rule
How it works: Custom ESLint rule (or extend eslint-plugin-jsx-a11y) flags hardcoded hex colors below contrast threshold and
skipped heading levels at write-time
Tradeoff: Catches issues before the page even renders, fits existing tooling — but can't check computed/cascaded styles or real
contrast against a rendered background, so it'd miss what the runtime script catches
────────────────────────────────────────
5. Approach: Bookmarklet
How it works: Already hinted at in the script's own header comment — one-click run, no build step
Tradeoff: Trivial to ship, but still fully manual per-page, no CI value

- My recommendation: pair the dev overlay (immediate, zero-friction feedback while building) with the CI gate (Track B, framed as a required check rather than an optional npm script) — that combo covers both "catch it while I'm coding" and "never let it regress," which the Chrome extension alone doesn't give you. The main cost is now maintaining two integration points instead of one.

Want me to scaffold any of these, or is this just for framing the workshop tracks?