
'use client'

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Leaf, LogIn, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import "./page.css"
import Image from "next/image";
import Google from  "../../../public/google.svg"
import { useAuth } from '@/contexts/AuthContext'; // Updated import
import { signInWithGoogle } from '@/lib/firebase/auth'; // Kept for Google sign-in


export default  function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { toast } = useToast();
  const { login, isLoading: authIsLoading } = useAuth(); // Use login from AuthContext
  const [isSubmitting, setIsSubmitting] = useState(false);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({
        title: "Login Failed",
        description: "Please enter both email and password.",
        variant: "destructive",
      });
      return;
    }
    setIsSubmitting(true);
    await login(email,password); // AuthContext handles success/error toasts and navigation
    setIsSubmitting(false);
  };

  const disabled = authIsLoading || isSubmitting;

  return (
    <Card className="w-full max-w-sm shadow-xl">
      <CardHeader className="space-y-1 text-center">
        <div className="flex justify-center items-center mb-4">
          <Leaf className="h-10 w-10 text-primary" />
        </div>
        <CardTitle className="text-2xl font-bold">Welcome Back!</CardTitle>
        <CardDescription>Enter your credentials to access NutriPlan</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="m@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={disabled}
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link
                href="/forgot-password"
                className="text-xs text-primary hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={disabled}
            />
          </div>
          <Button type="submit" className="w-full" disabled={disabled}>
            {disabled ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
            {disabled ? "Logging in..." : "Login"}
          </Button>

          <Button onClick={(e) => signInWithGoogle()} type="button" className="w-full" disabled={disabled}>
            <Image src={Google} alt='google' /> Login with Google
          </Button>

          <div id="firebaseui-auth-container" className='w-full h-full' />
        </form>
      </CardContent>
      <CardFooter className="flex flex-col items-center space-y-2">
         <p className="text-sm text-muted-foreground">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="font-medium text-primary hover:underline">
              Sign up
            </Link>
          </p>
      </CardFooter>
    </Card>
  );
}
