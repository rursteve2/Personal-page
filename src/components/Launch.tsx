import { Act } from './Act'

/**
 * Act 01. The name.
 *
 * No scroll-driven opacity: it reveals once and then stays readable until it
 * physically scrolls off. The scene does the choreography.
 */
export function Launch() {
  return (
    <Act id="launch" screens={2.0} className="launch">
      <div className="launch__inner">
        <p className="hero__eyebrow reveal" style={{ '--i': 0 } as React.CSSProperties}>
          New York
        </p>

        <h1 className="hero__title reveal" style={{ '--i': 1 } as React.CSSProperties}>
          <span>Stephen</span>
          <span>Chen</span>
        </h1>

        <div className="hero__meta reveal" style={{ '--i': 2 } as React.CSSProperties}>
          <span>Software Engineer</span>
          <i>/</i>
          <span>Full Stack</span>
        </div>

        <p className="hero__hint reveal" style={{ '--i': 4 } as React.CSSProperties}>
          <span aria-hidden="true" />
          Scroll
        </p>
      </div>
    </Act>
  )
}
