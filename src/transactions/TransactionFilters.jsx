import { useEffect, useEffectEvent, useId, useState } from 'react'
import FormField from '../components/FormField'
import { CATEGORIES, CATEGORY_COLORS, MAX_SEARCH_LENGTH, MIN_DATE, SEARCH_DEBOUNCE_MS } from './constants'
import { hasActiveFilters } from './listQuery'
import '../components/buttons.css'
import './TransactionFilters.css'

/**
 * Search, category and date filters for the transaction list. They all apply together.
 *
 * The search runs SEARCH_DEBOUNCE_MS after the last keystroke, or straight away on
 * Enter. Categories and dates apply as soon as they change.
 *
 * @param {object} props
 * @param {import('./listQuery').ListQuery} props.query The filters in effect (from the URL).
 * @param {(changes: object, options?: { replace?: boolean }) => void} props.onChange
 *   Called with the filters that changed; the list goes back to page 1.
 * @param {() => void} props.onClear Clears every filter.
 * @param {boolean} [props.rangeReversed] The end date is before the start date.
 * @param {{ current: HTMLInputElement|null }} [props.searchRef] The search box, so the
 *   page can focus it, e.g. after Clear all.
 */
export default function TransactionFilters({ query, onChange, onClear, rangeReversed = false, searchRef }) {
  const idPrefix = useId()
  const id = (name) => `${idPrefix}-${name}`

  // What's in the search box, which runs ahead of the URL until the search fires.
  const [searchText, setSearchText] = useState(query.q)
  // When the URL's search changes from outside (Clear all, Back), show it in the box.
  // A trailing space being typed isn't overwritten, since the search ignores it.
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

  function toggleCategory(category, checked) {
    const chosen = checked ? [...query.categories, category] : query.categories.filter((item) => item !== category)
    onChange({ categories: CATEGORIES.filter((item) => chosen.includes(item)) })
  }

  function handleClear() {
    setSearchText('')
    onClear()
  }

  const canClear = hasActiveFilters(query) || searchText.trim() !== ''

  return (
    <form
      className="transaction-filters"
      role="search"
      aria-label="Search and filter transactions"
      onSubmit={handleSubmit}
      noValidate
    >
      <FormField id={id('search')} label="Search descriptions">
        {(controlProps) => (
          <input
            {...controlProps}
            ref={searchRef}
            type="search"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            maxLength={MAX_SEARCH_LENGTH}
            autoComplete="off"
            enterKeyHint="search"
            placeholder="For example, groceries"
          />
        )}
      </FormField>

      <fieldset className="category-filter">
        <legend className="category-filter__legend">
          Categories <span className="category-filter__hint">(choose any)</span>
        </legend>
        <div className="category-filter__options">
          {CATEGORIES.map((category) => {
            const checked = query.categories.includes(category)
            const { light, dark } = CATEGORY_COLORS[category]
            return (
              <label key={category} className="category-filter__option">
                <input
                  type="checkbox"
                  name="category"
                  value={category}
                  checked={checked}
                  onChange={(event) => toggleCategory(category, event.target.checked)}
                />
                <span className="category-filter__chip">
                  <span
                    className="category-filter__swatch"
                    aria-hidden="true"
                    style={{ '--swatch': light.text, '--swatch-dark': dark.text }}
                  />
                  {category}
                  <svg className="category-filter__check" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                    <path d="M3 8.5 6.5 12 13 4.5" fill="none" stroke="currentColor" strokeWidth="2" />
                  </svg>
                </span>
              </label>
            )
          })}
        </div>
      </fieldset>

      <div className="transaction-filters__dates">
        <FormField id={id('from')} label="From">
          {(controlProps) => (
            <input
              {...controlProps}
              type="date"
              value={query.from}
              min={MIN_DATE}
              max={query.to || undefined}
              onChange={(event) => onChange({ from: event.target.value })}
            />
          )}
        </FormField>
        <FormField
          id={id('to')}
          label="To"
          error={rangeReversed ? 'Choose a date on or after the From date.' : undefined}
        >
          {(controlProps) => (
            <input
              {...controlProps}
              type="date"
              value={query.to}
              min={query.from || MIN_DATE}
              onChange={(event) => onChange({ to: event.target.value })}
            />
          )}
        </FormField>
      </div>

      <div className="transaction-filters__actions">
        <button type="button" className="button button--secondary" onClick={handleClear} disabled={!canClear}>
          Clear all
        </button>
      </div>
    </form>
  )
}
