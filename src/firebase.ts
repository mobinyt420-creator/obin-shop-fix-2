import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore, enableMultiTabIndexedDbPersistence } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCmHPYeSrGlbCTaw2B50q3RMiT-sBIdNRc",
  authDomain: "new-shop-b229c.firebaseapp.com",
  projectId: "new-shop-b229c",
  storageBucket: "new-shop-b229c.firebasestorage.app",
  messagingSenderId: "424792384330",
  appId: "1:424792384330:web:742cd78fabfa6804ae17b3",
  measurementId: "G-EKWEWLQFFE"
};

export const app = initializeApp(firebaseConfig);
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;
export const db = getFirestore(app);
enableMultiTabIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    console.warn('Multiple tabs open, persistence can only be enabled in one tab at a a time.');
  } else if (err.code === 'unimplemented') {
    console.warn('The current browser does not support all of the features required to enable persistence');
  }
});
export const storage = getStorage(app);
export const auth = getAuth(app);

// Google Sheets Webhook URL
export const GOOGLE_SHEETS_WEBHOOK_URL = import.meta.env.VITE_GOOGLE_SHEETS_WEBHOOK_URL || "https://script.google.com/macros/s/AKfycbw216IALTpxTrWOw_pGvT_kd_tLIE7hFJYs8_LSt4zs2HoFhdGu-uKCAKm97WUcnz2z/exec";

export const SECRET_ADMIN_EMAIL = import.meta.env.VITE_SECRET_ADMIN_EMAIL || "mobinyt420@gmail.com";
