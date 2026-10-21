import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router';
import AppShell from './components/AppShell';
import GuestRoute from './components/GuestRoute';
import PageLoading from './components/PageLoading';
import ProtectedRoute from './components/ProtectedRoute';

// Each page is its own chunk, loaded when it's first opened, so the first download
// stays small. The app shell, routing and sign-in check load straight away.
const AuthPage = lazy(() => import('./pages/AuthPage'));
const BudgetsPage = lazy(() => import('./pages/BudgetsPage'));
const SummaryPage = lazy(() => import('./pages/SummaryPage'));
const TransactionsPage = lazy(() => import('./pages/TransactionsPage'));

function App() {
    return (
        <Suspense fallback={<PageLoading />}>
            <Routes>
                <Route path="/login" element={
                    <GuestRoute><AuthPage key="login" mode="login" /></GuestRoute>
                } />
                <Route path="/register" element={
                    <GuestRoute><AuthPage key="register" mode="register" /></GuestRoute>
                } />
                <Route path="/" element={<Navigate to="/transactions" replace />} />
                {/* Signed-in pages share the app shell, which stays put between them. */}
                <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
                    <Route path="/transactions" element={<TransactionsPage />} />
                    <Route path="/summary" element={<SummaryPage />} />
                    <Route path="/budgets" element={<BudgetsPage />} />
                </Route>
            </Routes>
        </Suspense>
    );
}

export default App;
