import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

// Hardcoded allowlist of studio emails eligible for auto-provisioning.
// Admin accounts must be created manually via Firebase Console or Admin SDK.
const ALLOWED_AUTO_PROVISION_EMAILS = new Set([
  'mellinamdesignerstudio007@gmail.com',
  'staff@mellinamdesignerstudio.com',
]);

/**
 * Creates or ensures user profile document exists in Firestore.
 * All new profiles default to 'staff' role. Admin role must be set manually.
 * 
 * @param {string} uid - Firebase Auth UID
 * @param {string} email - Normalized email address
 * @returns {Promise<{uid: string, name: string, role: string}>}
 */
const ensureUserProfile = async (uid, email) => {
  const userDocRef = doc(db, 'users', uid);
  const userDocSnap = await getDoc(userDocRef);

  if (userDocSnap.exists()) {
    const data = userDocSnap.data();
    // Role comes from Firestore — never from email patterns
    return {
      uid,
      name: data.name || 'Studio Staff',
      role: data.role || 'staff',
    };
  }

  // New profiles always default to staff — no email-based escalation
  const profile = {
    name: 'Studio Staff',
    role: 'staff',
    email,
    createdAt: serverTimestamp(),
  };

  try {
    await setDoc(userDocRef, profile, { merge: true });
  } catch (e) {
    if (__DEV__) console.warn('Could not create user profile in Firestore:', e.message);
  }

  return {
    uid,
    name: profile.name,
    role: profile.role,
  };
};

/**
 * Authenticates a user and retrieves their profile/role from Firestore.
 * 
 * Security notes:
 * - Auto-provisioning is restricted to an explicit email allowlist
 * - Role is always read from the Firestore users/{uid} document
 * - New profiles always receive 'staff' role; admin is assigned via Firestore console
 * 
 * @param {string} email 
 * @param {string} password 
 * @returns {Promise<{uid: string, name: string, role: string}>}
 */
export const loginUser = async (email, password) => {
  const normalizedEmail = email.toLowerCase().trim();

  try {
    let userCredential;
    try {
      // 1. Try signing in with Firebase Auth
      userCredential = await signInWithEmailAndPassword(auth, normalizedEmail, password);
    } catch (authError) {
      const isCredentialError = 
        authError.code === 'auth/user-not-found' || 
        authError.code === 'auth/invalid-credential' || 
        authError.code === 'auth/wrong-password';

      // Only auto-provision explicitly whitelisted studio emails — never by pattern
      if (isCredentialError && ALLOWED_AUTO_PROVISION_EMAILS.has(normalizedEmail)) {
        try {
          if (__DEV__) console.log('Attempting auto-provision for:', normalizedEmail);
          userCredential = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
        } catch (createError) {
          // If creation fails because user already exists in Firebase Auth, re-throw invalid credential
          if (createError.code === 'auth/email-already-in-use') {
            throw authError;
          }
          throw createError;
        }
      } else {
        throw authError;
      }
    }

    const { uid } = userCredential.user;

    // 2. Retrieve or create user profile in Firestore (role is always from database)
    return await ensureUserProfile(uid, normalizedEmail);

  } catch (error) {
    if (__DEV__) console.warn('Login Attempt Failed:', error.code || error.message);
    
    // Map raw Firebase Auth error codes to human-readable error messages
    let friendlyMessage = error.message;
    if (
      error.code === 'auth/invalid-credential' || 
      error.code === 'auth/user-not-found' || 
      error.code === 'auth/wrong-password'
    ) {
      friendlyMessage = 'Invalid email or password. Please check your credentials.';
    } else if (error.code === 'auth/invalid-email') {
      friendlyMessage = 'Please enter a valid email address.';
    } else if (error.code === 'auth/too-many-requests') {
      friendlyMessage = 'Access temporarily disabled due to many failed attempts. Please try again later.';
    } else if (error.code === 'auth/network-request-failed') {
      friendlyMessage = 'Network error. Please check your internet connection.';
    }
    
    throw new Error(friendlyMessage);
  }
};
