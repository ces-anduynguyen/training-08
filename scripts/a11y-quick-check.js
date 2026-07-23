/*
 * a11y-quick-check.js — QC console tool
 * -------------------------------------------------------------------
 * Checks the current page (or the topmost open popup) for:
 *   1. Colour contrast   (WCAG 2.2 AA — 4.5:1 normal, 3:1 large text)
 *   2. Font size         (brand rule: flags <14px and <16px — NOT a WCAG rule)
 *   3. Heading structure (single <h1>, no skipped levels — full-page mode only)
 *   4. British spelling  (flags US spellings, suggests the UK form)
 *
 * AUTO-SCOPING: if a dialog / popover / dropdown / select / tooltip is open,
 * it audits ONLY that popup and skips the <h1> rule. Otherwise it audits the
 * whole page and skips subtrees hidden from assistive tech (aria-hidden / inert).
 * The console header shows which mode ran: [POPUP: dialog] vs [FULL PAGE].
 *
 * ─── HOW TO RUN (no re-pasting each time) ───────────────────────────
 * Option A — DevTools Snippet (recommended for repeated use):
 *   1. Open DevTools (F12) → "Sources" tab → "Snippets" (in the left panel;
 *      may be behind the ">>" overflow menu).
 *   2. Click "+ New snippet", paste this whole file, Ctrl+S to save.
 *   3. Run anytime with Ctrl+Enter (Cmd+Enter on Mac), or right-click → Run.
 *      The snippet persists — open any page, hit run, no pasting.
 *
 * Option B — Bookmarklet (one-click, see a11y-quick-check.bookmarklet.txt):
 *   Create a new bookmark, paste the javascript: line as the URL, click it
 *   on any page to run.
 *
 * Notes for QC:
 *   • "FAIL?bg" rows = text over an image/gradient/translucent layer — the
 *     script can't read the real background, so eyeball these manually.
 *   • Font-size fails are a brand guideline, not a WCAG failure.
 *   • Full results stay on: window.__a11y, window.__a11yHeadings, window.__a11yBritish
 * -------------------------------------------------------------------
 */
(() => {
  const srgb = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  const lum = ([r, g, b]) => 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b);
  const ratio = (a, b) => { const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05); };
  const parse = (s) => { const m = s.match(/rg(?:b|ba)?\(([^)]+)\)/i); if (!m) return null; const p = m[1].split(',').map((x) => parseFloat(x.trim())); return { r: p[0], g: p[1], b: p[2], a: p[3] === undefined ? 1 : p[3] }; };
  const blend = (fg, bg) => [Math.round(fg.r*fg.a+bg[0]*(1-fg.a)), Math.round(fg.g*fg.a+bg[1]*(1-fg.a)), Math.round(fg.b*fg.a+bg[2]*(1-fg.a))];
  const bgOf = (el) => { let n = el, u = false; while (n && n.nodeType === 1) { const c = parse(getComputedStyle(n).backgroundColor); if (c && c.a === 1) return { rgb: [c.r,c.g,c.b], unknown: u }; if (c && c.a > 0) u = true; n = n.parentElement; } return { rgb: [255,255,255], unknown: u }; };
  const hasOwnText = (el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length);
  const isSrOnly = (el, cs) => { const r = el.getBoundingClientRect(); if (el.closest('[class~="sr-only"],[class~="visually-hidden"]')) return true; if (r.width <= 1 && r.height <= 1) return true; if (r.right <= 0 || r.bottom <= 0) return true; if (cs.clip === 'rect(0px, 0px, 0px, 0px)' || cs.clipPath === 'inset(50%)') return true; return false; };
  const isDisabled = (el) => !!el.closest('[disabled],[aria-disabled="true"],:disabled');

  const POPUP_SEL = [
    '[role="dialog"][aria-modal="true"]',
    '[role="alertdialog"][aria-modal="true"]',
    'dialog[open]',
    '[data-radix-popper-content-wrapper]',
    '[role="menu"][data-state="open"]',
    '[role="listbox"][data-state="open"]',
    '[role="tooltip"][data-state="open"]',
    '[data-state="open"][role="dialog"]',
  ].join(',');
  const candidates = [...document.querySelectorAll(POPUP_SEL)].filter((el) => {
    const cs = getComputedStyle(el); const r = el.getBoundingClientRect();
    return cs.display !== 'none' && cs.visibility !== 'hidden' && +cs.opacity !== 0 && r.width && r.height;
  });
  const modal = candidates[candidates.length - 1] || null;
  const root = modal || document.body;
  const scoped = !!modal;
  let popupLabel = 'FULL PAGE';
  if (scoped) { const roleEl = modal.matches('[role]') ? modal : modal.querySelector('[role]'); popupLabel = 'POPUP: ' + (roleEl?.getAttribute('role') || modal.tagName.toLowerCase()); }
  const hidden = (el) => !scoped && el.closest('[aria-hidden="true"],[inert]');

  let skipSr = 0, skipDisabled = 0;
  const rows = [];
  for (const el of root.querySelectorAll('*')) {
    if (!hasOwnText(el)) continue;
    if (hidden(el)) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity === 0) continue;
    const rect = el.getBoundingClientRect(); if (!rect.width || !rect.height) continue;
    if (isSrOnly(el, cs)) { skipSr++; continue; }
    if (isDisabled(el)) { skipDisabled++; continue; }
    const fs = parseFloat(cs.fontSize), bold = +cs.fontWeight >= 700;
    const need = (fs >= 24 || (fs >= 18.66 && bold)) ? 3 : 4.5;
    const fg = parse(cs.color); if (!fg) continue;
    const bg = bgOf(el);
    const cr = ratio(fg.a < 1 ? blend(fg, bg.rgb) : [fg.r,fg.g,fg.b], bg.rgb);
    const cFail = cr < need, sFail = fs < 14 ? 'xs<14px' : fs < 16 ? 'sm<16px' : '';
    if (!cFail && !sFail) continue;
    rows.push({ text: el.textContent.trim().slice(0,40), tag: el.tagName.toLowerCase(), fontPx: +fs.toFixed(1), sizeIssue: sFail || '-', contrast: +cr.toFixed(2), need, contrastFail: cFail ? (bg.unknown ? 'FAIL?bg' : 'FAIL') : '-', color: cs.color, bg: `rgb(${bg.rgb.join(',')})${bg.unknown ? '?' : ''}`, el });
  }
  rows.sort((a, b) => a.contrast - b.contrast);
  window.__a11y = rows;

  const headings = [...root.querySelectorAll('h1,h2,h3,h4,h5,h6')].filter((h) => { if (hidden(h)) return false; const c = getComputedStyle(h); return c.display !== 'none' && c.visibility !== 'hidden' && h.textContent.trim(); });
  const h1s = headings.filter((h) => h.tagName === 'H1');
  const hi = [];
  if (!scoped) {
    if (h1s.length === 0) hi.push('❌ Không có <h1> (bắt buộc phải có 1).');
    else if (h1s.length > 1) hi.push(`⚠️ Có ${h1s.length} <h1> — chỉ nên đúng 1.`);
  }
  let prev = 0;
  for (const h of headings) { const l = +h.tagName[1]; if (prev && l > prev + 1) hi.push(`⚠️ Nhảy cấp <h${prev}>→<h${l}> ("${h.textContent.trim().slice(0,30)}")`); prev = l; }
  window.__a11yHeadings = headings;

  const PAIRS = [
    ['color','colour'],['colors','colours'],['center','centre'],['centered','centred'],['organize','organise'],['organized','organised'],['organization','organisation'],['license','licence'],['catalog','catalogue'],['behavior','behaviour'],['favorite','favourite'],['customize','customise'],['customization','customisation'],['optimize','optimise'],['analyze','analyse'],['apologize','apologise'],['canceled','cancelled'],['canceling','cancelling'],['labeled','labelled'],['modeling','modelling'],['fulfill','fulfil'],['enroll','enrol'],['gray','grey'],['personalize','personalise'],['recognize','recognise'],['minimize','minimise'],['maximize','maximise'],['initialize','initialise'],['finalize','finalise'],['summarize','summarise'],
    ['coloring','colouring'],['colorful','colourful'],['behaviors','behaviours'],['behavioral','behavioural'],['organizing','organising'],['organizations','organisations'],['optimized','optimised'],['optimizing','optimising'],['optimization','optimisation'],['customized','customised'],['customizing','customising'],['analyzed','analysed'],['analyzing','analysing'],['prioritize','prioritise'],['prioritized','prioritised'],['prioritizing','prioritising'],['prioritization','prioritisation'],['emphasize','emphasise'],['emphasized','emphasised'],['realize','realise'],['realized','realised'],['realization','realisation'],['specialize','specialise'],['specialized','specialised'],['categorize','categorise'],['categorized','categorised'],['categorization','categorisation'],['authorize','authorise'],['authorized','authorised'],['authorization','authorisation'],['normalize','normalise'],['normalized','normalised'],['standardize','standardise'],['standardized','standardised'],['synchronize','synchronise'],['synchronized','synchronised'],['dialog','dialogue'],['dialogs','dialogues'],['analog','analogue'],['defense','defence'],['offense','offence'],['fiber','fibre'],['theater','theatre'],['traveled','travelled'],['traveling','travelling'],['traveler','traveller'],['labeling','labelling'],['modeled','modelled'],['fueled','fuelled'],['fueling','fuelling'],['signaled','signalled'],['counselor','counsellor'],['fulfillment','fulfilment'],['enrollment','enrolment'],['skillful','skilful'],['willful','wilful'],['favor','favour'],['favors','favours'],['flavor','flavour'],['flavors','flavours'],['honor','honour'],['labor','labour'],['neighbor','neighbour'],['neighbors','neighbours'],['harbor','harbour'],['humor','humour'],['rumor','rumour'],['savior','saviour'],['endeavor','endeavour'],
  ].filter(([a, b]) => a !== b);

  const brit = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let tn;
  while ((tn = walker.nextNode())) {
    const p = tn.parentElement; if (!p) continue;
    if (['SCRIPT','STYLE','NOSCRIPT'].includes(p.tagName)) continue;
    if (hidden(p)) continue;
    const cs = getComputedStyle(p);
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    const txt = tn.textContent; if (!txt.trim()) continue;
    for (const [a, b] of PAIRS) { const re = new RegExp(`\\b${a}\\b`, 'gi'); let m; while ((m = re.exec(txt)) !== null) { const cased = m[0][0] === m[0][0].toUpperCase() ? b[0].toUpperCase() + b.slice(1) : b; brit.push({ word: m[0], suggest: cased, context: txt.trim().slice(0,50), tag: p.tagName.toLowerCase(), el: p }); } }
  }
  window.__a11yBritish = brit;

  const contrastFails = rows.filter((r) => r.contrastFail !== '-'), sizeFails = rows.filter((r) => r.sizeIssue !== '-');
  console.clear();
  console.log(`%ca11y quick check — ${location.pathname} %c[${popupLabel}]`, 'font-weight:bold;font-size:14px', `font-weight:bold;color:${scoped ? '#c026d3' : '#0284c7'}`);
  console.log(`Contrast fails: ${contrastFails.length} | Font-size fails: ${sizeFails.length} | đã loại: ${skipSr} sr-only, ${skipDisabled} disabled`);
  console.log(`%cHeadings: ${h1s.length} h1 / ${headings.length} tổng${scoped ? ' (h1 rule bỏ qua trong popup)' : ''}`, (scoped || h1s.length === 1) ? 'color:green' : 'color:red;font-weight:bold');
  hi.length ? hi.forEach((m) => console.log('  ' + m)) : console.log('  ✅ Heading hợp lệ.');
  console.log('  Outline:', headings.map((h) => `${h.tagName.toLowerCase()}: ${h.textContent.trim().slice(0,40)}`));
  console.log(`%cBritish English: ${brit.length} từ US cần đổi`, brit.length ? 'color:orange;font-weight:bold' : 'color:green');
  console.log('--- Contrast / Font-size ---'); console.table(rows.map(({ el, ...r }) => r));
  if (brit.length) { console.log('--- British English ---'); console.table(brit.map(({ el, ...r }) => r)); }
  console.log('Chi tiết: window.__a11y · window.__a11yHeadings · window.__a11yBritish');
})();
