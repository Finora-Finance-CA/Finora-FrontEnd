import { createContext, useContext } from 'react';

// Kept apart from AuthProvider (AuthContext.jsx) so that file only exports a
// component, which React Fast Refresh needs to hot-reload it.
export const AuthContext = createContext(null);

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used inside an AuthProvider');
    }
    return context;
}
