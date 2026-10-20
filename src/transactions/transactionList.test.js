import { describe, expect, it } from 'vitest'
import { makeTransaction } from '../test/transactions'
import { removeTransaction, replaceTransaction } from './transactionList'

const ids = (list) => list.map(({ id }) => id)

describe('replaceTransaction', () => {
  it('replaces the transaction with the same id where it is', () => {
    const list = [makeTransaction({ id: '1' }), makeTransaction({ id: '2' }), makeTransaction({ id: '3' })]

    const result = replaceTransaction(list, { ...list[1], description: 'Changed', date: '2020-01-01' })

    expect(ids(result)).toEqual(['1', '2', '3'])
    expect(result[1].description).toBe('Changed')
  })

  it('leaves the list as it is when the transaction is not on it', () => {
    const list = [makeTransaction({ id: '1' })]

    expect(replaceTransaction(list, makeTransaction({ id: '9' }))).toEqual(list)
  })

  it('does not change the list it was given', () => {
    const list = [makeTransaction({ id: '1', description: 'Before' })]

    replaceTransaction(list, { ...list[0], description: 'After' })

    expect(list[0].description).toBe('Before')
  })
})

describe('removeTransaction', () => {
  it('removes only the transaction with that id', () => {
    const list = [makeTransaction({ id: '1' }), makeTransaction({ id: '2' })]

    expect(ids(removeTransaction(list, '1'))).toEqual(['2'])
  })
})
