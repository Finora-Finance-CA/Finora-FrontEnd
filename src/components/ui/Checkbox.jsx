import { Check } from 'lucide-react'
import './Checkbox.css'

/**
 * A checkbox with its label. The real input stays in the page for keyboard and screen
 * reader use; the box beside it is what people see. An optional `swatch` shows a colour
 * dot before the label (light and dark mode colours), e.g. a category's colour.
 *
 * @param {object} props
 * @param {import('react').ReactNode} props.label
 * @param {{ light: string, dark: string }} [props.swatch]
 */
export default function Checkbox({ label, swatch, className, ...props }) {
  return (
    <label className={['checkbox', className].filter(Boolean).join(' ')}>
      <input type="checkbox" className="checkbox__input" {...props} />
      <span className="checkbox__box" aria-hidden="true">
        <Check className="checkbox__check" />
      </span>
      {swatch && (
        <span
          className="checkbox__swatch"
          aria-hidden="true"
          style={{ '--swatch': swatch.light, '--swatch-dark': swatch.dark }}
        />
      )}
      <span>{label}</span>
    </label>
  )
}
