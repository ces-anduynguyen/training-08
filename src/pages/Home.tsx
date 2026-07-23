function Home() {
  return (
    <section>
      <h1>Welcome</h1>
      <p>
        This home page is a simple test fixture for the accessibility
        checker script.
      </p>
      <p style={{ color: '#cccccc', background: '#ffffff' }}>
        This paragraph uses light grey text on a white background, which
        fails the WCAG AA colour contrast requirement.
      </p>
      <p style={{ fontSize: '12px' }}>
        This text is set at 12px, below the minimum readable size.
      </p>
      <p style={{ fontSize: '15px' }}>
        This text is set at 15px, below the recommended 16px size.
      </p>
    </section>
  )
}

export default Home
