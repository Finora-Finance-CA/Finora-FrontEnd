import { ChevronDown } from 'lucide-react'
import './Input.css'
import './Select.css'

/**
 * A native select with the app's styling. Native, so it works with every keyboard,
 * screen reader and phone picker.
 */
export default function Select({ className, children, ...props }) {
  return (
    <span className="select-wrap">
      <select className={['select', className].filter(Boolean).join(' ')} {...props}>
        {children}
      </select>
      <ChevronDown className="select-wrap__icon" />
    </span>
  )
}
