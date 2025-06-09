"use server"
import admin, { ServiceAccount } from 'firebase-admin';
import {firebaseConfig} from "../constants"



console.log("Server config",firebaseConfig)
// Initialize Firebase
const app = admin.apps.length == 0 ? admin.initializeApp(firebaseConfig) : admin.app();
const auth = admin.auth(app);
const db = admin.firestore(app);
const storage = admin.storage(app);
export const  getAuth =async()=>{
        return auth
}

export const  getDb =async()=>{
        return db;
}
