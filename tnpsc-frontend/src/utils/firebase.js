import { getApp, getApps, initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const hasFirebaseConfig = Object.values(firebaseConfig).every(Boolean);
const app = getApps().length
  ? getApp()
  : hasFirebaseConfig
    ? initializeApp(firebaseConfig)
    : null;
const auth = app ? getAuth(app) : null;
const provider = new GoogleAuthProvider();

provider.addScope("profile");
provider.addScope("email");

export const signInWithGoogle = async () => {
  if (!auth) {
    throw new Error("Firebase is not configured. Add the VITE_FIREBASE_* values to the frontend environment.");
  }

  const result = await signInWithPopup(auth, provider);
  const idToken = await result.user.getIdToken();

  return {
    idToken,
    name: result.user.displayName,
    email: result.user.email,
    photo: result.user.photoURL,
  };
};

export const firebaseSignOut = async () => {
  if (auth) await signOut(auth);
};

export { auth };
