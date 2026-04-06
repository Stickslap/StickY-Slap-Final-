'use client';

import firebaseConfig from '../../firebase-applet-config.json';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, initializeFirestore } from 'firebase/firestore'

// IMPORTANT: DO NOT MODIFY THIS FUNCTION
export function initializeFirebase() {
  if (!getApps().length) {
    const firebaseApp = initializeApp(firebaseConfig);
    return getSdks(firebaseApp);
  }

  // If already initialized, return the SDKs with the already initialized App
  return getSdks(getApp());
}

export function getSdks(firebaseApp: FirebaseApp) {
  const dbId = "ai-studio-73577978-c57a-4d16-9fca-7a635e2af192";
  console.log("Initializing Firestore with database ID:", dbId);
  let db;
  try {
    db = initializeFirestore(firebaseApp, {}, dbId);
  } catch (e) {
    // If it's already initialized, getFirestore will return it
    db = getFirestore(firebaseApp, dbId);
  }
  console.log("Firestore initialized. Database ID:", (db as any)._databaseId || (db as any).databaseId || "unknown");
  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: db
  };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
