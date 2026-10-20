import { describe, expect, it } from 'vitest'
import { EMPTY_LIST_QUERY, hasActiveFilters, isRangeReversed, readListQuery, writeListQuery } from './listQuery'

const read = (search) => readListQuery(new URLSearchParams(search))

describe('readListQuery', () => {
  it('defaults to page 1 with no filters', () => {
    expect(read('')).toEqual(EMPTY_LIST_QUERY)
  })

  it('reads every filter', () => {
    expect(read('?page=3&q=lunch&category=Housing&category=Food&from=2026-09-01&to=2026-09-30')).toEqual({
      page: 3,
      q: 'lunch',
      categories: ['Food', 'Housing'],
      from: '2026-09-01',
      to: '2026-09-30',
    })
  })

  it.each(['0', '-1', '1.5', 'abc', '01', '100001', ''])('treats page=%s as page 1', (page) => {
    expect(read(`?page=${page}`).page).toBe(1)
  })

  it('drops unknown and repeated categories, keeping the app’s order', () => {
    expect(read('?category=Other&category=food&category=Other&category=Food').categories).toEqual(['Food', 'Other'])
  })

  it.each(['2026-02-30', '2026/09/01', 'yesterday', '1899-12-31'])('drops the date %s', (date) => {
    expect(read(`?from=${date}&to=${date}`)).toMatchObject({ from: '', to: '' })
  })

  it('keeps the search as typed but no longer than the API allows', () => {
    expect(read('?q=%20Lunch%20').q).toBe(' Lunch ')
    expect(read(`?q=${'x'.repeat(300)}`).q).toHaveLength(255)
  })
})

describe('writeListQuery', () => {
  it('leaves out everything at its default', () => {
    expect(writeListQuery(EMPTY_LIST_QUERY).toString()).toBe('')
  })

  it('writes every filter, trimming the search, with a repeated category', () => {
    const query = { page: 2, q: '  lunch ', categories: ['Food', 'Other'], from: '2026-09-01', to: '2026-09-30' }

    expect(writeListQuery(query).toString()).toBe(
      'q=lunch&category=Food&category=Other&from=2026-09-01&to=2026-09-30&page=2'
    )
  })

  it('round-trips through readListQuery', () => {
    const query = { page: 4, q: 'rent', categories: ['Housing'], from: '', to: '2026-10-01' }

    expect(readListQuery(writeListQuery(query))).toEqual(query)
  })
})

describe('hasActiveFilters', () => {
  it('is false with no filters, whatever the page', () => {
    expect(hasActiveFilters({ ...EMPTY_LIST_QUERY, page: 5 })).toBe(false)
    expect(hasActiveFilters({ ...EMPTY_LIST_QUERY, q: '   ' })).toBe(false)
  })

  it.each([
    ['a search', { q: 'x' }],
    ['a category', { categories: ['Food'] }],
    ['a start date', { from: '2026-01-01' }],
    ['an end date', { to: '2026-01-01' }],
  ])('is true with %s', (_, changes) => {
    expect(hasActiveFilters({ ...EMPTY_LIST_QUERY, ...changes })).toBe(true)
  })
})

describe('isRangeReversed', () => {
  it.each([
    ['2026-09-02', '2026-09-01', true],
    ['2026-09-01', '2026-09-01', false],
    ['2026-09-01', '2026-09-02', false],
    ['2026-09-01', '', false],
    ['', '2026-09-01', false],
  ])('from %s to %s is %s', (from, to, expected) => {
    expect(isRangeReversed({ from, to })).toBe(expected)
  })
})
