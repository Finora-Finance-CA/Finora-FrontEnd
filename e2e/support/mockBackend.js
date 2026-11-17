// A stand-in for the Finora API and Supabase Auth, served from memory to the browser
// through Playwright's request interception (page.route). Every request the page makes
// comes through handle():
//
// - The app's own files (the Vite dev server on the same origin) pass through.
// - /api/... is answered from the fixtures, with the same shapes and rules as the real
//   API (Finora-API README): paging, search and filters, monthly totals, budget status,
//   goals and contributions. Changes are kept for the rest of the test.
// - .../auth/v1/... is answered as Supabase Auth would: password sign-in, sign-up,
//   token refresh, the current user and sign-out.
// - Anything else is aborted and recorded in `unmocked`. test.js fails the test if
//   that list isn't empty, so no test can ever reach the real Supabase or API.

import { NOW, USER, initialBudgets, initialGoals, initialTransactions } from './fixtures.js'

const PAGE_SIZE = 20
const CATEGORIES = ['Food', 'Transportation', 'Housing', 'Entertainment', 'Other']
const WARNING_PERCENT = 80

function base64url(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url')
}

/** A session shaped like Supabase's, valid for an hour after NOW. */
export function sessionFor(user = USER) {
  const issuedAt = Math.floor(NOW.getTime() / 1000)
  const expiresAt = issuedAt + 3600
  const accessToken = [
    base64url({ alg: 'HS256', typ: 'JWT' }),
    base64url({ sub: user.id, email: user.email, role: 'authenticated', aud: 'authenticated', iat: issuedAt, exp: expiresAt }),
    'e2e-signature',
  ].join('.')
  return {
    access_token: accessToken,
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: expiresAt,
    refresh_token: 'e2e-refresh-token',
    user: {
      id: user.id,
      aud: 'authenticated',
      role: 'authenticated',
      email: user.email,
      email_confirmed_at: '2026-09-01T00:00:00.000Z',
      app_metadata: { provider: 'email', providers: ['email'] },
      user_metadata: {},
      identities: [],
      created_at: '2026-09-01T00:00:00.000Z',
      updated_at: '2026-09-01T00:00:00.000Z',
    },
  }
}

const monthOf = (date) => date.slice(0, 7)

function addMonths(month, change) {
  const [year, number] = month.split('-').map(Number)
  const index = year * 12 + (number - 1) + change
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}`
}

export class MockBackend {
  /**
   * @param {object} options
   * @param {string} options.appOrigin The dev server's origin.
   * @param {object[]} [options.transactions] Instead of the usual fixtures, e.g. 1,000 of them.
   * @param {number} [options.latencyMs] Delay before each API answer, like a real network
   *   and server. 0 by default.
   */
  constructor({ appOrigin, transactions, latencyMs = 0 }) {
    this.appOrigin = appOrigin
    this.latencyMs = latencyMs
    this.transactions = transactions ?? initialTransactions()
    this.budgets = initialBudgets()
    this.goals = initialGoals()
    this.nextId = 1000
    /** Requests that no mock answered: the test fails if any are left. */
    this.unmocked = []
    /** Every API request, as `METHOD /path?query`, for tests that check what was asked. */
    this.apiRequests = []
  }

  async handle(route) {
    const request = route.request()
    const url = new URL(request.url())

    if (url.origin === this.appOrigin && url.pathname.includes('/auth/v1/')) return this.auth(route, request, url)
    if (url.origin === this.appOrigin && (url.pathname.startsWith('/api/') || url.pathname === '/health')) {
      if (this.latencyMs > 0) await new Promise((resolve) => setTimeout(resolve, this.latencyMs))
      return this.api(route, request, url)
    }
    if (url.origin === this.appOrigin) return route.continue()

    this.unmocked.push(`${request.method()} ${request.url()}`)
    return route.abort('blockedbyclient')
  }

  // ---------------------------------------------------------------- Supabase Auth

  auth(route, request, url) {
    const path = url.pathname.slice(url.pathname.indexOf('/auth/v1/') + '/auth/v1'.length)
    const body = request.postDataJSON?.() ?? null
    if (request.method() === 'POST' && path === '/token') {
      return json(route, 200, sessionFor(body?.email ? { ...USER, email: body.email } : USER))
    }
    if (request.method() === 'POST' && path === '/signup') return json(route, 200, sessionFor({ ...USER, email: body?.email }))
    if (request.method() === 'POST' && path === '/logout') return route.fulfill({ status: 204 })
    if (request.method() === 'GET' && path === '/user') return json(route, 200, sessionFor().user)
    this.unmocked.push(`${request.method()} ${request.url()}`)
    return json(route, 404, { error: 'Not mocked' })
  }

  // ---------------------------------------------------------------- Finora API

  api(route, request, url) {
    const method = request.method()
    this.apiRequests.push(`${method} ${url.pathname}${url.search}`)
    const body = method === 'POST' || method === 'PUT' ? (request.postDataJSON() ?? {}) : null
    const query = url.searchParams
    const [, , resource, id, action] = url.pathname.split('/')

    if (url.pathname === '/health') return json(route, 200, { status: 'ok', database: 'ok' })

    if (resource === 'transactions') {
      if (method === 'GET' && !id) return json(route, 200, this.listTransactions(query))
      if (method === 'POST' && !id) return json(route, 201, { transaction: this.saveTransaction(body) })
      const index = this.transactions.findIndex((item) => item.id === id)
      if (index === -1) return json(route, 404, { error: 'Transaction not found.' })
      if (method === 'PUT') return json(route, 200, { transaction: this.saveTransaction(body, this.transactions[index]) })
      if (method === 'DELETE') {
        this.transactions.splice(index, 1)
        return route.fulfill({ status: 204 })
      }
    }

    if (resource === 'summary' && method === 'GET') {
      const month = query.get('month')
      if (!id) return json(route, 200, this.summary(month))
      if (id === 'categories') return json(route, 200, this.categories(month))
      if (id === 'trend') return json(route, 200, this.trend(month, Number(query.get('months') || 6)))
    }

    if (resource === 'budgets') {
      if (method === 'GET' && !id) return json(route, 200, { budgets: this.sortedBudgets() })
      if (method === 'GET' && id === 'status') return json(route, 200, this.budgetStatus(query.get('month')))
      if (method === 'POST' && !id) {
        if (this.budgets.some((budget) => budget.category === body.category)) {
          return json(route, 409, { error: `You already have a budget for ${body.category}. Change that one instead.` })
        }
        const budget = this.stamp({ id: this.newId(), user_id: USER.id, category: body.category, limit_cents: body.limit_cents })
        this.budgets.push(budget)
        return json(route, 201, { budget })
      }
      const budget = this.budgets.find((item) => item.id === id)
      if (!budget) return json(route, 404, { error: 'Budget not found.' })
      if (method === 'PUT') return json(route, 200, { budget: Object.assign(budget, this.stamp({ limit_cents: body.limit_cents })) })
      if (method === 'DELETE') {
        this.budgets = this.budgets.filter((item) => item !== budget)
        return route.fulfill({ status: 204 })
      }
    }

    if (resource === 'goals') {
      if (method === 'GET' && !id) {
        return json(route, 200, { goals: [...this.goals].sort((a, b) => b.created_at.localeCompare(a.created_at)) })
      }
      if (method === 'POST' && !id) {
        const goal = this.stamp({
          id: this.newId(),
          user_id: USER.id,
          name: body.name,
          target_cents: body.target_cents,
          saved_cents: 0,
          target_date: body.target_date ?? null,
          created_at: new Date(NOW.getTime() + this.nextId).toISOString(),
        })
        this.goals.push(goal)
        return json(route, 201, { goal })
      }
      const goal = this.goals.find((item) => item.id === id)
      if (!goal) return json(route, 404, { error: 'Goal not found.' })
      if (method === 'POST' && action === 'contributions') {
        goal.saved_cents += body.amount_cents
        return json(route, 200, { goal: this.stamp(goal) })
      }
      if (method === 'PUT') {
        Object.assign(goal, { name: body.name, target_cents: body.target_cents, target_date: body.target_date ?? null })
        return json(route, 200, { goal: this.stamp(goal) })
      }
      if (method === 'DELETE') {
        this.goals = this.goals.filter((item) => item !== goal)
        return route.fulfill({ status: 204 })
      }
    }

    this.unmocked.push(`${method} ${request.url()}`)
    return json(route, 404, { error: 'Not found.' })
  }

  newId() {
    this.nextId += 1
    return String(this.nextId)
  }

  stamp(record) {
    return Object.assign(record, {
      created_at: record.created_at ?? NOW.toISOString(),
      updated_at: NOW.toISOString(),
    })
  }

  saveTransaction(body, existing) {
    const record = existing ?? { id: this.newId(), user_id: USER.id, created_at: new Date(NOW.getTime() + this.nextId).toISOString() }
    Object.assign(record, {
      amount_cents: body.amount_cents,
      date: body.date,
      type: body.type,
      category: body.category ?? null,
      description: body.description?.trim() || null,
    })
    this.stamp(record)
    if (!existing) this.transactions.push(record)
    return record
  }

  listTransactions(query) {
    const page = Number(query.get('page') || 1)
    const q = (query.get('q') || '').trim().toLowerCase()
    const categories = query.getAll('category').filter(Boolean)
    const from = query.get('from')
    const to = query.get('to')
    const matching = this.transactions
      .filter((item) => !q || (item.description ?? '').toLowerCase().includes(q))
      .filter((item) => categories.length === 0 || categories.includes(item.category))
      .filter((item) => (!from || item.date >= from) && (!to || item.date <= to))
      .sort((a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at) || Number(b.id) - Number(a.id))
    return {
      transactions: matching.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
      pagination: {
        page,
        page_size: PAGE_SIZE,
        total_count: matching.length,
        total_pages: Math.ceil(matching.length / PAGE_SIZE),
      },
    }
  }

  inMonth(month, type) {
    return this.transactions.filter((item) => monthOf(item.date) === month && (!type || item.type === type))
  }

  summary(month) {
    const sum = (type) => this.inMonth(month, type).reduce((total, item) => total + item.amount_cents, 0)
    const income = sum('income')
    const expense = sum('expense')
    return {
      month,
      income_cents: income,
      expense_cents: expense,
      net_cents: income - expense,
      transaction_count: this.inMonth(month).length,
    }
  }

  spentBy(month) {
    const totals = Object.fromEntries(CATEGORIES.map((category) => [category, 0]))
    for (const item of this.inMonth(month, 'expense')) totals[item.category] += item.amount_cents
    return totals
  }

  categories(month) {
    const spent = this.spentBy(month)
    const categories = CATEGORIES.map((category) => ({ category, spent_cents: spent[category] }))
    return { month, total_cents: categories.reduce((total, item) => total + item.spent_cents, 0), categories }
  }

  trend(month, months) {
    return {
      month,
      months: Array.from({ length: months }, (_, i) => {
        const shown = addMonths(month, i - months + 1)
        return {
          month: shown,
          expense_cents: this.inMonth(shown, 'expense').reduce((total, item) => total + item.amount_cents, 0),
        }
      }),
    }
  }

  sortedBudgets() {
    return [...this.budgets].sort((a, b) => CATEGORIES.indexOf(a.category) - CATEGORIES.indexOf(b.category))
  }

  budgetStatus(month) {
    const spent = this.spentBy(month)
    return {
      month,
      budgets: this.sortedBudgets().map(({ id, category, limit_cents }) => {
        const spent_cents = spent[category]
        const percent_used = spent_cents > limit_cents ? Math.max(100, Math.floor((spent_cents * 100) / limit_cents)) : Math.floor((spent_cents * 100) / limit_cents)
        const status = spent_cents > limit_cents ? 'over' : percent_used >= WARNING_PERCENT ? 'warning' : 'under'
        return { id, category, limit_cents, spent_cents, remaining_cents: limit_cents - spent_cents, percent_used, status }
      }),
    }
  }
}

function json(route, status, body) {
  return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
}
