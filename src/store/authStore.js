import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { loginUser } from '../services/authService';

/**
 * AuthStore — manages authentication state.
 *
 * ARCHITECTURE: Screen → AuthStore → AuthService (Firebase auth)
 */

const AUTH_KEY = 'atelier_auth_session';
const VALID_ROLES = new Set(['admin', 'staff']);

/** Session Persistence Helpers */
const saveSession = async (session) => {
    try {
        const data = JSON.stringify(session);
        if (Platform.OS === 'web') {
            localStorage.setItem(AUTH_KEY, data);
        } else {
            await SecureStore.setItemAsync(AUTH_KEY, data);
        }
    } catch (e) {
        // Silently fail in dev/unsupported envs
    }
};

const loadSession = async () => {
    try {
        if (Platform.OS === 'web') {
            const data = localStorage.getItem(AUTH_KEY);
            return data ? JSON.parse(data) : null;
        } else {
            const data = await SecureStore.getItemAsync(AUTH_KEY);
            return data ? JSON.parse(data) : null;
        }
    } catch (e) {
        return null;
    }
};

const clearSession = async () => {
    try {
        if (Platform.OS === 'web') {
            localStorage.removeItem(AUTH_KEY);
        } else {
            await SecureStore.deleteItemAsync(AUTH_KEY);
        }
    } catch (e) {
        // ignore
    }
};

export const useAuthStore = create((set, get) => ({
    user: null,
    role: null,
    isAuthenticated: false,
    isLoading: false,
    isInitializing: true, // true on boot — prevents navigation flicker
    error: null,

    clearError: () => set({ error: null }),

    /**
     * Called on app boot — always requires explicit role selection on every app open.
     */
    initSession: async () => {
        set({ isInitializing: true });
        try {
            // Clear any persisted local session
            await clearSession();

            // Ensure Firebase Auth requires role selection on fresh app launch
            const { signOut } = await import('firebase/auth');
            const { auth } = await import('../config/firebase');
            await signOut(auth).catch(() => {});

            set({
                user: null,
                role: null,
                isAuthenticated: false,
            });
        } catch (e) {
            // Stay logged out
        } finally {
            set({ isInitializing: false });
        }
    },

    /**
     * Login — validates credentials against Firebase Auth & Firestore database, sets user + role.
     */
    login: async (email, password) => {
        if (get().isLoading) return; // Debounce duplicate calls
        set({ isLoading: true, error: null });

        try {
            // 1. Call Firebase Auth & Firestore Service
            const userData = await loginUser(email, password);
            
            const user = { 
                id: userData.uid, 
                name: userData.name, 
                email 
            };
            const role = userData.role;

            // Guard: only accept known database roles
            if (!VALID_ROLES.has(role)) {
                throw new Error('Unauthorised: unknown role returned from database.');
            }

            // 2. Save Session
            await saveSession({ user, role });

            // 3. Update State
            set({ user, role, isAuthenticated: true, isLoading: false, error: null });
        } catch (err) {
            set({
                isLoading: false,
                error: err.message || 'Login failed. Please try again.',
                user: null,
                role: null,
                isAuthenticated: false,
            });
            throw err;
        }
    },

    /**
     * Logout — clears ALL auth state and requires role selection on next launch.
     */
    logout: async () => {
        set({ isLoading: true });
        try {
            const { signOut } = await import('firebase/auth');
            const { auth } = await import('../config/firebase');
            await signOut(auth).catch(() => {});

            // 1. Clean up all real-time listeners first
            const { useOrderStore } = await import('./orderStore');
            const { useProductionStore } = await import('./productionStore');
            const { useFinishingStore } = await import('./finishingStore');
            const { useCatalogueStore } = await import('./catalogueStore');
            const { useShootStore } = await import('./shootStore');

            useOrderStore.getState().destroy();
            useProductionStore.getState().destroy();
            useFinishingStore.getState().destroy();
            useCatalogueStore.getState().destroy();
            useShootStore.getState().destroy();

            // 2. Tear down any remaining shared Firestore listeners
            const { destroyAllSharedListeners } = await import('../services/sharedListeners');
            destroyAllSharedListeners();

            // 3. Clear session
            await clearSession();
        } finally {
            set({
                user: null,
                role: null,
                isAuthenticated: false,
                isLoading: false,
                error: null,
            });
        }
    },
}));
