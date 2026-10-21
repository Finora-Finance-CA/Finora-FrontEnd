import { useId } from 'react'
import SessionEndedMessage from '../components/SessionEndedMessage'
import Alert from '../components/ui/Alert'
import Button from '../components/ui/Button'
import Field from '../components/ui/Field'
import Input from '../components/ui/Input'
import SegmentedControl from '../components/ui/SegmentedControl'
import Select from '../components/ui/Select'
import { CATEGORIES, MAX_DESCRIPTION_LENGTH, MIN_DATE, TRANSACTION_TYPES } from './constants'
import { useTransactionForm } from './useTransactionForm'
import './TransactionForm.css'

const TYPE_OPTIONS = Object.entries(TRANSACTION_TYPES).map(([value, { label }]) => ({ value, label }))

/**
 * Form for adding an expense or an income, or editing one, inside the add or edit
 * drawer (whose title names it). The button, fields and rules follow `type` (see
 * TRANSACTION_TYPES); the expense form has a category, the income form doesn't.
 *
 * With `onTypeChange`, the form starts with an Expense or Income switch. Changing type
 * keeps the amount, date and description typed so far and clears any error. The switch
 * is locked while a save is in progress.
 *
 * With `transaction`, the form edits it instead: it starts with its values and shows
 * its type without letting it change.
 *
 * @param {object} props
 * @param {'income'|'expense'} props.type
 * @param {(type: 'income'|'expense') => void} [props.onTypeChange]
 * @param {(transaction: object, message?: string) => void} [props.onSaved] See useTransactionForm.
 * @param {object} [props.transaction] The saved transaction to edit.
 * @param {() => void} props.onCancel
 * @param {() => void} [props.onNotFound] See useTransactionForm.
 * @param {(isSubmitting: boolean) => void} [props.onSubmittingChange] See useTransactionForm.
 * @param {{ current: HTMLElement|null }} [props.firstFieldRef] See useTransactionForm.
 */
export default function TransactionForm({
  type,
  onTypeChange,
  onSaved,
  transaction,
  onCancel,
  onNotFound,
  onSubmittingChange,
  firstFieldRef,
}) {
  const { label, submitLabel, fields } = TRANSACTION_TYPES[type]
  const isEditing = Boolean(transaction)
  const { values, errors, formError, isSubmitting, fieldProps, handleSubmit } = useTransactionForm({
    type,
    transaction,
    onSaved,
    onNotFound,
    onSubmittingChange,
    firstFieldRef,
  })

  // Unique per form. The same input stays in place when the type changes, so ids
  // don't include it.
  const idPrefix = useId()
  const id = (field) => `${idPrefix}-${field}`
  const descriptionLength = values.description.trim().length

  return (
    <form className="transaction-form" onSubmit={handleSubmit} noValidate>
      {isEditing && (
        <p className="transaction-form__type">
          Type: <strong>{label}</strong>
        </p>
      )}

      {onTypeChange && (
        <SegmentedControl
          name={id('type')}
          legend="Transaction type"
          value={type}
          options={TYPE_OPTIONS}
          onChange={onTypeChange}
          disabled={isSubmitting}
        />
      )}

      <Field id={id('amount')} label="Amount ($)" hint="For example 12.50" error={errors.amount}>
        {(controlProps) => (
          <Input
            {...controlProps}
            {...fieldProps('amount')}
            className="tabular"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            placeholder="0.00"
          />
        )}
      </Field>

      <Field id={id('date')} label="Date" error={errors.date}>
        {(controlProps) => <Input {...controlProps} {...fieldProps('date')} type="date" min={MIN_DATE} />}
      </Field>

      {fields.includes('category') && (
        <Field id={id('category')} label="Category" error={errors.category}>
          {(controlProps) => (
            <Select {...controlProps} {...fieldProps('category')}>
              <option value="">Choose a category</option>
              {CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </Select>
          )}
        </Field>
      )}

      <Field
        id={id('description')}
        label="Description"
        optional
        hint={`${descriptionLength} of ${MAX_DESCRIPTION_LENGTH} characters`}
        error={errors.description}
      >
        {(controlProps) => <Input {...controlProps} {...fieldProps('description')} type="text" autoComplete="off" />}
      </Field>

      {formError && <Alert>{formError.kind === 'unauthorized' ? <SessionEndedMessage /> : <p>{formError.message}</p>}</Alert>}

      <div className="dialog__actions">
        <Button onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : isEditing ? 'Save changes' : submitLabel}
        </Button>
      </div>
    </form>
  )
}
