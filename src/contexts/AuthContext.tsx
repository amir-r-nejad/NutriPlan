
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
import { app } from '@/lib/firebase'; // Import your Firebase app instance
import { useToast } from '@/hooks/use-toast';

interface User {
  uid: string; // Changed from id to uid for Firebase consistency
  email: string | null;
  // Add other user properties as needed from FirebaseUser if desired
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isOnboarded: boolean;
  login: (email: string, password_unused?: string) => Promise<void>; // Password will be handled by Firebase
  signup: (email: string, password_unused?: string) => Promise<void>; // Password will be handled by Firebase
  logout: () => Promise<void>;
  completeOnboarding: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const auth = getAuth(app); // Get auth instance

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
        };
        setUser(appUser);
        // Check onboarding status from localStorage, keyed by Firebase UID
        const storedOnboardingStatus = localStorage.getItem(`nutriplan_onboarded_${firebaseUser.uid}`);
        if (storedOnboardingStatus === 'true') {
          setIsOnboarded(true);
        } else {
          setIsOnboarded(false);
        }
      } else {
        setUser(null);
        setIsOnboarded(false);
        localStorage.removeItem('nutriplan_onboarded'); // Clear general onboarding flag on logout
      }
      setIsLoading(false);
    });

    return () => unsubscribe(); // Cleanup subscription on unmount
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const isAuthPage = pathname?.startsWith('/login') || pathname?.startsWith('/signup');
    const isOnboardingPage = pathname?.startsWith('/onboarding');

    if (!user && !isAuthPage && !isOnboardingPage && pathname !== '/') {
      router.push('/login');
    } else if (user && !isOnboarded && !isOnboardingPage && pathname !== '/login' && pathname !== '/signup') {
      router.push('/onboarding');
    } else if (user && isOnboarded && (isAuthPage || isOnboardingPage)) {
      router.push('/dashboard');
    }
  }, [user, isOnboarded, isLoading, pathname, router]);

  const login = async (emailProvided: string, passwordProvided: string) => {
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, emailProvided, passwordProvided);
      // onAuthStateChanged will handle setting user and onboarding status
      // Navigation will be handled by the useEffect hook
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
      setUser(null); // Ensure user is null on failed login attempt
      setIsOnboarded(false);
    } finally {
      setIsLoading(false);
    }
  };
  
  const signup = async (emailProvided: string, passwordProvided: string) => {
    setIsLoading(true);
    try {
      await createUserWithEmailAndPassword(auth, emailProvided, passwordProvided);
      // onAuthStateChanged will handle setting user
      // User will be redirected to onboarding by the useEffect hook as isOnboarded will be false
      toast({ title: "Signup Successful", description: "Welcome! Please complete your profile." });
    } catch (error: any) {
      console.error("Firebase signup error:", error);
      let errorMessage = "Failed to sign up. Please try again.";
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = "This email address is already in use.";
      } else if (error.code === 'auth/weak-password') {
        errorMessage = "Password is too weak. It should be at least 6 characters.";
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = "Please enter a valid email address.";
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
      // onAuthStateChanged will set user to null and clear onboarding
      // localStorage.removeItem for specific user onboarding is handled in onAuthStateChanged
      router.push('/login');
    } catch (error) {
      console.error("Firebase logout error:", error);
      toast({ title: "Logout Failed", description: "Could not log out. Please try again.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const completeOnboarding = () => {
    if (user) {
      setIsOnboarded(true);
      localStorage.setItem(`nutriplan_onboarded_${user.uid}`, 'true'); // User-specific onboarding status
      localStorage.setItem('nutriplan_onboarded', 'true'); // General onboarding status (could be removed if only uid-specific is used)
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
