import './EmptyState.css'

/**
 * What to show when there's nothing to list, nothing matches, or loading failed: an
 * icon, a short title, an optional line of detail and an optional action.
 *
 * @param {object} props
 * @param {import('react').ComponentType} props.icon A lucide icon.
 * @param {import('react').ReactNode} props.title
 * @param {import('react').ReactNode} [props.children] Detail under the title.
 * @param {import('react').ReactNode} [props.action] A button or link.
 */
export default function EmptyState({ icon: Icon, title, children, action, className }) {
  return (
    <div className={['empty-state', className].filter(Boolean).join(' ')}>
      <span className="empty-state__icon">
        <Icon />
      </span>
      <p className="empty-state__title">{title}</p>
      {children && <div className="empty-state__detail">{children}</div>}
      {action && <div className="empty-state__action">{action}</div>}
    </div>
  )
}
