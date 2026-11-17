// The inline validation every form shares (US-52, US-58): values, one error per field,
// and when each error appears.
//
// - On blur: a field the user has changed is checked when they leave it. Tabbing past
//   an untouched field says nothing, so nobody is told off before they start.
// - On submit: every field is checked, the request is blocked if any is invalid, and
//   focus goes to the first invalid field in on-screen order.
// - After that: a field is checked again as it's typed in, so its error goes away as
//   soon as it's fixed (and comes back if it's broken again).
//
// The form renders each error with the Field primitive, which sets aria-invalid and
// points aria-describedby at the message.

import { useRef, useState } from 'react'

/**
 * @param {object} options
 * @param {Record<string, string> | (() => Record<string, string>)} options.initialValues
 * @param {readonly string[]} options.fields The fields the form shows, in on-screen order.
 * @param {(field: string, values: Record<string, string>) => string|null} options.validate
 *   Checks one field against all the values; returns a message or null.
 */
export function useFormFields({ initialValues, fields, validate }) {
  const [values, setValues] = useState(initialValues)
  const [errors, setErrors] = useState({})
  const [hasSubmitted, setHasSubmitted] = useState(false)
  // What each field started as, to tell whether the user has changed it.
  const startValuesRef = useRef(values)
  const inputRefs = useRef({})

  function focusField(field) {
    inputRefs.current[field]?.focus()
  }

  function focusFirst(fieldErrors) {
    const first = fields.find((field) => fieldErrors[field])
    if (first) focusField(first)
  }

  function handleChange(event) {
    const { name, value } = event.target
    const nextValues = { ...values, [name]: value }
    setValues(nextValues)
    if (hasSubmitted || errors[name]) {
      setErrors((current) => ({ ...current, [name]: validate(name, nextValues) }))
    }
  }

  function handleBlur(event) {
    const { name } = event.target
    if (!fields.includes(name)) return
    if (!hasSubmitted && values[name] === startValuesRef.current[name]) return
    setErrors((current) => ({ ...current, [name]: validate(name, values) }))
  }

  /**
   * Checks every field, shows the errors and focuses the first invalid one.
   *
   * @returns {boolean} True if the form is valid and may be sent.
   */
  function validateAll() {
    setHasSubmitted(true)
    const fieldErrors = {}
    for (const field of fields) {
      const message = validate(field, values)
      if (message) fieldErrors[field] = message
    }
    setErrors(fieldErrors)
    focusFirst(fieldErrors)
    return Object.keys(fieldErrors).length === 0
  }

  /** Shows errors found elsewhere (the API's 400) under their fields, and focuses the first. */
  function showErrors(fieldErrors) {
    setErrors(fieldErrors)
    focusFirst(fieldErrors)
  }

  /** Drops every error and goes back to checking on blur only, e.g. when the form changes shape. */
  function clearErrors() {
    setErrors({})
    setHasSubmitted(false)
  }

  /**
   * Props to spread onto a field's input or select.
   *
   * @param {string} field
   * @param {(element: HTMLElement|null) => void} [extraRef] Also called with the element.
   */
  function fieldProps(field, extraRef) {
    return {
      name: field,
      value: values[field],
      onChange: handleChange,
      onBlur: handleBlur,
      ref: (element) => {
        inputRefs.current[field] = element
        extraRef?.(element)
      },
    }
  }

  return { values, errors, fieldProps, validateAll, showErrors, clearErrors, focusField }
}
