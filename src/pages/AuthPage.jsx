import { Eye, EyeOff } from 'lucide-react';
import { useId, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { authErrorMessage } from '../auth/authErrors';
import Logo from '../components/Logo';
import Alert from '../components/ui/Alert';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Field from '../components/ui/Field';
import IconButton from '../components/ui/IconButton';
import Input from '../components/ui/Input';
import { supabase } from '../lib/supabase';
import './AuthPage.css';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const MIN_PASSWORD_LENGTH = 8;

const COPY = {
    login: {
        heading: 'Log in',
        subtitle: 'Welcome back. Pick up where you left off.',
        submit: 'Log in',
        busy: 'Logging in…',
        switchText: "Don't have an account?",
        switchLink: 'Create one',
        switchTo: '/register',
        passwordAutoComplete: 'current-password',
    },
    register: {
        heading: 'Create your account',
        subtitle: 'Track your spending and set monthly budgets.',
        submit: 'Create account',
        busy: 'Creating account…',
        switchText: 'Already have an account?',
        switchLink: 'Log in',
        switchTo: '/login',
        passwordAutoComplete: 'new-password',
    },
};

// The same checks as before sending: both fields filled in, an email that looks like
// one, and (to register) a password of at least 8 characters.
function validate(email, password, isRegister) {
    const errors = {};
    if (!email) errors.email = 'Enter your email.';
    else if (!EMAIL_PATTERN.test(email)) errors.email = 'Enter a valid email address, like name@example.com.';
    if (!password) errors.password = 'Enter your password.';
    else if (isRegister && password.length < MIN_PASSWORD_LENGTH) {
        errors.password = `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
    }
    return errors;
}

/**
 * /login and /register: a centred card with no app chrome. Problems with a field show
 * under it; problems with the sign-in itself show above the button. Supabase's own
 * error text is never shown (see authErrors.js).
 *
 * @param {{ mode: 'login'|'register' }} props
 */
function AuthPage({ mode }) {
    const isRegister = mode === 'register';
    const copy = COPY[mode];
    const navigate = useNavigate();
    const location = useLocation();
    const redirectTo = location.state?.from?.pathname || '/transactions';
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [errors, setErrors] = useState({});
    const [formError, setFormError] = useState(null);
    const [message, setMessage] = useState(null);
    const [loading, setLoading] = useState(false);
    const emailRef = useRef(null);
    const passwordRef = useRef(null);
    const idPrefix = useId();
    const emailId = `${idPrefix}-email`;
    const passwordId = `${idPrefix}-password`;

    function focusField(field) {
        (field === 'email' ? emailRef : passwordRef).current?.focus();
    }

    // Editing a field clears its message; the next submit checks it again.
    function clearError(field) {
        if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }));
    }

    const handleSubmit = async (event) => {
        event.preventDefault();
        setFormError(null);
        setMessage(null);

        const trimmedEmail = email.trim();
        const fieldErrors = validate(trimmedEmail, password, isRegister);
        setErrors(fieldErrors);
        if (fieldErrors.email || fieldErrors.password) {
            focusField(fieldErrors.email ? 'email' : 'password');
            return;
        }

        setLoading(true);

        try {
            const { data, error } = isRegister
                ? await supabase.auth.signUp({ email: trimmedEmail, password })
                : await supabase.auth.signInWithPassword({ email: trimmedEmail, password });

            if (error) {
                const { field, message: text } = authErrorMessage(error, mode);
                if (field) {
                    setErrors({ [field]: text });
                    focusField(field);
                } else {
                    setFormError(text);
                }
                return;
            }

            if (isRegister && !data.session) {
                setMessage('Account created. Check your email to confirm it, then log in.');
                return;
            }

            navigate(redirectTo, { replace: true });
        } catch (err) {
            console.error('Unexpected auth error:', err);
            setFormError('Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="auth-page">
            <Card className="auth-card">
                <Logo />
                <div className="auth-card__intro">
                    <h1>{copy.heading}</h1>
                    <p className="auth-card__subtitle">{copy.subtitle}</p>
                </div>

                <form className="auth-card__form" onSubmit={handleSubmit} noValidate>
                    <Field id={emailId} label="Email" error={errors.email}>
                        {(controlProps) => (
                            <Input
                                {...controlProps}
                                ref={emailRef}
                                type="email"
                                autoComplete="email"
                                autoCapitalize="none"
                                spellCheck={false}
                                value={email}
                                onChange={(event) => {
                                    setEmail(event.target.value);
                                    clearError('email');
                                }}
                            />
                        )}
                    </Field>

                    <Field
                        id={passwordId}
                        label="Password"
                        hint={isRegister ? `At least ${MIN_PASSWORD_LENGTH} characters.` : undefined}
                        error={errors.password}
                    >
                        {(controlProps) => (
                            <Input
                                {...controlProps}
                                ref={passwordRef}
                                type={showPassword ? 'text' : 'password'}
                                autoComplete={copy.passwordAutoComplete}
                                value={password}
                                onChange={(event) => {
                                    setPassword(event.target.value);
                                    clearError('password');
                                }}
                                trailing={
                                    <IconButton
                                        icon={showPassword ? EyeOff : Eye}
                                        label="Show password"
                                        aria-pressed={showPassword}
                                        aria-controls={passwordId}
                                        onClick={() => setShowPassword((current) => !current)}
                                    />
                                }
                            />
                        )}
                    </Field>

                    {formError && <Alert>{formError}</Alert>}
                    {message && <Alert tone="success">{message}</Alert>}

                    <Button type="submit" variant="primary" fullWidth disabled={loading}>
                        {loading ? copy.busy : copy.submit}
                    </Button>
                </form>

                <p className="auth-card__switch">
                    {copy.switchText} <Link to={copy.switchTo}>{copy.switchLink}</Link>
                </p>
            </Card>
        </main>
    );
}

export default AuthPage;
