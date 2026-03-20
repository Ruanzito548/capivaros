import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyB6xsOgPfwyiBAie7TufMm-G4TCugwfTlQ",
  authDomain: "capivaros-templarios.firebaseapp.com",
  projectId: "capivaros-templarios",
  storageBucket: "capivaros-templarios.firebasestorage.app",
  messagingSenderId: "690734005020",
  appId: "1:690734005020:web:3421f1a927592a424b98d9",
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);