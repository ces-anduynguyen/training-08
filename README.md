# Accessibility App

A small React + TypeScript + Vite app used as a test fixture for
[`scripts/a11y-quick-check.js`](scripts/a11y-quick-check.js) — a browser-console
snippet that audits a page for colour contrast, font size, heading structure, and
British/American spelling issues. Each route below seeds a fixed, known set of
violations so the checker's output can be verified against an expected result.

## Project structure

```
.
├── index.html              Vite entry point, loads src/main.tsx
├── public/
│   └── favicon.svg         Favicon referenced by index.html
├── scripts/
│   └── a11y-quick-check.js Accessibility checker (paste into DevTools console)
└── src/
    ├── main.tsx            React root, wraps <App /> in <BrowserRouter>
    ├── App.tsx              Tab navigation (NavLink) + <Routes> for the 4 pages
    ├── index.css            Global styles (colors, typography, layout)
    └── pages/
        ├── Home.tsx         "/"           — colour contrast + font-size errors
        ├── PageTwo.tsx       "/page-two"   — heading structure errors
        ├── PageThree.tsx     "/page-three" — British/American spelling errors
        └── PageFour.tsx      "/page-four"  — all of the above combined
```

Each page is a static functional component with no state — the violations are
hardcoded JSX/inline styles, not generated at runtime, so re-running the checker
against a given route always produces the same result.

## Running the app

```sh
npm install
npm run dev
```

Open the app, click through the four tabs (Home / Structure / Spelling /
Everything) and confirm the URL changes for each one.

## Running the accessibility checker

1. Open a page in the app and open DevTools (F12) → Console.
2. Paste the full contents of `scripts/a11y-quick-check.js` and press Enter
   (or save it as a DevTools Snippet to re-run without re-pasting — see the
   comment header in the file for details).
3. Read the console summary/table, or inspect `window.__a11y`,
   `window.__a11yHeadings`, and `window.__a11yBritish` for the full results.

## Other scripts

- `npm run build` — type-check (`tsc -b`) and build for production
- `npm run lint` — run ESLint
- `npm run preview` — preview the production build locally
