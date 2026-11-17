import { useEffect, useRef, useState } from 'react';
import { onSessionExpired } from '../api/requestEvents';
import { supabase } from '../lib/supabase';
import { AuthContext } from './useAuth';

export function AuthProvider({ children }) {
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);
    // True after the API turned a request away (401), until the user signs in again.
    // The login page uses it to say why they were sent there.
    const [sessionExpired, setSessionExpired] = useState(false);
    const sessionRef = useRef(null);
    const isSigningOutRef = useRef(false);

    useEffect(() => {
        let isMounted = true;

        function show(newSession) {
            sessionRef.current = newSession;
            setSession(newSession);
            setLoading(false);
        }

        supabase.auth.getSession().then(
            ({ data }) => {
                if (isMounted) show(data.session);
            },
            // A session that can't be read (e.g. storage is blocked) means signed out,
            // never a page stuck on "Loading…".
            (error) => {
                console.error('Could not read the saved session:', error);
                if (isMounted) show(null);
            }
        );

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (event, newSession) => {
                show(newSession);
                if (event === 'SIGNED_IN') setSessionExpired(false);
            }
        );

        // The API said the token is no longer good (US-57): sign out, which sends every
        // signed-in page to /login, and remember why. Several requests can fail at once,
        // so only the first one signs out.
        const stopListening = onSessionExpired(async () => {
            if (!sessionRef.current || isSigningOutRef.current) return;
            isSigningOutRef.current = true;
            setSessionExpired(true);
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
            subscription.unsubscribe();
            stopListening();
        };
    }, []);

    const signOut = () => {
        setSessionExpired(false);
        return supabase.auth.signOut();
    };

    const value = {
        session,
        user: session?.user ?? null,
        loading,
        sessionExpired,
        signOut,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
