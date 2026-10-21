import { ChevronLeft, ChevronRight } from 'lucide-react'
import Button from '../components/ui/Button'
import IconButton from '../components/ui/IconButton'
import { addMonths, formatMonth, MIN_MONTH } from './months'
import './MonthSelector.css'

/**
 * Previous and Next month buttons around the month's name (US-28). The buttons are
 * named after the month they go to, and the name is announced to screen readers when
 * it changes. "This month" appears when another month is showing, to jump back.
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
      <div className="month-selector__stepper">
        <IconButton
          icon={ChevronLeft}
          label={`Previous month, ${formatMonth(previous)}`}
          onClick={() => onChange(previous)}
          disabled={previous < MIN_MONTH}
        />
        <p className="month-selector__label" aria-live="polite" aria-atomic="true">
          {formatMonth(month)}
        </p>
        <IconButton icon={ChevronRight} label={`Next month, ${formatMonth(next)}`} onClick={() => onChange(next)} />
      </div>
      {month !== current && (
        <Button size="sm" onClick={() => onChange(current)}>
          This month
        </Button>
      )}
    </div>
  )
}
