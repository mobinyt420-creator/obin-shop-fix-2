import { getFirestore, enableMultiTabIndexedDbPersistence, collection, getDocs, doc, setDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { app } from "./config";

export const db = getFirestore(app);

// Enable persistence only on client side
if (typeof window !== 'undefined') {
  enableMultiTabIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.');
    } else if (err.code === 'unimplemented') {
      console.warn('The current browser does not support all of the features required to enable persistence');
    }
  });
}

export const dbServices = {
  getCollection: async (colName: string) => {
    const querySnapshot = await getDocs(collection(db, colName));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },
  // Add more specific database queries here as needed
};
