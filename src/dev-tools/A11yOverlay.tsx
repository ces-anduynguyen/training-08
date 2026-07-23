import type { CSSProperties } from 'react'
import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { A11Y_OVERLAY_MARKER_ATTR, runA11yCheck } from './a11yChecker'
import type { A11yCheckResult, BritishHit, ContrastRow, HeadingInfo } from './a11yChecker'

const FONT_STACK = 'system-ui, "Segoe UI", Roboto, sans-serif'

type TabKey = 'contrast' | 'size' | 'headings' | 'spelling'

const rootStyle: CSSProperties = {
  position: 'fixed',
  bottom: 16,
  right: 16,
  zIndex: 999999,
  fontFamily: FONT_STACK,
  fontSize: 13,
  lineHeight: 1.4,
  letterSpacing: 'normal',
  color: '#1a1a1a',
  textAlign: 'left',
  boxSizing: 'border-box',
}

function toggleButtonStyle(issueCount: number): CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    cursor: 'pointer',
    padding: '8px 14px',
    border: 'none',
    borderRadius: 999,
    fontFamily: FONT_STACK,
    fontSize: 13,
    fontWeight: 700,
    color: '#fff',
    background: issueCount > 0 ? '#dc2626' : '#16a34a',
    boxShadow: '0 2px 10px rgba(0,0,0,0.35)',
    boxSizing: 'border-box',
  }
}

const panelStyle: CSSProperties = {
  position: 'absolute',
  bottom: 'calc(100% + 8px)',
  right: 0,
  width: 380,
  maxHeight: 480,
  overflowY: 'auto',
  background: '#fff',
  color: '#1a1a1a',
  border: '1px solid #d0d0d0',
  borderRadius: 10,
  boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
  fontFamily: FONT_STACK,
  fontSize: 12,
  lineHeight: 1.4,
  boxSizing: 'border-box',
  padding: 12,
}

const headerRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 8,
  marginBottom: 8,
}

const pathLabelStyle: CSSProperties = {
  fontWeight: 700,
  fontSize: 12,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}

const smallButtonStyle: CSSProperties = {
  cursor: 'pointer',
  border: '1px solid #d0d0d0',
  borderRadius: 6,
  background: '#f5f5f5',
  color: '#1a1a1a',
  fontSize: 11,
  padding: '3px 8px',
  fontFamily: FONT_STACK,
}

const tabsRowStyle: CSSProperties = {
  display: 'flex',
  gap: 4,
  marginBottom: 8,
}

function tabButtonStyle(active: boolean, count: number): CSSProperties {
  return {
    flex: 1,
    cursor: 'pointer',
    border: '1px solid ' + (active ? '#1a1a1a' : '#d0d0d0'),
    borderRadius: 6,
    background: active ? '#1a1a1a' : '#fff',
    color: active ? '#fff' : count > 0 ? '#dc2626' : '#1a1a1a',
    fontSize: 11,
    fontWeight: count > 0 ? 700 : 500,
    padding: '6px 4px',
    fontFamily: FONT_STACK,
  }
}

const rowStyle: CSSProperties = {
  padding: '6px 4px',
  borderBottom: '1px solid #eee',
  cursor: 'pointer',
}

const emptyStateStyle: CSSProperties = {
  padding: '12px 4px',
  color: '#6b6375',
  textAlign: 'center',
}

function flashHighlight(el: Element) {
  el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  if (!(el instanceof HTMLElement)) return
  const prevOutline = el.style.outline
  const prevOffset = el.style.outlineOffset
  el.style.outline = '3px solid #ff3366'
  el.style.outlineOffset = '2px'
  window.setTimeout(() => {
    el.style.outline = prevOutline
    el.style.outlineOffset = prevOffset
  }, 1500)
}

function ContrastRowItem({ row }: { row: ContrastRow }) {
  return (
    <div style={rowStyle} onClick={() => flashHighlight(row.el)}>
      <div>
        <strong>{row.contrastFail}</strong> &lt;{row.tag}&gt; {row.contrast} vs {row.need} needed
      </div>
      <div style={{ color: '#6b6375' }}>
        &quot;{row.text}&quot; — {row.color} on {row.bg}
      </div>
    </div>
  )
}

function SizeRowItem({ row }: { row: ContrastRow }) {
  return (
    <div style={rowStyle} onClick={() => flashHighlight(row.el)}>
      <div>
        <strong>{row.sizeIssue}</strong> &lt;{row.tag}&gt; {row.fontPx}px
      </div>
      <div style={{ color: '#6b6375' }}>&quot;{row.text}&quot;</div>
    </div>
  )
}

function HeadingRowItem({ heading }: { heading: HeadingInfo }) {
  return (
    <div style={rowStyle} onClick={() => flashHighlight(heading.el)}>
      <strong>{heading.tag}</strong>: {heading.text}
    </div>
  )
}

function SpellingRowItem({ hit }: { hit: BritishHit }) {
  return (
    <div style={rowStyle} onClick={() => flashHighlight(hit.el)}>
      <div>
        <strong>{hit.word}</strong> → {hit.suggest} (&lt;{hit.tag}&gt;)
      </div>
      <div style={{ color: '#6b6375' }}>&quot;{hit.context}&quot;</div>
    </div>
  )
}

function A11yOverlay() {
  const location = useLocation()
  const [result, setResult] = useState<A11yCheckResult | null>(null)
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<TabKey>('contrast')

  useEffect(() => {
    // Reads live layout/DOM state after the route has committed — can't be
    // computed during render without violating render purity.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setResult(runA11yCheck())
  }, [location.pathname])

  if (!import.meta.env.DEV) return null

  const rerun = () => setResult(runA11yCheck())

  const contrastFails = result?.contrastFails ?? []
  const sizeFails = result?.sizeFails ?? []
  const headingIssues = result?.headingIssues ?? []
  const britishHits = result?.britishHits ?? []
  const totalIssues = contrastFails.length + sizeFails.length + headingIssues.length + britishHits.length

  return (
    <div {...{ [A11Y_OVERLAY_MARKER_ATTR]: '' }} style={rootStyle}>
      {open && result && (
        <div style={panelStyle}>
          <div style={headerRowStyle}>
            <span style={pathLabelStyle}>{result.path}</span>
            <div style={{ display: 'flex', gap: 4 }}>
              <button style={smallButtonStyle} onClick={rerun}>
                Re-run
              </button>
              <button style={smallButtonStyle} onClick={() => setOpen(false)}>
                Close
              </button>
            </div>
          </div>

          <div style={tabsRowStyle}>
            <button style={tabButtonStyle(tab === 'contrast', contrastFails.length)} onClick={() => setTab('contrast')}>
              Contrast ({contrastFails.length})
            </button>
            <button style={tabButtonStyle(tab === 'size', sizeFails.length)} onClick={() => setTab('size')}>
              Size ({sizeFails.length})
            </button>
            <button style={tabButtonStyle(tab === 'headings', headingIssues.length)} onClick={() => setTab('headings')}>
              Headings ({headingIssues.length})
            </button>
            <button style={tabButtonStyle(tab === 'spelling', britishHits.length)} onClick={() => setTab('spelling')}>
              Spelling ({britishHits.length})
            </button>
          </div>

          <div>
            {tab === 'contrast' &&
              (contrastFails.length
                ? contrastFails.map((row, i) => <ContrastRowItem key={i} row={row} />)
                : <div style={emptyStateStyle}>No contrast failures.</div>)}

            {tab === 'size' &&
              (sizeFails.length
                ? sizeFails.map((row, i) => <SizeRowItem key={i} row={row} />)
                : <div style={emptyStateStyle}>No font-size issues.</div>)}

            {tab === 'headings' && (
              <div>
                {headingIssues.length
                  ? headingIssues.map((issue, i) => (
                      <div key={i} style={{ ...rowStyle, cursor: 'default', color: '#dc2626' }}>
                        {issue}
                      </div>
                    ))
                  : <div style={emptyStateStyle}>Heading structure is valid.</div>}
                {result.headings.map((h, i) => (
                  <HeadingRowItem key={i} heading={h} />
                ))}
              </div>
            )}

            {tab === 'spelling' &&
              (britishHits.length
                ? britishHits.map((hit, i) => <SpellingRowItem key={i} hit={hit} />)
                : <div style={emptyStateStyle}>No US spellings found.</div>)}
          </div>
        </div>
      )}

      <button style={toggleButtonStyle(totalIssues)} onClick={() => setOpen((o) => !o)}>
        ♿ {totalIssues}
      </button>
    </div>
  )
}

export default A11yOverlay
