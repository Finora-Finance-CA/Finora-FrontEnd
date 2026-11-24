import { Component } from 'react'
import { useLocation } from 'react-router'
import { resetFailedPages } from '../lib/lazyPage'
import Button from './ui/Button'
import Card from './ui/Card'
import EmptyState from './ui/EmptyState'
import './ErrorBoundary.css'

// What the browser says when a page's code (a lazy chunk) didn't download.
const CHUNK_LOAD_ERROR =
  /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|Unable to preload CSS/i

function isChunkLoadError(error) {
  return error?.name === 'ChunkLoadError' || CHUNK_LOAD_ERROR.test(String(error?.message ?? ''))
}

function isOffline() {
  return typeof navigator !== 'undefined' && navigator.onLine === false
}

/**
 * Catches anything that breaks while a part of the app renders, so the screen is never
 * left blank (US-57). It shows a plain-language message instead:
 * - offline: "You appear to be offline", with Try again (also tried by itself as soon
 *   as the connection is back);
 * - a page's code that didn't download: Try again, or Reload page;
 * - anything else (a bug): Try again, or Reload page.
 *
 * The cause is logged to the console, never shown.
 *
 * @param {object} props
 * @param {'app'|'page'} [props.variant='page'] 'app' fills the screen (nothing else
 *   rendered); 'page' sits inside the app shell, which keeps the navigation working.
 * @param {unknown} [props.resetKey] When it changes (e.g. the user opens another page),
 *   the error is cleared and the children are shown again.
 */
export class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('Part of the page failed to show:', error, info?.componentStack)
  }

  componentDidMount() {
    window.addEventListener('online', this.handleOnline)
  }

  componentWillUnmount() {
    window.removeEventListener('online', this.handleOnline)
  }

  componentDidUpdate(previous) {
    if (this.state.error && previous.resetKey !== this.props.resetKey) this.retry()
  }

  handleOnline = () => {
    if (this.state.error && isChunkLoadError(this.state.error)) this.retry()
  }

  retry = () => {
    resetFailedPages()
    this.setState({ error: null })
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children
    return <ErrorFallback error={error} variant={this.props.variant ?? 'page'} onRetry={this.retry} />
  }
}

function ErrorFallback({ error, variant, onRetry }) {
  const offline = isOffline()
  const chunk = isChunkLoadError(error)
  const title = offline ? 'You appear to be offline' : chunk ? "This page didn't load" : 'Something went wrong'
  const detail = offline
    ? 'Check your connection, then try again.'
    : chunk
      ? "Part of the app couldn't be downloaded. Try again, or reload the page."
      : 'This part of the app ran into a problem. Try again, or reload the page.'

  const content = (
    <Card padded={false}>
      <EmptyState
        title={title}
        action={
          <div className="error-boundary__actions">
            <Button variant="primary" onClick={onRetry}>
              Try again
            </Button>
            {!offline && <Button onClick={() => window.location.reload()}>Reload page</Button>}
          </div>
        }
      >
        <p role="alert">{detail}</p>
      </EmptyState>
    </Card>
  )

  return variant === 'app' ? <main className="error-boundary error-boundary--app">{content}</main> : <div className="page">{content}</div>
}

/**
 * An ErrorBoundary for the page inside the app shell: opening another page clears it.
 */
export function RouteErrorBoundary({ children }) {
  const { pathname } = useLocation()
  return <ErrorBoundary resetKey={pathname}>{children}</ErrorBoundary>
}
