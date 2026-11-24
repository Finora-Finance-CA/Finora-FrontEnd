import './EmptyState.css'

/**
 * What to show when there's nothing to list, nothing matches, or loading failed: a
 * short title saying what's missing, an optional line of detail and at most one action.
 * No icon: the words carry it.
 *
 * @param {object} props
 * @param {import('react').ReactNode} props.title
 * @param {import('react').ReactNode} [props.children] Detail under the title.
 * @param {import('react').ReactNode} [props.action] A button or link.
 */
export default function EmptyState({ title, children, action, className }) {
  return (
    <div className={['empty-state', className].filter(Boolean).join(' ')}>
      <p className="empty-state__title">{title}</p>
      {children && <div className="empty-state__detail">{children}</div>}
      {action && <div className="empty-state__action">{action}</div>}
    </div>
  )
}
