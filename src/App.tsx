import type { CSSProperties } from 'react'
import { NavLink, Route, Routes } from 'react-router-dom'
import Home from './pages/Home'
import PageTwo from './pages/PageTwo'
import PageThree from './pages/PageThree'
import PageFour from './pages/PageFour'

const tabStyle: CSSProperties = {
  padding: '8px 16px',
  textDecoration: 'none',
  color: '#1a1a1a',
  borderBottom: '3px solid transparent',
}

const activeTabStyle: CSSProperties = {
  ...tabStyle,
  borderBottom: '3px solid #1a1a1a',
  fontWeight: 700,
}

function App() {
  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: 24 }}>
      <nav style={{ display: 'flex', gap: 8, borderBottom: '1px solid #ddd' }}>
        <NavLink
          to="/"
          end
          style={({ isActive }) => (isActive ? activeTabStyle : tabStyle)}
        >
          Home
        </NavLink>
        <NavLink
          to="/page-two"
          style={({ isActive }) => (isActive ? activeTabStyle : tabStyle)}
        >
          Structure
        </NavLink>
        <NavLink
          to="/page-three"
          style={({ isActive }) => (isActive ? activeTabStyle : tabStyle)}
        >
          Spelling
        </NavLink>
        <NavLink
          to="/page-four"
          style={({ isActive }) => (isActive ? activeTabStyle : tabStyle)}
        >
          Everything
        </NavLink>
      </nav>

      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/page-two" element={<PageTwo />} />
          <Route path="/page-three" element={<PageThree />} />
          <Route path="/page-four" element={<PageFour />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
