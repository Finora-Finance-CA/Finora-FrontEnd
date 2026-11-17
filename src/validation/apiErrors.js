// Puts the API's 400 field errors ({ errors: { field: message } }) under the form fields
// they belong to. The API writes these messages for people (validation-rules.md), but
// anything that isn't a short, non-empty string is dropped, so raw or unexpected API
// text never reaches the screen.

const MAX_MESSAGE_LENGTH = 200

/** The message if it's safe to show, else null. */
export function readableMessage(message) {
  if (typeof message !== 'string') return null
  const text = message.trim()
  return text !== '' && text.length <= MAX_MESSAGE_LENGTH ? text : null
}

/**
 * @param {Record<string, unknown>|undefined} apiErrors From ApiError.fieldErrors.
 * @param {Record<string, string>} fieldMap API field name to form field name, for the
 *   fields the form shows, e.g. { amount_cents: 'amount', date: 'date' }.
 * @returns {{ fieldErrors: Record<string, string>, hasOtherErrors: boolean }}
 *   `hasOtherErrors` is true if some error has no field on the form to go under (or
 *   wasn't readable), so the form should say so in a general message.
 */
export function mapApiFieldErrors(apiErrors, fieldMap) {
  const fieldErrors = {}
  let hasOtherErrors = false
  for (const [apiField, message] of Object.entries(apiErrors ?? {})) {
    const field = fieldMap[apiField]
    const text = readableMessage(message)
    if (field && text) fieldErrors[field] = text
    else hasOtherErrors = true
  }
  return { fieldErrors, hasOtherErrors }
}

/** Shown above the buttons when the API rejected something the form can't point to. */
export const NOT_SAVED_CHECK_DETAILS = "This couldn't be saved. Check the details and try again."
