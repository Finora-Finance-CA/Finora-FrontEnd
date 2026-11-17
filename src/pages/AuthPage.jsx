import { Eye, EyeOff } from 'lucide-react';
import { useId, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { authErrorMessage } from '../auth/authErrors';
import Logo from '../components/Logo';
import Alert from '../components/ui/Alert';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Field from '../components/ui/Field';
import IconButton from '../components/ui/IconButton';
import Input from '../components/ui/Input';
import { useAuth } from '../context/useAuth';
import { supabase } from '../lib/supabase';
import { useFormFields } from '../validation/useFormFields';
import { MIN_PASSWORD_LENGTH, validateEmail, validatePassword } from '../validation/rules';
import './AuthPage.css';

const FIELDS = ['email', 'password'];

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

// The shared rules (../validation/rules.js): an email that looks like one, and a
// password, of at least 8 characters to register.
function validatorFor(isRegister) {
    return (field, values) =>
        field === 'email'
            ? validateEmail(values.email)
            : validatePassword(values.password, { minLength: isRegister ? MIN_PASSWORD_LENGTH : 0 });
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
    const { sessionExpired } = useAuth();
    const { values, errors, fieldProps, validateAll, showErrors } = useFormFields({
        initialValues: { email: '', password: '' },
        fields: FIELDS,
        validate: validatorFor(isRegister),
    });
    const [showPassword, setShowPassword] = useState(false);
    const [formError, setFormError] = useState(null);
    const [message, setMessage] = useState(null);
    const [loading, setLoading] = useState(false);
    const idPrefix = useId();
    const emailId = `${idPrefix}-email`;
    const passwordId = `${idPrefix}-password`;

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (loading) return;
        setFormError(null);
        setMessage(null);
        if (!validateAll()) return;

        const trimmedEmail = values.email.trim();
        const { password } = values;

        setLoading(true);

        try {
            const { data, error } = isRegister
                ? await supabase.auth.signUp({ email: trimmedEmail, password })
                : await supabase.auth.signInWithPassword({ email: trimmedEmail, password });

            if (error) {
                const { field, message: text } = authErrorMessage(error, mode);
                if (field) {
                    showErrors({ [field]: text });
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

                {sessionExpired && !isRegister && (
                    <Alert tone="info">Your session expired, please log in again.</Alert>
                )}

                <form className="auth-card__form" onSubmit={handleSubmit} noValidate>
                    <Field id={emailId} label="Email" error={errors.email}>
                        {(controlProps) => (
                            <Input
                                {...controlProps}
                                {...fieldProps('email')}
                                type="email"
                                autoComplete="email"
                                autoCapitalize="none"
                                spellCheck={false}
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
                                {...fieldProps('password')}
                                type={showPassword ? 'text' : 'password'}
                                autoComplete={copy.passwordAutoComplete}
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
