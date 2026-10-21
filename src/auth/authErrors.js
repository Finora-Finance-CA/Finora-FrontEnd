// Turns a Supabase Auth error into a message written for people. Supabase's own text
// ("Invalid login credentials", "AuthApiError: ...") never reaches the screen.

const RATE_LIMITED = 'Too many attempts. Wait a minute, then try again.'

/** By Supabase error code. `field` puts the message under that input instead of above the button. */
const BY_CODE = {
  invalid_credentials: { message: 'Incorrect email or password.' },
  user_already_exists: { message: 'An account with this email already exists.' },
  email_exists: { message: 'An account with this email already exists.' },
  email_not_confirmed: { message: 'Please confirm your email before logging in.' },
  weak_password: { field: 'password', message: 'Please choose a stronger password.' },
  email_address_invalid: { field: 'email', message: 'Enter a valid email address, like name@example.com.' },
  validation_failed: { message: 'Check your email and password, then try again.' },
  signup_disabled: { message: "New accounts can't be created right now. Please try again later." },
  user_banned: { message: "This account can't log in right now." },
  over_request_rate_limit: { message: RATE_LIMITED },
  over_email_send_rate_limit: { message: RATE_LIMITED },
  request_timeout: { message: 'The server took too long to respond. Please try again.' },
}

const NETWORK = { message: "We couldn't reach the server. Check your connection and try again." }

const FALLBACK = {
  login: { message: "We couldn't log you in. Please try again." },
  register: { message: "We couldn't create your account. Please try again." },
}

/**
 * @param {{ code?: string, name?: string } | null | undefined} error From signInWithPassword or signUp.
 * @param {'login'|'register'} mode
 * @returns {{ field?: 'email'|'password', message: string }}
 */
export function authErrorMessage(error, mode) {
  if (error?.code && BY_CODE[error.code]) return BY_CODE[error.code]
  // Supabase reports an unreachable server as a retryable fetch error, with no code.
  if (error?.name === 'AuthRetryableFetchError') return NETWORK
  return FALLBACK[mode]
}
