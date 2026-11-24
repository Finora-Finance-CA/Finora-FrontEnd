import { useId } from 'react'
import Card from './Card'
import './Panel.css'

/**
 * A titled section in one bordered box: the heading (and an optional link or button on
 * the right) sits inside the top of the box, so the heading and its content read as one
 * unit. The box is a <section> named by its heading.
 *
 * @param {object} props
 * @param {import('react').ReactNode} props.title
 * @param {import('react').ReactNode} [props.action] e.g. a "Manage budgets" link.
 * @param {boolean} [props.busy] Newer data is loading (aria-busy).
 * @param {string} [props.className]
 * @param {import('react').ReactNode} props.children
 */
export default function Panel({ title, action, busy, className, children }) {
  const headingId = useId()
  return (
    <Card
      as="section"
      padded={false}
      className={['panel', className].filter(Boolean).join(' ')}
      aria-labelledby={headingId}
      aria-busy={busy || undefined}
    >
      <header className="panel__header">
        <h2 id={headingId} className="panel__title">
          {title}
        </h2>
        {action && <div className="panel__action">{action}</div>}
      </header>
      <div className="panel__body">{children}</div>
    </Card>
  )
}
