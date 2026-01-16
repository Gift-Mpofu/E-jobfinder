'use client';

import { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/firebase/client';
import { setSessionCookie, clearSessionCookie } from '@/firebase/auth';

export default function AuthStateListener() {
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        await setSessionCookie(user);
      } else {
        clearSessionCookie();
      }
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  return null;
}
