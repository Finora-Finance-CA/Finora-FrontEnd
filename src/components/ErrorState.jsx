import ErrorAlert from './ErrorAlert'
import Button from './ui/Button'
import Card from './ui/Card'
import EmptyState from './ui/EmptyState'

/**
 * What a page or panel shows when its data didn't load: a title, the plain-language
 * reason (ErrorAlert, announced) and Try again. A 401 gets the "Sign in again" link
 * instead of Try again, which wouldn't help.
 *
 * @param {object} props
 * @param {string} props.title e.g. "Goals didn't load".
 * @param {import('../api/client').ApiError|Error} props.error
 * @param {string} [props.context] What failed, before the reason, e.g. "We couldn't load your goals."
 * @param {() => void} props.onRetry
 * @param {boolean} [props.bare] Leave out the panel, for a place that already has one.
 */
export default function ErrorState({ title, error, context, onRetry, bare = false }) {
  const content = (
    <EmptyState title={title} action={error?.kind !== 'unauthorized' && <Button onClick={onRetry}>Try again</Button>}>
      <ErrorAlert error={error} context={context} />
    </EmptyState>
  )
  return bare ? content : <Card padded={false}>{content}</Card>
}
