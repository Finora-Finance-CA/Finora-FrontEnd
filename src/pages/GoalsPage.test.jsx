// The Savings goals page (US-40, US-49, US-50) as a user sees it: list, create, edit,
// delete and contribute, with validation, loading, empty and error states and a toast
// after each save. The API module is mocked; nothing leaves the test.

import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api/client'
import { addContribution, createGoal, deleteGoal, listGoals, updateGoal } from '../api/goals'
import { renderApp } from '../test/renderApp'
import { findToast } from '../test/toasts'

vi.mock('../api/goals')

const TRIP = {
  id: '1',
  user_id: 'u',
  name: 'Trip to Japan',
  target_cents: 5000,
  saved_cents: 1450,
  target_date: '2027-04-01',
  created_at: '2026-10-01T00:00:00Z',
  updated_at: '2026-10-01T00:00:00Z',
}
const FUND = { ...TRIP, id: '2', name: 'Emergency fund', target_cents: 100000, saved_cents: 100000, target_date: null }

const SERVER_ERROR = new ApiError('server', 'Something went wrong on our end. Please try again in a moment.', { status: 500 })
const NETWORK_ERROR = new ApiError('network', "We couldn't reach the server. Check your connection and try again.")
const NOT_FOUND = new ApiError('not_found', "We couldn't find that. It may have been deleted.", { status: 404 })

function deferred() {
  let resolve
  let reject
  const promise = new Promise((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

function goalList() {
  return screen.getByRole('list', { name: 'Savings goals' })
}

function cardFor(name) {
  return within(goalList()).getByRole('heading', { name }).closest('li')
}

async function showGoals(goals = [TRIP, FUND]) {
  listGoals.mockResolvedValue(goals)
  renderApp('/goals')
  if (goals.length > 0) await screen.findByRole('list', { name: 'Savings goals' })
  else await screen.findByText('No savings goals yet')
}

async function openCreate() {
  fireEvent.click(screen.getByRole('button', { name: 'Add goal' }))
  return screen.findByRole('dialog', { name: 'Add savings goal' })
}

function fill(dialog, { name, target, date } = {}) {
  if (name !== undefined) fireEvent.change(within(dialog).getByLabelText('Name'), { target: { value: name } })
  if (target !== undefined) fireEvent.change(within(dialog).getByLabelText('Target ($)'), { target: { value: target } })
  if (date !== undefined) fireEvent.change(within(dialog).getByLabelText('Target date (optional)'), { target: { value: date } })
}

beforeEach(() => {
  for (const mock of [addContribution, createGoal, deleteGoal, listGoals, updateGoal]) mock.mockReset()
  listGoals.mockResolvedValue([])
})

describe('the goals page', () => {
  it('uses the shared page layout and header, marked as the current page', async () => {
    await showGoals()

    expect(screen.getByRole('heading', { name: 'Savings goals', level: 1 })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Savings goals', level: 1 }).closest('.page')).not.toBeNull()
    const nav = screen.getAllByRole('navigation', { name: 'Main' })[0]
    expect(within(nav).getByRole('link', { name: 'Savings goals' })).toHaveAttribute('aria-current', 'page')
  })

  it('shows a loading message, then the goals newest first', async () => {
    const load = deferred()
    listGoals.mockReturnValue(load.promise)
    renderApp('/goals')

    expect(await screen.findByText('Loading goals…')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add goal' })).toBeDisabled()

    await act(async () => load.resolve([TRIP, FUND]))

    expect(within(goalList()).getAllByRole('heading').map((heading) => heading.textContent)).toEqual([
      'Trip to Japan',
      'Emergency fund',
    ])
    expect(screen.getByRole('button', { name: 'Add goal' })).toBeEnabled()
  })

  it('shows each goal’s saved amount, target, percent, what’s left and target date', async () => {
    await showGoals()

    const trip = cardFor('Trip to Japan')
    expect(within(trip).getByText('$14.50 of $50.00')).toBeInTheDocument()
    expect(within(trip).getByText('29% saved')).toBeInTheDocument()
    expect(within(trip).getByText('$35.50 to go')).toBeInTheDocument()
    expect(within(trip).getByRole('progressbar', { name: 'Trip to Japan savings' })).toHaveAttribute('aria-valuenow', '29')
    expect(within(trip).getByText('Apr 1, 2027')).toBeInTheDocument()

    const fund = cardFor('Emergency fund')
    expect(within(fund).getByText('100% saved')).toBeInTheDocument()
    expect(within(fund).getByText('Goal reached')).toBeInTheDocument()
    expect(within(fund).getByText('No target date')).toBeInTheDocument()
  })

  it('caps the percent at 100 for a goal past its target', async () => {
    await showGoals([{ ...TRIP, saved_cents: 7500 }])

    expect(within(cardFor('Trip to Japan')).getByText('100% saved')).toBeInTheDocument()
    expect(within(cardFor('Trip to Japan')).getByText('Goal reached')).toBeInTheDocument()
  })

  it('shows 0% for a goal with nothing saved', async () => {
    await showGoals([{ ...TRIP, saved_cents: 0 }])

    expect(within(cardFor('Trip to Japan')).getByText('0% saved')).toBeInTheDocument()
    expect(within(cardFor('Trip to Japan')).getByText('$50.00 to go')).toBeInTheDocument()
  })

  it('shows an empty state with a way to add the first goal', async () => {
    await showGoals([])

    expect(screen.getByText('No savings goals yet')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Add your first goal' }))
    expect(await screen.findByRole('dialog', { name: 'Add savings goal' })).toBeInTheDocument()
  })

  it.each([
    ['the server failed', SERVER_ERROR, "We couldn't load your savings goals. Something went wrong on our end. Please try again in a moment."],
    ['the server could not be reached', NETWORK_ERROR, "We couldn't load your savings goals. We couldn't reach the server. Check your connection and try again."],
  ])('shows an error with Try again when %s, and loads again', async (_, error, text) => {
    listGoals.mockRejectedValueOnce(error).mockResolvedValue([TRIP])
    renderApp('/goals')

    expect(await screen.findByText("Goals didn't load")).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent(text)

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByRole('heading', { name: 'Trip to Japan' })).toBeInTheDocument()
    expect(listGoals).toHaveBeenCalledTimes(2)
  })
})

describe('creating a goal', () => {
  it('creates the goal with the amount in cents, shows it first and says so', async () => {
    createGoal.mockImplementation(async (payload) => ({ ...TRIP, id: '3', saved_cents: 0, ...payload }))
    await showGoals()
    const dialog = await openCreate()
    expect(within(dialog).getByLabelText('Name')).toHaveFocus()

    fill(dialog, { name: '  New laptop  ', target: '1,299.99', date: '2027-01-15' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add goal' }))

    expect(await findToast('Goal created.')).toBeInTheDocument()
    expect(createGoal).toHaveBeenCalledWith({ name: 'New laptop', target_cents: 129999, target_date: '2027-01-15' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(within(goalList()).getAllByRole('heading')[0]).toHaveTextContent('New laptop')
  })

  it('sends no target date when it is left empty', async () => {
    createGoal.mockImplementation(async (payload) => ({ ...TRIP, id: '3', saved_cents: 0, ...payload }))
    await showGoals()
    const dialog = await openCreate()

    fill(dialog, { name: 'Fund', target: '500' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add goal' }))

    await waitFor(() => expect(createGoal).toHaveBeenCalledWith({ name: 'Fund', target_cents: 50000, target_date: null }))
  })

  it.each([
    ['no name', { name: '   ', target: '100' }, 'Name', 'Name is required.'],
    ['a name over 60 characters', { name: 'a'.repeat(61), target: '100' }, 'Name', 'Name must be 60 characters or fewer.'],
    ['no target', { name: 'Trip', target: '' }, 'Target ($)', 'Target is required.'],
    ['a zero target', { name: 'Trip', target: '0' }, 'Target ($)', 'Target must be greater than 0.'],
    ['a negative target', { name: 'Trip', target: '-50' }, 'Target ($)', 'Target must be greater than 0.'],
    ['a target that is not a number', { name: 'Trip', target: '12abc' }, 'Target ($)', 'Target must be a number, for example 12.50.'],
    ['a target with 3 decimals', { name: 'Trip', target: '1.005' }, 'Target ($)', 'Target can have at most 2 decimal places, for example 12.50.'],
    ['a target over the maximum', { name: 'Trip', target: '21474836.48' }, 'Target ($)', 'Target must be $21,474,836.47 or less.'],
    ['a date after 2100', { name: 'Trip', target: '100', date: '2101-01-01' }, 'Target date (optional)', 'Target date must be between 1900-01-01 and 2100-12-31.'],
  ])('blocks %s with the message under the field, focused, and sends nothing', async (_, values, label, message) => {
    await showGoals()
    const dialog = await openCreate()
    fill(dialog, values)

    fireEvent.click(within(dialog).getByRole('button', { name: 'Add goal' }))

    const input = within(dialog).getByLabelText(label)
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAccessibleDescription(expect.stringContaining(message))
    expect(input).toHaveFocus()
    expect(createGoal).not.toHaveBeenCalled()
  })

  it('checks a field when the user leaves it', async () => {
    await showGoals()
    const dialog = await openCreate()
    const target = within(dialog).getByLabelText('Target ($)')

    fireEvent.change(target, { target: { value: '-5' } })
    fireEvent.blur(target)

    expect(target).toHaveAccessibleDescription(expect.stringContaining('Target must be greater than 0.'))
  })

  it('puts the API’s field messages under their fields', async () => {
    createGoal.mockRejectedValue(
      new ApiError('validation', 'Some details need fixing.', { fieldErrors: { target_cents: 'Target must be $21,474,836.47 or less.' } })
    )
    await showGoals()
    const dialog = await openCreate()
    fill(dialog, { name: 'Trip', target: '100' })

    fireEvent.click(within(dialog).getByRole('button', { name: 'Add goal' }))

    expect(await within(dialog).findByText('Target must be $21,474,836.47 or less.')).toBeInTheDocument()
    expect(within(dialog).getByLabelText('Target ($)')).toHaveAttribute('aria-invalid', 'true')
  })

  it('keeps the dialog open with everything typed when saving fails', async () => {
    createGoal.mockRejectedValue(SERVER_ERROR)
    await showGoals()
    const dialog = await openCreate()
    fill(dialog, { name: 'Trip', target: '250.50', date: '2027-05-01' })

    fireEvent.click(within(dialog).getByRole('button', { name: 'Add goal' }))

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'The goal was not saved. Something went wrong on our end. Please try again in a moment.'
    )
    expect(within(dialog).getByLabelText('Name')).toHaveValue('Trip')
    expect(within(dialog).getByLabelText('Target ($)')).toHaveValue('250.50')
    expect(within(dialog).getByLabelText('Target date (optional)')).toHaveValue('2027-05-01')
  })

  it('locks the dialog while saving, so nothing is sent twice', async () => {
    const save = deferred()
    createGoal.mockReturnValue(save.promise)
    await showGoals()
    const dialog = await openCreate()
    fill(dialog, { name: 'Trip', target: '100' })

    fireEvent.click(within(dialog).getByRole('button', { name: 'Add goal' }))
    expect(within(dialog).getByRole('button', { name: 'Saving…' })).toBeDisabled()
    fireEvent.submit(within(dialog).getByLabelText('Name').closest('form'))

    expect(createGoal).toHaveBeenCalledTimes(1)
    await act(async () => save.resolve({ ...TRIP, id: '9' }))
  })
})

describe('editing a goal', () => {
  it('starts from the saved values, saves the changes and says so', async () => {
    updateGoal.mockImplementation(async (id, payload) => ({ ...TRIP, ...payload }))
    await showGoals()
    fireEvent.click(within(cardFor('Trip to Japan')).getByRole('button', { name: 'Edit Trip to Japan' }))
    const dialog = await screen.findByRole('dialog', { name: 'Edit savings goal' })

    expect(within(dialog).getByLabelText('Name')).toHaveValue('Trip to Japan')
    expect(within(dialog).getByLabelText('Target ($)')).toHaveValue('50.00')
    expect(within(dialog).getByLabelText('Target date (optional)')).toHaveValue('2027-04-01')

    fill(dialog, { target: '80' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }))

    expect(await findToast('Goal updated.')).toBeInTheDocument()
    expect(updateGoal).toHaveBeenCalledWith('1', { name: 'Trip to Japan', target_cents: 8000, target_date: '2027-04-01' })
    expect(within(cardFor('Trip to Japan')).getByText('$14.50 of $80.00')).toBeInTheDocument()
  })

  it('removes a goal that was deleted somewhere else, and says so', async () => {
    updateGoal.mockRejectedValue(NOT_FOUND)
    await showGoals()
    fireEvent.click(within(cardFor('Trip to Japan')).getByRole('button', { name: 'Edit Trip to Japan' }))
    const dialog = await screen.findByRole('dialog', { name: 'Edit savings goal' })

    fireEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }))

    expect(await findToast('That goal no longer exists, so it was removed from the list.')).toBeInTheDocument()
    expect(within(goalList()).queryByRole('heading', { name: 'Trip to Japan' })).not.toBeInTheDocument()
  })
})

describe('deleting a goal', () => {
  it('asks first with Cancel focused, then deletes and says so', async () => {
    deleteGoal.mockResolvedValue(undefined)
    await showGoals()
    fireEvent.click(within(cardFor('Trip to Japan')).getByRole('button', { name: 'Delete Trip to Japan' }))
    const dialog = await screen.findByRole('dialog', { name: 'Delete savings goal?' })
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toHaveFocus()
    expect(dialog).toHaveTextContent('Delete “Trip to Japan”, with $14.50 saved of $50.00?')

    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete goal' }))

    expect(await findToast('Goal deleted.')).toBeInTheDocument()
    expect(deleteGoal).toHaveBeenCalledWith('1')
    expect(within(goalList()).queryByRole('heading', { name: 'Trip to Japan' })).not.toBeInTheDocument()
  })

  it('keeps the goal and explains when deleting fails', async () => {
    deleteGoal.mockRejectedValue(SERVER_ERROR)
    await showGoals()
    fireEvent.click(within(cardFor('Trip to Japan')).getByRole('button', { name: 'Delete Trip to Japan' }))
    const dialog = await screen.findByRole('dialog', { name: 'Delete savings goal?' })

    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete goal' }))

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('The goal was not deleted.')
    expect(within(goalList()).getByRole('heading', { name: 'Trip to Japan' })).toBeInTheDocument()
  })
})

describe('adding a contribution', () => {
  async function openContribution(name = 'Trip to Japan') {
    fireEvent.click(within(cardFor(name)).getByRole('button', { name: `Add contribution to ${name}` }))
    return screen.findByRole('dialog', { name: 'Add contribution' })
  }

  it('adds the amount in cents, updates the progress and says so', async () => {
    addContribution.mockImplementation(async (id, cents) => ({ ...TRIP, saved_cents: TRIP.saved_cents + cents }))
    await showGoals()
    const dialog = await openContribution()
    expect(within(dialog).getByLabelText('Amount ($)')).toHaveFocus()
    expect(dialog).toHaveTextContent('Trip to Japan: $14.50 saved of $50.00.')

    fireEvent.change(within(dialog).getByLabelText('Amount ($)'), { target: { value: '10.55' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add contribution' }))

    expect(await findToast('Added $10.55 to Trip to Japan.')).toBeInTheDocument()
    expect(addContribution).toHaveBeenCalledWith('1', 1055)
    expect(within(cardFor('Trip to Japan')).getByText('$25.05 of $50.00')).toBeInTheDocument()
    expect(within(cardFor('Trip to Japan')).getByText('50% saved')).toBeInTheDocument()
  })

  it.each([
    ['', 'Amount is required.'],
    ['0', 'Amount must be greater than 0.'],
    ['-5', 'Amount must be greater than 0.'],
    ['abc', 'Amount must be a number, for example 12.50.'],
    ['5.123', 'Amount can have at most 2 decimal places, for example 12.50.'],
  ])('blocks %j and sends nothing', async (value, message) => {
    await showGoals()
    const dialog = await openContribution()
    const input = within(dialog).getByLabelText('Amount ($)')
    fireEvent.change(input, { target: { value } })

    fireEvent.click(within(dialog).getByRole('button', { name: 'Add contribution' }))

    expect(input).toHaveAccessibleDescription(expect.stringContaining(message))
    expect(input).toHaveFocus()
    expect(addContribution).not.toHaveBeenCalled()
  })

  it('shows the API’s message under the amount, readable as is', async () => {
    addContribution.mockRejectedValue(
      new ApiError('validation', 'Some details need fixing.', {
        fieldErrors: { amount_cents: 'This contribution would exceed the maximum saved total.' },
      })
    )
    await showGoals()
    const dialog = await openContribution()
    fireEvent.change(within(dialog).getByLabelText('Amount ($)'), { target: { value: '5' } })

    fireEvent.click(within(dialog).getByRole('button', { name: 'Add contribution' }))

    expect(await within(dialog).findByText('This contribution would exceed the maximum saved total.')).toBeInTheDocument()
    expect(screen.queryByText(/amount_cents/)).not.toBeInTheDocument()
  })

  it('keeps the amount typed when saving fails', async () => {
    addContribution.mockRejectedValue(NETWORK_ERROR)
    await showGoals()
    const dialog = await openContribution()
    fireEvent.change(within(dialog).getByLabelText('Amount ($)'), { target: { value: '12.34' } })

    fireEvent.click(within(dialog).getByRole('button', { name: 'Add contribution' }))

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('The contribution was not added.')
    expect(within(dialog).getByLabelText('Amount ($)')).toHaveValue('12.34')
  })
})
