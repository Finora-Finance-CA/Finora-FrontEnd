import { createContext, useContext } from 'react';

// Kept apart from AuthProvider (AuthContext.jsx) so that file only exports a
// component, which React Fast Refresh needs to hot-reload it.
export const AuthContext = createContext(null);

// How long the saved session may take to restore on page load before the app gives up,
// clears it and asks the user to log in again (US-59). Restoring normally takes well
// under a second, even when Supabase refreshes the token.
export const SESSION_RESTORE_TIMEOUT_MS = 8000;

// Why the user was signed out without asking, shown on the login page.
export const SIGNED_OUT_MESSAGES = Object.freeze({
    expired: 'Your session expired, please log in again.',
    restore_failed: "We couldn't restore your session, please log in again.",
});

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used inside an AuthProvider');
    }
    return context;
}
