
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
  type User as FirebaseUser 
} from 'firebase/auth';
import { app, db } from '@/lib/firebase/clientApp'; 
import { useToast } from '@/hooks/use-toast';
import { sendEmailVerificationToUser } from '@/lib/firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore'; 
import type { OnboardingFormValues } from '@/lib/schemas'; 

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
        if (!user.emailVerified && !isUtilityPage && pathname !== '/login') {
            // Optional: Could add a specific "please verify your email page" or just keep them on login/show a toast.
            // For now, if not verified, they can't access protected routes beyond login/utility.
            // If they are on login, they can stay. If they try to go elsewhere, they'll be pushed back.
            if (!isAuthPage) { // Allow them to be on login/signup/forgot if not verified
                 toast({ title: "Email Not Verified", description: "Please verify your email address to continue.", variant: "destructive", duration: 7000});
                //  router.push('/login'); // Or a specific "verify your email" page
            }
        } else if (!isOnboarded) { 
            if (!isOnboardingPage && !isUtilityPage) { 
              router.push('/onboarding');
            }
        } else { // User is authenticated, email verified, and onboarded
            if (isAuthPage || isOnboardingPage) { 
              router.push('/dashboard');
            }
        }
    }
  }, [user, isOnboarded, isLoading, pathname, router, toast]);

  const login = async (emailProvided: string, passwordProvided: string) => {
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, emailProvided, passwordProvided);
      toast({ title: "Login Successful", description: `Welcome back!` });
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
  
  const signup = async (emailProvided: string, passwordProvided: string) => {
    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, emailProvided, passwordProvided);
      if (userCredential.user) {
        await sendEmailVerificationToUser(userCredential.user);
        toast({ title: "Signup Successful", description: "Welcome! Please check your email to verify your account." });
      } else {
         toast({ title: "Signup Successful (Verification Pending)", description: "Welcome! Please check your email to verify your account. User object not immediately available." });
      }
    } catch (error: any) {
      console.error("Firebase signup error:", error);
      let errorMessage = "Failed to sign up. Please try again.";
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = "This email address is already in use.";
      } else if (error.code === 'auth/weak-password') {
        errorMessage = "Password is too weak. It should be at least 6 characters.";
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = "Please enter a valid email address.";
      } else if (error.code === 'auth/operation-not-allowed') {
        errorMessage = "Email/Password sign-up is not enabled for this project. Please check Firebase console settings.";
      }
      toast({ title: "Signup Failed", description: errorMessage, variant: "destructive" });
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
      setUser(null); // Explicitly set user to null on logout
      setIsOnboarded(false); // Explicitly set onboarded to false
      router.push('/login'); 
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
        // Ensure undefined fields are converted to null before saving
        const dataToSave: Record<string, any> = { ...profileData };
        for (const key in dataToSave) {
          if (dataToSave[key] === undefined) {
            dataToSave[key] = null;
          }
        }
        dataToSave.email = user.email;
        dataToSave.onboardingComplete = true;

        await setDoc(userProfileRef, dataToSave, { merge: true });
        setIsOnboarded(true); // Update context state
        router.push('/dashboard');
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
