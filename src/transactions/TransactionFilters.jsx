import { Search, SlidersHorizontal } from 'lucide-react'
import { useEffect, useEffectEvent, useId, useRef, useState } from 'react'
import Button from '../components/ui/Button'
import Dialog from '../components/ui/Dialog'
import Input from '../components/ui/Input'
import Popover from '../components/ui/Popover'
import Toolbar from '../components/ui/Toolbar'
import CategoryOptions from './CategoryOptions'
import { MAX_SEARCH_LENGTH, SEARCH_DEBOUNCE_MS } from './constants'
import { describeRange } from './datePresets'
import DateRangeOptions from './DateRangeOptions'
import { hasActiveFilters } from './listQuery'
import './TransactionFilters.css'

/** What the Category button says: "All categories", the one chosen, or how many. */
function describeCategories(selected) {
  if (selected.length === 0) return 'All categories'
  if (selected.length === 1) return selected[0]
  return `${selected.length} categories`
}

/**
 * The toolbar above the transaction table: search, then Category and Date filters and
 * Clear filters. On phones, Category and Date move into a Filters sheet. Everything
 * applies together.
 *
 * The search runs SEARCH_DEBOUNCE_MS after the last keystroke, or straight away on
 * Enter. Categories and dates apply as soon as they change.
 *
 * @param {object} props
 * @param {import('./listQuery').ListQuery} props.query The filters in effect (from the URL).
 * @param {(changes: object, options?: { replace?: boolean }) => void} props.onChange
 *   Called with the filters that changed; the list goes back to page 1.
 * @param {() => void} props.onClear Clears every filter and the search.
 * @param {boolean} [props.rangeReversed] The end date is before the start date.
 * @param {{ current: HTMLInputElement|null }} [props.searchRef] The search box, so the
 *   page can focus it, e.g. after clearing the filters.
 */
export default function TransactionFilters({ query, onChange, onClear, rangeReversed = false, searchRef }) {
  const searchId = useId()
  const [sheetOpen, setSheetOpen] = useState(false)
  const filtersButtonRef = useRef(null)

  // What's in the search box, which runs ahead of the URL until the search fires.
  const [searchText, setSearchText] = useState(query.q)
  // When the URL's search changes from outside (Clear filters, Back), show it in the
  // box. A trailing space being typed isn't overwritten, since the search ignores it.
  const [shownQuery, setShownQuery] = useState(query.q)
  if (query.q !== shownQuery) {
    setShownQuery(query.q)
    if (query.q !== searchText.trim()) setSearchText(query.q)
  }

  const runSearch = useEffectEvent((text) => onChange({ q: text }, { replace: true }))

  useEffect(() => {
    const text = searchText.trim()
    if (text === query.q.trim()) return undefined
    const timer = setTimeout(() => runSearch(text), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [searchText, query.q])

  function handleSubmit(event) {
    event.preventDefault()
    const text = searchText.trim()
    if (text !== query.q.trim()) onChange({ q: text }, { replace: true })
  }

  function handleClear() {
    setSearchText('')
    onClear()
  }

  const canClear = hasActiveFilters(query) || searchText.trim() !== ''
  // How many filters the sheet holds, for the Filters button on phones.
  const activeCount = query.categories.length + (query.from || query.to ? 1 : 0)
  const categoryOptions = (
    <CategoryOptions selected={query.categories} onChange={(categories) => onChange({ categories })} />
  )
  const dateOptions = (
    <DateRangeOptions from={query.from} to={query.to} onChange={onChange} rangeReversed={rangeReversed} />
  )

  return (
    <>
      <Toolbar
        as="form"
        className="transaction-filters"
        role="search"
        aria-label="Search and filter transactions"
        onSubmit={handleSubmit}
        noValidate
      >
        <div className="transaction-filters__search">
          <label className="visually-hidden" htmlFor={searchId}>
            Search descriptions
          </label>
          <Input
            id={searchId}
            ref={searchRef}
            icon={Search}
            type="search"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            maxLength={MAX_SEARCH_LENGTH}
            autoComplete="off"
            enterKeyHint="search"
            placeholder="Search descriptions"
          />
        </div>

        <Popover
          className="transaction-filters__wide"
          label="Categories"
          buttonContent={
            <>
              <span className="visually-hidden">Category:</span>{' '}
              {describeCategories(query.categories)}
            </>
          }
        >
          {categoryOptions}
        </Popover>

        <Popover
          className="transaction-filters__wide"
          label="Date range"
          buttonContent={
            <>
              <span className="visually-hidden">Date:</span>{' '}
              {describeRange(query)}
            </>
          }
        >
          {dateOptions}
        </Popover>

        <Button variant="ghost" className="transaction-filters__wide" onClick={handleClear} disabled={!canClear}>
          Clear filters
        </Button>

        <Button
          ref={filtersButtonRef}
          className="transaction-filters__narrow"
          icon={SlidersHorizontal}
          aria-haspopup="dialog"
          onClick={() => setSheetOpen(true)}
        >
          Filters
          {activeCount > 0 && (
            <>
              <span className="transaction-filters__count tabular" aria-hidden="true">
                {activeCount}
              </span>
              <span className="visually-hidden">, {activeCount} active</span>
            </>
          )}
        </Button>
      </Toolbar>

      {sheetOpen && (
        <Dialog variant="sheet" title="Filters" onClose={() => setSheetOpen(false)} returnFocusRef={filtersButtonRef}>
          {categoryOptions}
          {dateOptions}
          <div className="dialog__actions">
            <Button
              variant="ghost"
              onClick={() => onChange({ categories: [], from: '', to: '' })}
              disabled={activeCount === 0}
            >
              Clear filters
            </Button>
            <Button variant="primary" onClick={() => setSheetOpen(false)}>
              Show results
            </Button>
          </div>
        </Dialog>
      )}
    </>
  )
}
