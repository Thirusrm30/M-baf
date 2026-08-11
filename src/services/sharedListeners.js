// ─────────────────────────────────────────────
// Shared Firestore Listener Registry
// File: src/services/sharedListeners.js
// ─────────────────────────────────────────────
//
// Problem: Multiple stores (orderStore, productionStore) each create their own
// onSnapshot listeners on the SAME Firestore collections (orders, tailors),
// doubling network reads, CPU cost, and causing memory leaks.
//
// Solution: This registry deduplicates listeners at the Firestore level.
// Multiple consumers subscribe via sharedOnSnapshot() and receive fan-out
// from a single underlying onSnapshot. When the last consumer unsubscribes,
// the Firestore listener is torn down.

import { onSnapshot } from 'firebase/firestore';

/**
 * Map<string, { dataCallbacks: Set, errorCallbacks: Set, latestSnapshot, unsubscribe }>
 */
const listeners = new Map();

/**
 * Subscribe to a Firestore collection/query with automatic deduplication.
 * If a listener already exists for this ref's path, the callback is added
 * to the existing fan-out. Otherwise a new onSnapshot is created.
 *
 * @param {CollectionReference|Query} ref - Firestore collection or query reference
 * @param {Function} onData - Called with the Firestore QuerySnapshot on each update
 * @param {Function} [onError] - Called on listener errors
 * @returns {Function} Unsubscribe function (safe to call multiple times)
 */
export function sharedOnSnapshot(ref, onData, onError) {
    const key = ref.path;

    if (!listeners.has(key)) {
        // First subscriber — create the actual Firestore listener
        const entry = {
            dataCallbacks: new Set(),
            errorCallbacks: new Set(),
            latestSnapshot: null,
            unsubscribe: null,
        };

        entry.unsubscribe = onSnapshot(ref, (snapshot) => {
            entry.latestSnapshot = snapshot;
            entry.dataCallbacks.forEach(cb => cb(snapshot));
        }, (error) => {
            console.error(`[SharedListener] Error on "${key}":`, error.message);
            entry.errorCallbacks.forEach(cb => cb(error));
        });

        listeners.set(key, entry);
    }

    const entry = listeners.get(key);
    entry.dataCallbacks.add(onData);
    if (onError) entry.errorCallbacks.add(onError);

    // Deliver cached snapshot immediately so new subscribers don't wait
    // for the next Firestore update to receive data
    if (entry.latestSnapshot !== null) {
        try { onData(entry.latestSnapshot); } catch (e) { /* consumer error */ }
    }

    // Return unsubscribe for THIS specific consumer
    let unsubscribed = false;
    return () => {
        if (unsubscribed) return; // idempotent
        unsubscribed = true;

        entry.dataCallbacks.delete(onData);
        if (onError) entry.errorCallbacks.delete(onError);

        // Last consumer gone — tear down the Firestore listener
        if (entry.dataCallbacks.size === 0) {
            entry.unsubscribe();
            listeners.delete(key);
        }
    };
}

/**
 * Tear down ALL active shared listeners. Called on logout.
 */
export function destroyAllSharedListeners() {
    listeners.forEach((entry, key) => {
        entry.unsubscribe();
    });
    listeners.clear();
}
