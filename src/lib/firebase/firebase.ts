"use server"
import admin, { ServiceAccount } from 'firebase-admin';
import {firebaseConfig} from "../constants"


let serviceAccount:ServiceAccount = {
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || firebaseConfig.projectId,
        clientEmail: process.env.CLIENT_EMAIL,
        privateKey: process.env.PRIVATE_KEY
}
// Initialize Firebase
const app = admin.apps.length == 0 ? admin.initializeApp({ credential: admin.credential.cert(serviceAccount) }) : admin.app();
const auth = admin.auth(app);
const db = admin.firestore(app);
const storage = admin.storage(app);
export const  getAuth =async()=>{
        return auth
}

export const  getDb =async()=>{
        return db;
}
