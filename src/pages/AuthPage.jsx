import {useState} from "react";
import { Link } from "react-router";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function AuthPage({mode}) {
    const isRegister = mode === 'register';    
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError(null);

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

        console.log(`Submitting ${isRegister ? 'registration' : 'login'} for email: ${trimmedEmail}`);
    };
    
    return (
        <div>
            <h1>{isRegister ? 'Register' : 'Login'} Page</h1>
            <p>{isRegister ? 'Already have an account? ' : 'Don\'t have an account? '}
                <Link to={isRegister ? '/login' : '/register'}>{isRegister ? 'Login here' : 'Register here'}</Link>
            </p>
            <form
                onSubmit={handleSubmit}
                noValidate
            >
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
                <button type="submit">{isRegister ? 'Register' : 'Login'}</button>

            </form>
        </div>


    );
}

export default AuthPage;
