
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { 
  getAuth, 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as firebaseSignOut,
  sendEmailVerification as firebaseSendEmailVerification,
  type User as FirebaseUser 
} from 'firebase/auth';
import { app, db } from '@/lib/firebase/clientApp'; 
import { useToast } from '@/hooks/use-toast';
// Removed sendEmailVerificationToUser import as it's directly used from firebase/auth
import { doc, getDoc, setDoc } from 'firebase/firestore'; 
import type { OnboardingFormValues, FullProfileType } from '@/lib/schemas'; 

interface User {
  uid: string; 
  email: string | null;
  emailVerified: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isOnboarded: boolean;
  login: (email: string, password?: string) => Promise<void>; 
  signup: (email: string, password?: string) => Promise<void>; 
  logout: () => Promise<void>;
  completeOnboarding: (profileData: OnboardingFormValues) => Promise<void>; 
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const auth = getAuth(app); 

// Helper to convert undefined to null for Firestore
function preprocessDataForFirestore(data: Record<string, any>): Record<string, any> {
  const processedData: Record<string, any> = {};
  for (const key in data) {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      processedData[key] = data[key] === undefined ? null : data[key];
    }
  }
  return processedData;
}


export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnboarded, setIsOnboarded] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => { 
      setIsLoading(true);
      if (firebaseUser) {
        const appUser: User = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          emailVerified: firebaseUser.emailVerified,
        };
        setUser(appUser);
        try {
          const userProfileRef = doc(db, "users", firebaseUser.uid);
          const docSnap = await getDoc(userProfileRef);
          if (docSnap.exists() && docSnap.data()?.onboardingComplete) { 
            setIsOnboarded(true);
          } else {
            setIsOnboarded(false);
          }
        } catch (error) {
          console.error("Error checking onboarding status from Firestore:", error);
          setIsOnboarded(false); 
        }
      } else {
        setUser(null);
        setIsOnboarded(false);
      }
      setIsLoading(false);
    });

    return () => unsubscribe(); 
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const isAuthPage = pathname === '/login' || pathname === '/signup' || pathname === '/forgot-password';
    const isUtilityPage = pathname === '/reset-password' || pathname === '/verify-email';
    const isOnboardingPage = pathname === '/onboarding';
    
    if (!user) { 
      if (!isAuthPage && !isOnboardingPage && pathname !== '/' && !isUtilityPage) {
        router.push('/login');
      }
    } else { 
        if (!user.emailVerified && !isUtilityPage && pathname !== '/login' && !isOnboardingPage && !isAuthPage) {
            toast({ title: "Email Not Verified", description: "Please verify your email address to continue.", variant: "destructive", duration: 7000});
            // Consider redirecting to login or a specific "please verify" page if strict verification is needed before any app access
            // For now, if they are on login, signup, or onboarding, they can stay.
            // If they try to go elsewhere protected, they'll be pushed back by other conditions or this one if refined.
        } else if (!isOnboarded) { 
            if (!isOnboardingPage && !isUtilityPage) { 
              router.push('/onboarding');
            }
        } else { // User is authenticated, (email verified or on path to be), and onboarded
            if (isAuthPage || isOnboardingPage) { 
              router.push('/dashboard');
            }
        }
    }
  }, [user, isOnboarded, isLoading, pathname, router, toast]);

  const login = async (emailProvided: string, passwordProvided?: string) => { // Made password optional for potential future social logins
    if (!passwordProvided) {
      toast({ title: "Login Failed", description: "Password is required.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, emailProvided, passwordProvided);
      toast({ title: "Login Successful", description: `Welcome back!` });
      // onAuthStateChanged will handle setting user and redirection
    } catch (error: any) {
      console.error("Firebase login error:", error);
      let errorMessage = "Failed to login. Please check your credentials.";
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        errorMessage = "Invalid email or password.";
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = "Please enter a valid email address.";
      }
      toast({ title: "Login Failed", description: errorMessage, variant: "destructive" });
      setUser(null); 
      setIsOnboarded(false);
    } finally {
      setIsLoading(false);
    }
  };
  
  const signup = async (emailProvided: string, passwordProvided?: string) => { // Made password optional
    if (!passwordProvided) {
      toast({ title: "Signup Failed", description: "Password is required.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, emailProvided, passwordProvided);
      if (userCredential.user) {
        await firebaseSendEmailVerification(userCredential.user);
        toast({ title: "Signup Successful", description: "Welcome! Please check your email to verify your account." });
      } else {
         toast({ title: "Signup Successful (Verification Pending)", description: "Welcome! Please check your email to verify your account. User object not immediately available." });
      }
      // onAuthStateChanged will handle setting user. Redirection to onboarding is handled by the useEffect.
    } catch (error: any) {
      let errorMessage = "Failed to sign up. Please try again.";
      let title = "Signup Failed";

      if (error.code === 'auth/email-already-in-use') {
        errorMessage = "This email address is already in use. Please try logging in or use a different email.";
        console.warn(`Signup attempt with existing email (${emailProvided}):`, error.message);
      } else if (error.code === 'auth/weak-password') {
        errorMessage = "Password is too weak. It should be at least 6 characters.";
        console.warn(`Signup attempt with weak password for email (${emailProvided}):`, error.message);
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = "Please enter a valid email address.";
        console.warn(`Signup attempt with invalid email format (${emailProvided}):`, error.message);
      } else if (error.code === 'auth/operation-not-allowed') {
        errorMessage = "Email/Password sign-up is not enabled for this project. Please check Firebase console settings.";
        console.error("CRITICAL: Email/Password sign-up not enabled in Firebase project.", error);
      } else {
        // For unexpected errors, log as error
        console.error("Unexpected Firebase signup error:", error);
      }
      
      toast({ title: title, description: errorMessage, variant: "destructive" });
      setUser(null);
      setIsOnboarded(false);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await firebaseSignOut(auth);
      setUser(null); 
      setIsOnboarded(false); 
      // router.push('/login'); // Redirection is handled by useEffect
    } catch (error) {
      console.error("Firebase logout error:", error);
      toast({ title: "Logout Failed", description: "Could not log out. Please try again.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const completeOnboarding = async (profileData: OnboardingFormValues) => {
    if (user) {
      try {
        const userProfileRef = doc(db, "users", user.uid);
        const dataToSave = preprocessDataForFirestore({
          ...profileData,
          email: user.email, // Ensure email is part of the profile
          onboardingComplete: true,
        });
        await setDoc(userProfileRef, dataToSave, { merge: true });
        setIsOnboarded(true); 
        // router.push('/dashboard'); // Redirection handled by useEffect
      } catch (error) {
        console.error("Error saving onboarding data to Firestore:", error);
        toast({ title: "Onboarding Error", description: "Could not save your profile. Please try again.", variant: "destructive" });
      }
    } else {
        toast({ title: "Authentication Error", description: "No user found. Cannot complete onboarding.", variant: "destructive"});
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, isOnboarded, login, signup, logout, completeOnboarding }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
