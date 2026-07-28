import type { CSSProperties } from 'react'
import { Act } from './Act'

/**
 * Act 03. The stack.
 *
 * Grouped rather than listed flat, because that's how an engineer holds a stack
 * in their head — and because a flat grid of sixteen items reads as a keyword
 * dump.
 *
 * Cut from the earlier list: Git, REST, SQL and Linux. All four are assumed of
 * anyone doing this work, and listing assumed things dilutes the ones that
 * aren't.
 */
const GROUPS = [
  { label: 'Languages', items: ['Python', 'PHP', 'JavaScript', 'TypeScript'] },
  { label: 'Frameworks', items: ['React', 'React Native', 'Flask'] },
  { label: 'Data', items: ['MySQL', 'SQL Server'] },
  { label: 'Messaging & Cloud', items: ['RabbitMQ', 'Twilio', 'AWS'] },
]

export function Stack() {
  return (
    <Act id="stack" screens={2.2} className="stack-act">
      <div className="stack-act__inner">
        <h2 className="section__label reveal" style={{ '--i': 0 } as CSSProperties}>
          Stack
        </h2>

        <div className="groups">
          {GROUPS.map((group, i) => (
            <div
              className="group reveal"
              key={group.label}
              style={{ '--i': i + 1 } as CSSProperties}
            >
              <span className="group__label">{group.label}</span>
              <ul className="group__items">
                {group.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </Act>
  )
}
