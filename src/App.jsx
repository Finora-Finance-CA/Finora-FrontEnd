import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router';
import AppHeader from './components/AppHeader';
import GuestRoute from './components/GuestRoute';
import ProtectedRoute from './components/ProtectedRoute';

// Each page is its own chunk, loaded when it's first opened, so the first download
// stays small. The header, routing and sign-in check load straight away.
const AuthPage = lazy(() => import('./pages/AuthPage'));
const BudgetsPage = lazy(() => import('./pages/BudgetsPage'));
const SummaryPage = lazy(() => import('./pages/SummaryPage'));
const TransactionsPage = lazy(() => import('./pages/TransactionsPage'));

function PageLoading() {
    return (
        <p className="page-loading" role="status">
            Loading page…
        </p>
    );
}

function App() {
    return (
        <>
            <AppHeader />

            <Suspense fallback={<PageLoading />}>
                <Routes>
                    <Route path="/login" element={
                        <GuestRoute><AuthPage key="login" mode="login" /></GuestRoute>
                    } />
                    <Route path="/register" element={
                        <GuestRoute><AuthPage key="register" mode="register" /></GuestRoute>
                    } />
                    <Route path="/" element={<Navigate to="/transactions" replace />} />
                    <Route path="/transactions" element={
                        <ProtectedRoute><TransactionsPage /></ProtectedRoute>
                    } />
                    <Route path="/summary" element={
                        <ProtectedRoute><SummaryPage /></ProtectedRoute>
                    } />
                    <Route path="/budgets" element={
                        <ProtectedRoute><BudgetsPage /></ProtectedRoute>
                    } />
                </Routes>
            </Suspense>
        </>
    );
}

export default App;
