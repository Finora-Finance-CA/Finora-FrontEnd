// Keeps the on-screen list in the same order and length as GET /api/transactions
// after a local add, edit or delete, without asking the API again.

import { TRANSACTION_LIST_LIMIT } from './constants'

// Ids are BIGINTs sent as digit strings, so a longer id is always a bigger number.
function compareIds(a, b) {
  if (a.length !== b.length) return a.length - b.length
  return a < b ? -1 : a > b ? 1 : 0
}

function compareText(a, b) {
  return a < b ? -1 : a > b ? 1 : 0
}

/** Sort comparator matching the API: newest date first, then newest created, then highest id. */
export function compareNewestFirst(a, b) {
  return compareText(b.date, a.date) || compareText(b.created_at, a.created_at) || compareIds(b.id, a.id)
}

/** The list with `transaction` added, or replacing the one with the same id, in API order. */
export function upsertTransaction(list, transaction) {
  return [...list.filter(({ id }) => id !== transaction.id), transaction]
    .sort(compareNewestFirst)
    .slice(0, TRANSACTION_LIST_LIMIT)
}

/** The list without the transaction with this id. */
export function removeTransaction(list, id) {
  return list.filter((transaction) => transaction.id !== id)
}
