
"use client";

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Loader2, Wand2 } from 'lucide-react';

export default function OptimizedMealPlanPage() {
  const [isLoading, setIsLoading] = React.useState(false);

  const handleGeneratePlan = () => {
    setIsLoading(true);
    console.log("Generate plan clicked");
    setTimeout(() => {
      setIsLoading(false);
      console.log("Plan generation finished (simulated)");
    }, 1000);
  };

  return (
    <div className="container mx-auto py-8">
      <Card className="shadow-xl">
        <CardHeader className="flex flex-col md:flex-row justify-between items-start md:items-center">
          <div>
            <CardTitle className="text-3xl font-bold">AI-Optimized Weekly Meal Plan</CardTitle>
            <CardDescription>Generate a personalized meal plan.</CardDescription>
          </div>
          <Button onClick={handleGeneratePlan} disabled={isLoading} size="lg" className="mt-4 md:mt-0">
            {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Wand2 className="mr-2 h-5 w-5" />}
            {isLoading ? "Generating..." : "Generate New Plan"}
          </Button>
        </CardHeader>
        <CardContent>
          <p>Minimal content for Optimized Meal Plan Page.</p>
        </CardContent>
      </Card>
    </div>
  );
}
