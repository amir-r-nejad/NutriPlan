
"use client";

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Leaf, Mail, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { sendForgetPassword } from '@/lib/firebase/auth';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast({
        title: "Email Required",
        description: "Please enter your email address.",
        variant: "destructive",
      });
      return;
    }
    setIsLoading(true);
    setMessage('');
    try {
      await sendForgetPassword(email);
      setMessage("If an account exists for this email, a password reset link has been sent. Please check your inbox (and spam folder).");
      toast({
        title: "Reset Link Sent",
        description: "Please check your email for password reset instructions.",
      });
      setEmail(''); // Clear email field after successful submission
    } catch (error: any) {
      console.error("Forgot password error:", error);
      let userErrorMessage = "Failed to send password reset email. Please try again.";
      if (error.code === 'auth/invalid-email') {
        userErrorMessage = "The email address is not valid.";
      } else if (error.code === 'auth/user-not-found') {
        // For security, we don't reveal if an email exists, so the generic message is fine
        // but we can use the specific message here for the success case to be slightly more informative
         setMessage("If an account exists for this email, a password reset link has been sent. Please check your inbox (and spam folder).");
      }
      toast({
        title: "Error",
        description: userErrorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-sm shadow-xl">
      <CardHeader className="space-y-1 text-center">
        <div className="flex justify-center items-center mb-4">
          <Leaf className="h-10 w-10 text-primary" />
        </div>
        <CardTitle className="text-2xl font-bold">Forgot Your Password?</CardTitle>
        <CardDescription>Enter your email address and we'll send you a link to reset your password.</CardDescription>
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
              disabled={isLoading}
            />
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
            {isLoading ? "Sending..." : "Send Reset Link"}
          </Button>
        </form>
        {message && (
          <p className="mt-4 text-sm text-center text-muted-foreground bg-green-50 border border-green-200 p-3 rounded-md">{message}</p>
        )}
      </CardContent>
      <CardFooter className="flex flex-col items-center space-y-2">
        <Link href="/login" className="text-sm font-medium text-primary hover:underline">
          Back to Login
        </Link>
      </CardFooter>
    </Card>
  );
}
