import { Check } from 'lucide-react'
import './Checkbox.css'

/**
 * A checkbox with its label. The real input stays in the page for keyboard and screen
 * reader use; the box beside it is what people see.
 *
 * @param {object} props
 * @param {import('react').ReactNode} props.label
 */
export default function Checkbox({ label, className, ...props }) {
  return (
    <label className={['checkbox', className].filter(Boolean).join(' ')}>
      <input type="checkbox" className="checkbox__input" {...props} />
      <span className="checkbox__box" aria-hidden="true">
        <Check className="checkbox__check" />
      </span>
      <span>{label}</span>
    </label>
  )
}
