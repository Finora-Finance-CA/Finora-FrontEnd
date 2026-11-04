import './ProgressBar.css'

const TONES = ['default', 'warning', 'danger']

/**
 * A horizontal bar showing how much of something is used, e.g. a budget (US-36) or a
 * savings goal. The fill stops at 100% of the width, but `value` may be higher: say so
 * in `valueText`, which screen readers read instead of the number. Always show the
 * figures as text next to the bar too, so its length is never the only signal.
 *
 * @param {object} props
 * @param {number} props.value Percent used, e.g. 80. Above 100 fills the bar.
 * @param {string} props.label What the bar measures, e.g. "Food spending".
 * @param {string} [props.valueText] The value in words, e.g. "115% used, $23.15 over".
 * @param {'default'|'warning'|'danger'} [props.tone] The fill colour.
 */
export default function ProgressBar({ value, label, valueText, tone = 'default', className }) {
  const shown = Number.isFinite(value) ? Math.min(Math.max(value, 0), 100) : 0
  const toneClass = TONES.includes(tone) ? tone : 'default'

  return (
    <div
      className={['progress-bar', `progress-bar--${toneClass}`, className].filter(Boolean).join(' ')}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      // ARIA needs a value inside min and max; the real one, past 100, is in valueText.
      aria-valuenow={Math.round(shown)}
      aria-valuetext={valueText}
    >
      <div className="progress-bar__fill" style={{ '--progress': shown / 100 }} />
    </div>
  )
}
