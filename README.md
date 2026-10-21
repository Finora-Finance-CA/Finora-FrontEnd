# Finora-FrontEnd

React front-end for Finora, a personal finance and budgeting app.

## Team
Syed Kazmi, Usayd Jahangiri, Ayaan Sethi

## Tech Stack
- React with Vite (JavaScript, ESLint)
- React Router
- Plain CSS, one file per component, using the design tokens in `src/index.css` (light and dark mode); see [UI system](#ui-system)
- Inter, self-hosted with `@fontsource/inter` (latin subset, weights 400, 500 and 600)
- `lucide-react` icons, imported one by one
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

| Variable | Required | Value |
| --- | --- | --- |
| `VITE_API_URL` | In production only | Leave **empty** in development. Requests go to `/api` and Vite proxies them to `http://localhost:4000` (see `vite.config.js`). In production, the API's address (see [Deployment](#deployment)). |
| `VITE_SUPABASE_URL` | Yes | `https://<project-id>.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Yes | The project's publishable key (`sb_publishable_...`) |

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

Each page is lazy-loaded (`React.lazy` in `App.jsx`), so the first download only has the app shell, routing and sign-in check. "Loading page…" shows while a page's code arrives. The signed-in pages share one layout route (`<ProtectedRoute><AppShell /></ProtectedRoute>`), so the shell stays put while you move between them.

## How auth works
- `src/lib/supabase.js` creates the one Supabase client for the app. Import it from here; never create another.
- `src/context/AuthContext.jsx` provides the session to the app (`AuthProvider`). Read it with `useAuth()` from `src/context/useAuth.js`, which returns `{ session, user, loading, signOut }`. The provider reads the saved session on load and listens for sign-in, sign-out and token refresh, so sessions survive a page refresh.
- `src/components/ProtectedRoute.jsx` sends signed-out users to `/login`, and back to the page they wanted after logging in. Wrap any new private page in it.
- `src/components/GuestRoute.jsx` sends signed-in users away from `/login` and `/register`.
- `src/pages/AuthPage.jsx` handles both login and register. The `mode` prop comes from the route. It checks the fields before sending (both filled in, an email that looks like one, and at least 8 characters to register), shows each problem under its field, and turns Supabase's errors into plain messages with `authErrorMessage` (`src/auth/authErrors.js`), so Supabase's own text never reaches the screen.
- `src/auth/token.js` exports `getAuthToken()`, which returns the current Supabase access token. It is `async`, so always `await` it.
- `src/api/client.js` (`apiRequest`) adds the token to every API request automatically, and `src/api/url.js` builds its URL from `VITE_API_URL`. Use it for all API calls rather than calling `fetch` directly.
- When a call fails with `err.kind === 'unauthorized'` (the API returned 401), show `<SessionEndedMessage />` from `src/components`. It says "Your session has ended. Sign in again.", and its link signs the user out and opens `/login`, which brings them back to the same page after logging in.
- `<ErrorAlert error={err} context="..." />` from `src/components` shows any failed request: `SessionEndedMessage` for a 401, the `ApiError`'s plain-language message otherwise, and a generic message for anything unexpected, so raw error text never reaches the screen. A 404 has `err.kind === 'not_found'`.

Email confirmation is currently **off** in Supabase, so new accounts are signed in straight away. Minimum password length is 8.

`src/components/AppShell.jsx` is the frame around every signed-in page: a **Skip to main content** link; from 1024px wide, a fixed sidebar with the logo, the main navigation (Transactions, Summary, Budgets, with icons and `aria-current="page"` on the current one) and, at the bottom, the logged-in email and **Log out**; below 1024px, a top bar with the logo and **Open menu**, which opens the same navigation and account in a sheet. The page renders into the shell's `<main id="main">`, the skip link's target. The login and register pages have no app chrome, just a centred card. `src/components/Logo.jsx` is the logo (a wordmark for now) used in the sidebar, the top bar and the sign-in card.

## Transactions page
`/transactions` has a header with **Add transaction**, a toolbar with search and filters, and **Transaction history**: a table on wide screens and stacked rows on phones.

- **List:** 20 transactions per page, newest first, as `GET /api/transactions` returns them, in a table with Date, Description, Category, Amount and a ⋯ menu. The category is a coloured pill that always shows its name. Amounts are right-aligned with tabular figures; income is green with a `+`, expenses have a `−`, and the word Income or Expense sits under each amount. On phones (under 768px) each row is two lines: description and amount, then date and category. The table keeps its table roles on phones too.
- **States:** placeholder rows while the first page loads (with "Loading transactions…" for screen readers); "You haven't added any transactions yet." with **Add your first transaction**, which opens the add drawer; "No transactions match your search and filters." with **Clear all filters**; an error with **Try again**; and **Sign in again** if the session has ended. While another page or filter loads, the rows on screen stay, dimmed. Under the table, "Showing 21 to 40 of 57 transactions."
- **Paging:** **Previous** and **Next** under the table, with "Page 2 of 3". Focus moves to the Transaction history heading when the page changes. Hidden when everything fits on one page.
- **Search:** finds transactions whose description contains the text, in any case. It runs 300 ms after typing stops, or straight away on Enter.
- **Filters:** **Category** opens a list of checkboxes (choose any number); its button says "All categories", the one chosen, or "2 categories". **Date** opens presets: All time, This month (the 1st to the last day), Last month, Last 90 days (today and the 89 days before) and Custom (**From** and **To**, both inclusive). A preset only sets the `from` and `to` URL params; one in the URL shows as that preset. A To date before the From date is explained under To, and the list isn't loaded until it's fixed. Search and filters all work together, and **Clear filters** resets them and the page. On phones, Category and Date move into a **Filters** sheet (its button says how many are on), which applies them as they change.
- **URL:** the search, filters and page are kept in the URL (e.g. `/transactions?q=lunch&category=Food&page=2`), so refreshing, **Back** and shared links keep them. Anything invalid in the URL is ignored. Changing a search or filter goes back to page 1.
- **After a change:** adding, editing or deleting a transaction loads the current page again, so it always matches the API (an edited row updates in place straight away, and a deleted one disappears straight away, while that happens). If a delete empties the last page, the list steps back a page.
- **Add:** **Add transaction** opens a drawer from the right (a bottom sheet on phones) on the Amount field, with an **Expense** / **Income** switch. The expense form has a category; the income form doesn't. Changing type keeps what's typed. The existing checks run on **Save**, with each error under its field. After a save the drawer closes, "Expense of $12.50 saved." shows above the table, focus goes back to **Add transaction**, and the list loads again.
- **Row actions:** each row's ⋯ button is named for the transaction ("Actions for Lunch, $12.50, Oct 5, 2026") and opens a menu with **Edit** and **Delete**. The arrow keys, Home and End move through it, Escape closes it, and focus returns to ⋯.
- **Edit:** opens the same form in a drawer, filled in with the saved values. Amount, date, description and (for expenses) category can change; the type can't. **Save changes** sends `PUT /api/transactions/:id`. **Cancel**, **Close** or **Escape** closes without saving.
- **Delete:** opens a dialog showing the amount, date and description, with **Cancel** focused. **Delete** sends `DELETE /api/transactions/:id` and shows "Transaction deleted."
- If a transaction was already deleted (for example in another tab), editing or deleting it removes it from the list and says so. Any other failure leaves the data as it was and shows a plain-language message.
- Drawers and dialogs work by keyboard: focus moves into them, Tab stays inside, Escape closes them (except while a request is running), and focus returns to the button that opened them. Buttons are disabled while their request runs, so nothing is sent twice.

| File | Job |
| --- | --- |
| `src/pages/TransactionsPage.jsx` | The header and add drawer, the status message, and the list's search, filters and page in the URL |
| `src/transactions/listQuery.js` | Reads and writes the search, filters and page in the URL |
| `src/transactions/useTransactions.js` | Loads one page for the current query, and again after adds, edits and deletes |
| `src/transactions/transactionList.js` | Pure helpers that patch the rows on screen while the page reloads |
| `src/transactions/TransactionHistory.jsx` | The history section, its states, and which drawer or dialog is open |
| `src/transactions/TransactionTable.jsx` | The table, its placeholder rows, and its phone layout |
| `src/transactions/TransactionRow.jsx` | One row and its ⋯ menu |
| `src/transactions/TransactionFilters.jsx` | The toolbar: search, the Category and Date popovers, Clear filters, and the Filters sheet on phones |
| `src/transactions/CategoryOptions.jsx`, `DateRangeOptions.jsx` | The category checkboxes and date presets, shared by the popovers and the sheet |
| `src/transactions/datePresets.js` | What This month, Last month and Last 90 days mean as From and To dates |
| `src/transactions/Pagination.jsx` | Previous, Next and "Page 2 of 3" |
| `src/transactions/CategoryLabel.jsx` | A category's coloured pill |
| `src/transactions/AddTransactionDrawer.jsx` | `TransactionForm` with the type switch, in a drawer |
| `src/transactions/EditTransactionDialog.jsx` | `TransactionForm` in edit mode, in a drawer |
| `src/transactions/DeleteTransactionDialog.jsx` | The delete confirmation |
| `src/transactions/money.js` | Dollars to cents and back, and display formatting, with whole-number maths only |
| `src/transactions/constants.js` | Categories and their label colours, page size, search limits and form rules. Mirrors the API's `src/constants.js`. |

Category label colours are set once, in `CATEGORY_COLORS` in `constants.js`, for light and dark mode. `constants.test.js` checks every text and background pair is at least 4.5:1.

## Summary page
`/summary` shows one month's **Total income**, **Total expenses** and **Net balance** from `GET /api/summary`, as three stat cards with amounts from `formatCents`. The month switcher sits in the page header.

- **Month:** starts on the user's current month (in their own time zone). **Previous** and **Next** step a month at a time, across years too, and the month's name (e.g. "October 2026") is announced when it changes. **This month** jumps back. The month is in the URL (`/summary?month=2026-09`), so refresh and **Back** keep it; an invalid month in the URL shows the current month. January 1900 is the earliest.
- **Net balance:** a surplus is green with the word **Surplus**; a deficit is red, with a minus sign and the word **Deficit**; equal income and expenses say **Even**. Colour is never the only signal.
- **States:** placeholder cards while the first month loads (with "Loading summary…" for screen readers), an error with **Try again** (or **Sign in again** if the session has ended), "No transactions in August 2026." with a link to add one under the $0.00 cards, and the cards. While another month loads, the last one stays on screen, dimmed.

## Budgets page
`/budgets` has a row for every category (`BUDGET_CATEGORIES`), each with its monthly limit or "No limit set".

- **Set limit** or **Edit** opens a small form in the row. Typed dollars become cents with string parsing only (`readDollars` in `money.js`, shared with the transaction form), so "1,000.00", "$12" and " 40 " all work and nothing goes through floating point. **Save limit** sends `POST /api/budgets` (new) or `PUT /api/budgets/:id` (change). **Cancel** or **Escape** closes the form, and focus goes back to the row's button.
- **Invalid limits** (US-33): empty, zero, negative and non-numeric limits are blocked with "Enter a limit greater than zero."; more than two decimals with "Use at most two decimal places, like 500.00." The error is under the field and linked to it. If the API still rejects a limit, its message shows on the field ("Limit must be greater than zero.").
- **Duplicates:** if a limit for that category was added somewhere else meanwhile, the API's 409 message shows ("You already have a budget for Food. Change that one instead.") and the list loads again, so the next **Save limit** changes that one.
- **Remove** asks first, in a dialog with **Cancel** focused. **Remove limit** sends `DELETE /api/budgets/:id`.
- **Feedback:** each row says what happened ("Food limit saved: $500.00 a month.", "Food limit removed.") until the next change. Nothing disappears on a timer. A limit that was removed somewhere else is taken off the row with a message.
- **States:** a placeholder row per category while loading (with "Loading budgets…" for screen readers), an error with **Try again** (or **Sign in again**), and a note when no limits are set yet.

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
- Every UI primitive has its own test next to it in `src/components/ui` (what it renders, its accessible name, and its keyboard behaviour), and `src/pages/AuthPage.test.jsx` covers login and register.
- Focus that moves in an effect (after a dialog closes, after a save) and reloads started in an effect can land in a later task than the change that caused them, so assert them inside `waitFor`.
- `src/api/url.test.js` covers where requests go with and without `VITE_API_URL`, `src/lib/staleChunks.test.js` the reload after a redeploy, and `src/deployment.test.js` that `vercel.json` serves the app for every route in `App.jsx` but never for `/assets/` or `/api/` paths.

### CI
`.github/workflows/test.yml` runs `npm ci`, `npm run lint`, `npm test` and `npm run build` on Node 22 for every push and pull request. It needs no secrets. A pull request should only be merged when all four pass.

## Adding a protected page
1. Create the page in `src/pages`. Wrap it in `<div className="page">` (the shared layout in `index.css`) and start it with `<PageHeader title="..." />`; the app shell already provides `<main id="main">`.
2. Add a lazy route in `App.jsx` inside the layout route that renders `<AppShell />`, and add it to `LINKS` in `AppShell.jsx` (with a lucide icon) if it belongs in the main navigation.
3. Call the API with `apiRequest` from `src/api/client.js`.
4. Get the current user with `useAuth()` if the page needs it.

## UI system
The look is set by tokens in `src/index.css`, and pages are built from the primitives in `src/components/ui`. Component stylesheets use the tokens only: no raw colours, font sizes, spacing, radii, shadows or durations. Inline styles are used only to pass dynamic values as CSS variables (category colours).

- **Colour:** neutral surfaces (`--bg`, `--surface`, `--surface-2`, `--surface-3`), `--border`, `--border-field` (control edges, 3:1 or more), `--text` and `--text-muted` (4.5:1 or more on every surface, in both modes), one accent (`--accent` Cobalt, `--accent-text`, `--accent-tint`, `--ring`), and `--positive` / `--negative` for money and status only. Dark mode follows the operating system.
- **Type:** Inter at 12, 14, 16, 20, 24 and 32px (`--text-xs` to `--text-2xl`, each with its `--leading-*`), weights 400, 500 and 600. Add the `tabular` class to anything with figures.
- **Space and shape:** `--space-1` to `--space-9` (4, 8, 12, 16, 24, 32, 40, 48, 64px); radii 4, 6, 10 and 14px plus pills; shadows only on floating layers (`--shadow-popover`, `--shadow-overlay`).
- **Motion:** 150ms (`--duration-fast`) for hover and menus, 200ms (`--duration-base`) for drawers and sheets, ease-out, transform and opacity only; all of it is off with `prefers-reduced-motion`.
- **Touch and focus:** controls are at least 44px tall (`--control-h`); compact ones look 36px and keep a 44px hit area. Every control shows a 2px focus ring.
- **Breakpoints:** 768px (table rows, drawer or sheet, toolbar) and 1024px (sidebar or top bar). Tested at 375, 768, 1024 and 1440px.

| Primitive | Props |
| --- | --- |
| `Button` | `variant` (primary, secondary, ghost, danger), `size` (md, sm), `icon`, `fullWidth`, plus any button attribute |
| `IconButton` | `icon`, `label` (its accessible name), `variant` (ghost, secondary) |
| `Field` | `id`, `label`, `hint`, `error`, `optional`, and a render function that gets the control's id and aria props |
| `Input` | `icon` (inside the start), `trailing` (inside the end), plus any input attribute |
| `Select` | Any select attribute; a native select with a chevron |
| `Checkbox` | `label`, `swatch` ({ light, dark }), plus any checkbox attribute |
| `SegmentedControl` | `name`, `legend`, `value`, `options` ([{ value, label }]), `onChange`, `disabled`: a radio group |
| `Menu` | `label`, `icon`, `items` ([{ label, onSelect(trigger), tone }]): a WAI-ARIA menu button |
| `Popover` | `label`, `buttonContent`, `align`, `children`: a non-modal panel under a button |
| `Dialog` | `title`, `onClose`, `variant` (dialog, drawer, sheet, nav), `canClose`, `initialFocusRef`, `returnFocusRef`, `fallbackFocusRef` |
| `Card` | `as`, `padded` |
| `Pill` | `colors` ({ light, dark } text and background) |
| `Alert` | `tone` (error, success), `role` |
| `Skeleton` | `shape` (text, short, amount, pill, figure) |
| `EmptyState` | `icon`, `title`, `action`, and detail as children |
| `PageHeader` | `title`, `subtitle`, `actions` |
| `Toolbar` | `as`, plus any attribute (e.g. `role="search"`) |

Every `Dialog` variant shares one focus trap, `useModalLayer` (`src/components/ui/useModalLayer.js`): the page behind is inert, Tab stays inside, Escape closes, and focus returns to the opener. Don't write another. Menus and popovers return focus to their button on Escape. Data loading stays in the hooks and `src/api` modules; primitives never fetch.

## Deployment
The front-end runs on **Vercel**, set up by `vercel.json` in this repo. The API runs on Render; see the Deployment section in [Finora-API](https://github.com/Finora-Finance-CA/Finora-API#deployment), which also covers Supabase. Vercel builds the static site from GitHub, so there's nothing to run on your machine.

### 1. Order of operations
1. Deploy the API on Render first and note its URL, for example `https://finora-api.onrender.com`.
2. Deploy this repo on Vercel with `VITE_API_URL` set to that URL (step 2).
3. Put the front-end's URL in the API's `CLIENT_ORIGIN` on Render (Finora-API, Deployment, step 2.7).
4. Set the Supabase Auth Site URL and redirect URLs to the front-end's URL (Finora-API, Deployment, step 3).
5. Verify (step 3 below).

### 2. Create the Vercel project
1. In Vercel: **Add New**, then **Project**. Import `Finora-Finance-CA/Finora-FrontEnd` (give Vercel access to the organisation if it isn't listed).
2. Vercel reads `vercel.json`. Leave the build settings as they are:
   - Framework: Vite
   - Install command: `npm ci`
   - Build command: `npm run build`
   - Output directory: `dist`
3. Under **Environment Variables**, add these three for **Production** (and **Preview** if you want preview links to work):

   | Variable | Value |
   | --- | --- |
   | `VITE_API_URL` | The Render URL, for example `https://finora-api.onrender.com`. No `/api` on the end. |
   | `VITE_SUPABASE_URL` | `https://<project-id>.supabase.co` |
   | `VITE_SUPABASE_PUBLISHABLE_KEY` | The publishable key (`sb_publishable_...`). Never the secret key. |

   These are built into the public JavaScript, so they must only ever be values that are safe to show. Never add `DATABASE_URL` or any API secret here.
4. Click **Deploy**. When it's done, the project's URL is shown, for example `https://finora.vercel.app`. That exact origin goes in the API's `CLIENT_ORIGIN`.
5. In **Settings**, **Build and Deployment**, check **Node.js Version** is **22.x** (`engines` in `package.json` asks for it).
6. In **Settings**, **Git**, the production branch is the repo's default branch (`main`). Change it to `develop` if you're deploying before `develop` is merged into `main`.

**How refreshes work:** `vercel.json` sends every path that isn't a file to `index.html`, so `/transactions`, `/summary?month=2026-09` and `/budgets` load the app on a refresh or a shared link, and React Router shows the page. Paths under `/assets/` and `/api/` are left alone, so a missing file is a real `404` instead of the app's HTML.

**How pages load:** each page is its own file in `/assets/` with a hash in its name, loaded from an absolute path, so it loads the same from any URL. These files are cached for a year (the hash changes when they do) and `index.html` is always checked for a new version. If a tab that was open during a redeploy opens a page whose old file is gone, the app reloads once to pick up the new version (`src/lib/staleChunks.js`).

**Where requests go:** `src/api/url.js` builds every request URL. With `VITE_API_URL` empty (development), requests go to `/api` and the Vite proxy sends them to `http://localhost:4000`. In a production build, a missing or invalid `VITE_API_URL` is reported in the browser console.

### 3. Verify
On the live site, in a private window:

1. Register a new account, then log out and log in.
2. Add an expense and an income, then search and filter for them.
3. Open **Summary**, then **Budgets**, and set a limit.
4. On `/budgets`, do a hard refresh (Ctrl+Shift+R). The page loads, not a 404.
5. In DevTools, **Network**: API calls go to the Render URL. **Console**: no CORS errors and no `VITE_API_URL` message.

If the app says it can't reach the server and the Console shows a CORS error, the API's `CLIENT_ORIGIN` doesn't exactly match this site's origin.

### 4. Redeploy and roll back
- **Redeploy:** merging into the production branch deploys automatically. `VITE_` values are read at build time, so after changing one, open **Deployments**, then the latest one's **⋯** menu, and choose **Redeploy**.
- **Roll back:** **Deployments**, find the last good one, **⋯**, **Promote to Production** (Instant Rollback). It's live in seconds. Then revert the bad change in Git, or the next merge deploys it again.

### 5. Known limits for demo day
- The API is on Render's free tier and sleeps after 15 minutes without requests. The first request after that can take up to a minute; the app gives up after 20 seconds with "The server took too long to respond", and **Try again** works once it's awake. Open the API's `/health` 5 minutes before the demo.
- Supabase free projects pause after a week without activity, and then sign-in and every page fail. The day before the demo, open the Supabase dashboard and restore the project if it's paused.

## Workflow
- `develop` holds the current sprint's work. `main` is only updated at the end of each sprint, through one PR from `develop`.
- Branch from an up-to-date `develop`: `<name>/US-XX-short-description`.
- Open a PR into `develop`, reference the story, and get one teammate's approval before merging. Don't merge your own PR.
- Never commit `.env`.

## Related Repos
- [Finora-API](https://github.com/Finora-Finance-CA/Finora-API)