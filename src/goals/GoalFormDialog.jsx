import { useId, useRef, useState } from 'react'
import { createGoal, updateGoal } from '../api/goals'
import ErrorAlert from '../components/ErrorAlert'
import Button from '../components/ui/Button'
import Dialog from '../components/ui/Dialog'
import Field from '../components/ui/Field'
import Input from '../components/ui/Input'
import { useIsMountedRef } from '../hooks/useIsMountedRef'
import { MAX_DATE, MIN_DATE } from '../transactions/constants'
import { centsToDollarString, parseDollarsToCents } from '../transactions/money'
import { NOT_SAVED_CHECK_DETAILS, mapApiFieldErrors } from '../validation/apiErrors'
import { validateDate, validateText } from '../validation/rules'
import { useFormFields } from '../validation/useFormFields'

// Mirrors the API's goal name limit (validation-rules.md).
const MAX_GOAL_NAME_LENGTH = 60

const FIELDS = ['name', 'target', 'targetDate']
const API_FIELDS = { name: 'name', target_cents: 'target', target_date: 'targetDate' }

const validators = {
  name: (values) => validateText(values.name, 'Name', { required: true, max: MAX_GOAL_NAME_LENGTH }),
  target: (values) => parseDollarsToCents(values.target, 'Target').error,
  targetDate: (values) => validateDate(values.targetDate, 'Target date', { required: false }),
}

/**
 * Creates a savings goal, or edits one (US-40, US-47): a name, a target in dollars and an
 * optional date to reach it by. Fields are checked on blur and on submit with the shared
 * rules; nothing is sent until they're all valid. If the save fails, the dialog stays
 * open with everything typed.
 *
 * @param {object} props
 * @param {object} [props.goal] The goal to edit; without it, a new one is created.
 * @param {(goal: object) => void} props.onSaved
 * @param {(id: string) => void} props.onMissing The goal being edited no longer exists.
 * @param {() => void} props.onClose
 * @param {{ current: HTMLElement|null }} [props.returnFocusRef]
 * @param {{ current: HTMLElement|null }} [props.fallbackFocusRef]
 */
export default function GoalFormDialog({ goal, onSaved, onMissing, onClose, returnFocusRef, fallbackFocusRef }) {
  const { values, errors, fieldProps, validateAll, showErrors } = useFormFields({
    initialValues: {
      name: goal?.name ?? '',
      target: goal ? centsToDollarString(goal.target_cents) : '',
      targetDate: goal?.target_date ?? '',
    },
    fields: FIELDS,
    validate: (field, current) => validators[field](current),
  })
  const [formError, setFormError] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const savingRef = useRef(false)
  const nameRef = useRef(null)
  const isMountedRef = useIsMountedRef()
  const idPrefix = useId()
  const id = (field) => `${idPrefix}-${field}`

  async function handleSubmit(event) {
    event.preventDefault()
    if (savingRef.current) return
    setFormError(null)
    if (!validateAll()) return

    const payload = {
      name: values.name.trim(),
      target_cents: parseDollarsToCents(values.target).cents,
      target_date: values.targetDate || null,
    }

    savingRef.current = true
    setIsSaving(true)
    let saved = null
    let failure = null
    try {
      saved = goal ? await updateGoal(goal.id, payload) : await createGoal(payload)
    } catch (err) {
      failure = err
    }
    savingRef.current = false
    if (!isMountedRef.current) return
    setIsSaving(false)

    if (!failure) {
      onSaved(saved)
      return
    }
    if (failure.kind === 'not_found' && goal) {
      onMissing(goal.id)
      return
    }
    if (failure.kind === 'validation') {
      const { fieldErrors, hasOtherErrors } = mapApiFieldErrors(failure.fieldErrors, API_FIELDS)
      showErrors(fieldErrors)
      if (hasOtherErrors || Object.keys(fieldErrors).length === 0) {
        setFormError({ kind: 'validation', message: NOT_SAVED_CHECK_DETAILS })
      }
      return
    }
    // The dialog stays open with what was typed.
    if (!failure.kind) console.error(failure)
    setFormError(failure)
  }

  return (
    <Dialog
      title={goal ? 'Edit savings goal' : 'Add savings goal'}
      variant="drawer"
      onClose={onClose}
      canClose={!isSaving}
      initialFocusRef={nameRef}
      returnFocusRef={returnFocusRef}
      fallbackFocusRef={fallbackFocusRef}
    >
      <form className="goal-form" onSubmit={handleSubmit} noValidate>
        <Field
          id={id('name')}
          label="Name"
          hint={`For example Trip to Japan. Up to ${MAX_GOAL_NAME_LENGTH} characters.`}
          error={errors.name}
        >
          {(controlProps) => (
            <Input
              {...controlProps}
              {...fieldProps('name', (element) => {
                nameRef.current = element
              })}
              type="text"
              autoComplete="off"
            />
          )}
        </Field>

        <Field id={id('target')} label="Target ($)" hint="For example 3500.00" error={errors.target}>
          {(controlProps) => (
            <Input
              {...controlProps}
              {...fieldProps('target')}
              className="tabular"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              placeholder="0.00"
            />
          )}
        </Field>

        <Field id={id('targetDate')} label="Target date" optional error={errors.targetDate}>
          {(controlProps) => (
            <Input {...controlProps} {...fieldProps('targetDate')} type="date" min={MIN_DATE} max={MAX_DATE} />
          )}
        </Field>

        {formError && <ErrorAlert error={formError} context={goal ? 'The goal was not changed.' : 'The goal was not saved.'} />}

        <div className="dialog__actions">
          <Button onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isSaving}>
            {isSaving ? 'Saving…' : goal ? 'Save changes' : 'Add goal'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
