
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
import { activityLevels, mealsPerDayOptions } from "@/lib/constants";
import { Info, Loader2 } from "lucide-react";
import { calculateEstimatedDailyTargets, calculateBMR, calculateTDEE } from "@/lib/nutrition-calculator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

// Interface for the data returned by getDailyTargets, including the source
interface DailyTargetsData extends Partial<DailyTargets> {
  source?: 'stored' | 'calculated_from_profile' | 'fallback_defaults';
}

// Mock function to get profile data for target calculation
async function getProfileDataForTargets(userId: string): Promise<Partial<ProfileFormValues>> {
  console.log("Fetching profile for targets calculation, user:", userId);
  const storedProfile = localStorage.getItem(`nutriplan_profile_${userId}`);
  if (storedProfile) {
    try {
      const parsedProfile = JSON.parse(storedProfile);
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
async function getDailyTargets(userId: string, profileDataForCalc: Partial<ProfileFormValues>): Promise<DailyTargetsData> {
  console.log("Fetching daily targets for user:", userId);
  await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API delay
  
  const storedTargets = localStorage.getItem(`nutriplan_daily_targets_${userId}`);
  if (storedTargets) {
    try {
      return { ...JSON.parse(storedTargets), source: 'stored' };
    } catch (e) {
      console.error("Error parsing stored daily targets:", e);
      // Fall through to calculation if parsing fails
    }
  }

  // If no stored targets, try to calculate estimates using the provided profile data
  if (profileDataForCalc.age && profileDataForCalc.gender && profileDataForCalc.currentWeight && profileDataForCalc.height && profileDataForCalc.activityLevel && profileDataForCalc.dietGoal) {
    const estimatedTargets = calculateEstimatedDailyTargets(profileDataForCalc);
    console.log("Calculated estimated targets:", estimatedTargets);
    const mealsPerDay = profileDataForCalc.mealsPerDay || 3;
    return {
      targetCalories: estimatedTargets.targetCalories,
      targetProtein: estimatedTargets.targetProtein,
      targetCarbs: estimatedTargets.targetCarbs,
      targetFat: estimatedTargets.targetFat,
      mealsPerDay: mealsPerDay,
      caloriesBurned: undefined,
      source: 'calculated_from_profile',
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
    source: 'fallback_defaults',
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
  const [estimatedCaloriesFromProfile, setEstimatedCaloriesFromProfile] = useState<number | undefined>(undefined);
  const [userProfileData, setUserProfileData] = useState<Partial<ProfileFormValues>>({});


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
      getProfileDataForTargets(user.id).then(profileData => {
        setUserProfileData(profileData); // Store profile data for use in popover
        if (profileData.age && profileData.gender && profileData.currentWeight && profileData.height && profileData.activityLevel && profileData.dietGoal) {
          const estimates = calculateEstimatedDailyTargets(profileData);
          setEstimatedCaloriesFromProfile(estimates.targetCalories);
        } else {
          setEstimatedCaloriesFromProfile(undefined);
        }

        getDailyTargets(user.id, profileData).then((response) => {
          const { source, ...targetsDataValues } = response;
          form.reset(targetsDataValues);
          setIsLoading(false);
        }).catch(err => {
          console.error("Failed to load daily targets", err);
          toast({ title: "Error", description: "Could not load daily targets.", variant: "destructive"});
          setIsLoading(false);
        });
      }).catch(err => {
        console.error("Failed to load profile data for target estimation", err);
        toast({ title: "Error", description: "Could not load profile data for target estimation.", variant: "destructive"});
        // Still try to load daily targets with empty profile
        getDailyTargets(user.id, {}).then((response) => {
            const { ...targetsDataValues } = response;
            form.reset(targetsDataValues);
        }).finally(() => setIsLoading(false));
      });
    }
  }, [user, form, toast]);

  async function onSubmit(data: DailyTargets) {
    if (!user?.id) {
      toast({ title: "Error", description: "User not found.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);

    let submissionData = { ...data };
    
    // If targetCalories is submitted as 0 (blank input) and we have profile-based estimates, use them.
    if (data.targetCalories === 0 && userProfileData.age /* check if profile is complete enough */) {
        const currentEstimates = calculateEstimatedDailyTargets(userProfileData);
        if (currentEstimates.targetCalories) {
            submissionData.targetCalories = currentEstimates.targetCalories;
            submissionData.targetProtein = currentEstimates.targetProtein ?? data.targetProtein;
            submissionData.targetCarbs = currentEstimates.targetCarbs ?? data.targetCarbs;
            submissionData.targetFat = currentEstimates.targetFat ?? data.targetFat;
        }
    }

    try {
      await saveDailyTargets(user.id, { ...submissionData, userId: user.id });
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
  
  const canCalculateProfileTDEE = userProfileData.age && userProfileData.gender && userProfileData.currentWeight && userProfileData.height && userProfileData.activityLevel;
  const currentProfileTDEE = canCalculateProfileTDEE ? calculateTDEE(calculateBMR(userProfileData.gender!, userProfileData.currentWeight!, userProfileData.height!, userProfileData.age!), userProfileData.activityLevel!) : null;


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
                    <div className="flex items-center space-x-1">
                      <FormLabel>Target Daily Calories</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0">
                            <Info className="h-4 w-4 text-muted-foreground hover:text-accent" />
                            <span className="sr-only">How are calories calculated?</span>
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-96 text-sm">
                          <div className="space-y-2">
                            <h4 className="font-medium leading-none">
                              🔢 Estimated Required Daily Calories: {currentProfileTDEE ? `${Math.round(currentProfileTDEE)} kcal` : 'N/A (Profile incomplete)'}
                            </h4>
                            <p className="text-xs text-muted-foreground">
                              (Based on the Mifflin-St Jeor Equation and your activity level)
                            </p>
                            <p>🔹 We use the <strong>Mifflin-St Jeor Equation</strong>, a widely used formula for calculating Basal Metabolic Rate (BMR).</p>
                            <p>🔹 BMR is then multiplied by an <strong>activity multiplier</strong> to estimate <strong>Total Daily Energy Expenditure (TDEE)</strong>.</p>
                            
                            <p><strong>Formula:</strong></p>
                            <ul className="list-disc pl-5 space-y-1 text-xs">
                              <li><strong>Men:</strong> BMR = (10 × weight in kg) + (6.25 × height in cm) - (5 × age) + 5</li>
                              <li><strong>Women:</strong> BMR = (10 × weight in kg) + (6.25 × height in cm) - (5 × age) - 161</li>
                            </ul>
                            
                            <p><strong>Activity Multipliers:</strong></p>
                            <ul className="list-disc pl-5 space-y-1 text-xs">
                              {activityLevels.map(level => (
                                <li key={level.value}>
                                  {level.label} → <strong>×{level.activityFactor}</strong>
                                </li>
                              ))}
                            </ul>
                            <p className="text-xs text-muted-foreground pt-2">
                              🔹 If you <strong>leave this blank</strong>, the app will automatically calculate your TDEE based on your profile inputs upon saving.
                            </p>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder={estimatedCaloriesFromProfile ? `Auto: ${Math.round(estimatedCaloriesFromProfile)} kcal` : "Leave blank for auto-calc"} 
                        {...field} 
                        value={field.value ?? ''} 
                      />
                    </FormControl>
                     <FormDescription>Leave blank to auto-calculate based on your profile.</FormDescription>
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

