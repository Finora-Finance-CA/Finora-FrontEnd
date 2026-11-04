import { useEffect, useRef, useState } from 'react'
import {
  createGoal,
  deleteGoal,
  listGoals,
  updateGoal,
} from '../api/goals'
import ErrorAlert from '../components/ErrorAlert'
import Button from '../components/ui/Button'
import Dialog from '../components/ui/Dialog'
import Input from '../components/ui/Input'
import {
  centsToDollarString,
  formatCents,
  parseDollarsToCents,
} from '../transactions/money'
import './GoalsPage.css'
import ContributionDialog from './ContributionDialog'
import ProgressBar from '../components/ui/ProgressBar'

export default function GoalsPage() {
  const [goals, setGoals] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [reload, setReload] = useState(0)
  const [dialog, setDialog] = useState(null)
  const [message, setMessage] = useState('')
  const addButtonRef = useRef(null)
  const triggerRef = useRef(null)

  useEffect(() => {
    let active = true

    listGoals()
      .then((items) => {
        if (active) setGoals(items)
      })
      .catch((error) => {
        if (active) setLoadError(error)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [reload])

  function openDialog(type, goal, trigger) {
    triggerRef.current = trigger
    setMessage('')
    setDialog({ type, goal })
  }

  function handleSaved(goal) {
    setGoals((current) => {
      const exists = current.some((item) => item.id === goal.id)
      return exists
        ? current.map((item) => item.id === goal.id ? goal : item)
        : [goal, ...current]
    })
    setMessage(
        dialog.type === 'create'
            ? 'Goal created.'
            : dialog.type === 'contribute'
            ? 'Contribution added.'
            : 'Goal updated.'
    )
    setDialog(null)
  }

  function handleRemoved(id, alreadyDeleted = false) {
    setGoals((current) => current.filter((goal) => goal.id !== id))
    setMessage(alreadyDeleted ? 'This goal was already deleted.' : 'Goal deleted.')
    setDialog(null)
  }

  return (
    <section className="goals-page" aria-labelledby="goals-heading">
      <header className="goals-page__header">
        <div>
          <h1 id="goals-heading">Savings goals</h1>
          <p>Set a target for something you want to save toward.</p>
        </div>

        <Button
          ref={addButtonRef}
          variant="primary"
          disabled={loading || Boolean(loadError)}
          onClick={(event) => openDialog('create', null, event.currentTarget)}
        >
          Add goal
        </Button>
      </header>

      <p role="status">{message}</p>

      {loading && <p role="status">Loading goals…</p>}

      {loadError && (
        <div>
          <ErrorAlert error={loadError} context="Goals could not be loaded." />
          <Button
                onClick={() => {
                    setLoading(true)
                    setLoadError(null)
                    setReload((value) => value + 1)
                }}
                >
                Try again
        </Button>
        </div>
      )}

      {!loading && !loadError && goals.length === 0 && (
        <p>No savings goals yet. Add your first goal to get started.</p>
      )}

      {!loading && !loadError && goals.length > 0 && (
        <ul className="goals-page__list">
          {goals.map((goal) => (
            <li key={goal.id} className="goal-card">
              <h2>{goal.name}</h2>
                <GoalProgress goal={goal} />
              <p>
                {goal.target_date
                  ? <>Target date: <time dateTime={goal.target_date}>{goal.target_date}</time></>
                  : 'No target date'}
              </p>

              <div className="goals-page__actions">
                <Button
                    aria-label={`Add contribution to ${goal.name}`}
                    onClick={(event) => openDialog('contribute', goal, event.currentTarget)}
                    >
                    Add contribution
                 </Button>

                <Button
                  aria-label={`Edit ${goal.name}`}
                  onClick={(event) => openDialog('edit', goal, event.currentTarget)}
                >
                  Edit
                </Button>
                <Button
                  aria-label={`Delete ${goal.name}`}
                  onClick={(event) => openDialog('delete', goal, event.currentTarget)}
                >
                  Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {dialog && ['create', 'edit'].includes(dialog.type) && (
        <GoalFormDialog
          goal={dialog.goal}
          onClose={() => setDialog(null)}
          onSaved={handleSaved}
          onMissing={handleRemoved}
          returnFocusRef={triggerRef}
          fallbackFocusRef={addButtonRef}
        />
      )}

      {dialog?.type === 'delete' && (
        <DeleteGoalDialog
          goal={dialog.goal}
          onClose={() => setDialog(null)}
          onRemoved={handleRemoved}
          returnFocusRef={triggerRef}
          fallbackFocusRef={addButtonRef}
        />
      )}

      {dialog?.type === 'contribute' && (
        <ContributionDialog
            goal={dialog.goal}
            onClose={() => setDialog(null)}
            onSaved={handleSaved}
            onMissing={handleRemoved}
            returnFocusRef={triggerRef}
            fallbackFocusRef={addButtonRef}
        />
        )}
    </section>
  )
}

function GoalFormDialog({
  goal,
  onClose,
  onSaved,
  onMissing,
  returnFocusRef,
  fallbackFocusRef,
}) {
  const [name, setName] = useState(goal?.name ?? '')
  const [amount, setAmount] = useState(
    goal ? centsToDollarString(goal.target_cents) : ''
  )
  const [date, setDate] = useState(goal?.target_date ?? '')
  const [errors, setErrors] = useState({})
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const pendingRef = useRef(false)
  const nameRef = useRef(null)
  const amountRef = useRef(null)
  const dateRef = useRef(null)

  async function handleSubmit(event) {
    event.preventDefault()
    if (pendingRef.current) return

    const nextErrors = {}
    const parsed = parseDollarsToCents(amount)

    if (!name.trim()) nextErrors.name = 'Enter a goal name.'
    else if ([...name.trim()].length > 60) {
      nextErrors.name = 'Use at most 60 characters.'
    }

    if (parsed.error) nextErrors.target_cents = parsed.error

    if (date) {
      const candidate = new Date(`${date}T00:00:00Z`)
      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
        Number.isNaN(candidate.getTime()) ||
        candidate.toISOString().slice(0, 10) !== date ||
        date < '1900-01-01'
      ) {
        nextErrors.target_date = 'Enter a valid date in 1900 or later.'
      }
    }

    setErrors(nextErrors)
    setError(null)

    if (Object.keys(nextErrors).length) {
      if (nextErrors.name) nameRef.current?.focus()
      else if (nextErrors.target_cents) amountRef.current?.focus()
      else dateRef.current?.focus()
      return
    }

    const payload = {
      name: name.trim(),
      target_cents: parsed.cents,
      target_date: date || null,
    }

    pendingRef.current = true
    setSaving(true)

    try {
      const saved = goal
        ? await updateGoal(goal.id, payload)
        : await createGoal(payload)
      onSaved(saved)
    } catch (err) {
      if (err.kind === 'not_found' && goal) {
        onMissing(goal.id, true)
      } else {
        setError(err)
        if (err.kind === 'validation') setErrors(err.fieldErrors)
      }
    } finally {
      pendingRef.current = false
      setSaving(false)
    }
  }

  return (
    <Dialog
      title={goal ? 'Edit savings goal' : 'Create savings goal'}
      variant="drawer"
      onClose={onClose}
      canClose={!saving}
      initialFocusRef={nameRef}
      returnFocusRef={returnFocusRef}
      fallbackFocusRef={fallbackFocusRef}
    >
      <form className="goal-form" onSubmit={handleSubmit} noValidate>
        {error && <ErrorAlert error={error} />}

        <div>
          <label htmlFor="goal-name">Name</label>
          <Input
            ref={nameRef}
            id="goal-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            disabled={saving}
            required
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? 'goal-name-error' : undefined}
          />
          {errors.name && (
            <p id="goal-name-error" role="alert">{errors.name}</p>
          )}
        </div>

        <div>
          <label htmlFor="goal-target">Target amount (CAD)</label>
          <Input
            ref={amountRef}
            id="goal-target"
            inputMode="decimal"
            placeholder="5000.00"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            disabled={saving}
            required
            aria-invalid={Boolean(errors.target_cents)}
            aria-describedby={errors.target_cents ? 'goal-target-error' : undefined}
          />
          {errors.target_cents && (
            <p id="goal-target-error" role="alert">{errors.target_cents}</p>
          )}
        </div>

        <div>
          <label htmlFor="goal-date">Target date (optional)</label>
          <Input
            ref={dateRef}
            id="goal-date"
            type="date"
            min="1900-01-01"
            max="9999-12-31"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            disabled={saving}
            aria-invalid={Boolean(errors.target_date)}
            aria-describedby={errors.target_date ? 'goal-date-error' : undefined}
          />
          {errors.target_date && (
            <p id="goal-date-error" role="alert">{errors.target_date}</p>
          )}
        </div>

        <div className="goals-page__actions">
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? 'Saving…' : goal ? 'Save changes' : 'Create goal'}
          </Button>
          <Button onClick={onClose} disabled={saving}>Cancel</Button>
        </div>
      </form>
    </Dialog>
  )
}

function DeleteGoalDialog({
  goal,
  onClose,
  onRemoved,
  returnFocusRef,
  fallbackFocusRef,
}) {
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState(null)
  const pendingRef = useRef(false)
  const cancelRef = useRef(null)

  async function handleDelete() {
    if (pendingRef.current) return
    pendingRef.current = true
    setDeleting(true)
    setError(null)

    try {
      await deleteGoal(goal.id)
      onRemoved(goal.id)
    } catch (err) {
      if (err.kind === 'not_found') onRemoved(goal.id, true)
      else setError(err)
    } finally {
      pendingRef.current = false
      setDeleting(false)
    }
  }

  return (
    <Dialog
      title="Delete savings goal?"
      onClose={onClose}
      canClose={!deleting}
      initialFocusRef={cancelRef}
      returnFocusRef={returnFocusRef}
      fallbackFocusRef={fallbackFocusRef}
    >
      <p>
        Delete “{goal.name}” with a target of {formatCents(goal.target_cents)}?
        This cannot be undone.
      </p>

      {error && <ErrorAlert error={error} />}

      <div className="goals-page__actions">
        <Button ref={cancelRef} onClick={onClose} disabled={deleting}>
          Cancel
        </Button>
        <Button variant="danger" onClick={handleDelete} disabled={deleting}>
          {deleting ? 'Deleting…' : 'Delete goal'}
        </Button>
      </div>
    </Dialog>
  )
}

function GoalProgress({ goal }) {
  const saved = goal.saved_cents
  const target = goal.target_cents

  // Round down so an unfinished goal doesn't display 100%.
  const percent = target > 0
    ? Math.floor((saved / target) * 100)
    : 0

  return (
    <div className="goal-progress">
      <p>
        Saved: {formatCents(saved)} / Target: {formatCents(target)}
      </p>

      <ProgressBar
        value={percent}
        label={`${goal.name} savings progress`}
        valueText={`${percent}% complete. ${formatCents(saved)} saved toward ${formatCents(target)}.`}
      />

      <p>
        {percent}% complete
        {saved >= target && target > 0 ? ' — Goal reached!' : ''}
      </p>
    </div>
  )
}