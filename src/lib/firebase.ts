import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore, initializeFirestore } from "firebase/firestore";

export const firebaseConfig = {
  apiKey: "AIzaSyAc0TigGJ37e0xBssTM82Y78eotzEzr6dM",
  authDomain: "smart-task-manager-ia.firebaseapp.com",
  projectId: "smart-task-manager-ia",
  storageBucket: "smart-task-manager-ia.firebasestorage.app",
  messagingSenderId: "418342155714",
  appId: "1:418342155714:web:b85297a844a692a896125b",
};

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

let firestoreInstance;
try {
  firestoreInstance = initializeFirestore(app, { ignoreUndefinedProperties: true });
} catch {
  firestoreInstance = getFirestore(app);
}
export const db = firestoreInstance;
export const googleProvider = new GoogleAuthProvider();