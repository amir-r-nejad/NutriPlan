
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";

export default function MealLevelTargetsPageRemoved() {
  return (
    <div className="container mx-auto py-8 flex flex-col items-center justify-center">
      <Card className="w-full max-w-lg shadow-xl text-center">
        <CardHeader>
          <div className="mx-auto bg-destructive/10 p-3 rounded-full w-fit">
            <ShieldAlert className="h-12 w-12 text-destructive" />
          </div>
          <CardTitle className="text-2xl font-bold mt-4">Page Removed</CardTitle>
          <CardDescription className="text-lg">
            The Meal-Level Targets page has been removed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-6">
            The functionality for splitting macros across meals is now handled by the <strong>Macro Splitter</strong> tool.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/tools/macro-splitter" passHref>
              <Button>Go to Macro Splitter</Button>
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
