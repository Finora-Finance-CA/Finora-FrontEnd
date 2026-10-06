import {useState} from "react";
import { Link } from "react-router";

function AuthPage({mode}) {
    const isRegister = mode === 'register';    
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleSubmit = async (event) => {
        event.preventDefault();
        console.log(`Submitting ${isRegister ? 'registration' : 'login'} for email: ${email}`);
    }
    
    return (
        <div>
            <h1>{isRegister ? 'Register' : 'Login'} Page</h1>
            <p>{isRegister ? 'Already have an account? ' : 'Don\'t have an account? '}
                <Link to={isRegister ? '/login' : '/register'}>{isRegister ? 'Login here' : 'Register here'}</Link>
            </p>
            <form
                onSubmit={handleSubmit}
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
                <button type="submit">{isRegister ? 'Register' : 'Login'}</button>

            </form>
        </div>


    );
}

export default AuthPage;
