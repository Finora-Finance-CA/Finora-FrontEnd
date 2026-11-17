import { useSyncExternalStore } from 'react'
import { WAKING_UP_MESSAGE, isWaitingOnSlowRequest, subscribeToSlowRequests } from '../api/requestEvents'
import Alert from './ui/Alert'

/**
 * Says the server may be waking up while any API request has taken more than about 5
 * seconds (US-57): the API is on Render's free tier, which sleeps when it isn't used.
 * The status region is always on the page, so screen readers hear the message when it
 * appears; it takes no space while empty.
 */
export default function SlowServerNotice() {
  const isSlow = useSyncExternalStore(subscribeToSlowRequests, isWaitingOnSlowRequest)
  return (
    <div role="status" className="slow-server-notice">
      {isSlow && (
        <Alert tone="info" role="presentation">
          {WAKING_UP_MESSAGE}
        </Alert>
      )}
    </div>
  )
}
