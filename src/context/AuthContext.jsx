import { useEffect, useRef, useState } from 'react';
import { onSessionExpired } from '../api/requestEvents';
import { supabase } from '../lib/supabase';
import { AuthContext, SESSION_RESTORE_TIMEOUT_MS } from './useAuth';

// Where Supabase keeps the session in this browser: sb-<project ref>-auth-token.
const SESSION_STORAGE_KEY = /^sb-.+-auth-token/;

// Removes a saved session that couldn't be restored, so the next load starts clean.
// Supabase's own signOut waits for the same start-up that failed, so the key is also
// removed directly; neither step may stop the app from showing the login page.
function clearBrokenSession() {
    try {
        Object.keys(window.localStorage)
            .filter((key) => SESSION_STORAGE_KEY.test(key))
            .forEach((key) => window.localStorage.removeItem(key));
    } catch {
        // Storage is blocked: there's nothing saved to clear.
    }
    Promise.resolve()
        .then(() => supabase.auth.signOut({ scope: 'local' }))
        .catch((error) => console.error('Could not clear the saved session:', error));
}

export function AuthProvider({ children }) {
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);
    // Why the user was signed out without asking: 'expired' after the API turned a
    // request away (401), 'restore_failed' when the saved session couldn't be restored
    // on page load (US-59). The login page says why; signing in clears it.
    const [signedOutReason, setSignedOutReason] = useState(null);
    const sessionRef = useRef(null);
    const isSigningOutRef = useRef(false);

    useEffect(() => {
        let isMounted = true;
        // Set once the first answer is in, or restoring has failed or timed out. Anything
        // that answers the start-up check after that is ignored.
        let isRestored = false;

        function show(newSession) {
            sessionRef.current = newSession;
            setSession(newSession);
            setLoading(false);
        }

        function restoreFailed(error) {
            if (isRestored || !isMounted) return;
            isRestored = true;
            console.error('Could not restore the saved session:', error);
            clearBrokenSession();
            setSignedOutReason('restore_failed');
            show(null);
        }

        // Restoring the session from storage (and refreshing its token if it's old) on
        // page load. It errors, rejects or never answers only if something is broken;
        // then the user is sent to log in, never left on "Loading…".
        const timeout = setTimeout(
            () => restoreFailed(new Error(`No answer after ${SESSION_RESTORE_TIMEOUT_MS} ms.`)),
            SESSION_RESTORE_TIMEOUT_MS
        );
        supabase.auth.getSession().then(
            ({ data, error }) => {
                clearTimeout(timeout);
                if (error) return restoreFailed(error);
                if (isRestored || !isMounted) return;
                isRestored = true;
                show(data?.session ?? null);
            },
            (error) => {
                clearTimeout(timeout);
                restoreFailed(error);
            }
        );

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (event, newSession) => {
                // The start-up answer, arriving after restoring was given up on.
                if (event === 'INITIAL_SESSION' && isRestored && !sessionRef.current) return;
                // Any answer from Supabase before getSession's also settles start-up, so
                // the timeout never clears a session that did restore.
                if (!isRestored) {
                    isRestored = true;
                    clearTimeout(timeout);
                }
                show(newSession);
                if (event === 'SIGNED_IN') setSignedOutReason(null);
            }
        );

        // The API said the token is no longer good (US-57): sign out, which sends every
        // signed-in page to /login, and remember why. Several requests can fail at once,
        // so only the first one signs out.
        const stopListening = onSessionExpired(async () => {
            if (!sessionRef.current || isSigningOutRef.current) return;
            isSigningOutRef.current = true;
            setSignedOutReason('expired');
            try {
                const { error } = (await supabase.auth.signOut()) ?? {};
                if (error) console.error('Sign out failed:', error);
            } catch (error) {
                console.error('Sign out failed:', error);
            } finally {
                isSigningOutRef.current = false;
            }
        });

        return () => {
            isMounted = false;
            clearTimeout(timeout);
            subscription.unsubscribe();
            stopListening();
        };
    }, []);

    const signOut = () => {
        setSignedOutReason(null);
        return supabase.auth.signOut();
    };

    const value = {
        session,
        user: session?.user ?? null,
        loading,
        signedOutReason,
        signOut,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
