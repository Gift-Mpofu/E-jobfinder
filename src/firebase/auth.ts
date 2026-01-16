'use client';

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import { app } from './client';

const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export const handleSignUp = (email: string, pass: string) => {
  return createUserWithEmailAndPassword(auth, email, pass);
};

export const handleSignIn = (email: string, pass: string) => {
  return signInWithEmailAndPassword(auth, email, pass);
};

export const handleGoogleSignIn = () => {
  return signInWithPopup(auth, googleProvider);
};

export const handleSignOut = () => {
  return signOut(auth);
};

export const setSessionCookie = async (user: User) => {
  const idToken = await user.getIdToken();
  // Set cookie on the client to be picked up by the middleware
  document.cookie = `firebase-session=${idToken}; path=/;`;
};

export const clearSessionCookie = () => {
  document.cookie =
    'firebase-session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT;';
};
