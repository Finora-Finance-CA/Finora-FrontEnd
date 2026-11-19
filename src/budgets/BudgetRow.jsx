import { Plus } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { createBudget, updateBudget } from '../api/budgets'
import ErrorAlert from '../components/ErrorAlert'
import Button from '../components/ui/Button'
import Field from '../components/ui/Field'
import Input from '../components/ui/Input'
import ProgressBar from '../components/ui/ProgressBar'
import { useToast } from '../components/ui/useToast'
import { useIsMountedRef } from '../hooks/useIsMountedRef'
import { mapApiFieldErrors } from '../validation/apiErrors'
import { useFormFields } from '../validation/useFormFields'
import CategoryLabel from '../transactions/CategoryLabel'
import { centsToDollarString, formatCents } from '../transactions/money'
import { parseLimitToCents } from './limits'
import RemoveBudgetDialog from './RemoveBudgetDialog'
import { budgetAlert, remainingText } from './budgetAlerts'
import './BudgetRow.css'

const FIELDS = ['limit']
const validateLimit = (_field, values) => parseLimitToCents(values.limit).error

/**
 * One category on the Budgets page (US-32): its monthly limit, or "No limit set", with
 * buttons to set, edit or remove it. Setting or editing opens a small form in the row;
 * removing asks for confirmation first.
 *
 * With `spending` for the month, the row also shows what was spent of the limit, a
 * progress bar, the percent used and what's left (US-36, US-37), and a button to add
 * an expense in this category.
 *
 * @param {object} props
 * @param {string} props.category
 * @param {import('../api/budgets').Budget} [props.budget] The category's budget, if any.
 * @param {import('../api/budgets').BudgetStatus} [props.spending] This month's spending
 *   against the budget. Ignored if it was worked out for a different limit (the limit
 *   has just changed and the new figures are still loading).
 * @param {(budget: object) => void} props.onSaved
 * @param {(category: string) => void} props.onRemoved
 * @param {() => void} props.onOutOfDate The list on screen no longer matches the API
 *   (a 409 or 404), so it should be loaded again.
 * @param {(category: string, opener: HTMLElement) => void} [props.onAddExpense] Opens the
 *   add drawer with this category chosen.
 */
export default function BudgetRow({ category, budget, spending, onSaved, onRemoved, onOutOfDate, onAddExpense }) {
  const [isEditing, setIsEditing] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)
  // { error, context }: a problem that isn't only about the typed value. The context
  // ("not saved" or "not changed") is fixed when the save fails, so it doesn't change
  // if the list reloads underneath it.
  const [formError, setFormError] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const { showToast } = useToast()

  // The row's first button (Set limit, or Edit) gets focus back when the form closes,
  // and after a remove.
  const primaryRef = useRef(null)
  const removeRef = useRef(null)
  const savingRef = useRef(false)
  // Where focus should go once the next render is on screen. A new object each time,
  // so asking for the same place twice still moves focus.
  const [focusRequest, setFocusRequest] = useState(null)
  const isMountedRef = useIsMountedRef()
  const fieldId = useId()

  useEffect(() => {
    if (focusRequest?.to === 'primary') primaryRef.current?.focus()
  }, [focusRequest])

  function openForm() {
    setFormError(null)
    setIsEditing(true)
  }

  function closeForm(text = '') {
    setIsEditing(false)
    setFormError(null)
    if (text) showToast(text)
    setFocusRequest({ to: 'primary' })
  }

  async function handleSubmit(event, form) {
    event.preventDefault()
    if (savingRef.current) return

    setFormError(null)
    if (!form.validateAll()) return
    const { cents } = parseLimitToCents(form.values.limit)

    savingRef.current = true
    setIsSaving(true)
    let saved = null
    let failure = null
    try {
      saved = budget
        ? await updateBudget(budget.id, { limit_cents: cents })
        : await createBudget({ category, limit_cents: cents })
    } catch (err) {
      failure = err
    }
    savingRef.current = false
    if (!isMountedRef.current) return
    setIsSaving(false)

    if (!failure) {
      onSaved(saved)
      closeForm(`${category} limit saved: ${formatCents(saved.limit_cents)} a month.`)
      return
    }
    // The form stays open with the typed limit.
    handleSaveError(failure, form)
  }

  function handleSaveError(err, form) {
    const context = budget ? 'The limit was not changed.' : 'The limit was not saved.'
    if (err?.kind === 'validation') {
      const { fieldErrors, hasOtherErrors } = mapApiFieldErrors(err.fieldErrors, { limit_cents: 'limit' })
      form.showErrors(fieldErrors)
      if (hasOtherErrors || !fieldErrors.limit) setFormError({ error: err, context })
      return
    }
    if (err?.kind === 'not_found') {
      // Removed somewhere else (another tab) while this form was open.
      onRemoved(category)
      onOutOfDate()
      closeForm(`That ${category} limit no longer exists, so it was removed from the list.`)
      return
    }
    if (err?.kind === 'conflict') {
      // Added somewhere else meanwhile. Load the list again so this row shows it; the
      // next Save then changes that limit instead.
      onOutOfDate()
      setFormError({
        error: { kind: 'conflict', message: `You already have a ${category} limit. Save again to change it.` },
        context,
      })
      return
    }
    if (!err?.kind) console.error(err)
    setFormError({ error: err, context })
  }

  function handleKeyDown(event) {
    if (event.key === 'Escape' && !isSaving) {
      event.stopPropagation()
      closeForm()
    }
  }

  function handleRemoved(text) {
    setIsRemoving(false)
    onRemoved(category)
    showToast(text)
  }

  const progress = budget && spending?.limit_cents === budget.limit_cents ? spending : null

  let limitText = 'No limit set'
  if (progress) limitText = `${formatCents(progress.spent_cents)} of ${formatCents(progress.limit_cents)}`
  else if (budget) limitText = `${formatCents(budget.limit_cents)} a month`

  return (
    <li className="budget-row">
      <div className="budget-row__summary">
        <h2 className="budget-row__name">
          <CategoryLabel category={category} />
        </h2>
        <p className={`budget-row__limit tabular${budget ? '' : ' budget-row__limit--none'}`}>{limitText}</p>
      </div>

      {progress && <BudgetProgress category={category} spending={progress} />}

      {!isEditing && (
        <div className="budget-row__actions">
          {budget ? (
            <>
              <Button ref={primaryRef} size="sm" onClick={openForm} aria-label={`Edit ${category} limit`}>
                Edit
              </Button>
              <Button
                ref={removeRef}
                variant="ghost"
                size="sm"
                onClick={() => setIsRemoving(true)}
                aria-label={`Remove ${category} limit`}
              >
                Remove
              </Button>
              {/* Last, so Edit stays first: when the limit is removed, React turns that same
                  button into Set limit, which is where focus goes back to. */}
              {onAddExpense && (
                <Button
                  size="sm"
                  icon={Plus}
                  aria-haspopup="dialog"
                  onClick={(event) => onAddExpense(category, event.currentTarget)}
                  aria-label={`Add expense to ${category}`}
                >
                  Add expense
                </Button>
              )}
            </>
          ) : (
            <Button ref={primaryRef} size="sm" onClick={openForm} aria-label={`Set limit for ${category}`}>
              Set limit
            </Button>
          )}
        </div>
      )}

      {isEditing && (
        <LimitForm
          category={category}
          fieldId={fieldId}
          startValue={budget ? centsToDollarString(budget.limit_cents) : ''}
          formError={formError}
          isSaving={isSaving}
          onSubmit={handleSubmit}
          onKeyDown={handleKeyDown}
          onCancel={() => closeForm()}
        />
      )}

      {isRemoving && budget && (
        <RemoveBudgetDialog
          budget={budget}
          onRemoved={() => handleRemoved(`${category} limit removed.`)}
          onNotFound={() => {
            onOutOfDate()
            handleRemoved(`That ${category} limit was already removed.`)
          }}
          onClose={() => setIsRemoving(false)}
          returnFocusRef={removeRef}
          fallbackFocusRef={primaryRef}
        />
      )}
    </li>
  )
}

// The limit's form, shown in the row. Mounted fresh each time it opens, so it starts from
// the saved limit with no errors, and focuses its input.
function LimitForm({ category, fieldId, startValue, formError, isSaving, onSubmit, onKeyDown, onCancel }) {
  const form = useFormFields({ initialValues: { limit: startValue }, fields: FIELDS, validate: validateLimit })
  const { errors, fieldProps } = form
  const inputRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  return (
    <form className="budget-row__form" onSubmit={(event) => onSubmit(event, form)} onKeyDown={onKeyDown} noValidate>
      <Field id={fieldId} label={`Monthly limit for ${category} ($)`} hint="For example 500.00" error={errors.limit}>
        {(controlProps) => (
          <Input
            {...controlProps}
            {...fieldProps('limit', (element) => {
              inputRef.current = element
            })}
            className="tabular"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            placeholder="0.00"
          />
        )}
      </Field>
      {formError && <ErrorAlert error={formError.error} context={formError.context} />}
      <div className="budget-row__buttons">
        <Button type="submit" variant="primary" disabled={isSaving}>
          {isSaving ? 'Saving…' : 'Save limit'}
        </Button>
        <Button onClick={onCancel} disabled={isSaving}>
          Cancel
        </Button>
      </div>
    </form>
  )
}

// The bar and the figures under it. The text says everything the bar shows, so its
// length and colour are never the only signal. The status (US-39, US-40) colours the
// bar and adds a label.
function BudgetProgress({ category, spending }) {
  const { percent_used: percent, remaining_cents: remaining, status } = spending
  const left = remainingText(remaining)
  const alert = budgetAlert(status)

  return (
    <div className="budget-row__progress">
      <ProgressBar value={percent} label={`${category} spending`} valueText={`${percent}% used, ${left}`} tone={alert.tone} />
      <p className="budget-row__figures tabular">
        <span>{percent}% used</span>
        {alert.label && (
          <span className={`budget-row__alert budget-row__alert--${alert.tone}`}>{alert.label}</span>
        )}
        <span className="budget-row__remaining">{left}</span>
      </p>
    </div>
  )
}
