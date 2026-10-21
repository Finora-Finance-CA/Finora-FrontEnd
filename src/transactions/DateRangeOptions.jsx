import { useId, useState } from 'react'
import Field from '../components/ui/Field'
import Input from '../components/ui/Input'
import { MIN_DATE } from './constants'
import { DATE_PRESETS, matchPreset, presetRange } from './datePresets'
import { todayLocal } from './dates'
import './FilterOptions.css'

/**
 * The date range presets (All time, This month, Last month, Last 90 days, Custom), in
 * the Date popover on wide screens and the Filters sheet on phones. A preset sets the
 * From and To dates at once. Custom shows the two dates, which apply as they change; a
 * To date before the From date is explained under To.
 *
 * @param {object} props
 * @param {string} props.from YYYY-MM-DD or ''.
 * @param {string} props.to YYYY-MM-DD or ''.
 * @param {(changes: { from?: string, to?: string }) => void} props.onChange
 * @param {boolean} [props.rangeReversed]
 */
export default function DateRangeOptions({ from, to, onChange, rangeReversed = false }) {
  const idPrefix = useId()
  const today = todayLocal()
  // Custom can be picked before any date is typed, which no URL can show, so it's
  // remembered here until the panel closes.
  const [customChosen, setCustomChosen] = useState(false)
  const selected = customChosen ? 'custom' : matchPreset({ from, to }, today)

  function choose(id) {
    setCustomChosen(id === 'custom')
    if (id !== 'custom') onChange(presetRange(id, today))
  }

  return (
    <fieldset className="filter-options">
      <legend className="filter-options__legend">Date range</legend>
      {DATE_PRESETS.map(({ id, label }) => (
        <label key={id} className="filter-options__radio">
          <input
            type="radio"
            name={`${idPrefix}-range`}
            value={id}
            checked={selected === id}
            onChange={() => choose(id)}
          />
          {label}
        </label>
      ))}

      {selected === 'custom' && (
        <div className="filter-options__dates">
          <Field id={`${idPrefix}-from`} label="From">
            {(controlProps) => (
              <Input
                {...controlProps}
                type="date"
                value={from}
                min={MIN_DATE}
                max={to || undefined}
                onChange={(event) => onChange({ from: event.target.value })}
              />
            )}
          </Field>
          <Field
            id={`${idPrefix}-to`}
            label="To"
            error={rangeReversed ? 'Choose a date on or after the From date.' : undefined}
          >
            {(controlProps) => (
              <Input
                {...controlProps}
                type="date"
                value={to}
                min={from || MIN_DATE}
                onChange={(event) => onChange({ to: event.target.value })}
              />
            )}
          </Field>
        </div>
      )}
    </fieldset>
  )
}
