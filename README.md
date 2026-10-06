# Finora-FrontEnd

React front-end for Finora, a personal finance and budgeting app.

## Team
Syed Kazmi, Usayd Jahangiri, Ayaan Sethi

## Tech Stack
- React with Vite (JavaScript, ESLint)
- React Router
- Tailwind CSS
- Supabase Auth (`@supabase/supabase-js`) for sign-up, login and sessions
- Vitest and Testing Library for tests

## Getting Started

```bash
nvm use
npm install
cp .env.example .env
```

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
| `npm test` | Runs the tests once |
| `npm run lint` | Checks the code with ESLint |

## Switching to Supabase Auth: what to do after pulling
1. Run `npm install` (`@supabase/supabase-js` was added).
2. Update `.env` to match `.env.example`: add the two `VITE_SUPABASE_` variables, keep `VITE_API_URL` empty, and delete `VITE_DEV_TOKEN` if you have it.
3. Register an account at `/register` to test. Dev tokens no longer work.
4. `BrowserRouter` moved from `App.jsx` to `main.jsx`, where it wraps `AuthProvider`. New routes still go in `App.jsx`.

## Routes

| Path | Who can see it | Page |
| --- | --- | --- |
| `/login` | Signed-out users only | `AuthPage` in login mode |
| `/register` | Signed-out users only | `AuthPage` in register mode |
| `/transactions` | Signed-in users only | `TransactionsPage` |
| `/` | Everyone | Redirects to `/transactions` (or `/login` if signed out) |

## How auth works
- `src/lib/supabase.js` creates the one Supabase client for the app. Import it from here; never create another.
- `src/context/AuthContext.jsx` provides `useAuth()`, which returns `{ session, user, loading, signOut }`. It reads the saved session on load and listens for sign-in, sign-out and token refresh, so sessions survive a page refresh.
- `src/components/ProtectedRoute.jsx` sends signed-out users to `/login`, and back to the page they wanted after logging in. Wrap any new private page in it.
- `src/components/GuestRoute.jsx` sends signed-in users away from `/login` and `/register`.
- `src/pages/AuthPage.jsx` handles both login and register. The `mode` prop comes from the route.
- `src/auth/token.js` exports `getAuthToken()`, which returns the current Supabase access token. It is `async`, so always `await` it.
- `src/api/client.js` (`apiRequest`) adds the token to every API request automatically. Use it for all API calls rather than calling `fetch` directly.

Email confirmation is currently **off** in Supabase, so new accounts are signed in straight away. Minimum password length is 8.

A temporary status bar in `App.jsx` shows who is logged in and has a Log out button. Remove it once there's a real navigation bar.

## Adding a protected page
1. Create the page in `src/pages`.
2. Add a route in `App.jsx`, wrapped in `<ProtectedRoute>`.
3. Call the API with `apiRequest` from `src/api/client.js`.
4. Get the current user with `useAuth()` if the page needs it.

## Workflow
- `develop` holds the current sprint's work. `main` is only updated at the end of each sprint, through one PR from `develop`.
- Branch from an up-to-date `develop`: `<name>/US-XX-short-description`.
- Open a PR into `develop`, reference the story, and get one teammate's approval before merging. Don't merge your own PR.
- Never commit `.env`.

## Related Repos
- [Finora-API](https://github.com/Finora-Finance-CA/Finora-API)