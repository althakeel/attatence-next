import { auth, db } from "./firebaseConfig";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";

export async function createUserWithRole(email, password, role) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    await setDoc(doc(db, "users", user.uid), {
      email,
      role,
      createdAt: new Date().toISOString()
    });

    return user;
  } catch (error) {
    throw new Error(error.message);
  }
}
