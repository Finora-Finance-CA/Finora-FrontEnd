import './FormField.css'

/**
 * A labelled form control with an optional hint and error message, wired up for
 * screen readers. `children` is a function that receives the props the control
 * needs (id, aria-invalid, aria-describedby) and returns the input or select.
 *
 *   <FormField id="amount" label="Amount" error={errors.amount}>
 *     {(controlProps) => <input {...controlProps} {...fieldProps('amount')} />}
 *   </FormField>
 */
export default function FormField({ id, label, hint, error, optional = false, children }) {
  const hintId = hint ? `${id}-hint` : null
  const errorId = error ? `${id}-error` : null
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined

  return (
    <div className={`form-field${error ? ' form-field--invalid' : ''}`}>
      <label className="form-field__label" htmlFor={id}>
        {label}
        {optional && <span className="form-field__optional"> (optional)</span>}
      </label>
      {children({ id, 'aria-invalid': error ? true : undefined, 'aria-describedby': describedBy })}
      {hint && (
        <p className="form-field__hint" id={hintId}>
          {hint}
        </p>
      )}
      {error && (
        <p className="form-field__error" id={errorId}>
          {error}
        </p>
      )}
    </div>
  )
}
