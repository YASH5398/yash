// Firebase configuration and initialization
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyATdpruM3xBRsQGRtLb7BdA9WTDGkRkrNU",
  authDomain: "trading-record-4fc14.firebaseapp.com",
  databaseURL: "https://trading-record-4fc14-default-rtdb.firebaseio.com",
  projectId: "trading-record-4fc14",
  storageBucket: "trading-record-4fc14.firebasestorage.app",
  messagingSenderId: "282613130293",
  appId: "1:282613130293:web:2dbc040e3027c5c5cbbd7c",
  measurementId: "G-0WR3KJ6LP0"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Initialize reCAPTCHA for phone authentication
window.recaptchaVerifier = null;