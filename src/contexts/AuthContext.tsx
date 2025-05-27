
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
import { app } from '@/lib/firebase'; 
import { useToast } from '@/hooks/use-toast';
import { sendEmailVerificationToUser } from '@/lib/firebase/auth'; // Added

interface User {
  uid: string; 
  email: string | null;
  emailVerified: boolean; // Added
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isOnboarded: boolean;
  login: (email: string, password_unused?: string) => Promise<void>; 
  signup: (email: string, password_unused?: string) => Promise<void>; 
  logout: () => Promise<void>;
  completeOnboarding: () => void;
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
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
      setIsLoading(true);
      if (firebaseUser) {
        const appUser: User = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          emailVerified: firebaseUser.emailVerified, // Added
        };
        setUser(appUser);
        const storedOnboardingStatus = localStorage.getItem(`nutriplan_onboarded_${firebaseUser.uid}`);
        if (storedOnboardingStatus === 'true') {
          setIsOnboarded(true);
        } else {
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
      if (!isOnboarded) { 
        if (!isOnboardingPage && !isUtilityPage) { 
          router.push('/onboarding');
        }
      } else { 
        if (isAuthPage || isOnboardingPage) { 
          router.push('/dashboard');
        }
      }
    }
  }, [user, isOnboarded, isLoading, pathname, router]);

  const login = async (emailProvided: string, passwordProvided: string) => {
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, emailProvided, passwordProvided);
      toast({ title: "Login Successful", description: `Welcome back!` });
      // onAuthStateChanged handles navigation based on onboarded status
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
      // onAuthStateChanged will handle setting user
      // User will be redirected to onboarding by the useEffect hook as isOnboarded will be false
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
    setIsLoading(true); // Set loading state
    try {
      await firebaseSignOut(auth);
      // Clear local state immediately after sign out success
      setUser(null);
      setIsOnboarded(false);
      localStorage.clear(); // Consider more targeted removal if needed
      router.push('/login'); 
    } catch (error) {
      console.error("Firebase logout error:", error);
      toast({ title: "Logout Failed", description: "Could not log out. Please try again.", variant: "destructive" });
    } finally {
      setIsLoading(false); // Reset loading state
    }
  };

  const completeOnboarding = () => {
    if (user) {
      setIsOnboarded(true);
      localStorage.setItem(`nutriplan_onboarded_${user.uid}`, 'true'); 
      router.push('/dashboard');
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
