import './SegmentedControl.css'

/**
 * A row of mutually exclusive options that look like one control. It's a radio group,
 * so keyboard users Tab to it and change it with the arrow keys, and screen readers
 * announce the legend and the chosen option.
 *
 * @param {object} props
 * @param {string} props.name Radio group name, unique on the page.
 * @param {string} props.legend
 * @param {string} props.value
 * @param {{ value: string, label: string }[]} props.options
 * @param {(value: string) => void} props.onChange
 * @param {boolean} [props.disabled]
 */
export default function SegmentedControl({ name, legend, value, options, onChange, disabled = false }) {
  return (
    <fieldset className="segmented" disabled={disabled}>
      <legend className="segmented__legend">{legend}</legend>
      <div className="segmented__options">
        {options.map((option) => (
          <label key={option.value} className="segmented__option">
            <input
              type="radio"
              className="segmented__input"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
            />
            <span className="segmented__label">{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
