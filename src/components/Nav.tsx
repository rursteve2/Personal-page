import { useEffect, useState } from 'react'
import { scrollToAct } from '../lib/acts'

const SECTIONS = [
  { id: 'stack', label: 'stack' },
  { id: 'arrival', label: 'contact' },
]

export function Nav() {
  const [scrolled, setScrolled] = useState(false)
  const [active, setActive] = useState<string | null>(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > window.innerHeight * 0.6)
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id)
        }
      },
      { rootMargin: '-45% 0px -45% 0px' },
    )

    for (const { id } of SECTIONS) {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    }
    return () => observer.disconnect()
  }, [])

  const toTop = () => window.scrollTo({ top: 0, behavior: 'smooth' })

  return (
    <nav className="nav" data-stuck={scrolled}>
      {/* At the top of the page this is a mark and nothing more, so it doesn't
          claim to be a control. Once there's somewhere to go back to, it turns
          into a labelled one — the previous version was a button with a real
          action and no way to know it. */}
      <button
        type="button"
        className="nav__mark"
        onClick={toTop}
        data-active={scrolled}
        aria-label={scrolled ? 'Back to top' : undefined}
        aria-hidden={!scrolled}
        tabIndex={scrolled ? 0 : -1}
      >
        <span className="nav__dot" aria-hidden="true" />
        <span className="nav__initials">SC</span>
        <span className="nav__top" aria-hidden="true">
          <svg viewBox="0 0 10 10" aria-hidden="true">
            <path
              d="M5 8.5V1.8M1.8 5 5 1.8 8.2 5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Top
        </span>
      </button>

      <div className="nav__links">
        {SECTIONS.map(({ id, label }) => (
          <a
            key={id}
            className="nav__link"
            href={`#${id}`}
            aria-current={active === id ? 'true' : undefined}
            onClick={(e) => {
              // Same reason as useHashLanding: the raw anchor would drop you at
              // the top of the act, before its content has revealed.
              if (scrollToAct(id)) e.preventDefault()
            }}
          >
            {label}
          </a>
        ))}
      </div>
    </nav>
  )
}
