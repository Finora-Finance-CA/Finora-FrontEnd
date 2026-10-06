import { Navigate, Route, Routes } from 'react-router';
import TransactionsPage from './pages/TransactionsPage';
import AuthPage from './pages/AuthPage';
import { useAuth } from './context/AuthContext';

function App() {
    const { user, loading, signOut } = useAuth();

    return (
        <>
            <div style={{ padding: '0.5rem', background: '#eee' }}>
                {loading
                    ? 'Checking session...'
                    : user
                        ? <>Logged in as {user.email} <button onClick={signOut}>Log out</button></>
                        : 'Not logged in'}
            </div>

            <Routes>
                <Route path="/login" element={<AuthPage key="login" mode="login" />} />
                <Route path="/register" element={<AuthPage key="register" mode="register" />} />
                <Route path="/" element={<Navigate to="/transactions" replace />} />
                <Route path="/transactions" element={<TransactionsPage />} />
            </Routes>
        </>
    );
}

export default App;