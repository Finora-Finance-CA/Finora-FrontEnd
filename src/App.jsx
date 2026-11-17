import { Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router'
import AppShell from './components/AppShell'
import { ErrorBoundary } from './components/ErrorBoundary'
import GuestRoute from './components/GuestRoute'
import PageLoading from './components/PageLoading'
import ProtectedRoute from './components/ProtectedRoute'
import { ToastProvider } from './components/ui/Toast'
import { TransactionsSyncProvider } from './context/TransactionsSyncContext'
import { lazyPage } from './lib/lazyPage'

// Each page is its own chunk, loaded when it's first opened, so the first download
// stays small. The app shell, routing and sign-in check load straight away. lazyPage
// lets a page whose code failed to download (e.g. offline) be tried again.
const AuthPage = lazyPage(() => import('./pages/AuthPage'))
const BudgetsPage = lazyPage(() => import('./pages/BudgetsPage'))
const SummaryPage = lazyPage(() => import('./pages/SummaryPage'))
const TransactionsPage = lazyPage(() => import('./pages/TransactionsPage'))
const DashboardPage = lazyPage(() => import('./pages/DashboardPage'))
const GoalsPage = lazyPage(() => import('./pages/GoalsPage'))

function App() {
    return (
        <ToastProvider>
            {/* The last line of defence: never a blank screen (US-57). Signed-in pages
                also have their own boundary inside the app shell (AppShell.jsx). */}
            <ErrorBoundary variant="app">
                <Suspense fallback={<PageLoading />}>
                    <Routes>
                        <Route path="/login" element={
                            <GuestRoute><AuthPage key="login" mode="login" /></GuestRoute>
                        } />
                        <Route path="/register" element={
                            <GuestRoute><AuthPage key="register" mode="register" /></GuestRoute>
                        } />
                        <Route path="/" element={<Navigate to="/transactions" replace />} />
                        {/* Signed-in pages share the app shell, which stays put between them, and
                            hear about each other's transaction changes (US-38). */}
                        <Route element={
                            <ProtectedRoute><TransactionsSyncProvider><AppShell /></TransactionsSyncProvider></ProtectedRoute>
                        }>
                            <Route path="/dashboard" element={<DashboardPage />} />
                            <Route path="/transactions" element={<TransactionsPage />} />
                            <Route path="/summary" element={<SummaryPage />} />
                            <Route path="/budgets" element={<BudgetsPage />} />
                            <Route path="/goals" element={<GoalsPage />} />
                        </Route>
                    </Routes>
                </Suspense>
            </ErrorBoundary>
        </ToastProvider>
    )
}

export default App
