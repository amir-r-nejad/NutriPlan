import { db } from "@/lib/firebase/firebase"
import { collection,addDoc, updateDoc, query, where, getDocs  } from "firebase/firestore";
import {User} from  "firebase/auth"
import { OnboardingFormValues } from "./schemas";
async function  addUser(user:User){
    try{
        const userRef =  collection(db,"user")
        const q = query(userRef,where("uid","==",user.uid))
        const userSnapshot = await getDocs(q);
        if(userSnapshot.empty){
            addDoc(userRef, user)
        }
        return user
    }catch(e){
        throw e  
    }
}
async function onboardingUpdateUser(userId: string, onboardingValues: OnboardingFormValues) {
    try {
        const userRef = collection(db, "user");
        const q = query(userRef, where("uid", "==", userId));
        const userSnapshot = await getDocs(q);

        if (userSnapshot.empty) {
            throw new Error("User not found");
        }

        // Assuming uid is unique, so only one doc
        const userDoc = userSnapshot.docs[0];
        await updateDoc(userDoc.ref, onboardingValues);
        return true;
    } catch (e) {
        throw e;
    }
}
