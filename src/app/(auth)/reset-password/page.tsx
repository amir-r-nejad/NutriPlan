
"use client";

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '../../../components/ui/card';
import { Leaf, KeyRound, Loader2, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useToast } from '../../../hooks/use-toast';
import Link from 'next/link';
import { confirmPassword, verifyOob } from "../../../lib/firebase/auth"

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const oobCode = searchParams.get('oobCode');

  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [isValidCode, setIsValidCode] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!oobCode) {
      setVerificationError("Invalid or missing password reset code. Please request a new link.");
      setIsVerifying(false);
      setIsValidCode(false);
      return;
    }

    const verifyCode = async () => {
      setIsVerifying(true);
      try {
        await verifyOob(oobCode)
        setIsValidCode(true);
      } catch (error: any) {
        console.error("Error verifying reset code:", error);
        setVerificationError("Invalid or expired password reset link. Please request a new one.");
        setIsValidCode(false);
      } finally {
        setIsVerifying(false);
      }
    };
    verifyCode();
  }, [oobCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || !confirmNewPassword) {
      toast({ title: "Error", description: "Please fill in both password fields.", variant: "destructive" });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: "Error", description: "Password must be at least 6 characters long.", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmNewPassword) {
      toast({ title: "Error", description: "Passwords do not match.", variant: "destructive" });
      return;
    }
    if (!oobCode) {
        toast({ title: "Error", description: "Password reset code is missing.", variant: "destructive" });
        return;
    }

    setIsLoading(true);
    try {
      await confirmPassword(oobCode, newPassword);
      toast({
        title: "Password Reset Successful",
        description: "Your password has been changed. Please log in with your new password.",
        variant: "default", 
      });
      router.push('/login');
    } catch (error: any) {
      console.error("Error confirming password reset:", error);
      let userErrorMessage = "Failed to reset password. The link may have expired or been used already.";
      if (error.code === 'auth/invalid-action-code') {
        userErrorMessage = "Invalid or expired password reset link. Please request a new one.";
      } else if (error.code === 'auth/weak-password') {
        userErrorMessage = "The new password is too weak. It must be at least 6 characters.";
      }
      toast({ title: "Password Reset Failed", description: userErrorMessage, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  if (isVerifying) {
    return (
      <Card className="w-full max-w-sm shadow-xl text-center">
        <CardHeader>
          <div className="flex justify-center items-center mb-4">
            <Loader2 className="h-10 w-10 text-primary animate-spin" />
          </div>
          <CardTitle className="text-2xl font-bold">Verifying Link...</CardTitle>
          <CardDescription>Please wait while we validate your password reset link.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!isValidCode || verificationError) {
    return (
       <Card className="w-full max-w-sm shadow-xl text-center">
        <CardHeader>
          <div className="flex justify-center items-center mb-4">
            <ShieldAlert className="h-10 w-10 text-destructive" />
          </div>
          <CardTitle className="text-2xl font-bold">Link Error</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive">{verificationError || "Invalid password reset link."}</p>
        </CardContent>
        <CardFooter>
          <Link href="/forgot-password" passHref className="w-full">
            <Button className="w-full">Request New Reset Link</Button>
          </Link>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-sm shadow-xl">
      <CardHeader className="space-y-1 text-center">
        <div className="flex justify-center items-center mb-4">
           <ShieldCheck className="h-10 w-10 text-primary" />
        </div>
        <CardTitle className="text-2xl font-bold">Set New Password</CardTitle>
        <CardDescription>Please enter your new password below.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-password">New Password</Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-new-password">Confirm New Password</Label>
            <Input
              id="confirm-new-password"
              type="password"
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
            {isLoading ? "Resetting..." : "Reset Password"}
          </Button>
        </form>
      </CardContent>
       <CardFooter className="flex flex-col items-center space-y-2">
        <Link href="/login" className="text-sm font-medium text-primary hover:underline">
          Back to Login
        </Link>
      </CardFooter>
    </Card>
  );
}


export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ResetPasswordContent />
    </Suspense>
  )
}
