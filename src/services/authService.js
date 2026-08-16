import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

/**
 * Creates or ensures user profile document exists in Firestore.
 * Role & name are read directly from Firestore database document.
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

  // Determine role based on email pattern for initial database profile creation
  const isAdmin = email.includes('admin');
  const profileName = defaultName || (isAdmin ? 'Mellinam Admin' : 'Studio Staff');
  const profileRole = defaultRole || (isAdmin ? 'admin' : 'staff');

  const profile = {
    name: profileName,
    role: profileRole,
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
 * Authenticates a user and retrieves their profile/role directly from Firestore database.
 * 
 * @param {string} email 
 * @param {string} password 
 * @returns {Promise<{uid: string, name: string, role: string}>}
 */
export const loginUser = async (email, password) => {
  const normalizedEmail = email.toLowerCase().trim();
  const isAdminEmail = normalizedEmail.includes('admin');

  try {
    let userCredential;
    try {
      // 1. Try signing in with Firebase Auth
      userCredential = await signInWithEmailAndPassword(auth, normalizedEmail, password);
    } catch (authError) {
      const isStudioAccount = normalizedEmail.includes('mellinam') || normalizedEmail.includes('staff') || normalizedEmail.includes('admin');
      const isCredentialError = 
        authError.code === 'auth/user-not-found' || 
        authError.code === 'auth/invalid-credential' || 
        authError.code === 'auth/wrong-password';

      // If user doc/auth user doesn't exist yet for studio accounts, try creating
      if (isStudioAccount && isCredentialError) {
        try {
          if (__DEV__) console.log('Attempting auto-provision for studio account:', normalizedEmail);
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
    const defaultName = isAdminEmail ? 'Mellinam Admin' : 'Studio Staff';
    const defaultRole = isAdminEmail ? 'admin' : 'staff';

    // 2. Retrieve or create user profile document in Firestore (Database source of truth)
    return await ensureUserProfile(uid, normalizedEmail, defaultName, defaultRole);

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


