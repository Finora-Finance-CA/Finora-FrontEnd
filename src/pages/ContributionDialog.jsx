import { useRef, useState } from 'react'
import { addContribution } from '../api/goals'
import ErrorAlert from '../components/ErrorAlert'
import Button from '../components/ui/Button'
import Dialog from '../components/ui/Dialog'
import Input from '../components/ui/Input'
import { formatCents, parseDollarsToCents } from '../transactions/money'

export default function ContributionDialog({
  goal,
  onClose,
  onSaved,
  onMissing,
  returnFocusRef,
  fallbackFocusRef,
}) {
  const [amount, setAmount] = useState('')
  const [fieldError, setFieldError] = useState('')
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const pendingRef = useRef(false)
  const amountRef = useRef(null)

  async function handleSubmit(event) {
    event.preventDefault()
    if (pendingRef.current) return

    const parsed = parseDollarsToCents(amount)
    setError(null)
    setFieldError(parsed.error ?? '')

    if (parsed.error) {
      amountRef.current?.focus()
      return
    }

    pendingRef.current = true
    setSaving(true)

    try {
      const updated = await addContribution(goal.id, parsed.cents)
      onSaved(updated)
    } catch (err) {
      if (err.kind === 'not_found') {
        onMissing(goal.id, true)
      } else {
        setError(err)
        setFieldError(err.fieldErrors?.amount_cents ?? '')
      }
    } finally {
      pendingRef.current = false
      setSaving(false)
    }
  }

  return (
    <Dialog
      title="Add contribution"
      variant="drawer"
      onClose={onClose}
      canClose={!saving}
      initialFocusRef={amountRef}
      returnFocusRef={returnFocusRef}
      fallbackFocusRef={fallbackFocusRef}
    >
      <p>
        {goal.name}: currently saved {formatCents(goal.saved_cents)}.
      </p>

      <form className="goal-form" onSubmit={handleSubmit} noValidate>
        {error && <ErrorAlert error={error} />}

        <div>
          <label htmlFor="contribution-amount">Contribution amount (CAD)</label>
          <Input
            ref={amountRef}
            id="contribution-amount"
            inputMode="decimal"
            placeholder="25.00"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            disabled={saving}
            required
            aria-invalid={Boolean(fieldError)}
            aria-describedby={fieldError ? 'contribution-error' : undefined}
          />
          {fieldError && (
            <p id="contribution-error" role="alert">{fieldError}</p>
          )}
        </div>

        <div className="goals-page__actions">
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? 'Saving...' : 'Add contribution'}
          </Button>
          <Button onClick={onClose} disabled={saving}>
            Cancel
          </Button>
        </div>
      </form>
    </Dialog>
  )
}