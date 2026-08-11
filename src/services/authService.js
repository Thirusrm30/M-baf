import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword 
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

const DEMO_ACCOUNTS = {
  'mellinamdesignerstudio007@gmail.com': { name: 'Mellinam Admin', role: 'admin' },
  'staff@mellinamdesignerstudio.com': { name: 'Studio Staff', role: 'staff' },
};

/**
 * Creates or ensures user profile document exists in Firestore
 */
const ensureUserProfile = async (uid, email, defaultName, defaultRole) => {
  const userDocRef = doc(db, 'users', uid);
  const userDocSnap = await getDoc(userDocRef);

  if (userDocSnap.exists()) {
    const data = userDocSnap.data();
    return {
      uid,
      name: data.name || defaultName,
      role: data.role || defaultRole,
    };
  }

  // Determine role fallback based on account type
  const isDemoAdmin = email === 'mellinamdesignerstudio007@gmail.com' || email.includes('admin');
  const profile = {
    name: DEMO_ACCOUNTS[email]?.name || defaultName || (isDemoAdmin ? 'Admin User' : 'Staff User'),
    role: DEMO_ACCOUNTS[email]?.role || defaultRole || (isDemoAdmin ? 'admin' : 'staff'),
    email,
    createdAt: serverTimestamp(),
  };

  try {
    await setDoc(userDocRef, profile, { merge: true });
  } catch (e) {
    if (__DEV__) console.warn('Could not auto-create user profile in Firestore:', e.message);
  }

  return {
    uid,
    name: profile.name,
    role: profile.role,
  };
};

/**
 * Authenticates a user and retrieves their profile from Firestore.
 * Automatically provisions demo accounts if they don't exist yet.
 * 
 * @param {string} email 
 * @param {string} password 
 * @returns {Promise<{uid: string, name: string, role: string}>}
 */
export const loginUser = async (email, password) => {
  const normalizedEmail = email.toLowerCase().trim();

  try {
    // 1. Try signing in with Firebase Auth
    let userCredential;
    try {
      userCredential = await signInWithEmailAndPassword(auth, normalizedEmail, password);
    } catch (authError) {
      // 2. Auto-provision demo account if it doesn't exist in Firebase Auth yet
      const isDemoAccount = DEMO_ACCOUNTS[normalizedEmail] != null;
      const isCredentialError = 
        authError.code === 'auth/invalid-credential' || 
        authError.code === 'auth/user-not-found' ||
        authError.code === 'auth/wrong-password';

      if (isDemoAccount && isCredentialError) {
        if (__DEV__) console.log('Auto-provisioning demo account:', normalizedEmail);
        userCredential = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
      } else {
        throw authError;
      }
    }

    const { uid } = userCredential.user;
    const defaultMeta = DEMO_ACCOUNTS[normalizedEmail] || {};

    // 3. Retrieve or auto-create user profile document in Firestore
    return await ensureUserProfile(
      uid, 
      normalizedEmail, 
      defaultMeta.name || 'User', 
      defaultMeta.role || 'staff'
    );

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
