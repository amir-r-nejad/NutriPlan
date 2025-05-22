
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ShieldAlert, Settings } from "lucide-react";

export default function DailyTargetsPageRemoved() {
  return (
    <div className="container mx-auto py-8 flex flex-col items-center justify-center">
      <Card className="w-full max-w-lg shadow-xl text-center">
        <CardHeader>
          <div className="mx-auto bg-destructive/10 p-3 rounded-full w-fit">
            <ShieldAlert className="h-12 w-12 text-destructive" />
          </div>
          <CardTitle className="text-2xl font-bold mt-4">Page Removed</CardTitle>
          <CardDescription className="text-lg">
            The Daily Targets page has been removed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-6">
            Your total daily macronutrient needs (calories, protein, etc.) for tools like the <strong>Macro Splitter</strong> are now automatically calculated based on your main <strong>User Profile</strong>.
          </p>
          <p className="text-muted-foreground mb-6">
            Please ensure your profile information (age, weight, height, activity level, diet goal) is up-to-date for accurate calculations.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/profile" passHref>
              <Button>
                <Settings className="mr-2 h-4 w-4" />
                Go to Profile
              </Button>
            </Link>
            <Link href="/dashboard" passHref>
              <Button variant="outline">Back to Dashboard</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
