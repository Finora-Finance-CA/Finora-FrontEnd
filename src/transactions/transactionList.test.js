import { describe, expect, it } from 'vitest'
import { makeTransaction } from '../test/transactions'
import { TRANSACTION_LIST_LIMIT } from './constants'
import { compareNewestFirst, removeTransaction, upsertTransaction } from './transactionList'

const ids = (list) => list.map(({ id }) => id)

describe('compareNewestFirst', () => {
  it('orders like the API: newest date, then newest created, then highest id', () => {
    const list = [
      makeTransaction({ id: '9', date: '2026-10-01', created_at: '2026-10-01T10:00:00.000Z' }),
      makeTransaction({ id: '10', date: '2026-10-05', created_at: '2026-10-05T09:00:00.000Z' }),
      makeTransaction({ id: '11', date: '2026-10-05', created_at: '2026-10-05T12:00:00.000Z' }),
      makeTransaction({ id: '99', date: '2026-10-05', created_at: '2026-10-05T09:00:00.000Z' }),
    ]

    expect(ids([...list].sort(compareNewestFirst))).toEqual(['11', '99', '10', '9'])
  })

  it('compares ids as numbers, not text', () => {
    const same = { date: '2026-10-05', created_at: '2026-10-05T09:00:00.000Z' }
    const list = [makeTransaction({ ...same, id: '9' }), makeTransaction({ ...same, id: '10' })]

    expect(ids(list.sort(compareNewestFirst))).toEqual(['10', '9'])
  })
})

describe('upsertTransaction', () => {
  const older = makeTransaction({ id: '1', date: '2026-09-01' })
  const newer = makeTransaction({ id: '2', date: '2026-10-01' })

  it('adds a new transaction in date order', () => {
    const middle = makeTransaction({ id: '3', date: '2026-09-15' })

    expect(ids(upsertTransaction([newer, older], middle))).toEqual(['2', '3', '1'])
  })

  it('replaces the transaction with the same id and moves it if its date changed', () => {
    const moved = { ...older, date: '2026-10-09', description: 'Changed' }

    const result = upsertTransaction([newer, older], moved)

    expect(ids(result)).toEqual(['1', '2'])
    expect(result[0].description).toBe('Changed')
  })

  it('keeps no more than the API’s list limit, dropping the oldest', () => {
    const full = Array.from({ length: TRANSACTION_LIST_LIMIT }, (_, i) =>
      makeTransaction({ id: String(i + 1), date: '2026-09-01' })
    )
    const newest = makeTransaction({ id: '500', date: '2026-10-01' })

    const result = upsertTransaction(full, newest)

    expect(result).toHaveLength(TRANSACTION_LIST_LIMIT)
    expect(result[0].id).toBe('500')
  })

  it('does not change the list it was given', () => {
    const list = [newer, older]

    upsertTransaction(list, makeTransaction({ id: '3' }))

    expect(ids(list)).toEqual(['2', '1'])
  })
})

describe('removeTransaction', () => {
  it('removes only the transaction with that id', () => {
    const list = [makeTransaction({ id: '1' }), makeTransaction({ id: '2' })]

    expect(ids(removeTransaction(list, '1'))).toEqual(['2'])
  })
})
