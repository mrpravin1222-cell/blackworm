import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  onSnapshot,
  setDoc,
  getDoc,
  collection,
  getDocs
} from 'firebase/firestore';
import rawConfig from '../firebase-applet-config.json';

// Safely resolve config from environment variables or local applet JSON
const activeConfig = {
  projectId: (import.meta as any).env?.VITE_FIREBASE_PROJECT_ID || rawConfig?.projectId || '',
  appId: (import.meta as any).env?.VITE_FIREBASE_APP_ID || rawConfig?.appId || '',
  apiKey: (import.meta as any).env?.VITE_FIREBASE_API_KEY || rawConfig?.apiKey || '',
  authDomain: (import.meta as any).env?.VITE_FIREBASE_AUTH_DOMAIN || rawConfig?.authDomain || '',
  firestoreDatabaseId: (import.meta as any).env?.VITE_FIREBASE_DATABASE_ID || rawConfig?.firestoreDatabaseId || '',
};

const app = initializeApp(activeConfig);

export const db = activeConfig.firestoreDatabaseId
  ? getFirestore(app, activeConfig.firestoreDatabaseId)
  : getFirestore(app);

export { doc, onSnapshot, setDoc, getDoc, collection, getDocs };
