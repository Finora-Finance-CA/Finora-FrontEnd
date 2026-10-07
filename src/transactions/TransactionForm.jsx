import FormField from '../components/FormField'
import SessionEndedMessage from '../components/SessionEndedMessage'
import { CATEGORIES, MAX_DESCRIPTION_LENGTH, MIN_DATE, TRANSACTION_TYPES } from './constants'
import TransactionTypeSwitch from './TransactionTypeSwitch'
import { useTransactionForm } from './useTransactionForm'
import './TransactionForm.css'

/**
 * Form for adding an expense or an income. The heading, button, fields and rules
 * follow `type` (see TRANSACTION_TYPES); the expense form has a category, the
 * income form doesn't.
 *
 * With `onTypeChange`, the form starts with an Expense or Income switch. Changing
 * type keeps the amount, date and description typed so far and clears any error or
 * confirmation. The switch is locked while a save is in progress.
 *
 * @param {object} props
 * @param {'income'|'expense'} props.type
 * @param {(type: 'income'|'expense') => void} [props.onTypeChange]
 * @param {(transaction: object) => void} [props.onSaved]
 */
export default function TransactionForm({ type, onTypeChange, onSaved }) {
  const { title, submitLabel, fields } = TRANSACTION_TYPES[type]
  const { values, errors, formError, successMessage, isSubmitting, fieldProps, handleSubmit } =
    useTransactionForm({ type, onSaved })

  // The same input stays in place when the type changes, so ids don't include it.
  const id = (field) => `transaction-${field}`
  const headingId = id('heading')
  const descriptionLength = values.description.trim().length

  return (
    <form className="transaction-form" onSubmit={handleSubmit} noValidate aria-labelledby={headingId}>
      <h2 id={headingId}>{title}</h2>

      {onTypeChange && (
        <TransactionTypeSwitch
          name={id('type')}
          value={type}
          onChange={onTypeChange}
          disabled={isSubmitting}
        />
      )}

      <FormField id={id('amount')} label="Amount ($)" hint="For example 12.50" error={errors.amount}>
        {(controlProps) => (
          <input
            {...controlProps}
            {...fieldProps('amount')}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            placeholder="0.00"
          />
        )}
      </FormField>

      <FormField id={id('date')} label="Date" error={errors.date}>
        {(controlProps) => <input {...controlProps} {...fieldProps('date')} type="date" min={MIN_DATE} />}
      </FormField>

      {fields.includes('category') && (
        <FormField id={id('category')} label="Category" error={errors.category}>
          {(controlProps) => (
            <select {...controlProps} {...fieldProps('category')}>
              <option value="">Choose a category</option>
              {CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          )}
        </FormField>
      )}

      <FormField
        id={id('description')}
        label="Description"
        optional
        hint={`${descriptionLength} of ${MAX_DESCRIPTION_LENGTH} characters`}
        error={errors.description}
      >
        {(controlProps) => (
          <input {...controlProps} {...fieldProps('description')} type="text" autoComplete="off" />
        )}
      </FormField>

      {formError && (
        <div className="transaction-form__alert" role="alert">
          {formError.kind === 'unauthorized' ? <SessionEndedMessage /> : <p>{formError.message}</p>}
        </div>
      )}

      <div className="transaction-form__status" role="status">
        {successMessage}
      </div>

      <button type="submit" className="transaction-form__submit" disabled={isSubmitting}>
        {isSubmitting ? 'Saving…' : submitLabel}
      </button>
    </form>
  )
}
