// State and submit logic shared by the transaction forms. The form component only
// renders; this hook owns the values, validation, the API call and its outcome.

import { useRef, useState } from 'react'
import { createTransaction, updateTransaction } from '../api/transactions'
import { useIsMountedRef } from '../hooks/useIsMountedRef'
import { TRANSACTION_TYPES } from './constants'
import { todayLocal } from './dates'
import { centsToDollarString, formatCents } from './money'
import { mapApiErrors, toTransactionPayload, validateField, validateTransactionForm } from './validation'

function emptyValues() {
  return { amount: '', date: todayLocal(), category: '', description: '' }
}

// A saved transaction as the inputs show it.
function valuesFrom(transaction) {
  return {
    amount: centsToDollarString(transaction.amount_cents),
    date: transaction.date,
    category: transaction.category ?? '',
    description: transaction.description ?? '',
  }
}

/**
 * @param {object} options
 * @param {'income'|'expense'} options.type Sent as the transaction's `type`. The
 *   fields, labels and rules come from TRANSACTION_TYPES[type].
 * @param {object} [options.transaction] The saved transaction to edit. The form starts
 *   with its values and saving replaces it (PUT). Without it, saving adds a new one.
 * @param {(transaction: object) => void} [options.onSaved] Called after a successful save.
 * @param {() => void} [options.onNotFound] Called, instead of showing an error, when
 *   the transaction being edited no longer exists.
 * @param {(isSubmitting: boolean) => void} [options.onSubmittingChange] Called when a
 *   save starts and ends, e.g. so a dialog can't be closed part-way through.
 */
export function useTransactionForm({ type, transaction, onSaved, onNotFound, onSubmittingChange }) {
  const { label, fields } = TRANSACTION_TYPES[type]
  const [values, setValues] = useState(() => (transaction ? valuesFrom(transaction) : emptyValues()))
  const [errors, setErrors] = useState({})
  // A problem that isn't about one field: { kind, message }.
  const [formError, setFormError] = useState(null)
  const [successMessage, setSuccessMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false)

  // Switching between expense and income keeps the typed values but drops every
  // error and confirmation, which belonged to the other type. Done during render
  // (not in an effect) so the old messages are never shown under the new heading.
  const [shownType, setShownType] = useState(type)
  if (type !== shownType) {
    setShownType(type)
    setErrors({})
    setFormError(null)
    setSuccessMessage('')
    setHasAttemptedSubmit(false)
  }

  // State updates aren't immediate, so a ref blocks a second submit fired before
  // the button re-renders as disabled (e.g. pressing Enter twice quickly).
  const submittingRef = useRef(false)
  const isMountedRef = useIsMountedRef()
  const inputRefs = useRef({})
  // Only an expense shows a category, and there it's required.
  const options = { categoryRequired: fields.includes('category'), fields }

  function focusField(field) {
    inputRefs.current[field]?.focus()
  }

  function focusFirstError(fieldErrors) {
    const first = fields.find((field) => fieldErrors[field])
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

    const payload = toTransactionPayload(values, type, fields)
    submittingRef.current = true
    setIsSubmitting(true)
    onSubmittingChange?.(true)

    let saved = null
    let failure = null
    try {
      saved = transaction ? await updateTransaction(transaction.id, payload) : await createTransaction(payload)
    } catch (err) {
      failure = err
    }

    submittingRef.current = false
    // The form may have closed while the request was out (e.g. the user signed out).
    if (!isMountedRef.current) return
    setIsSubmitting(false)
    onSubmittingChange?.(false)

    if (failure) handleApiError(failure)
    else if (transaction) onSaved?.(saved)
    else handleCreated(saved, payload)
  }

  function handleCreated(created, payload) {
    setValues(emptyValues())
    setErrors({})
    setHasAttemptedSubmit(false)
    setSuccessMessage(`${label} of ${formatCents(payload.amount_cents)} saved.`)
    focusField('amount')
    onSaved?.(created)
  }

  function handleApiError(err) {
    if (err?.kind === 'not_found' && onNotFound) {
      onNotFound()
      return
    }
    if (err?.kind === 'validation') {
      const { fieldErrors, otherErrors } = mapApiErrors(err.fieldErrors, fields)
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
