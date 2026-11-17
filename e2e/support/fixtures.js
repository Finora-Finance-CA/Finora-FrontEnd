// Fixture data for the mocked browser tests: one signed-in user with six months of
// transactions across every category, budgets under, near and over their limits, and
// savings goals with contributions. All money is integer cents.
//
// The browser's clock is fixed at NOW (see test.js), so "this month" is November 2026
// and the figures, and the screenshots, never change from one run to the next.

export const NOW = new Date('2026-11-15T12:00:00-05:00')
export const THIS_MONTH = '2026-11'

export const USER = Object.freeze({
  id: '6f1c2b8e-1d3a-4e5f-9a7b-0c1d2e3f4a5b',
  email: 'sam@example.com',
})

let nextId = 1

function transaction(date, type, amount_cents, category, description) {
  const id = String(nextId++)
  return {
    id,
    user_id: USER.id,
    amount_cents,
    date,
    type,
    category,
    description,
    created_at: `${date}T12:00:${String(nextId % 60).padStart(2, '0')}.000Z`,
    updated_at: `${date}T12:00:00.000Z`,
  }
}

// The same pattern each month, so the trend chart has six full bars.
function month(prefix, { rent = 180000, groceries = [8237, 6420, 9312], transit = [4500, 3215], fun = [1999, 4250] } = {}) {
  return [
    transaction(`${prefix}-01`, 'income', 425000, null, 'Salary'),
    transaction(`${prefix}-01`, 'expense', rent, 'Housing', 'Rent'),
    ...groceries.map((cents, i) => transaction(`${prefix}-${String(4 + i * 7).padStart(2, '0')}`, 'expense', cents, 'Food', `Groceries ${i + 1}`)),
    ...transit.map((cents, i) => transaction(`${prefix}-${String(6 + i * 9).padStart(2, '0')}`, 'expense', cents, 'Transportation', i ? 'Transit pass' : 'Gas')),
    ...fun.map((cents, i) => transaction(`${prefix}-${String(9 + i * 8).padStart(2, '0')}`, 'expense', cents, 'Entertainment', i ? 'Concert tickets' : 'Movie night')),
    transaction(`${prefix}-20`, 'expense', 2599, 'Other', 'Phone bill'),
  ]
}

export function initialTransactions() {
  nextId = 1
  return [
    ...month('2026-06', { fun: [1999] }),
    ...month('2026-07', { groceries: [7510, 8890] }),
    ...month('2026-08', { transit: [4500, 3215, 2875] }),
    ...month('2026-09'),
    ...month('2026-10', { fun: [1999, 4250, 6000] }),
    // November so far: Food near its limit, Transportation over it, Housing exactly at it.
    transaction('2026-11-01', 'income', 425000, null, 'Salary'),
    transaction('2026-11-01', 'expense', 180000, 'Housing', 'Rent'),
    transaction('2026-11-03', 'expense', 12450, 'Food', 'Groceries'),
    transaction('2026-11-07', 'expense', 8237, 'Food', 'Farmers market'),
    transaction('2026-11-10', 'expense', 11553, 'Food', 'Groceries'),
    transaction('2026-11-12', 'expense', 3000, 'Food', 'Lunch with a very long description that has to wrap on a narrow phone screen'),
    transaction('2026-11-04', 'expense', 9800, 'Transportation', 'Car repair'),
    transaction('2026-11-09', 'expense', 7515, 'Transportation', 'Transit pass'),
    transaction('2026-11-08', 'expense', 2000, 'Entertainment', 'Movie night'),
    transaction('2026-11-14', 'income', 32500, 'Other', 'Freelance design work'),
  ]
}

// Food: $352.40 of $400.00 (88%, near). Transportation: $173.15 of $150.00 (over).
// Housing: $1,800.00 of $1,800.00 (100%, near). Entertainment: $20.00 of $100.00.
export function initialBudgets() {
  return [
    { id: '1', user_id: USER.id, category: 'Food', limit_cents: 40000 },
    { id: '2', user_id: USER.id, category: 'Transportation', limit_cents: 15000 },
    { id: '3', user_id: USER.id, category: 'Housing', limit_cents: 180000 },
    { id: '4', user_id: USER.id, category: 'Entertainment', limit_cents: 10000 },
  ].map((budget) => ({ ...budget, created_at: '2026-09-01T00:00:00.000Z', updated_at: '2026-09-01T00:00:00.000Z' }))
}

export function initialGoals() {
  return [
    { id: '1', name: 'Trip to Japan', target_cents: 350000, saved_cents: 145000, target_date: '2027-04-01' },
    { id: '2', name: 'Emergency fund', target_cents: 500000, saved_cents: 500000, target_date: null },
    { id: '3', name: 'New laptop for school and design work', target_cents: 180000, saved_cents: 0, target_date: '2027-08-31' },
  ].map((goal, i) => ({
    ...goal,
    user_id: USER.id,
    created_at: `2026-10-0${3 - i}T00:00:00.000Z`,
    updated_at: `2026-10-0${3 - i}T00:00:00.000Z`,
  }))
}
