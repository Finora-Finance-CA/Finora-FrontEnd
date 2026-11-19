// Test helpers for the toast region (src/components/ui/Toast.jsx), which the app renders
// once, into document.body, as a polite live region.

import { within } from '@testing-library/react'

/** The toast region: the live region every success message goes to. */
function toastRegion() {
  const region = document.querySelector('[data-live-region]')
  if (!region) throw new Error('No toast region on the page. Is the app wrapped in ToastProvider?')
  return region
}

/** Waits for a toast with exactly this text. */
export function findToast(text) {
  return within(toastRegion()).findByText(text)
}
