import React, { useEffect, useState } from 'react';
import { useOrderStore } from '../store/orderStore';
import { useProductionStore } from '../store/productionStore';
import { useFinishingStore } from '../store/finishingStore';
import { useCatalogueStore } from '../store/catalogueStore';
import { useShootStore } from '../store/shootStore';
import { useAuthStore } from '../store/authStore';
import { auth } from '../config/firebase';
import { onAuthStateChanged } from 'firebase/auth';

/**
 * AppInitializer — initializes all stores on mount.
 * 
 * Flow: AppInitializer → Store.init() → Service.getData() → Data Source
 */
const AppInitializer = ({ children }) => {
    const initOrders = useOrderStore((s) => s.init);
    const initProduction = useProductionStore((s) => s.init);
    const initFinishing = useFinishingStore((s) => s.init);
    const initCatalogue = useCatalogueStore((s) => s.init);
    const initShoots = useShootStore((s) => s.init);
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    
    const [firebaseReady, setFirebaseReady] = useState(false);

    useEffect(() => {
        if (__DEV__) console.log("[AppInitializer] Monitoring Firebase Auth state...");
        const unsub = onAuthStateChanged(auth, async (user) => {
            if (user) {
                if (__DEV__) console.log("[AppInitializer] Firebase Auth: Authenticated as", user.email);
                setFirebaseReady(true);
            } else {
                if (__DEV__) console.log("[AppInitializer] Firebase Auth: Not Authenticated");
                setFirebaseReady(false);
            }
        });
        return unsub;
    }, []);

    useEffect(() => {
        if (__DEV__) console.log("[AppInitializer] Store Init Check:", { isAuthenticated, firebaseReady });

        // Only initialize real-time listeners when user completes role selection and Firebase Auth is ready
        if (!isAuthenticated || !firebaseReady) return;

        if (__DEV__) console.log("[AppInitializer] Starting all store listeners...");
        Promise.all([
            initOrders(),
            initProduction(),
            initFinishing(),
            initCatalogue(),
            initShoots(),
        ]).then(() => {
            if (__DEV__) console.log("[AppInitializer] All stores initialized successfully.");
        }).catch((err) => {
            console.error("[AppInitializer] Store Init Error:", err);
            useOrderStore.setState({ isLoading: false, error: 'Initialization failed' });
            useProductionStore.setState({ isLoading: false });
        });
    }, [isAuthenticated, firebaseReady]);

    return children;
};

export default AppInitializer;
