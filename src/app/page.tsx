
"use client";
import { Skeleton } from '@/components/ui/skeleton';

export default function HomePage() {
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
