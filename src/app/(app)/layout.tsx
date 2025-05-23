
"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  User,
  CalendarDays,
  Sparkles,
  Target,
  ClipboardList,
  LogOut,
  Settings,
  Bot,
  NotebookText,
  Calculator,
  SplitSquareHorizontal,
  ChefHat,
  Scaling // Added for Daily Macro Breakdown
} from 'lucide-react';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { Logo } from '@/components/Logo';
import { Toaster } from "@/components/ui/toaster";
import React from 'react';


const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/profile', label: 'Profile', icon: User },
  { href: '/tools/calorie-calculator', label: 'Calorie Calculator', icon: Calculator },
  { href: '/tools/macro-calculator', label: 'Daily Macro Breakdown', icon: Scaling },
  { href: '/tools/macro-splitter', label: 'Macro Splitter', icon: SplitSquareHorizontal },
  { href: '/tools/meal-suggestions', label: 'Meal Suggestions', icon: ChefHat },
  { href: '/meal-plan/current', label: 'Current Meal Plan', icon: NotebookText },
  { href: '/meal-plan/optimized', label: 'AI Meal Plan', icon: Bot },
];

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user, logout, isLoading } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [isLoading, user, router]);

  if (isLoading || !user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <SidebarProvider defaultOpen>
      <Sidebar>
        <SidebarHeader>
          <Logo />
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {navItems.map((item) => (
              <SidebarMenuItem key={item.label}>
                <Link href={item.href} legacyBehavior passHref>
                  <SidebarMenuButton
                    isActive={pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href))}
                    tooltip={item.label}
                  >
                    <item.icon />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter className="p-2">
           <div className="flex items-center gap-3 p-2 rounded-md border border-sidebar-border bg-sidebar-accent/50">
            <Avatar className="h-9 w-9">
              <AvatarImage src={`https://placehold.co/100x100.png?text=${user.email?.[0]?.toUpperCase() ?? 'U'}`} alt={user.email ?? 'User Avatar'} data-ai-hint="avatar person" />
              <AvatarFallback>{user.email?.[0]?.toUpperCase() ?? 'U'}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col group-data-[collapsible=icon]:hidden">
              <span className="text-sm font-medium text-sidebar-foreground truncate max-w-[120px]">{user.email}</span>
            </div>
          </div>
          <SidebarMenuButton onClick={logout} tooltip="Logout" className="w-full">
            <LogOut />
            <span>Logout</span>
          </SidebarMenuButton>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6 py-4">
          <SidebarTrigger className="sm:hidden" />
          {/* You can add breadcrumbs or page title here */}
        </header>
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          {children}
        </main>
        <Toaster />
      </SidebarInset>
    </SidebarProvider>
  );
}
