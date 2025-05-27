import {
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged as _onAuthStateChanged,
  onIdTokenChanged as _onIdTokenChanged,
  NextOrObserver,
  User,
  signInWithRedirect,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  confirmPasswordReset,
} from "firebase/auth";

import { auth } from "./clientApp";

export function onAuthStateChanged(cb:NextOrObserver<User>) {
    console.log(cb)
  return _onAuthStateChanged(auth, cb);
}

export function onIdTokenChanged(cb:NextOrObserver<User>) {
  return _onIdTokenChanged(auth, cb);
}

export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();

  try {
    await signInWithRedirect(auth, provider);
  } catch (error) {
    console.error("Error signing in with Google", error);
  }
}

export async function signOut() {
  try {
    return auth.signOut();
  } catch (error) {
    console.error("Error signing out with Google", error);
  }
}
export async function login(email: string, password: string) {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password)
    }
    catch (error: any) {
        const errorCode = error.code;
        const errorMessage = error.message;
    }
};

export async function forgetPassword(email:string) {
    sendPasswordResetEmail(auth,email)
}
export async function confirmPassword(oobCode: string, newPassword: string) {
    confirmPasswordReset(auth, oobCode, newPassword)
}