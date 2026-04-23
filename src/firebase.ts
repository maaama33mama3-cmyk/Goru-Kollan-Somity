import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDY52D7x_9--LC_yx2_rpfozjJmQSsjRy0",
  authDomain: "goru-kallyan-somiti.firebaseapp.com",
  projectId: "goru-kallyan-somiti",
  storageBucket: "goru-kallyan-somiti.firebasestorage.app",
  messagingSenderId: "473769189799",
  appId: "1:473769189799:web:0249c7dcfb110c92e6d682",
  measurementId: "G-5FXQL7WF84"
};

// Check if Firebase is configured
export const isFirebaseConfigured = true;

export const app = isFirebaseConfigured ? initializeApp(firebaseConfig) : null;
export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;

export const googleProvider = new GoogleAuthProvider();
