/* ============================================================
   firebase-config.js — Firebase initialization & configuration
   ============================================================ */

/**
 * Firebase configuration — replace placeholder values with your
 * actual Firebase project credentials.
 */
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCX6lLJsWQBgtmqCDwIvRizQbXnxAcxg28",
  authDomain: "scratch-tracker.firebaseapp.com",
  projectId: "scratch-tracker",
  storageBucket: "scratch-tracker.firebasestorage.app",
  messagingSenderId: "427189707101",
  appId: "1:427189707101:web:4300986eda37c4e89308b4"

};

/**
 * Returns true when the config contains real credentials (not placeholders).
 * @returns {boolean}
 */
function isFirebaseConfigured() {
  return FIREBASE_CONFIG.apiKey && !FIREBASE_CONFIG.apiKey.startsWith("YOUR_");
}

/* --- Initialize Firebase only when properly configured --- */
if (isFirebaseConfigured()) {
  firebase.initializeApp(FIREBASE_CONFIG);
}

/** Firestore reference (null when Firebase is not configured) */
const db = isFirebaseConfigured() ? firebase.firestore() : null;

/* Offline support: cache data locally so the app works without a connection
   and queues writes until it's back online. Safe to fail (e.g. multiple tabs). */
if (db) {
  db.enablePersistence({ synchronizeTabs: true }).catch(function () {});
}

/** Auth reference (null when Firebase is not configured) */
const auth = isFirebaseConfigured() ? firebase.auth() : null;
