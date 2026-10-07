import SessionEndedMessage from './SessionEndedMessage'
import './ErrorAlert.css'

const FALLBACK_MESSAGE = 'Something went wrong. Please try again.'

/**
 * Shows a failed request to the user, announced by screen readers. A 401 gets the
 * "Sign in again" link; an ApiError shows its plain-language message; anything else
 * (a bug) gets a generic message, so raw error text never reaches the screen.
 *
 * @param {object} props
 * @param {import('../api/client').ApiError|Error} props.error
 * @param {string} [props.context] What failed, shown first, e.g. "The transaction was not deleted."
 */
export default function ErrorAlert({ error, context }) {
  if (error?.kind === 'unauthorized') {
    return (
      <div className="error-alert" role="alert">
        <SessionEndedMessage />
      </div>
    )
  }

  const message = error?.kind ? error.message : FALLBACK_MESSAGE
  return (
    <div className="error-alert" role="alert">
      <p>{context ? `${context} ${message}` : message}</p>
    </div>
  )
}
