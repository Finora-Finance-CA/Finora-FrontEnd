import { useId, useRef, useState } from 'react'
import { addContribution } from '../api/goals'
import ErrorAlert from '../components/ErrorAlert'
import Button from '../components/ui/Button'
import Dialog from '../components/ui/Dialog'
import Field from '../components/ui/Field'
import Input from '../components/ui/Input'
import { useIsMountedRef } from '../hooks/useIsMountedRef'
import { formatCents, parseDollarsToCents } from '../transactions/money'
import { NOT_SAVED_CHECK_DETAILS, mapApiFieldErrors } from '../validation/apiErrors'
import { useFormFields } from '../validation/useFormFields'

const FIELDS = ['amount']
const validateAmount = (_field, values) => parseDollarsToCents(values.amount, 'Amount').error

/**
 * Adds money to a goal's saved total (US-49, US-50). The amount is checked with the
 * shared money rules; if the save fails, the dialog stays open with the amount typed.
 *
 * @param {object} props
 * @param {object} props.goal
 * @param {(goal: object, amountCents: number) => void} props.onSaved Gets the goal with its new total.
 * @param {(id: string) => void} props.onMissing The goal no longer exists.
 * @param {() => void} props.onClose
 * @param {{ current: HTMLElement|null }} [props.returnFocusRef]
 * @param {{ current: HTMLElement|null }} [props.fallbackFocusRef]
 */
export default function ContributionDialog({ goal, onSaved, onMissing, onClose, returnFocusRef, fallbackFocusRef }) {
  const { values, errors, fieldProps, validateAll, showErrors } = useFormFields({
    initialValues: { amount: '' },
    fields: FIELDS,
    validate: validateAmount,
  })
  const [formError, setFormError] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const savingRef = useRef(false)
  const amountRef = useRef(null)
  const isMountedRef = useIsMountedRef()
  const fieldId = useId()

  async function handleSubmit(event) {
    event.preventDefault()
    if (savingRef.current) return
    setFormError(null)
    if (!validateAll()) return

    const { cents } = parseDollarsToCents(values.amount)
    savingRef.current = true
    setIsSaving(true)
    let updated = null
    let failure = null
    try {
      updated = await addContribution(goal.id, cents)
    } catch (err) {
      failure = err
    }
    savingRef.current = false
    if (!isMountedRef.current) return
    setIsSaving(false)

    if (!failure) {
      onSaved(updated, cents)
      return
    }
    if (failure.kind === 'not_found') {
      onMissing(goal.id)
      return
    }
    if (failure.kind === 'validation') {
      const { fieldErrors, hasOtherErrors } = mapApiFieldErrors(failure.fieldErrors, { amount_cents: 'amount' })
      showErrors(fieldErrors)
      if (hasOtherErrors || !fieldErrors.amount) setFormError({ kind: 'validation', message: NOT_SAVED_CHECK_DETAILS })
      return
    }
    if (!failure.kind) console.error(failure)
    setFormError(failure)
  }

  return (
    <Dialog
      title="Add contribution"
      variant="drawer"
      onClose={onClose}
      canClose={!isSaving}
      initialFocusRef={amountRef}
      returnFocusRef={returnFocusRef}
      fallbackFocusRef={fallbackFocusRef}
    >
      <form className="goal-form" onSubmit={handleSubmit} noValidate>
        <p className="goal-form__context tabular">
          {goal.name}: {formatCents(goal.saved_cents)} saved of {formatCents(goal.target_cents)}.
        </p>

        <Field id={fieldId} label="Amount ($)" hint="For example 25.00" error={errors.amount}>
          {(controlProps) => (
            <Input
              {...controlProps}
              {...fieldProps('amount', (element) => {
                amountRef.current = element
              })}
              className="tabular"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              placeholder="0.00"
            />
          )}
        </Field>

        {formError && <ErrorAlert error={formError} context="The contribution was not added." />}

        <div className="dialog__actions">
          <Button onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isSaving}>
            {isSaving ? 'Saving…' : 'Add contribution'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
