// Quick local changes to the page of transactions on screen, shown straight away while
// the page is loaded again from the API. The API decides the order and which page
// each transaction is on (search, filters and paging all happen there), so these only
// patch what is already showing; the reload that follows puts everything in place.

/** The list with the transaction that has the same id replaced, in the same position. */
export function replaceTransaction(list, transaction) {
  return list.map((item) => (item.id === transaction.id ? transaction : item))
}

/** The list without the transaction with this id. */
export function removeTransaction(list, id) {
  return list.filter((transaction) => transaction.id !== id)
}
