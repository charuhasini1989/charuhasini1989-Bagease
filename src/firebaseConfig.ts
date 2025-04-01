// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";  // Import Analytics

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyARxFxBCW09BAIOcBLb38WBz7vAWDj1-zE",
  authDomain: "bagease-23f95.firebaseapp.com",
  projectId: "bagease-23f95",
  storageBucket: "bagease-23f95.firebasestorage.app",
  messagingSenderId: "752731786593",
  appId: "1:752731786593:web:d971aefd701eb8861d8920",
  measurementId: "G-HB476DMZ9G"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);

export { db }; 