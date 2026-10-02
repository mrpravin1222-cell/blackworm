import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  getFirestore,
  doc,
  onSnapshot,
  setDoc,
  getDoc,
  collection,
  getDocs,
  enableIndexedDbPersistence,
  terminate
} from 'firebase/firestore';

import rawConfig from '../firebase-applet-config.json';

// Default verified Blackworm production cloud config
const FALLBACK_CONFIG = {
  projectId: "gen-lang-client-0210099623",
  appId: "1:86239432792:web:506ab502de810067fc3a2d",
  apiKey: "AIzaSyB07C67eDg7DAstuB5qjbmLKn24SbSQC1g",
  authDomain: "gen-lang-client-0210099623.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-blackwormagritec-dad5191d-d42b-4df5-998f-4ffa43a51ed3",
  storageBucket: "gen-lang-client-0210099623.firebasestorage.app",
  messagingSenderId: "86239432792",
};

// Safely resolve config from environment variables, applet JSON, or fallback
const activeConfig = {
  projectId: (import.meta as any).env?.VITE_FIREBASE_PROJECT_ID || rawConfig?.projectId || FALLBACK_CONFIG.projectId,
  appId: (import.meta as any).env?.VITE_FIREBASE_APP_ID || rawConfig?.appId || FALLBACK_CONFIG.appId,
  apiKey: (import.meta as any).env?.VITE_FIREBASE_API_KEY || rawConfig?.apiKey || FALLBACK_CONFIG.apiKey,
  authDomain: (import.meta as any).env?.VITE_FIREBASE_AUTH_DOMAIN || rawConfig?.authDomain || FALLBACK_CONFIG.authDomain,
  firestoreDatabaseId: (import.meta as any).env?.VITE_FIREBASE_DATABASE_ID || rawConfig?.firestoreDatabaseId || FALLBACK_CONFIG.firestoreDatabaseId,
};

const app = initializeApp(activeConfig);

export const db = activeConfig.firestoreDatabaseId
  ? getFirestore(app, activeConfig.firestoreDatabaseId)
  : getFirestore(app);

export const auth = getAuth(app);

// Enable offline persistence for zero-second data loading even without internet
if (typeof window !== 'undefined') {
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      // Multiple tabs open, persistence can only be enabled in one tab at a time.
      console.warn('Firestore persistence failed: Multiple tabs open');
    } else if (err.code === 'unimplemented') {
      // The current browser doesn't support all of the features required to enable persistence
      console.warn('Firestore persistence not supported by browser');
    }
  });
}

export { doc, onSnapshot, setDoc, getDoc, collection, getDocs, terminate };
