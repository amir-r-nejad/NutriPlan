
import {
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged as _onAuthStateChanged,
  onIdTokenChanged as _onIdTokenChanged,
  NextOrObserver,
  User,
  signInWithRedirect,
  signInWithEmailAndPassword,
  sendPasswordResetEmail as firebaseSendPasswordResetEmail,
  verifyPasswordResetCode as firebaseVerifyPasswordResetCode,
  confirmPasswordReset as firebaseConfirmPasswordReset,
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
        // Rethrow or handle as needed for AuthContext
        throw error;
    }
};

export async function sendPasswordResetEmail(email: string) {
  try {
    await firebaseSendPasswordResetEmail(auth, email);
  } catch (error) {
    console.error("Error sending password reset email", error);
    throw error; // Propagate error to be handled in the UI
  }
}

export async function verifyPasswordResetCode(actionCode: string) {
  try {
    const email = await firebaseVerifyPasswordResetCode(auth, actionCode);
    return email; // Returns the user's email if the code is valid
  } catch (error) {
    console.error("Error verifying password reset code", error);
    throw error;
  }
}

export async function confirmPasswordReset(actionCode: string, newPassword: string) {
  try {
    await firebaseConfirmPasswordReset(auth, actionCode, newPassword);
  } catch (error) {
    console.error("Error confirming password reset", error);
    throw error;
  }
}
