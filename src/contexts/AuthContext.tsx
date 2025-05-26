
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';

import firebase from "firebase/compat/app";
import "firebase/compat/auth";

import { useToast } from '@/hooks/use-toast';


interface AuthContextType {
  user: firebase.User | null;
  isLoading: boolean;
  isOnboarded: boolean;
  login: (email: string, password: string) => Promise<Login | undefined>;
  logout: () => void;
  Glogin: () => void;
  onRedirectResult: (() => void)|undefined
}


const AuthContext = createContext<AuthContextType | undefined>(undefined);



const firebaseConfig = {
  apiKey: "AIzaSyBn52hl8ARjilr2TBAOKGHbAw6G3-CvGgw",
  authDomain: "nutriplan-7wkxu.firebaseapp.com",
  projectId: "nutriplan-7wkxu",
  storageBucket: "nutriplan-7wkxu.firebasestorage.app",
  messagingSenderId: "631126099554",
  appId: "1:631126099554:web:45488015d6fda0f149f33b"
};


interface Error {
  code: string,
  message: string
}
interface Login {
  user:firebase.User|null,
  error:Error|null
}
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<firebase.User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnboarded, setIsOnboarded] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  const provider = new firebase.auth.GoogleAuthProvider()
  const [auth, setAuth] = useState<firebase.auth.Auth>()
  const [onRedirectResult,setCallback] = useState<()=>void>()
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedUser = localStorage.getItem('nutriplan_user');
      const storedOnboardingStatus = localStorage.getItem('nutriplan_onboarded');
      const app = !firebase.apps.length ?
        firebase.initializeApp(firebaseConfig)
        : firebase.app()
      const fAuth = firebase.auth(app)
      setAuth(fAuth)
      setCallback(() => {
        const app = !firebase.apps.length ?
          firebase.initializeApp(firebaseConfig)
          : firebase.app()
        const fAuth = firebase.auth(app)
        fAuth!.getRedirectResult().then((result) => {
          if(result.user || firebase.auth().currentUser){
            const newUser = firebase.auth().currentUser??result.user;
            if (newUser == null) return
            setUser(newUser);
            console.log(newUser, result)
            localStorage.setItem('nutriplan_user', JSON.stringify(newUser));
            toast({
              title: "Login Successful",
              description: `Welcome back, ${newUser.email}!`,
            })
            router.push("/dashboard")
          }
        }).catch((error: any) => {
          toast({
            title: "Login Failed",
            description: error.message,
            variant: "destructive",
          })
        })
      })

      provider.addScope("https://www.googleapis.com/auth/contacts.readonly")

      if (storedUser) {
        setUser(JSON.parse(storedUser));
        if (storedOnboardingStatus === 'true') {
          setIsOnboarded(true);
        }
      }
    }

    setIsLoading(false);
  }, [pathname]);

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


  const login: (email: string, password: string) => Promise<Login | undefined> = async (email: string, password: string) => {
    try {
      const userCredential = await auth!.signInWithEmailAndPassword(email, password)
      const newUser = userCredential.user;
      setUser(newUser);
      localStorage.setItem('nutriplan_user', JSON.stringify(newUser));
      return { user: newUser, error: null } as Login;
    } catch (error: any) {
      const errorCode = error.code;
      const errorMessage = error.message;
      return { user: null, error: { code: errorCode, message: errorMessage } as Error } as Login
    };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('nutriplan_user');
    localStorage.removeItem('access_token');
    auth!.signOut();
    router.push('/login');
  };
  const Glogin = async () => {
    console.log("loging in with google")
    await auth!.signInWithRedirect(provider);
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, isOnboarded, login, logout,Glogin,onRedirectResult }}>
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
