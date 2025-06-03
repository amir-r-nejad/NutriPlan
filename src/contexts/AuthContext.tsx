
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { 
  getRedirectResult,
  type User as FirebaseUser 
} from 'firebase/auth';
import {  useToast } from '@/hooks/use-toast';
import { login as fLogin , signIn as fSignIn , signOut as fSignOut } from "@/lib/firebase/auth"

import type { OnboardingFormValues, } from '@/lib/schemas'; 
import { useUser } from '@/hooks/use-user';
import { getAuthenticatedAppForUser, IAuthincatedAppUser } from '@/app/api/user/serverApp';
import { addUser,onboardingUpdateUser } from '@/app/api/user/database';
import { auth } from "@/lib/firebase/clientApp"

interface User {
  uid: string; 
  email: string | null;
  emailVerified: boolean;
}

interface AuthContextType {
  user: User | null; // Changed from User | null | undefined
  isLoading: boolean;
  login: (email: string, password?: string) => Promise<void>; 
  signup: (email: string, password?: string) => Promise<void>; 
  logout: () => Promise<void>;
  completeOnboarding: (profileData: OnboardingFormValues) => Promise<void>; 
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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
  const user = useUser();
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  useEffect(() => {
    if (isLoading) return;
    const isAuthPage = pathname === '/login' || pathname === '/signup' || pathname === "/forgot-password" || pathname==="/reset-password";
    const isOnboardingPage = pathname === '/onboarding';
    const isOnboarded = localStorage.getItem("Onboarded") === "true";
    
    if (!user) { 
      if (!isAuthPage && !isOnboardingPage && pathname !== '/' ) {
        router.push('/login');
      }
    } else { 
        if (!user.emailVerified && pathname !== '/login' && !isOnboardingPage && !isAuthPage) {
            toast({ title: "Email Not Verified", description: "Please verify your email address to continue.", variant: "destructive", duration: 7000});
            // Consider redirecting to login or a specific "please verify" page if strict verification is needed before any app access
            // For now, if they are on login, signup, or onboarding, they can stay.
            // If they try to go elsewhere protected, they'll be pushed back by other conditions or this one if refined.
        } else if (!isOnboarded) { 
            if (!isOnboardingPage) { 
              router.push('/onboarding');
            }
        } else { // User is authenticated, (email verified or on path to be), and onboarded
            if (isAuthPage || isOnboardingPage) { 
              router.push('/dashboard');
            }
        }
    }
}, [user, isLoading, pathname, router]);// Added toast to dependency array
  const login = async (emailProvided: string, passwordProvided?: string) => { 
    if (!passwordProvided) {
      toast({ title: "Login Failed", description: "Password is required.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const userCredential = await fLogin(emailProvided, passwordProvided); // Use aliased fLogin
      if (userCredential.user) {
        localStorage.setItem('lastUserUid_nutriplan', userCredential.user.uid); // Store UID for logout
      }
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
    } finally {
      setIsLoading(false);
    }
  };
  
  const signup = async (emailProvided: string, passwordProvided?: string) => { 
    if (!passwordProvided) {
      toast({ title: "Signup Failed", description: "Password is required.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    let title = "Signup Failed";
    try {
      await fSignIn(emailProvided,passwordProvided);
    } catch (error: any) {
      let errorMessage = "Failed to sign up. Please try again.";
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = "This email address is already in use. Please try logging in or use a different email.";
      } else if (error.code === 'auth/weak-password') {
        errorMessage = "Password is too weak. It should be at least 6 characters.";
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = "Please enter a valid email address.";
      } else if (error.code === 'auth/operation-not-allowed') {
        errorMessage = "Email/Password sign-up is not enabled for this project.";
      }
      
      toast({ title: title, description: errorMessage, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    const currentUserUid = user?.uid; // Get UID before user state is cleared
    try {
      await fSignOut();
    } catch (error) {
      console.error("Firebase logout error:", error);
      toast({ title: "Logout Failed", description: "Could not log out. Please try again.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const completeOnboarding = async (profileData: OnboardingFormValues) => {
    if (user?.uid) { // Ensure user and user.uid exist
      try {
        await onboardingUpdateUser(user.uid,profileData)
        localStorage.setItem("Onboarded", "true");
        router.push('/dashboard'); // Redirection handled by useEffect
      } catch (error) {
        console.error("Error saving onboarding data to Firestore:", error);
        toast({ title: "Onboarding Error", description: "Could not save your profile. Please try again.", variant: "destructive" });
      }
    } else {
        toast({ title: "Authentication Error", description: "No user found. Cannot complete onboarding.", variant: "destructive"});
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading,login, signup, logout, completeOnboarding }}>
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
