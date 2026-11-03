import { Plus } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { createBudget, updateBudget } from '../api/budgets'
import ErrorAlert from '../components/ErrorAlert'
import Button from '../components/ui/Button'
import Field from '../components/ui/Field'
import Input from '../components/ui/Input'
import ProgressBar from '../components/ui/ProgressBar'
import { useIsMountedRef } from '../hooks/useIsMountedRef'
import CategoryLabel from '../transactions/CategoryLabel'
import { centsToDollarString, formatCents } from '../transactions/money'
import { parseLimitToCents } from './limits'
import RemoveBudgetDialog from './RemoveBudgetDialog'
import './BudgetRow.css'

// The API names the field limit_cents; people see "Limit".
function humanizeLimitError(message) {
  const text = String(message)
  return text.startsWith('limit_cents') ? `Limit${text.slice('limit_cents'.length)}` : text
}

// "$95.13 left", or "Over by $23.15" when the limit has been passed (US-37).
function remainingText(remainingCents) {
  return remainingCents < 0 ? `Over by ${formatCents(-remainingCents)}` : `${formatCents(remainingCents)} left`
}

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
  const [value, setValue] = useState('')
  const [error, setError] = useState(null)
  // { error, context }: a problem that isn't only about the typed value. The context
  // ("not saved" or "not changed") is fixed when the save fails, so it doesn't change
  // if the list reloads underneath it.
  const [formError, setFormError] = useState(null)
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState('')

  // The row's first button (Set limit, or Edit) gets focus back when the form closes,
  // and after a remove.
  const primaryRef = useRef(null)
  const removeRef = useRef(null)
  const inputRef = useRef(null)
  const savingRef = useRef(false)
  // Where focus should go once the next render is on screen. A new object each time,
  // so asking for the same place twice still moves focus.
  const [focusRequest, setFocusRequest] = useState(null)
  const isMountedRef = useIsMountedRef()
  const fieldId = useId()

  useEffect(() => {
    if (focusRequest?.to === 'input') inputRef.current?.focus()
    if (focusRequest?.to === 'primary') primaryRef.current?.focus()
  }, [focusRequest])

  function openForm() {
    setValue(budget ? centsToDollarString(budget.limit_cents) : '')
    setError(null)
    setFormError(null)
    setHasAttemptedSubmit(false)
    setMessage('')
    setIsEditing(true)
    setFocusRequest({ to: 'input' })
  }

  function closeForm(text = '') {
    setIsEditing(false)
    setError(null)
    setFormError(null)
    setMessage(text)
    setFocusRequest({ to: 'primary' })
  }

  function handleChange(event) {
    setValue(event.target.value)
    if (hasAttemptedSubmit || error) setError(parseLimitToCents(event.target.value).error)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (savingRef.current) return

    setHasAttemptedSubmit(true)
    setFormError(null)
    const { cents, error: limitError } = parseLimitToCents(value)
    setError(limitError)
    if (limitError) {
      inputRef.current?.focus()
      return
    }

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
    handleSaveError(failure)
  }

  function handleSaveError(err) {
    const context = budget ? 'The limit was not changed.' : 'The limit was not saved.'
    if (err?.kind === 'validation') {
      const fieldErrors = err.fieldErrors ?? {}
      if (fieldErrors.limit_cents) {
        setError(humanizeLimitError(fieldErrors.limit_cents))
        inputRef.current?.focus()
      }
      const others = Object.entries(fieldErrors).filter(([field]) => field !== 'limit_cents')
      if (others.length > 0 || !fieldErrors.limit_cents) setFormError({ error: err, context })
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
    setMessage(text)
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
                onClick={() => {
                  setMessage('')
                  setIsRemoving(true)
                }}
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
                  onClick={(event) => {
                    setMessage('')
                    onAddExpense(category, event.currentTarget)
                  }}
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
        <form className="budget-row__form" onSubmit={handleSubmit} onKeyDown={handleKeyDown} noValidate>
          <Field id={fieldId} label={`Monthly limit for ${category} ($)`} hint="For example 500.00" error={error}>
            {(controlProps) => (
              <Input
                {...controlProps}
                ref={inputRef}
                className="tabular"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                placeholder="0.00"
                value={value}
                onChange={handleChange}
              />
            )}
          </Field>
          {formError && <ErrorAlert error={formError.error} context={formError.context} />}
          <div className="budget-row__buttons">
            <Button type="submit" variant="primary" disabled={isSaving}>
              {isSaving ? 'Saving…' : 'Save limit'}
            </Button>
            <Button onClick={() => closeForm()} disabled={isSaving}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      <p className="budget-row__message" role="status">
        {message}
      </p>

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

// The bar and the figures under it. The text says everything the bar shows, so its
// length and colour are never the only signal.
function BudgetProgress({ category, spending }) {
  const { percent_used: percent, remaining_cents: remaining } = spending
  const left = remainingText(remaining)

  return (
    <div className="budget-row__progress">
      {/* Always the default tone for now. US-39/US-40 map spending.status to a tone
          here: "warning" to tone="warning", "over" to tone="danger". */}
      <ProgressBar value={percent} label={`${category} spending`} valueText={`${percent}% used, ${left}`} tone="default" />
      <p className="budget-row__figures tabular">
        <span>{percent}% used</span>
        <span className="budget-row__remaining">{left}</span>
      </p>
    </div>
  )
}

