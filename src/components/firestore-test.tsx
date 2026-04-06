'use client';
import { useEffect } from 'react';
import { doc, getDocFromServer } from 'firebase/firestore';
import { useFirestore } from '@/firebase';

export function FirestoreTest() {
  const db = useFirestore();
  useEffect(() => {
    async function testConnection() {
      try {
        const docRef = doc(db, 'test', 'connection');
        await getDocFromServer(docRef);
        console.log("Firestore connection test: Success");
      } catch (error) {
        console.error("Firestore connection test error:", error);
      }
    }
    testConnection();
  }, [db]);
  return null;
}
