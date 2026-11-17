import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'dist-e2e', 'test-results', 'playwright-report', 'e2e-screenshots']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
  {
    // Browser tests and their config run in Node (Playwright), with code that also runs
    // in the page.
    files: ['e2e/**/*.js', 'playwright.config.js'],
    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
    },
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
  {
    // Test helpers are never hot-reloaded, so Fast Refresh's export rule doesn't apply.
    files: ['src/test/**', 'src/**/*.test.{js,jsx}'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
])
