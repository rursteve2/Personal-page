import { useEffect, useRef, useState } from 'react'
import { Act } from './Act'
import type { CSSProperties } from 'react'

const EMAIL = 'chenstephen2@gmail.com'

const LINKS = [
  { label: 'GitHub', href: 'https://github.com/rursteve2', icon: GitHubIcon },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/chenstephen2', icon: LinkedInIcon },
]

/** Act 04. The craft comes down, and the way to reach him resolves in. */
export function Arrival() {
  const [copied, setCopied] = useState(false)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(EMAIL)
    } catch {
      // Clipboard needs a secure context and permission. If either is missing,
      // open the visitor's mail client rather than silently doing nothing.
      window.location.href = `mailto:${EMAIL}`
      return
    }
    setCopied(true)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setCopied(false), 2000)
  }


  return (
    <Act id="arrival" screens={1.9} className="arrival">
      <div className="arrival__inner">
        <h2 className="section__label reveal" style={{ '--i': 0 } as CSSProperties}>
          <b>02</b> Contact
        </h2>

        <button
          type="button"
          className="copy reveal"
          onClick={copy}
          data-copied={copied}
          aria-label={`Copy email address ${EMAIL}`}
          style={{ '--i': 1 } as CSSProperties}
        >
          <span className="copy__text">{EMAIL}</span>
          <span className="copy__badge" aria-hidden="true">
            {copied ? 'copied' : 'copy'}
          </span>
        </button>

        {/* Outside the button on purpose: a live region nested inside it would
            be folded into the button's accessible name. */}
        <span className="visually-hidden" role="status">
          {copied ? 'Email address copied to clipboard' : ''}
        </span>

        <div className="links reveal" style={{ '--i': 2 } as CSSProperties}>
          {LINKS.map(({ label, href, icon: Icon }) => (
            <a key={label} href={href} target="_blank" rel="noopener noreferrer">
              <Icon />
              {label}
            </a>
          ))}
        </div>
      </div>
    </Act>
  )
}

function GitHubIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.4 7.4 0 0 1 2-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
    </svg>
  )
}

function LinkedInIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M3.6 5.4H.9V15h2.7V5.4zM2.25 1A1.57 1.57 0 0 0 .7 2.57c0 .87.7 1.57 1.55 1.57A1.57 1.57 0 0 0 3.8 2.57C3.8 1.7 3.1 1 2.25 1zM15.3 9.53c0-2.6-1.39-3.8-3.24-3.8-1.5 0-2.17.82-2.54 1.4V5.4H6.83c.04.76 0 9.6 0 9.6h2.69V9.64c0-.24.02-.48.09-.65.19-.48.63-.98 1.37-.98.96 0 1.35.73 1.35 1.81V15h2.7V9.53z" />
    </svg>
  )
}
