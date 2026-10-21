import './Button.css'

/**
 * The app's button. One primary button per screen; everything else is secondary, ghost
 * (no border, for toolbars and menus) or danger (for confirming a delete).
 *
 * @param {object} props
 * @param {'primary'|'secondary'|'ghost'|'danger'} [props.variant='secondary']
 * @param {'md'|'sm'} [props.size='md'] Small buttons look smaller but keep a 44px hit area.
 * @param {import('react').ComponentType} [props.icon] A lucide icon shown before the text.
 * @param {boolean} [props.fullWidth]
 */
export default function Button({
  variant = 'secondary',
  size = 'md',
  icon: Icon,
  fullWidth = false,
  type = 'button',
  className,
  children,
  ...props
}) {
  const classes = ['button', `button--${variant}`, `button--${size}`, fullWidth && 'button--full', className]
    .filter(Boolean)
    .join(' ')

  return (
    <button type={type} className={classes} {...props}>
      {Icon && <Icon className="button__icon" />}
      {children}
    </button>
  )
}
