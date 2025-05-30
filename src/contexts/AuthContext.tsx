
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { 
  onAuthStateChanged,
  type User as FirebaseUser 
} from 'firebase/auth';
import { app } from '@/lib/firebase/firebase'; 
import { useToast } from '@/hooks/use-toast';
import { login as fLogin , signOut as fSignOut,signIn as fSignIn } from "@/lib/firebase/auth";
import { useUser } from '@/hooks/use-user';
import { getAuthenticatedAppForUser } from '@/app/api/user/serverApp';

interface User {
  uid: string; 
  email: string | null;
  emailVerified: boolean; // Added
}

interface AuthContextType {
  user: User | null | undefined;
  isLoading: boolean;
  isOnboarded: boolean;
  login: (emailProvided: string, passwordProvided: string) => Promise<void>; 
  signup: (emailProvided: string, passwordProvided: string) => Promise<void>; 
  logout: () => Promise<void>;
  completeOnboarding: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user,setUser] = useState<FirebaseUser | null>(null);
  const logindeUser = useUser();
  const [isLoading, setIsLoading] = useState(false);
  const [isOnboarded, setIsOnboarded] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();


  useEffect(() => {
    const user 
        setUser(currentUser)
    })
    console.log(user,logindeUser)
    if (isLoading) return;

    const isAuthPage = pathname === '/login' || pathname === '/signup' || pathname === "/forgot-password" || pathname==="/reset-password";
    const isOnboardingPage = pathname === '/onboarding';
    
    if (!user) { 
      if (!isAuthPage && !isOnboardingPage && pathname !== '/' ) {
        router.push('/login');
      }
    } else { 
      const isOnBoard = localStorage.getItem(`nutriplan_profile_${user.uid}`)
      console.log(user)
      if (isOnBoard) {
        setIsOnboarded(true)
      }
      if (!isOnboarded) { 
        if (!isOnboardingPage) { 
          router.push('/onboarding');
        }
      } else { 
        if (isAuthPage || isOnboardingPage) { 
          router.push('/dashboard');
        }
      }
    }
  }, [user, isOnboarded, isLoading, pathname, router,logindeUser]);

  const login = async (emailProvided: string, passwordProvided: string) => {
    setIsLoading(true);
    try {
      await fLogin(emailProvided, passwordProvided);
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
      setIsOnboarded(false);
    } finally {
      setIsLoading(false);
    }
  };
  
  const signup = async (emailProvided: string, passwordProvided: string) => {
    setIsLoading(true);
    try {
      await fSignIn(emailProvided, passwordProvided);
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
      setIsOnboarded(false);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true); // Set loading state
    try {
      await fSignOut();
      router.push('/login'); // Explicitly push to login on logout
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
