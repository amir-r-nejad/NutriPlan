
"use client";

import { initializeApp, getApps, getApp } from "firebase/app"; // Added getApps, getApp
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { firebaseConfig } from "../constants";

// Initialize Firebase only if it hasn't been initialized yet
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const firebaseApp = app; // Export the singleton app instance

export const auth = getAuth(app); // Use the singleton app instance for auth
export const db = getFirestore(app); // Use the singleton app instance for firestore
export const storage = getStorage(app); // Use the singleton app instance for storage
