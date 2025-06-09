
"use client";

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '../../../components/ui/card';
import { useAuth } from '../../../contexts/AuthContext';
import { Leaf, UserPlus, Loader2 } from 'lucide-react';
import { useToast } from '../../../hooks/use-toast';
import { signInWithGoogle } from '../../../lib/firebase/auth';
import Image from "next/image"
import Google from  "../../../public/google.svg"

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const { signup, isLoading: authIsLoading } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!email || !password || !confirmPassword) {
      toast({
        title: "Signup Failed",
        description: "Please fill all fields.",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Signup Failed",
        description: "Password should be at least 6 characters.",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Signup Failed",
        description: "Passwords do not match.",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }
    
    await signup(email, password); // AuthContext handles success/error toasts and navigation
    setIsSubmitting(false);
  };

  const disabled = authIsLoading || isSubmitting;

  return (
    <Card className="w-full max-w-sm shadow-xl">
      <CardHeader className="space-y-1 text-center">
        <div className="flex justify-center items-center mb-4">
          <Leaf className="h-10 w-10 text-primary" />
        </div>
        <CardTitle className="text-2xl font-bold">Create Account</CardTitle>
        <CardDescription>Join NutriPlan to start your health journey</CardDescription>
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
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={disabled}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm Password</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={disabled}
            />
          </div>
          <Button type="submit" className="w-full" disabled={disabled}>
            {disabled ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
            {disabled ? 'Signing up...' : 'Sign Up'}
          </Button>

          <Button onClick={(e) => signInWithGoogle()} type="button" className="w-full" disabled={disabled}>
            <Image src={Google} alt='google' /> Login with Google
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col items-center space-y-2">
        <p className="text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Login
          </Link>
        </p>
         <Link
            href="/forgot-password"
            className="text-xs text-primary hover:underline mt-2"
          >
            Forgot password?
          </Link>
      </CardFooter>
    </Card>
  );
}
