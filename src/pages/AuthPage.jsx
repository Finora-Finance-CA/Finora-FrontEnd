import {useState} from "react";

function AuthPage({mode}) {
    const isRegister = mode === 'register';    
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    
    return (
        <div>
            <h1>{isRegister ? 'Register' : 'Login'} Page</h1>
            <form>
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
