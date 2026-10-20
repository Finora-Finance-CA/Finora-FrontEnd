// The transaction list's page, search and filters live in the URL
// (/transactions?q=lunch&category=Food&from=2026-09-01&page=2), so refreshing, the
// Back button and shared links keep them. These pure helpers read and write them.
// Anything invalid in the URL is dropped rather than sent to the API.

import { CATEGORIES, MAX_SEARCH_LENGTH } from './constants'
import { isValidDate } from './dates'

/**
 * @typedef {object} ListQuery
 * @property {number} page 1-based.
 * @property {string} q Search text as typed (may be '').
 * @property {string[]} categories In CATEGORIES order, no repeats.
 * @property {string} from YYYY-MM-DD or ''.
 * @property {string} to YYYY-MM-DD or ''.
 */

export const EMPTY_LIST_QUERY = Object.freeze({ page: 1, q: '', categories: Object.freeze([]), from: '', to: '' })

// Far beyond any real history; the API rejects anything larger.
const MAX_PAGE = 100_000
const PAGE_PATTERN = /^[1-9]\d*$/

function readPage(value) {
  return value && PAGE_PATTERN.test(value) && Number(value) <= MAX_PAGE ? Number(value) : 1
}

function readDate(value) {
  return value && isValidDate(value) ? value : ''
}

/**
 * @param {URLSearchParams} searchParams
 * @returns {ListQuery}
 */
export function readListQuery(searchParams) {
  const chosen = searchParams.getAll('category')
  return {
    page: readPage(searchParams.get('page')),
    q: (searchParams.get('q') ?? '').slice(0, MAX_SEARCH_LENGTH),
    categories: CATEGORIES.filter((category) => chosen.includes(category)),
    from: readDate(searchParams.get('from')),
    to: readDate(searchParams.get('to')),
  }
}

/**
 * The URL search params for a query, leaving out anything at its default.
 *
 * @param {ListQuery} query
 * @returns {URLSearchParams}
 */
export function writeListQuery({ page, q, categories, from, to }) {
  const params = new URLSearchParams()
  const search = q.trim()
  if (search) params.set('q', search)
  for (const category of categories) params.append('category', category)
  if (from) params.set('from', from)
  if (to) params.set('to', to)
  if (page > 1) params.set('page', String(page))
  return params
}

/** True if any search or filter is set (the page number doesn't count). */
export function hasActiveFilters({ q, categories, from, to }) {
  return Boolean(q.trim() || categories.length > 0 || from || to)
}

/** True if both dates are set and the end is before the start. */
export function isRangeReversed({ from, to }) {
  // Same-format YYYY-MM-DD strings compare correctly as text.
  return Boolean(from && to && to < from)
}
