import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore"; // ✅ Add this line

const firebaseConfig = {
  apiKey: "AIzaSyDh56VHB7fRSTSAPnZrzq4z3MDR_Ziav_0",
  authDomain: "althakeel-attendance.firebaseapp.com",
  projectId: "althakeel-attendance",
  storageBucket: "althakeel-attendance.appspot.com",  // Corrected here
  messagingSenderId: "43659960791",
  appId: "1:43659960791:web:9896062ab9cbf5b8102b92",
  measurementId: "G-1V8R88ZEGV"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app); // ✅ Initialize Firestore

export { app, auth, db }; // ✅ Export db
