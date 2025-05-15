
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';

export default function HomePage() {
  const { user, isOnboarded, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.replace('/login');
      } else if (!isOnboarded) {
        router.replace('/onboarding');
      } else {
        router.replace('/dashboard');
      }
    }
  }, [user, isOnboarded, isLoading, router]);

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="space-y-4">
        <Skeleton className="h-12 w-64 rounded-md" />
        <Skeleton className="h-8 w-48 rounded-md" />
        <Skeleton className="h-32 w-64 rounded-md" />
      </div>
    </div>
  );
}
