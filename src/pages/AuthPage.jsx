import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router';
import { supabase } from '../lib/supabase';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ERROR_MESSAGES = {
    user_already_exists: 'An account with this email already exists.',
    invalid_credentials: 'Incorrect email or password.',
    email_not_confirmed: 'Please confirm your email before logging in.',
    weak_password: 'Please choose a stronger password.',
};

function AuthPage({ mode }) {
    const isRegister = mode === 'register';
    const navigate = useNavigate();
    const location = useLocation();
    const redirectTo = location.state?.from?.pathname || '/transactions';
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const [message, setMessage] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError(null);
        setMessage(null);

        const trimmedEmail = email.trim();

        if (!trimmedEmail || !password) {
            setError('Email and password are required.');
            return;
        }

        if (!EMAIL_PATTERN.test(trimmedEmail)) {
            setError('Please enter a valid email address.');
            return;
        }

        if (isRegister && password.length < 8) {
            setError('Password must be at least 8 characters.');
            return;
        }

        setLoading(true);

        try {
            const { data, error } = isRegister
                ? await supabase.auth.signUp({ email: trimmedEmail, password })
                : await supabase.auth.signInWithPassword({ email: trimmedEmail, password });

            if (error) {
                console.log('Supabase auth error:', error.code, error.message);
                setError(ERROR_MESSAGES[error.code] ?? error.message);
                return;
            }

            if (isRegister && !data.session) {
                setMessage('Account created. Check your email to confirm it, then log in.');
                return;
            }

            navigate(redirectTo, { replace: true });
        } catch (err) {
            console.error('Unexpected auth error:', err);
            setError('Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const buttonText = loading
        ? 'Please wait...'
        : isRegister ? 'Register' : 'Login';

    return (
        <div>
            <h1>{isRegister ? 'Register' : 'Login'}</h1>
            <p>
                {isRegister ? 'Already have an account? ' : "Don't have an account? "}
                <Link to={isRegister ? '/login' : '/register'}>
                    {isRegister ? 'Login here' : 'Register here'}
                </Link>
            </p>
            <form onSubmit={handleSubmit} noValidate>
                <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />
                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />
                {error && <p style={{ color: 'red' }}>{error}</p>}
                {message && <p style={{ color: 'green' }}>{message}</p>}
                <button type="submit" disabled={loading}>
                    {buttonText}
                </button>
            </form>
        </div>
    );
}

export default AuthPage;