
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
import { DailyTargetsSchema, type DailyTargets, type ProfileFormValues } from "@/lib/schemas";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import React, { useEffect, useState } from "react";
import { mealsPerDayOptions } from "@/lib/constants";
import { Info, Loader2 } from "lucide-react";
import { calculateEstimatedDailyTargets } from "@/lib/nutrition-calculator";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Mock function to get profile data for target calculation
async function getProfileDataForTargets(userId: string): Promise<Partial<ProfileFormValues>> {
  console.log("Fetching profile for targets calculation, user:", userId);
  const storedProfile = localStorage.getItem(`nutriplan_profile_${userId}`);
  if (storedProfile) {
    try {
      const parsedProfile = JSON.parse(storedProfile);
      // Ensure array fields are arrays (though not strictly needed for calculations here, good practice)
      const arrayFields: (keyof ProfileFormValues)[] = [
        'preferredCuisines', 'dispreferredCuisines', 'preferredIngredients', 'dispreferredIngredients',
        'allergies', 'preferredMicronutrients', 'medicalConditions', 'medications', 
        'injuries', 'surgeries', 'exerciseGoals', 'exercisePreferences', 'equipmentAccess'
      ];
      arrayFields.forEach(field => {
        if (typeof parsedProfile[field] === 'string') {
           parsedProfile[field] = parsedProfile[field] ? parsedProfile[field].split(',').map((s: string) => s.trim()).filter((s: string) => s !== '') : [];
        } else if (!Array.isArray(parsedProfile[field])) {
            parsedProfile[field] = [];
        }
      });
      return parsedProfile as ProfileFormValues;
    } catch (error) {
      console.error("Error parsing stored profile data for targets:", error);
      return {};
    }
  }
  return {}; // Return empty if no profile found
}


// Mock functions for data operations
async function getDailyTargets(userId: string): Promise<Partial<DailyTargets>> {
  console.log("Fetching daily targets for user:", userId);
  await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API delay
  
  const storedTargets = localStorage.getItem(`nutriplan_daily_targets_${userId}`);
  if (storedTargets) {
    try {
      return JSON.parse(storedTargets);
    } catch (e) {
      console.error("Error parsing stored daily targets:", e);
      // Fall through to calculation if parsing fails
    }
  }

  // If no stored targets, try to calculate estimates
  const userProfile = await getProfileDataForTargets(userId);
  if (userProfile.age && userProfile.gender && userProfile.currentWeight && userProfile.height && userProfile.activityLevel && userProfile.dietGoal) {
    const estimatedTargets = calculateEstimatedDailyTargets(userProfile);
    console.log("Calculated estimated targets:", estimatedTargets);
    // Provide default mealsPerDay if not present in profile or estimates
    const mealsPerDay = userProfile.mealsPerDay || 3;
    return {
      targetCalories: estimatedTargets.targetCalories,
      targetProtein: estimatedTargets.targetProtein,
      // Carbs and fat could be estimated too, or left for user input
      targetCarbs: estimatedTargets.targetCarbs,
      targetFat: estimatedTargets.targetFat,
      mealsPerDay: mealsPerDay,
      caloriesBurned: undefined, // User inputs this manually
    };
  }
  
  // Fallback default values if profile data is insufficient for calculation
  return {
    targetCalories: 2000,
    targetProtein: 150,
    targetCarbs: 200,
    targetFat: 60,
    mealsPerDay: 3,
    caloriesBurned: undefined,
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
  const [isAutoCalculated, setIsAutoCalculated] = useState(false);

  const form = useForm<DailyTargets>({
    resolver: zodResolver(DailyTargetsSchema),
    defaultValues: {
      mealsPerDay: 3, 
      targetCalories: undefined,
      targetProtein: undefined,
      targetCarbs: undefined,
      targetFat: undefined,
      caloriesBurned: undefined,
    },
  });

  useEffect(() => {
    if (user?.id) {
      setIsLoading(true);
      // Check if targets were previously saved
      const previouslySaved = localStorage.getItem(`nutriplan_daily_targets_${user.id}`);
      
      getDailyTargets(user.id).then((targetsData) => {
        form.reset(targetsData);
        if (!previouslySaved && (targetsData.targetCalories || targetsData.targetProtein)) {
          // If no data was saved, and we got calculated values, mark as auto-calculated
          setIsAutoCalculated(true); 
        } else {
          setIsAutoCalculated(false);
        }
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
      setIsAutoCalculated(false); // Once saved, they are no longer "auto-calculated initial estimates"
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
          {isAutoCalculated 
            ? "These are auto-calculated estimates based on your profile. Adjust them as needed."
            : "Adjust your daily intake goals. These can be auto-calculated from your profile or set manually."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isAutoCalculated && (
          <Alert className="mb-6">
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>How are these estimates calculated?</strong>
              <ul className="list-disc pl-5 mt-1 space-y-1 text-sm">
                <li><strong>Basal Metabolic Rate (BMR):</strong> Estimated using the Mifflin-St Jeor Equation based on your profile (age, gender, height, weight). This is the calories your body burns at rest.</li>
                <li><strong>Total Daily Energy Expenditure (TDEE):</strong> Your BMR is multiplied by an activity factor (based on your selected activity level) to estimate total daily calorie needs.</li>
                <li><strong>Protein:</strong> Suggested based on your body weight and diet goal (e.g., higher for muscle gain or weight loss to preserve muscle).</li>
                <li><strong>Carbohydrates & Fat:</strong> Initial estimates for carbs and fat are provided. You can adjust these based on your preferences (e.g., for low-carb or low-fat diets).</li>
              </ul>
              <p className="mt-2 text-xs">Remember, these are just starting points. Feel free to adjust them to better suit your individual needs and preferences!</p>
            </AlertDescription>
          </Alert>
        )}
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
                      <Input type="number" placeholder="e.g., 500 (from tracker)" {...field} value={field.value ?? ''} />
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
                      <Input type="number" placeholder="e.g., 2000 kcal" {...field} value={field.value ?? ''} />
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
                      <Input type="number" placeholder="e.g., 150 g" {...field} value={field.value ?? ''}/>
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
                      <Input type="number" placeholder="e.g., 200 g" {...field} value={field.value ?? ''}/>
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
                      <Input type="number" placeholder="e.g., 60 g" {...field} value={field.value ?? ''} />
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
                    <Select onValueChange={(value) => field.onChange(Number(value))} value={String(field.value || 3)}>
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

