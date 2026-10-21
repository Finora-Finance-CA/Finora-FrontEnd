import './IconButton.css'

/**
 * A button that shows only an icon. `label` is its accessible name, so screen readers
 * say what it does.
 *
 * @param {object} props
 * @param {import('react').ComponentType} props.icon A lucide icon.
 * @param {string} props.label
 * @param {'ghost'|'secondary'} [props.variant='ghost']
 */
export default function IconButton({ icon: Icon, label, variant = 'ghost', type = 'button', className, ...props }) {
  const classes = ['icon-button', `icon-button--${variant}`, className].filter(Boolean).join(' ')
  return (
    <button type={type} className={classes} aria-label={label} {...props}>
      <Icon className="icon-button__icon" />
    </button>
  )
}
