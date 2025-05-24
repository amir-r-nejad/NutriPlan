
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ShieldAlert, BrainCircuit } from "lucide-react";

export default function DailyMacroBreakdownPageRemoved() {
  return (
    <div className="container mx-auto py-8 flex flex-col items-center justify-center">
      <Card className="w-full max-w-lg shadow-xl text-center">
        <CardHeader>
          <div className="mx-auto bg-destructive/10 p-3 rounded-full w-fit">
            <ShieldAlert className="h-12 w-12 text-destructive" />
          </div>
          <CardTitle className="text-2xl font-bold mt-4">Page Merged</CardTitle>
          <CardDescription className="text-lg">
            The Daily Macro Breakdown tool has been merged.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-6">
            Its functionality is now part of the <strong>Smart Calorie & Macro Planner</strong>.
            You can find the manual macro breakdown option within that page.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/tools/smart-calorie-planner" passHref>
              <Button>
                <BrainCircuit className="mr-2 h-4 w-4" />
                Go to Smart Calorie & Macro Planner
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

    