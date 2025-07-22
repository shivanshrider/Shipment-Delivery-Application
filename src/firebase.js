// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDU7mpcqXVUKlgiumUsTH4zk-AVwuGfwgg",
  authDomain: "shipment-app-3f1a6.firebaseapp.com",
  projectId: "shipment-app-3f1a6",
  storageBucket: "shipment-app-3f1a6.firebasestorage.app",
  messagingSenderId: "219953412242",
  appId: "1:219953412242:web:5661f8a94fe66568200e4b"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
