import { TRANSACTION_TYPES } from './constants'
import './TransactionTypeSwitch.css'

/**
 * Two-option switch for choosing whether the form adds an expense or an income.
 * It's a radio group, so keyboard users Tab to it and change it with the arrow keys,
 * and screen readers announce it as "Transaction type" with the chosen option.
 *
 * @param {object} props
 * @param {'income'|'expense'} props.value
 * @param {(type: 'income'|'expense') => void} props.onChange
 * @param {string} props.name Radio group name, unique on the page.
 * @param {boolean} [props.disabled=false]
 */
export default function TransactionTypeSwitch({ value, onChange, name, disabled = false }) {
  return (
    <fieldset className="type-switch" disabled={disabled}>
      <legend className="type-switch__legend">Transaction type</legend>
      <div className="type-switch__options">
        {Object.entries(TRANSACTION_TYPES).map(([type, { label }]) => (
          <label key={type} className="type-switch__option">
            <input
              type="radio"
              name={name}
              value={type}
              checked={value === type}
              onChange={() => onChange(type)}
            />
            <span>{label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
