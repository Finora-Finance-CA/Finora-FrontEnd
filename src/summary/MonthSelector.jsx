import { addMonths, formatMonth, MIN_MONTH } from './months'
import '../components/buttons.css'
import './MonthSelector.css'

/**
 * Previous and Next month buttons around the month's name (US-28). The name is
 * announced to screen readers when it changes. "This month" appears when another
 * month is showing, to jump back.
 *
 * @param {object} props
 * @param {string} props.month YYYY-MM, showing now.
 * @param {string} props.current YYYY-MM, the user's current month.
 * @param {(month: string) => void} props.onChange
 */
export default function MonthSelector({ month, current, onChange }) {
  const previous = addMonths(month, -1)
  const next = addMonths(month, 1)

  return (
    <div className="month-selector" role="group" aria-label="Choose a month">
      <button
        type="button"
        className="button button--secondary"
        onClick={() => onChange(previous)}
        disabled={previous < MIN_MONTH}
        aria-label={`Previous month, ${formatMonth(previous)}`}
      >
        <svg className="month-selector__arrow" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
          <path d="M10 3 5 8l5 5" fill="none" stroke="currentColor" strokeWidth="2" />
        </svg>
        <span className="month-selector__word">Previous</span>
      </button>

      <p className="month-selector__label" aria-live="polite" aria-atomic="true">
        {formatMonth(month)}
      </p>

      <button
        type="button"
        className="button button--secondary"
        onClick={() => onChange(next)}
        aria-label={`Next month, ${formatMonth(next)}`}
      >
        <span className="month-selector__word">Next</span>
        <svg className="month-selector__arrow" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
          <path d="m6 3 5 5-5 5" fill="none" stroke="currentColor" strokeWidth="2" />
        </svg>
      </button>

      {month !== current && (
        <button type="button" className="button button--secondary month-selector__today" onClick={() => onChange(current)}>
          This month
        </button>
      )}
    </div>
  )
}
