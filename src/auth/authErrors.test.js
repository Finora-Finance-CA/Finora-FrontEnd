import { describe, expect, it } from 'vitest'
import { authErrorMessage } from './authErrors'

describe('authErrorMessage', () => {
  it.each([
    ['invalid_credentials', 'Incorrect email or password.'],
    ['user_already_exists', 'An account with this email already exists.'],
    ['email_exists', 'An account with this email already exists.'],
    ['email_not_confirmed', 'Please confirm your email before logging in.'],
    ['over_request_rate_limit', 'Too many attempts. Wait a minute, then try again.'],
    ['signup_disabled', "New accounts can't be created right now. Please try again later."],
  ])('explains %s above the button', (code, message) => {
    expect(authErrorMessage({ code, message: 'raw supabase text' }, 'login')).toEqual({ message })
  })

  it('puts a weak password under the password field', () => {
    expect(authErrorMessage({ code: 'weak_password' }, 'register')).toEqual({
      field: 'password',
      message: 'Please choose a stronger password.',
    })
  })

  it('puts an email Supabase rejects under the email field', () => {
    expect(authErrorMessage({ code: 'email_address_invalid' }, 'register')).toEqual({
      field: 'email',
      message: 'Enter a valid email address, like name@example.com.',
    })
  })

  it('says the server could not be reached when the request failed', () => {
    expect(authErrorMessage({ name: 'AuthRetryableFetchError', message: 'Failed to fetch' }, 'login').message).toBe(
      "We couldn't reach the server. Check your connection and try again."
    )
  })

  it.each([
    [{ code: 'something_new', message: 'AuthApiError: internal detail' }, 'login', "We couldn't log you in. Please try again."],
    [{ message: 'Database error saving new user' }, 'register', "We couldn't create your account. Please try again."],
    [null, 'login', "We couldn't log you in. Please try again."],
  ])('never shows Supabase’s own text for %j', (error, mode, message) => {
    expect(authErrorMessage(error, mode)).toEqual({ message })
  })
})
