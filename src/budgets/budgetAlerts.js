// How each budget status from the API (US-35) is shown: the progress bar's tone and a
// short label (US-39, US-40). The API decides the status; this only decides its look,
// so the Budgets page and the dashboard alerts (US-41) always agree.

const ALERTS = {
  under: { tone: 'default', label: null },
  warning: { tone: 'warning', label: 'Close to limit' },
  over: { tone: 'danger', label: 'Over budget' },
}

/**
 * @param {'under'|'warning'|'over'} status From the budget status endpoint.
 * @returns {{ tone: 'default'|'warning'|'danger', label: string|null }}
 *   An unknown status is shown as under, with no label.
 */
export function budgetAlert(status) {
  return ALERTS[status] ?? ALERTS.under
}