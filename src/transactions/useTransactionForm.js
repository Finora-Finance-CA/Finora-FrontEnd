// State and submit logic shared by the transaction forms. The form component only
// renders; this hook owns the values, validation, the API call and its outcome.

import { useRef, useState } from 'react'
import { createTransaction } from '../api/transactions'
import { todayLocal } from './dates'
import { formatCents } from './money'
import { FIELD_NAMES, mapApiErrors, toTransactionPayload, validateField, validateTransactionForm } from './validation'

function emptyValues() {
  return { amount: '', date: todayLocal(), category: '', description: '' }
}

/**
 * @param {object} options
 * @param {'income'|'expense'} options.type Sent as the transaction's `type`.
 * @param {boolean} options.categoryRequired Whether a category must be chosen.
 * @param {string} options.successLabel Used in the confirmation, e.g. "Expense".
 * @param {(transaction: object) => void} [options.onSaved] Called after a successful save.
 */
export function useTransactionForm({ type, categoryRequired, successLabel, onSaved }) {
  const [values, setValues] = useState(emptyValues)
  const [errors, setErrors] = useState({})
  // A problem that isn't about one field: { kind, message }.
  const [formError, setFormError] = useState(null)
  const [successMessage, setSuccessMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false)

  // State updates aren't immediate, so a ref blocks a second submit fired before
  // the button re-renders as disabled (e.g. pressing Enter twice quickly).
  const submittingRef = useRef(false)
  const inputRefs = useRef({})
  const options = { categoryRequired }

  function focusField(field) {
    inputRefs.current[field]?.focus()
  }

  function focusFirstError(fieldErrors) {
    const first = FIELD_NAMES.find((field) => fieldErrors[field])
    if (first) focusField(first)
  }

  function handleChange(event) {
    const { name, value } = event.target
    const nextValues = { ...values, [name]: value }
    setValues(nextValues)

    // After a submit attempt, re-check a field as the user types so its error
    // disappears once fixed (and comes back if they break it again). Before that,
    // stay quiet so people aren't told off mid-typing.
    if (hasAttemptedSubmit || errors[name]) {
      setErrors((current) => ({ ...current, [name]: validateField(name, nextValues, options) }))
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (submittingRef.current) return

    setSuccessMessage('')
    setFormError(null)
    setHasAttemptedSubmit(true)

    const fieldErrors = validateTransactionForm(values, options)
    setErrors(fieldErrors)
    if (Object.keys(fieldErrors).length > 0) {
      focusFirstError(fieldErrors)
      return
    }

    const payload = toTransactionPayload(values, type)
    submittingRef.current = true
    setIsSubmitting(true)

    try {
      const transaction = await createTransaction(payload)
      setValues(emptyValues())
      setErrors({})
      setHasAttemptedSubmit(false)
      setSuccessMessage(`${successLabel} of ${formatCents(payload.amount_cents)} saved.`)
      focusField('amount')
      onSaved?.(transaction)
    } catch (err) {
      handleApiError(err)
    } finally {
      submittingRef.current = false
      setIsSubmitting(false)
    }
  }

  function handleApiError(err) {
    if (err?.kind === 'validation') {
      const { fieldErrors, otherErrors } = mapApiErrors(err.fieldErrors)
      setErrors(fieldErrors)
      if (otherErrors.length > 0 || Object.keys(fieldErrors).length === 0) {
        setFormError({ kind: 'validation', message: [err.message, ...otherErrors].join(' ') })
      }
      focusFirstError(fieldErrors)
      return
    }
    // ApiError messages are written for users; anything else is a bug, so stay generic.
    if (!err?.kind) console.error(err)
    setFormError({
      kind: err?.kind ?? 'server',
      message: err?.kind ? err.message : 'Something went wrong. Please try again.',
    })
  }

  /** Props to spread onto a field's input or select. */
  function fieldProps(field) {
    return {
      name: field,
      value: values[field],
      onChange: handleChange,
      ref: (element) => {
        inputRefs.current[field] = element
      },
    }
  }

  return { values, errors, formError, successMessage, isSubmitting, fieldProps, handleSubmit }
}
