// ─────────────────────────────────────────────
// Firebase Configuration & Initialization
// File: src/config/firebase.js
// ─────────────────────────────────────────────

import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence, getAuth } from "firebase/auth";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Prevent duplicate app initialization
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// ── Auth: persistence ──────────────────────────────────────────────────
let auth;
if (Platform.OS === 'web') {
    auth = getAuth(app);
} else {
    try {
        auth = initializeAuth(app, {
            persistence: getReactNativePersistence(AsyncStorage),
        });
    } catch (e) {
        auth = getAuth(app);
    }
}

// ── Firestore: Platform-Specific Cache ──────────────────────────────────
// initializeFirestore() cannot be called twice on the same app.
// Web uses IndexedDB persistentLocalCache; Native uses memoryLocalCache to prevent IndexedDB warnings.
let db;
try {
    const { memoryLocalCache } = require("firebase/firestore");
    const cacheConfig = Platform.OS === 'web'
        ? persistentLocalCache({ tabManager: persistentMultipleTabManager() })
        : memoryLocalCache();

    db = initializeFirestore(app, {
        localCache: cacheConfig
    });
} catch (e) {
    // Already initialized (e.g. hot-reload) — reuse the existing instance
    const { getFirestore } = require("firebase/firestore");
    db = getFirestore(app);
}

export { auth, db };
export const storage = getStorage(app);
export default app;
