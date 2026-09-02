import { initializeApp, getApps, getApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyCmHPYeSrGlbCTaw2B50q3RMiT-sBIdNRc",
  authDomain: "new-shop-b229c.firebaseapp.com",
  projectId: "new-shop-b229c",
  storageBucket: "new-shop-b229c.firebasestorage.app",
  messagingSenderId: "424792384330",
  appId: "1:424792384330:web:742cd78fabfa6804ae17b3",
  measurementId: "G-EKWEWLQFFE"
};

// Initialize Firebase securely for Next.js SSR
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

export { app, analytics };
