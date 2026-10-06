import FormField from '../components/FormField'
import { CATEGORIES, MAX_DESCRIPTION_LENGTH, MIN_DATE } from './constants'
import { useTransactionForm } from './useTransactionForm'
import './TransactionForm.css'

const SIGN_IN_HINT_DEV = 'Developers: set VITE_DEV_TOKEN in .env.development.local until login exists (see README).'

/**
 * Form for adding a transaction. Add Expense uses it with type "expense"; Add
 * Income (US-12) can use it with type "income" and categoryRequired={false}.
 *
 * @param {object} props
 * @param {'income'|'expense'} props.type
 * @param {string} props.title Heading, e.g. "Add expense".
 * @param {string} props.submitLabel Button text, e.g. "Save expense".
 * @param {string} props.successLabel Used in the confirmation, e.g. "Expense".
 * @param {boolean} [props.categoryRequired=true]
 * @param {(transaction: object) => void} [props.onSaved]
 */
export default function TransactionForm({
  type,
  title,
  submitLabel,
  successLabel,
  categoryRequired = true,
  onSaved,
}) {
  const { values, errors, formError, successMessage, isSubmitting, fieldProps, handleSubmit } =
    useTransactionForm({ type, categoryRequired, successLabel, onSaved })

  // Ids are prefixed by type so an expense and an income form can share a page.
  const id = (field) => `${type}-${field}`
  const headingId = id('heading')
  const descriptionLength = values.description.trim().length

  return (
    <form className="transaction-form" onSubmit={handleSubmit} noValidate aria-labelledby={headingId}>
      <h2 id={headingId}>{title}</h2>

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

      <FormField
        id={id('category')}
        label="Category"
        optional={!categoryRequired}
        error={errors.category}
      >
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
          <p>{formError.message}</p>
          {formError.kind === 'unauthorized' && import.meta.env.DEV && (
            <p className="transaction-form__dev-hint">{SIGN_IN_HINT_DEV}</p>
          )}
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
