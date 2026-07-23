/*
 * a11yChecker.ts — dev-overlay core checker
 * -------------------------------------------------------------------
 * A TypeScript port of the same four checks performed by
 * scripts/a11y-quick-check.js (colour contrast, font size, heading
 * structure, British/American spelling), adapted to return plain
 * structured data instead of writing to window globals / console.
 *
 * Simplification vs. the original script: this port always scans the
 * whole document.body and always enforces the single-<h1> rule — it
 * does not port the original's popup/dialog auto-scoping logic, since
 * none of this app's routes currently render a modal/dropdown. If a
 * route ever adds one, this checker would incorrectly flag content
 * hidden behind it and incorrectly still require an <h1> while a
 * dialog is open — a known, accepted limitation for this fixture app.
 * -------------------------------------------------------------------
 */

export const A11Y_OVERLAY_MARKER_ATTR = 'data-a11y-overlay-root'

export interface ContrastRow {
  text: string
  tag: string
  fontPx: number
  sizeIssue: '-' | 'xs<14px' | 'sm<16px'
  contrast: number
  need: number
  contrastFail: '-' | 'FAIL' | 'FAIL?bg'
  color: string
  bg: string
  el: Element
}

export interface BritishHit {
  word: string
  suggest: string
  context: string
  tag: string
  el: Element
}

export interface HeadingInfo {
  el: Element
  tag: string
  text: string
}

export interface A11yCheckResult {
  path: string
  timestamp: number
  contrastRows: ContrastRow[]
  contrastFails: ContrastRow[]
  sizeFails: ContrastRow[]
  skipped: { srOnly: number; disabled: number }
  headings: HeadingInfo[]
  headingIssues: string[]
  britishHits: BritishHit[]
}

type RGB = [number, number, number]

interface ParsedColor {
  r: number
  g: number
  b: number
  a: number
}

const srgb = (c: number) => {
  c /= 255
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}

const lum = ([r, g, b]: RGB) => 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b)

const ratio = (a: RGB, b: RGB) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

const parseColor = (s: string): ParsedColor | null => {
  const m = s.match(/rg(?:b|ba)?\(([^)]+)\)/i)
  if (!m) return null
  const p = m[1].split(',').map((x) => parseFloat(x.trim()))
  return { r: p[0], g: p[1], b: p[2], a: p[3] === undefined ? 1 : p[3] }
}

const blend = (fg: ParsedColor, bg: RGB): RGB => [
  Math.round(fg.r * fg.a + bg[0] * (1 - fg.a)),
  Math.round(fg.g * fg.a + bg[1] * (1 - fg.a)),
  Math.round(fg.b * fg.a + bg[2] * (1 - fg.a)),
]

const bgOf = (el: Element): { rgb: RGB; unknown: boolean } => {
  let n: Element | null = el
  let unknown = false
  while (n && n.nodeType === 1) {
    const c = parseColor(getComputedStyle(n).backgroundColor)
    if (c && c.a === 1) return { rgb: [c.r, c.g, c.b], unknown }
    if (c && c.a > 0) unknown = true
    n = n.parentElement
  }
  return { rgb: [255, 255, 255], unknown }
}

const hasOwnText = (el: Element) =>
  [...el.childNodes].some((n) => n.nodeType === 3 && !!n.textContent?.trim().length)

const isSrOnly = (el: Element, cs: CSSStyleDeclaration) => {
  const r = el.getBoundingClientRect()
  if (el.closest('[class~="sr-only"],[class~="visually-hidden"]')) return true
  if (r.width <= 1 && r.height <= 1) return true
  if (r.right <= 0 || r.bottom <= 0) return true
  if (cs.clip === 'rect(0px, 0px, 0px, 0px)' || cs.clipPath === 'inset(50%)') return true
  return false
}

const isDisabled = (el: Element) => !!el.closest('[disabled],[aria-disabled="true"],:disabled')

const isHidden = (el: Element) =>
  !!el.closest(`[aria-hidden="true"],[inert],[${A11Y_OVERLAY_MARKER_ATTR}]`)

const RAW_PAIRS: [string, string][] = [
  ['color', 'colour'], ['colors', 'colours'], ['center', 'centre'], ['centered', 'centred'],
  ['organize', 'organise'], ['organized', 'organised'], ['organization', 'organisation'],
  ['license', 'licence'], ['catalog', 'catalogue'], ['behavior', 'behaviour'],
  ['favorite', 'favourite'], ['customize', 'customise'], ['customization', 'customisation'],
  ['optimize', 'optimise'], ['analyze', 'analyse'], ['apologize', 'apologise'],
  ['canceled', 'cancelled'], ['canceling', 'cancelling'], ['labeled', 'labelled'],
  ['modeling', 'modelling'], ['fulfill', 'fulfil'], ['enroll', 'enrol'], ['gray', 'grey'],
  ['personalize', 'personalise'], ['recognize', 'recognise'], ['minimize', 'minimise'],
  ['maximize', 'maximise'], ['initialize', 'initialise'], ['finalize', 'finalise'],
  ['summarize', 'summarise'], ['coloring', 'colouring'], ['colorful', 'colourful'],
  ['behaviors', 'behaviours'], ['behavioral', 'behavioural'], ['organizing', 'organising'],
  ['organizations', 'organisations'], ['optimized', 'optimised'], ['optimizing', 'optimising'],
  ['optimization', 'optimisation'], ['customized', 'customised'], ['customizing', 'customising'],
  ['analyzed', 'analysed'], ['analyzing', 'analysing'], ['prioritize', 'prioritise'],
  ['prioritized', 'prioritised'], ['prioritizing', 'prioritising'], ['prioritization', 'prioritisation'],
  ['emphasize', 'emphasise'], ['emphasized', 'emphasised'], ['realize', 'realise'],
  ['realized', 'realised'], ['realization', 'realisation'], ['specialize', 'specialise'],
  ['specialized', 'specialised'], ['categorize', 'categorise'], ['categorized', 'categorised'],
  ['categorization', 'categorisation'], ['authorize', 'authorise'], ['authorized', 'authorised'],
  ['authorization', 'authorisation'], ['normalize', 'normalise'], ['normalized', 'normalised'],
  ['standardize', 'standardise'], ['standardized', 'standardised'], ['synchronize', 'synchronise'],
  ['synchronized', 'synchronised'], ['dialog', 'dialogue'], ['dialogs', 'dialogues'],
  ['analog', 'analogue'], ['defense', 'defence'], ['offense', 'offence'], ['fiber', 'fibre'],
  ['theater', 'theatre'], ['traveled', 'travelled'], ['traveling', 'travelling'],
  ['traveler', 'traveller'], ['labeling', 'labelling'], ['modeled', 'modelled'],
  ['fueled', 'fuelled'], ['fueling', 'fuelling'], ['signaled', 'signalled'],
  ['counselor', 'counsellor'], ['fulfillment', 'fulfilment'], ['enrollment', 'enrolment'],
  ['skillful', 'skilful'], ['willful', 'wilful'], ['favor', 'favour'], ['favors', 'favours'],
  ['flavor', 'flavour'], ['flavors', 'flavours'], ['honor', 'honour'], ['labor', 'labour'],
  ['neighbor', 'neighbour'], ['neighbors', 'neighbours'], ['harbor', 'harbour'],
  ['humor', 'humour'], ['rumor', 'rumour'], ['savior', 'saviour'], ['endeavor', 'endeavour'],
]
const PAIRS = RAW_PAIRS.filter(([a, b]) => a !== b)

export function runA11yCheck(): A11yCheckResult {
  const root = document.body

  let skipSr = 0
  let skipDisabled = 0
  const contrastRows: ContrastRow[] = []

  for (const el of root.querySelectorAll('*')) {
    if (!hasOwnText(el)) continue
    if (isHidden(el)) continue
    const cs = getComputedStyle(el)
    if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity === 0) continue
    const rect = el.getBoundingClientRect()
    if (!rect.width || !rect.height) continue
    if (isSrOnly(el, cs)) { skipSr++; continue }
    if (isDisabled(el)) { skipDisabled++; continue }
    const fs = parseFloat(cs.fontSize)
    const bold = +cs.fontWeight >= 700
    const need = fs >= 24 || (fs >= 18.66 && bold) ? 3 : 4.5
    const fg = parseColor(cs.color)
    if (!fg) continue
    const bg = bgOf(el)
    const cr = ratio(fg.a < 1 ? blend(fg, bg.rgb) : [fg.r, fg.g, fg.b], bg.rgb)
    const cFail = cr < need
    const sFail: ContrastRow['sizeIssue'] = fs < 14 ? 'xs<14px' : fs < 16 ? 'sm<16px' : '-'
    if (!cFail && sFail === '-') continue
    contrastRows.push({
      text: el.textContent?.trim().slice(0, 40) ?? '',
      tag: el.tagName.toLowerCase(),
      fontPx: +fs.toFixed(1),
      sizeIssue: sFail,
      contrast: +cr.toFixed(2),
      need,
      contrastFail: cFail ? (bg.unknown ? 'FAIL?bg' : 'FAIL') : '-',
      color: cs.color,
      bg: `rgb(${bg.rgb.join(',')})${bg.unknown ? '?' : ''}`,
      el,
    })
  }
  contrastRows.sort((a, b) => a.contrast - b.contrast)

  const headingEls = [...root.querySelectorAll('h1,h2,h3,h4,h5,h6')].filter((h) => {
    if (isHidden(h)) return false
    const c = getComputedStyle(h)
    return c.display !== 'none' && c.visibility !== 'hidden' && !!h.textContent?.trim()
  })
  const headings: HeadingInfo[] = headingEls.map((h) => ({
    el: h,
    tag: h.tagName.toLowerCase(),
    text: h.textContent?.trim().slice(0, 40) ?? '',
  }))
  const h1s = headingEls.filter((h) => h.tagName === 'H1')
  const headingIssues: string[] = []
  if (h1s.length === 0) headingIssues.push('Missing <h1> (exactly one is required).')
  else if (h1s.length > 1) headingIssues.push(`${h1s.length} <h1> elements found — only one is allowed.`)
  let prev = 0
  for (const h of headingEls) {
    const level = +h.tagName[1]
    if (prev && level > prev + 1) {
      headingIssues.push(`Heading level skips from h${prev} to h${level} ("${h.textContent?.trim().slice(0, 30)}").`)
    }
    prev = level
  }

  const britishHits: BritishHit[] = []
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  let tn: Node | null
  while ((tn = walker.nextNode())) {
    const p = tn.parentElement
    if (!p) continue
    if (p.tagName === 'SCRIPT' || p.tagName === 'STYLE' || p.tagName === 'NOSCRIPT') continue
    if (isHidden(p)) continue
    const cs = getComputedStyle(p)
    if (cs.display === 'none' || cs.visibility === 'hidden') continue
    const txt = tn.textContent ?? ''
    if (!txt.trim()) continue
    for (const [a, b] of PAIRS) {
      const re = new RegExp(`\\b${a}\\b`, 'gi')
      let m: RegExpExecArray | null
      while ((m = re.exec(txt)) !== null) {
        const cased = m[0][0] === m[0][0].toUpperCase() ? b[0].toUpperCase() + b.slice(1) : b
        britishHits.push({
          word: m[0],
          suggest: cased,
          context: txt.trim().slice(0, 50),
          tag: p.tagName.toLowerCase(),
          el: p,
        })
      }
    }
  }

  return {
    path: location.pathname,
    timestamp: Date.now(),
    contrastRows,
    contrastFails: contrastRows.filter((r) => r.contrastFail !== '-'),
    sizeFails: contrastRows.filter((r) => r.sizeIssue !== '-'),
    skipped: { srOnly: skipSr, disabled: skipDisabled },
    headings,
    headingIssues,
    britishHits,
  }
}
