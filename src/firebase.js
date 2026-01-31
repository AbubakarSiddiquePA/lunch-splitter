import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDaBsttbmHLLqnfJ3uRqWPik2oV27IQVd8",
  authDomain: "office-lunch-splitter.firebaseapp.com",
  projectId: "office-lunch-splitter",
  storageBucket: "office-lunch-splitter.firebasestorage.app",
  messagingSenderId: "845070654070",
  appId: "1:845070654070:web:5c82ded6d87b7fbb3b5d57",
  measurementId: "G-Y884NEWT9N"
};

const app = initializeApp(firebaseConfig);

const db = getFirestore(app);

export { db };
