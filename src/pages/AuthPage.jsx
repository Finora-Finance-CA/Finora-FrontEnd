import {useState} from "react";

function AuthPage({mode}) {
    const isRegister = mode === 'register';    
    
    return (
        <h1>{isRegister ? 'Register' : 'Login'} Page</h1>
    );
}

export default AuthPage;
