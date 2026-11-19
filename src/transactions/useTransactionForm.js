// State and submit logic shared by the transaction forms. The form component only
// renders; this hook owns the values, validation, the API call and its outcome.
// Validation follows the shared pattern (../validation/useFormFields.js): each field is
// checked on blur and on submit, nothing is sent until every field is valid, and focus
// goes to the first invalid field.

import { useRef, useState } from 'react'
import { createTransaction, updateTransaction } from '../api/transactions'
import { useTransactionsSync } from '../context/useTransactionsSync'
import { useIsMountedRef } from '../hooks/useIsMountedRef'
import { NOT_SAVED_CHECK_DETAILS } from '../validation/apiErrors'
import { useFormFields } from '../validation/useFormFields'
import { TRANSACTION_TYPES } from './constants'
import { todayLocal } from './dates'
import { centsToDollarString, formatCents } from './money'
import { mapApiErrors, toTransactionPayload, validateField } from './validation'

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
 * @param {{ amount?: string, date?: string, category?: string, description?: string }} [options.initialValues]
 *   When adding, values to start with instead of the empty ones, e.g. { category: 'Food' }.
 *   Ignored when editing.
 * @param {(transaction: object, message?: string) => void} [options.onSaved] Called after a
 *   successful save. After adding, it also gets a message to show, e.g. "Expense of $12.50 saved.".
 * @param {() => void} [options.onNotFound] Called, instead of showing an error, when
 *   the transaction being edited no longer exists.
 * @param {(isSubmitting: boolean) => void} [options.onSubmittingChange] Called when a
 *   save starts and ends, e.g. so a dialog can't be closed part-way through.
 * @param {{ current: HTMLElement|null }} [options.firstFieldRef] Set to the form's first
 *   input (Amount), so the page can move focus there.
 */
export function useTransactionForm({
  type,
  transaction,
  initialValues,
  onSaved,
  onNotFound,
  onSubmittingChange,
  firstFieldRef,
}) {
  const { label, fields } = TRANSACTION_TYPES[type]
  const { notifyTransactionsChanged } = useTransactionsSync()
  // Only an expense shows a category, and there it's required.
  const options = { categoryRequired: fields.includes('category'), fields }
  const form = useFormFields({
    initialValues: () => (transaction ? valuesFrom(transaction) : { ...emptyValues(), ...initialValues }),
    fields,
    validate: (field, values) => validateField(field, values, options),
  })
  const { values, errors, validateAll, showErrors, clearErrors } = form
  // A problem that isn't about one field: an ApiError, { kind, message }, or a bug.
  const [formError, setFormError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Switching between expense and income keeps the typed values but drops every
  // error, which belonged to the other type. Done during render (not in an effect) so
  // the old messages are never shown under the new heading.
  const [shownType, setShownType] = useState(type)
  if (type !== shownType) {
    setShownType(type)
    clearErrors()
    setFormError(null)
  }

  // State updates aren't immediate, so a ref blocks a second submit fired before
  // the button re-renders as disabled (e.g. pressing Enter twice quickly).
  const submittingRef = useRef(false)
  const isMountedRef = useIsMountedRef()

  async function handleSubmit(event) {
    event.preventDefault()
    if (submittingRef.current) return

    setFormError(null)
    if (!validateAll()) return

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
    // Budgets and the summary load again (US-38), even if this form has closed meanwhile:
    // the transaction was saved. A 404 on edit is reported by the page (handleGone).
    if (!failure) notifyTransactionsChanged()
    // The form may have closed while the request was out (e.g. the user signed out).
    if (!isMountedRef.current) return
    setIsSubmitting(false)
    onSubmittingChange?.(false)

    // On failure the form stays open with everything the user typed.
    if (failure) handleApiError(failure)
    else if (transaction) onSaved?.(saved)
    else onSaved?.(saved, `${label} of ${formatCents(payload.amount_cents)} saved.`)
  }

  function handleApiError(err) {
    if (err?.kind === 'not_found' && onNotFound) {
      onNotFound()
      return
    }
    if (err?.kind === 'validation') {
      const { fieldErrors, hasOtherErrors } = mapApiErrors(err.fieldErrors, fields)
      showErrors(fieldErrors)
      if (hasOtherErrors || Object.keys(fieldErrors).length === 0) {
        setFormError({ kind: 'validation', message: NOT_SAVED_CHECK_DETAILS })
      }
      return
    }
    // ApiError messages are written for users; anything else is a bug, which ErrorAlert
    // shows with its generic message.
    if (!err?.kind) console.error(err)
    setFormError(err)
  }

  /** Props to spread onto a field's input or select. */
  function fieldProps(field) {
    return form.fieldProps(field, (element) => {
      if (firstFieldRef && field === fields[0]) firstFieldRef.current = element
    })
  }

  return { values, errors, formError, isSubmitting, fieldProps, handleSubmit }
}
