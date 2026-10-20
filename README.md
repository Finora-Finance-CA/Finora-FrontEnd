# Finora-FrontEnd

React front-end for Finora, a personal finance and budgeting app.

## Team
Syed Kazmi, Usayd Jahangiri, Ayaan Sethi

## Tech Stack
- React with Vite (JavaScript, ESLint)
- React Router
- Plain CSS, one file per component, with shared colour tokens in `src/index.css` (light and dark mode)
- Supabase Auth (`@supabase/supabase-js`) for sign-up, login and sessions
- Vitest and Testing Library for tests

## Getting Started

```bash
nvm use 22
npm install
cp .env.example .env
```

The project uses Node 22. Use `nvm use 22` as shown: nvm-windows ignores `.nvmrc` files. In PowerShell, use `Copy-Item .env.example .env` instead of `cp`.

Fill in `.env` (real values are in the team's credential document):

| Variable | Value |
| --- | --- |
| `VITE_API_URL` | Leave **empty** in development. Requests go to `/api` and Vite proxies them to `http://localhost:4000` (see `vite.config.js`). |
| `VITE_SUPABASE_URL` | `https://<project-id>.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | The project's publishable key (`sb_publishable_...`) |

Use `.env` only (not `.env.development.local`), so everyone has the same setup. Restart `npm run dev` after changing it; Vite only reads `.env` on startup.

Start the API first (see Finora-API), then:

```bash
npm run dev
```

The app runs at http://localhost:5173.

| Command | What it does |
| --- | --- |
| `npm run dev` | Starts the dev server |
| `npm test` | Runs the tests once (no API, Supabase or `.env` needed) |
| `npm run build` | Builds the production bundle into `dist/` |
| `npm run lint` | Checks the code with ESLint |

## Switching to Supabase Auth: what to do after pulling
1. Run `npm install` (`@supabase/supabase-js` was added).
2. Update `.env` to match `.env.example`: add the two `VITE_SUPABASE_` variables, keep `VITE_API_URL` empty, and remove any variable that isn't in `.env.example`.
3. Register an account at `/register` to test.
4. `BrowserRouter` moved from `App.jsx` to `main.jsx`, where it wraps `AuthProvider`. New routes still go in `App.jsx`.

## Routes

| Path | Who can see it | Page |
| --- | --- | --- |
| `/login` | Signed-out users only | `AuthPage` in login mode |
| `/register` | Signed-out users only | `AuthPage` in register mode |
| `/transactions` | Signed-in users only | `TransactionsPage`. Takes `?q=`, `?category=` (repeatable), `?from=`, `?to=` and `?page=` for the list's search, filters and page. |
| `/summary` | Signed-in users only | `SummaryPage`. Takes `?month=YYYY-MM`; without it (or with an invalid one) it shows the current month. |
| `/budgets` | Signed-in users only | `BudgetsPage` |
| `/` | Everyone | Redirects to `/transactions` (or `/login` if signed out) |

Each page is lazy-loaded (`React.lazy` in `App.jsx`), so the first download only has the header, routing and sign-in check. "Loading page…" shows while a page's code arrives.

## How auth works
- `src/lib/supabase.js` creates the one Supabase client for the app. Import it from here; never create another.
- `src/context/AuthContext.jsx` provides the session to the app (`AuthProvider`). Read it with `useAuth()` from `src/context/useAuth.js`, which returns `{ session, user, loading, signOut }`. The provider reads the saved session on load and listens for sign-in, sign-out and token refresh, so sessions survive a page refresh.
- `src/components/ProtectedRoute.jsx` sends signed-out users to `/login`, and back to the page they wanted after logging in. Wrap any new private page in it.
- `src/components/GuestRoute.jsx` sends signed-in users away from `/login` and `/register`.
- `src/pages/AuthPage.jsx` handles both login and register. The `mode` prop comes from the route.
- `src/auth/token.js` exports `getAuthToken()`, which returns the current Supabase access token. It is `async`, so always `await` it.
- `src/api/client.js` (`apiRequest`) adds the token to every API request automatically. Use it for all API calls rather than calling `fetch` directly.
- When a call fails with `err.kind === 'unauthorized'` (the API returned 401), show `<SessionEndedMessage />` from `src/components`. It says "Your session has ended. Sign in again.", and its link signs the user out and opens `/login`, which brings them back to the same page after logging in.
- `<ErrorAlert error={err} context="..." />` from `src/components` shows any failed request: `SessionEndedMessage` for a 401, the `ApiError`'s plain-language message otherwise, and a generic message for anything unexpected, so raw error text never reaches the screen. A 404 has `err.kind === 'not_found'`.

Email confirmation is currently **off** in Supabase, so new accounts are signed in straight away. Minimum password length is 8.

`src/components/AppHeader.jsx` is the bar at the top of every page: a **Skip to main content** link, the app name, the main navigation (Transactions, Summary, Budgets, with `aria-current="page"` on the current one) and, apart from the links, the logged-in email and **Log out**. Signed-out visitors only see the app name. On a narrow phone the links move to their own row. Every page's `<main>` has `id="main"` for the skip link.

## Transactions page
`/transactions` has the Add expense / Add income form at the top and **Transaction history** below it.

- **List:** 20 transactions per page, newest first, as `GET /api/transactions` returns them. Each row shows the date, type, category, description and amount. The category is a coloured label that always shows its name. Income is green with a `+` and the word Income; expenses have a `−` and the word Expense.
- **States:** a loading message; "You haven't added any transactions yet." with **Add your first transaction**, which moves focus to the form's Amount field; "No transactions match your search and filters." with **Clear all filters**; an error with **Try again**; and **Sign in again** if the session has ended. A line above the list says which transactions are showing, e.g. "Showing 21 to 40 of 57 transactions."
- **Paging:** **Previous** and **Next** below the list, with "Page 2 of 3". Focus moves to the Transaction history heading when the page changes. Hidden when everything fits on one page.
- **Search:** finds transactions whose description contains the text, in any case. It runs 300 ms after typing stops, or straight away on Enter.
- **Filters:** category chips (choose any number) and **From** / **To** dates (both inclusive). A To date before the From date is explained next to the field, and the list isn't loaded until it's fixed. Search and filters all work together, and **Clear all** resets them and the page.
- **URL:** the search, filters and page are kept in the URL (e.g. `/transactions?q=lunch&category=Food&page=2`), so refreshing, **Back** and shared links keep them. Anything invalid in the URL is ignored. Changing a search or filter goes back to page 1.
- **After a change:** adding, editing or deleting a transaction loads the current page again, so it always matches the API (an edited row updates in place straight away, and a deleted one disappears straight away, while that happens). If a delete empties the last page, the list steps back a page.
- **Edit:** opens a dialog with the same form, filled in with the saved values. Amount, date, description and (for expenses) category can change; the type can't. **Save changes** sends `PUT /api/transactions/:id`. **Cancel** or **Escape** closes without saving.
- **Delete:** opens a dialog showing the amount, date and description, with **Cancel** focused. **Delete** sends `DELETE /api/transactions/:id` and shows "Transaction deleted."
- If a transaction was already deleted (for example in another tab), editing or deleting it removes it from the list and says so. Any other failure leaves the data as it was and shows a plain-language message.
- The dialogs work by keyboard: focus moves into the dialog, Tab stays inside it, Escape closes it (except while a request is running), and focus returns to the button that opened it. Buttons are disabled while their request runs, so nothing is sent twice.

| File | Job |
| --- | --- |
| `src/pages/TransactionsPage.jsx` | Puts the form and the history on the page, and keeps the list's search, filters and page in the URL |
| `src/transactions/listQuery.js` | Reads and writes the search, filters and page in the URL |
| `src/transactions/useTransactions.js` | Loads one page for the current query, and again after adds, edits and deletes |
| `src/transactions/transactionList.js` | Pure helpers that patch the rows on screen while the page reloads |
| `src/transactions/TransactionHistory.jsx` | The history section, its states, and which dialog is open |
| `src/transactions/TransactionFilters.jsx` | The search box, category chips, date range and Clear all |
| `src/transactions/Pagination.jsx` | Previous, Next and "Page 2 of 3" |
| `src/transactions/CategoryLabel.jsx` | A category's coloured label |
| `src/transactions/TransactionListItem.jsx` | One row |
| `src/transactions/EditTransactionDialog.jsx` | `TransactionForm` in edit mode inside a `Dialog` |
| `src/transactions/DeleteTransactionDialog.jsx` | The delete confirmation |
| `src/components/Dialog.jsx` | The accessible modal both dialogs use |
| `src/transactions/money.js` | Dollars to cents and back, and display formatting, with whole-number maths only |
| `src/transactions/constants.js` | Categories and their label colours, page size, search limits and form rules. Mirrors the API's `src/constants.js`. |

Category label colours are set once, in `CATEGORY_COLORS` in `constants.js`, for light and dark mode. `constants.test.js` checks every text and background pair is at least 4.5:1.

## Summary page
`/summary` shows one month's **Total income**, **Total expenses** and **Net balance** from `GET /api/summary`, as three cards with amounts from `formatCents`.

- **Month:** starts on the user's current month (in their own time zone). **Previous** and **Next** step a month at a time, across years too, and the month's name (e.g. "October 2026") is announced when it changes. **This month** jumps back. The month is in the URL (`/summary?month=2026-09`), so refresh and **Back** keep it; an invalid month in the URL shows the current month. January 1900 is the earliest.
- **Net balance:** a surplus is green with the word **Surplus**; a deficit is red, with a minus sign and the word **Deficit**; equal income and expenses say **Even**. Colour is never the only signal.
- **States:** "Loading summary…", an error with **Try again** (or **Sign in again** if the session has ended), "No transactions in August 2026." with a link to add one, and the cards. While another month loads, the last one stays on screen, dimmed.

## Budgets page
`/budgets` has a row for every category (`BUDGET_CATEGORIES`), each with its monthly limit or "No limit set".

- **Set limit** or **Edit** opens a small form in the row. Typed dollars become cents with string parsing only (`readDollars` in `money.js`, shared with the transaction form), so "1,000.00", "$12" and " 40 " all work and nothing goes through floating point. **Save limit** sends `POST /api/budgets` (new) or `PUT /api/budgets/:id` (change). **Cancel** or **Escape** closes the form, and focus goes back to the row's button.
- **Invalid limits** (US-33): empty, zero, negative and non-numeric limits are blocked with "Enter a limit greater than zero."; more than two decimals with "Use at most two decimal places, like 500.00." The error is under the field and linked to it. If the API still rejects a limit, its message shows on the field ("Limit must be greater than zero.").
- **Duplicates:** if a limit for that category was added somewhere else meanwhile, the API's 409 message shows ("You already have a budget for Food. Change that one instead.") and the list loads again, so the next **Save limit** changes that one.
- **Remove** asks first, in a dialog with **Cancel** focused. **Remove limit** sends `DELETE /api/budgets/:id`.
- **Feedback:** each row says what happened ("Food limit saved: $500.00 a month.", "Food limit removed.") until the next change. Nothing disappears on a timer. A limit that was removed somewhere else is taken off the row with a message.
- **States:** "Loading budgets…", an error with **Try again** (or **Sign in again**), and a note when no limits are set yet.

| File | Job |
| --- | --- |
| `src/pages/SummaryPage.jsx` | The month in the URL, and the summary's states |
| `src/summary/MonthSelector.jsx` | Previous, the month's name, Next and This month |
| `src/summary/SummaryCards.jsx` | The three cards, and Surplus / Deficit / Even |
| `src/summary/months.js` | Months as `YYYY-MM`: the current month, stepping, and "October 2026" labels, with no time zone maths |
| `src/summary/useMonthlySummary.js` | Loads a month's summary |
| `src/pages/BudgetsPage.jsx` | One row per category, and the page's states |
| `src/budgets/BudgetRow.jsx` | One category's limit, its form, and its messages |
| `src/budgets/RemoveBudgetDialog.jsx` | The remove confirmation |
| `src/budgets/limits.js` | Dollars to cents for a limit, with the limit's messages |
| `src/budgets/useBudgets.js` | Loads the budgets and keeps them current |
| `src/api/summary.js`, `src/api/budgets.js` | The API calls |

A 409 from the API becomes an `ApiError` with `kind: 'conflict'` and the API's own message (it's written for people), or "That already exists." if it has none.

## Tests

```bash
npm test
```

Runs every `src/**/*.test.{js,jsx}` file once with Vitest, in jsdom, and exits. The tests never call the API or Supabase:

- `src/test/setup.js` runs first in every file. It adds the jest-dom matchers (`toBeInTheDocument`, `toHaveFocus`, ...), replaces `src/lib/supabase.js` with `src/test/fakeSupabase.js` (signed in by default; `resetFakeSupabase({ session: null })` signs out), and cleans up after each test.
- Tests that render pages mock the API modules (`vi.mock('../api/transactions')`, `'../api/summary'`, `'../api/budgets'`) and set what each function returns. Reset the mocks in `beforeEach`: `restoreMocks` doesn't clear queued `mockResolvedValueOnce` values. Summary tests fix the clock with `vi.useFakeTimers({ toFake: ['Date'] })`, so only dates are faked. `src/test/transactions.js` builds transactions shaped like the API's, and `pageOf([...])` builds the `{ transactions, pagination }` that `listTransactions` returns.
- `renderApp(path)` from `src/test/renderApp.jsx` renders the whole app (routes and `AuthProvider`) at a path, so tests use the page the way a user does. `currentPath()` and `currentSearch()` say where the app is now. Pages are lazy-loaded, so use `findBy...` for the first thing on a page; `setup.js` gives those waits up to 5 seconds.

### CI
`.github/workflows/test.yml` runs `npm ci`, `npm run lint`, `npm test` and `npm run build` on Node 22 for every push and pull request. It needs no secrets. A pull request should only be merged when all four pass.

## Adding a protected page
1. Create the page in `src/pages`, with `<main id="main" className="page">` (the skip link's target and the shared layout in `index.css`).
2. Add a lazy route in `App.jsx`, wrapped in `<ProtectedRoute>`, and a link in `AppHeader.jsx` if it belongs in the main navigation.
3. Call the API with `apiRequest` from `src/api/client.js`.
4. Get the current user with `useAuth()` if the page needs it.

## Workflow
- `develop` holds the current sprint's work. `main` is only updated at the end of each sprint, through one PR from `develop`.
- Branch from an up-to-date `develop`: `<name>/US-XX-short-description`.
- Open a PR into `develop`, reference the story, and get one teammate's approval before merging. Don't merge your own PR.
- Never commit `.env`.

## Related Repos
- [Finora-API](https://github.com/Finora-Finance-CA/Finora-API)