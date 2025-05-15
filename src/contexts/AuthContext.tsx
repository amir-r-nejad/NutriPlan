
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface User {
  id: string;
  email: string;
  // Add other user properties as needed
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isOnboarded: boolean;
  login: (email: string, id?: string) => void;
  logout: () => void;
  completeOnboarding: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnboarded, setIsOnboarded] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Simulate checking auth status
    const storedUser = localStorage.getItem('nutriplan_user');
    const storedOnboardingStatus = localStorage.getItem('nutriplan_onboarded');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
      if (storedOnboardingStatus === 'true') {
        setIsOnboarded(true);
      }
    }
    setIsLoading(false);
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


  const login = (email: string, id: string = 'mock_user_id') => {
    const newUser = { id, email };
    setUser(newUser);
    localStorage.setItem('nutriplan_user', JSON.stringify(newUser));
    // Check if user has completed onboarding before, default to false
    const storedOnboardingStatus = localStorage.getItem(`nutriplan_onboarded_${id}`);
    if (storedOnboardingStatus === 'true') {
      setIsOnboarded(true);
      localStorage.setItem('nutriplan_onboarded', 'true'); // General onboarding status
      router.push('/dashboard');
    } else {
      setIsOnboarded(false);
      localStorage.removeItem('nutriplan_onboarded');
      router.push('/onboarding');
    }
  };

  const logout = () => {
    setUser(null);
    setIsOnboarded(false);
    localStorage.removeItem('nutriplan_user');
    localStorage.removeItem('nutriplan_onboarded');
    if (user) {
       localStorage.removeItem(`nutriplan_onboarded_${user.id}`);
    }
    router.push('/login');
  };

  const completeOnboarding = () => {
    if (user) {
      setIsOnboarded(true);
      localStorage.setItem('nutriplan_onboarded', 'true');
      localStorage.setItem(`nutriplan_onboarded_${user.id}`, 'true'); // User-specific onboarding status
      router.push('/dashboard');
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, isOnboarded, login, logout, completeOnboarding }}>
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
