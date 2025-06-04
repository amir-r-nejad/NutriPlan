"use server"
import serviceAccount from './nutriplan-firebase.json';
import admin, { ServiceAccount } from 'firebase-admin';


// Initialize Firebase
const app = admin.apps.length == 0 ? admin.initializeApp({ credential: admin.credential.cert(serviceAccount as ServiceAccount) }) : admin.app();
const auth = admin.auth(app);
const db = admin.firestore(app);
const storage = admin.storage(app);
export const  getAuth =async()=>{
        return auth
}

export const  getDb =async()=>{
        return db;
}
