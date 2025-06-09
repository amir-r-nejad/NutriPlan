
"use client";

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '../../../components/ui/card';
import { MailCheck, MailWarning, Loader2, ShieldCheck, Home } from 'lucide-react';
import { useToast } from '../../../hooks/use-toast';
import  { confirmPassword } from "../../../lib/firebase/auth";
import Link from 'next/link';

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const oobCode = searchParams.get('oobCode');

  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [message, setMessage] = useState('Verifying your email address...');
  const { toast } = useToast();

  useEffect(() => {
    if (!oobCode) {
      setMessage("Invalid verification link. Code is missing.");
      setStatus('error');
      return;
    }

    const verifyEmail = async () => {
      setStatus('verifying');
      
      try {
        setMessage("Your email has been successfully verified! You can now log in.");
        setStatus('success');
        toast({
          title: "Email Verified",
          description: "You can now log in with your credentials.",
          variant: "default" 
        });
        // Optional: Redirect after a delay or let user click
        // setTimeout(() => router.push('/login'), 3000);
      } catch (error: any) {
        console.error("Error verifying email:", error);
        let userErrorMessage = "Failed to verify email. The link may be invalid or expired.";
        if (error.code === 'auth/invalid-action-code') {
          userErrorMessage = "Invalid or expired verification link. Please try signing up again or requesting a new verification email if applicable.";
        }
        setMessage(userErrorMessage);
        setStatus('error');
        toast({
          title: "Verification Failed",
          description: userErrorMessage,
          variant: "destructive",
        });
      }
    };

    verifyEmail();
  }, [oobCode, router, toast]);

  return (
    <Card className="w-full max-w-md shadow-xl text-center">
      <CardHeader>
        <div className="flex justify-center items-center mb-4">
          {status === 'verifying' && <Loader2 className="h-12 w-12 text-primary animate-spin" />}
          {status === 'success' && <ShieldCheck className="h-12 w-12 text-green-500" />}
          {status === 'error' && <MailWarning className="h-12 w-12 text-destructive" />}
        </div>
        <CardTitle className="text-2xl font-bold">
          {status === 'verifying' && "Verifying Your Email"}
          {status === 'success' && "Email Verified!"}
          {status === 'error' && "Verification Problem"}
        </CardTitle>
        <CardDescription>{message}</CardDescription>
      </CardHeader>
      <CardContent>
        {status === 'verifying' && (
          <p className="text-sm text-muted-foreground">Please wait a moment...</p>
        )}
      </CardContent>
      <CardFooter className="flex flex-col items-center space-y-3">
        {status === 'success' && (
          <Link href="/login" passHref className="w-full">
            <Button className="w-full">
              <MailCheck className="mr-2 h-4 w-4" /> Proceed to Login
            </Button>
          </Link>
        )}
        {status === 'error' && (
          <Link href="/signup" passHref className="w-full">
            <Button variant="outline" className="w-full">
                Try Signing Up Again
            </Button>
          </Link>
        )}
         <Link href="/" passHref className="w-full text-sm">
            <Button variant="link" className="w-full text-primary">
              <Home className="mr-2 h-4 w-4" /> Go to Homepage
            </Button>
          </Link>
      </CardFooter>
    </Card>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /><p className="ml-2">Loading verification...</p></div>}>
      <VerifyEmailContent />
    </Suspense>
  )
}
