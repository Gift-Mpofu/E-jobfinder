"use client";

import { initializeApp, getApps, type FirebaseOptions } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig: FirebaseOptions = {
  apiKey: "AIzaSyDKfGpwH8_QvJpbIpByaZUSYRLD_zXqYt0",
  authDomain: "studio-2287473014-e93e4.firebaseapp.com",
  projectId: "studio-2287473014-e93e4",
  storageBucket: "studio-2287473014-e93e4.appspot.com",
  messagingSenderId: "1063982704712",
  appId: "1:1063982704712:web:42fbb933250b132db1107d",
};

// Initialize Firebase
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
