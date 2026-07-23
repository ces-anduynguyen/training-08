function PageFour() {
  return (
    <section>
      <h2>Everything section</h2>
      <p style={{ color: '#cccccc', background: '#ffffff' }}>
        This low contrast paragraph should fail the colour check.
      </p>
      <p style={{ fontSize: '12px' }}>
        This text is set at 12px, below the minimum readable size.
      </p>
      <h4>Skipped level heading</h4>
      <p style={{ fontSize: '15px' }}>
        My favorite color is gray, and the theater canceled our favorite show
        after we traveled to the center.
      </p>
    </section>
  )
}

export default PageFour
