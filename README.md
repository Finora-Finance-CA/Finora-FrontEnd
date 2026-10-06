# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## Running against the local API

The front-end expects the API from the sibling repo [Finora-API](https://github.com/Finora-Finance-CA/Finora-API) running on `http://localhost:4000`. In development, Vite proxies every `/api` request to it (see `vite.config.js`), so the API doesn't need CORS set up.

1. Start the API (in `Finora-API`): `npm run dev`
2. Start the front-end (in this repo): `npm install`, then `npm run dev`, and open http://localhost:5173

### Testing before login exists

API calls need a token. Until login is built, use a development token:

1. In `Finora-API`, generate one (valid for 1 hour). Use a test email, because the script creates the user in the shared database if it doesn't exist:

   ```powershell
   npm run --silent dev:token -- you+test@example.com
   ```

2. In this repo, create `.env.development.local` (git-ignored, see `.env.example`) and paste the token:

   ```
   VITE_DEV_TOKEN=<paste the token here>
   ```

3. Restart `npm run dev`. Vite only reads env files at startup.

`VITE_DEV_TOKEN` is only used by the dev server and is never included in a production build. A token saved in `localStorage` under `finora.accessToken` (where login will put it) takes priority over it.

To point at an API somewhere else, set `VITE_API_URL` (for example `https://api.example.com`). Leave it empty to use the dev proxy.
