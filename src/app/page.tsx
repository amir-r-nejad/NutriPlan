
"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { useUser } from '@/hooks/use-user';

export default function HomePage() {
  const router = useRouter();
  const user =  useUser()

  useEffect(() => {
    if (user==null) {
      router.replace('/login');
    } else if(user){
      router.replace('/dashboard');
    }
  }, [user, router]);

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
