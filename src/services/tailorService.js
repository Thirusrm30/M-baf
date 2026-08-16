import { db } from '../config/firebase';
import { collection } from 'firebase/firestore';
import { sharedOnSnapshot } from './sharedListeners';

const TAILORS_REF = collection(db, 'tailors');

/**
 * TailorService — managing tailor-related Firestore interactions.
 * No mock data. Firestore is the single source of truth.
 */
class TailorService {
    /**
     * Set up real-time listener for tailors from Firestore.
     * 
     * @param {Function} onUpdate - Success callback
     * @returns {Function} - Unsubscribe function
     */
    getTailors(onUpdate) {
        return sharedOnSnapshot(TAILORS_REF, (snap) => {
            if (snap.empty) {
                if (__DEV__) console.log("Tailors collection is empty in Firestore.");
                onUpdate([]);
                return;
            }

            // Map and sanitize data
            const firestoreTailors = snap.docs.map(doc => {
                const data = doc.data();
                
                // Data Safety: Ensure mandatory fields exist and provide fallbacks for undefined values
                return {
                    id: doc.id,
                    name: data.name || 'Unknown Tailor',
                    experience: data.experience || 'Not specified',
                    specialty: data.specialty || data.experience || 'General'
                };
            }).filter(tailor => tailor.id && tailor.name);

            if (__DEV__) console.log("Firestore Tailors:", firestoreTailors.length);
            onUpdate(firestoreTailors);
        }, (error) => {
            console.error("Firestore Error in getTailors:", error.message);
            onUpdate([]);
        });
    }
}

export const tailorService = new TailorService();
