// firebaseConfig.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";
import { getDatabase, ref, get, set, onValue } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyBEXevAPjcsgvtXJMVNJMVq4SKnbajsON8",
  authDomain: "smartenergymeter-f3dd3.firebaseapp.com",
  databaseURL: "https://smartenergymeter-f3dd3-default-rtdb.firebaseio.com",
  projectId: "smartenergymeter-f3dd3",
  storageBucket: "smartenergymeter-f3dd3.firebasestorage.app",
  messagingSenderId: "301203302431",
  appId: "1:301203302431:web:72932d0693c7d8a6944d2a",
  measurementId: "G-L2TVRJYGRP"
};


// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export { ref, get, set, onValue };
