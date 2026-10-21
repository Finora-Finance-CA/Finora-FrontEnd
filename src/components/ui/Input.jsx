import './Input.css'

/**
 * A text-like input (text, email, password, search, date). An `icon` sits inside the
 * start of the box, e.g. a magnifier for search; `trailing` sits inside the end, e.g. a
 * show-password button. Invalid styling comes from aria-invalid, which Field sets.
 *
 * @param {object} props
 * @param {import('react').ComponentType} [props.icon] A lucide icon.
 * @param {import('react').ReactNode} [props.trailing]
 */
export default function Input({ icon: Icon, trailing, className, ...props }) {
  const classes = ['input', Icon && 'input--with-icon', trailing && 'input--with-trailing', className]
    .filter(Boolean)
    .join(' ')
  const input = <input className={classes} {...props} />
  if (!Icon && !trailing) return input

  return (
    <span className="input-wrap">
      {Icon && <Icon className="input-wrap__icon" />}
      {input}
      {trailing && <span className="input-wrap__trailing">{trailing}</span>}
    </span>
  )
}
