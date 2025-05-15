
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DailyTargetsSchema, type DailyTargets } from "@/lib/schemas";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import React, { useEffect, useState } from "react";
import { mealsPerDayOptions } from "@/lib/constants";
import { Loader2 } from "lucide-react";

// Mock functions for data operations
async function getDailyTargets(userId: string): Promise<Partial<DailyTargets>> {
  console.log("Fetching daily targets for user:", userId);
  await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API delay
  const storedTargets = localStorage.getItem(`nutriplan_daily_targets_${userId}`);
  if (storedTargets) {
    return JSON.parse(storedTargets);
  }
  // Default or auto-calculated values based on profile (simplified here)
  return {
    targetCalories: 2000,
    targetProtein: 150,
    targetCarbs: 200,
    targetFat: 60,
    mealsPerDay: 3,
    caloriesBurned: 500, // Example
  };
}

async function saveDailyTargets(userId: string, data: DailyTargets) {
  console.log("Saving daily targets for user:", userId, data);
  localStorage.setItem(`nutriplan_daily_targets_${userId}`, JSON.stringify(data));
  await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API delay
  return { success: true };
}


export default function DailyTargetsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<DailyTargets>({
    resolver: zodResolver(DailyTargetsSchema),
    defaultValues: {
      mealsPerDay: 3, // Default
    },
  });

  useEffect(() => {
    if (user?.id) {
      setIsLoading(true);
      getDailyTargets(user.id).then((targetsData) => {
        form.reset(targetsData);
        setIsLoading(false);
      }).catch(err => {
        console.error("Failed to load daily targets", err);
        toast({ title: "Error", description: "Could not load daily targets.", variant: "destructive"});
        setIsLoading(false);
      });
    }
  }, [user, form, toast]);

  async function onSubmit(data: DailyTargets) {
    if (!user?.id) {
      toast({ title: "Error", description: "User not found.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      await saveDailyTargets(user.id, { ...data, userId: user.id });
      toast({ title: "Targets Updated", description: "Your daily nutritional targets have been saved." });
    } catch (error) {
      toast({ title: "Update Failed", description: "Could not save targets. Please try again.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Loading daily targets...</p>
      </div>
    );
  }

  return (
    <Card className="max-w-2xl mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="text-3xl font-bold">Daily Nutritional Targets</CardTitle>
        <CardDescription>
          Adjust your daily intake goals. These can be auto-calculated from your profile or set manually.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="caloriesBurned"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Daily Burned Calories (Optional)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="e.g., 500 (from tracker)" {...field} />
                    </FormControl>
                    <FormDescription>Estimated calories burned through activity.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="targetCalories"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target Daily Calories</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="e.g., 2000 kcal" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="targetProtein"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target Daily Protein (g)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="e.g., 150 g" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="targetCarbs"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target Daily Carbohydrates (g)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="e.g., 200 g" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="targetFat"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target Daily Fat (g)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="e.g., 60 g" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="mealsPerDay"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Meals Per Day</FormLabel>
                    <Select onValueChange={(value) => field.onChange(Number(value))} defaultValue={String(field.value || 3)}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select number of meals" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {mealsPerDayOptions.map(option => (
                          <SelectItem key={option.value} value={String(option.value)}>{option.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <Button type="submit" className="w-full text-lg py-6" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSubmitting ? "Saving..." : "Save Daily Targets"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
