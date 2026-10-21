import './Field.css'

/**
 * A labelled form control with an optional hint and error message, wired up for
 * screen readers. `children` is a function that receives the props the control needs
 * (id, aria-invalid, aria-describedby) and returns the input or select.
 *
 *   <Field id="amount" label="Amount" error={errors.amount}>
 *     {(controlProps) => <Input {...controlProps} {...fieldProps('amount')} />}
 *   </Field>
 *
 * @param {object} props
 * @param {string} props.id
 * @param {import('react').ReactNode} props.label
 * @param {import('react').ReactNode} [props.hint]
 * @param {string} [props.error]
 * @param {boolean} [props.optional]
 * @param {(controlProps: object) => import('react').ReactNode} props.children
 */
export default function Field({ id, label, hint, error, optional = false, children }) {
  const hintId = hint ? `${id}-hint` : null
  const errorId = error ? `${id}-error` : null
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined

  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>
        {label}
        {optional && <span className="field__optional"> (optional)</span>}
      </label>
      {children({ id, 'aria-invalid': error ? true : undefined, 'aria-describedby': describedBy })}
      {hint && (
        <p className="field__hint" id={hintId}>
          {hint}
        </p>
      )}
      {error && (
        <p className="field__error" id={errorId}>
          {error}
        </p>
      )}
    </div>
  )
}
