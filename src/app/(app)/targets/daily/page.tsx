
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
import { calculateEstimatedDailyTargets, calculateBMR, calculateTDEE, calculateRecommendedProtein } from "@/lib/nutrition-calculator";
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
      // Ensure array fields are arrays
      const arrayFields: (keyof ProfileFormValues)[] = [
        'preferredCuisines', 'dispreferredCuisines', 'preferredIngredients', 'dispreferredIngredients',
        'allergies', 'preferredMicronutrients', 'medicalConditions', 'medications', 
        'injuries', 'surgeries', 'exerciseGoals', 'exercisePreferences', 'equipmentAccess'
      ];
      arrayFields.forEach(field => {
        if (parsedProfile[field] && typeof parsedProfile[field] === 'string') {
           parsedProfile[field] = parsedProfile[field].split(',').map((s: string) => s.trim()).filter((s: string) => s !== '');
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
  await new Promise(resolve => setTimeout(resolve, 300)); // Simulate API delay
  
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
  await new Promise(resolve => setTimeout(resolve, 300)); // Simulate API delay
  return { success: true };
}


export default function DailyTargetsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [estimatedCaloriesFromProfile, setEstimatedCaloriesFromProfile] = useState<number | undefined>(undefined);
  const [estimatedProteinFromProfile, setEstimatedProteinFromProfile] = useState<number | undefined>(undefined);
  const [userProfileData, setUserProfileData] = useState<Partial<ProfileFormValues>>({});


  const form = useForm<DailyTargets>({
    resolver: zodResolver(DailyTargetsSchema),
    defaultValues: {
      mealsPerDay: 3, 
      targetCalories: 0, 
      targetProtein: 0,
      targetCarbs: 0,
      targetFat: 0,
      caloriesBurned: undefined,
    },
  });

  useEffect(() => {
    if (user?.id) {
      setIsLoading(true);
      getProfileDataForTargets(user.id).then(profileData => {
        setUserProfileData(profileData); 
        if (profileData.age && profileData.gender && profileData.currentWeight && profileData.height && profileData.activityLevel && profileData.dietGoal) {
          const estimates = calculateEstimatedDailyTargets(profileData);
          setEstimatedCaloriesFromProfile(estimates.targetCalories);
          setEstimatedProteinFromProfile(estimates.targetProtein);
        } else {
          setEstimatedCaloriesFromProfile(undefined);
          setEstimatedProteinFromProfile(undefined);
        }

        getDailyTargets(user.id, profileData).then((response) => {
          const { source, ...targetsDataValues } = response;
          const saneTargets: Partial<DailyTargets> = {
            targetCalories: targetsDataValues.targetCalories ?? 0,
            targetProtein: targetsDataValues.targetProtein ?? 0,
            targetCarbs: targetsDataValues.targetCarbs ?? 0,
            targetFat: targetsDataValues.targetFat ?? 0,
            mealsPerDay: targetsDataValues.mealsPerDay ?? 3,
            caloriesBurned: targetsDataValues.caloriesBurned,
          };
          form.reset(saneTargets);
          setIsLoading(false);
        }).catch(err => {
          console.error("Failed to load daily targets", err);
          toast({ title: "Error", description: "Could not load daily targets.", variant: "destructive"});
          setIsLoading(false);
        });
      }).catch(err => {
        console.error("Failed to load profile data for target estimation", err);
        toast({ title: "Error", description: "Could not load profile data for target estimation.", variant: "destructive"});
        getDailyTargets(user.id, {}).then((response) => {
            const { source, ...targetsDataValues } = response;
            const saneTargets: Partial<DailyTargets> = {
              targetCalories: targetsDataValues.targetCalories ?? 0,
              targetProtein: targetsDataValues.targetProtein ?? 0,
              targetCarbs: targetsDataValues.targetCarbs ?? 0,
              targetFat: targetsDataValues.targetFat ?? 0,
              mealsPerDay: targetsDataValues.mealsPerDay ?? 3,
              caloriesBurned: targetsDataValues.caloriesBurned,
            };
            form.reset(saneTargets);
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
    
    if (userProfileData.age && userProfileData.gender && 
        userProfileData.currentWeight && userProfileData.height && 
        userProfileData.activityLevel && userProfileData.dietGoal) {
        const currentEstimates = calculateEstimatedDailyTargets(userProfileData);
        
        if (data.targetCalories === 0 || data.targetCalories === undefined) {
            if (currentEstimates.targetCalories) {
                submissionData.targetCalories = currentEstimates.targetCalories;
                submissionData.targetCarbs = currentEstimates.targetCarbs ?? data.targetCarbs ?? 0;
                submissionData.targetFat = currentEstimates.targetFat ?? data.targetFat ?? 0;
            }
        }
        if (data.targetProtein === 0 || data.targetProtein === undefined) {
            if (currentEstimates.targetProtein) {
                submissionData.targetProtein = currentEstimates.targetProtein;
                 // If protein changed, carbs and fat might need re-eval if calories were fixed
                 // For simplicity, we assume user fixed calories if they changed protein from auto
                 if (submissionData.targetCalories !== (currentEstimates.targetCalories ?? 0)) {
                    const proteinCalories = submissionData.targetProtein * 4;
                    const fatGrams = Math.round((submissionData.targetCalories * 0.25) / 9);
                    const fatCalories = fatGrams * 9;
                    submissionData.targetFat = fatGrams;
                    submissionData.targetCarbs = Math.round((submissionData.targetCalories - proteinCalories - fatCalories) / 4);
                 }
            }
        }
    }

    try {
      await saveDailyTargets(user.id, { ...submissionData, userId: user.id });
      toast({ title: "Targets Updated", description: "Your daily nutritional targets have been saved." });
       // Re-fetch and reset form to reflect saved (possibly auto-calculated) values
      const profileData = await getProfileDataForTargets(user.id);
      const targetsResponse = await getDailyTargets(user.id, profileData);
      const { source, ...targetsDataValues } = targetsResponse;
      form.reset({
        targetCalories: targetsDataValues.targetCalories ?? 0,
        targetProtein: targetsDataValues.targetProtein ?? 0,
        targetCarbs: targetsDataValues.targetCarbs ?? 0,
        targetFat: targetsDataValues.targetFat ?? 0,
        mealsPerDay: targetsDataValues.mealsPerDay ?? 3,
        caloriesBurned: targetsDataValues.caloriesBurned,
      });
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
  const currentProfileBMR = canCalculateProfileTDEE ? calculateBMR(userProfileData.gender!, userProfileData.currentWeight!, userProfileData.height!, userProfileData.age!) : null;
  const currentProfileTDEE = currentProfileBMR && userProfileData.activityLevel ? calculateTDEE(currentProfileBMR, userProfileData.activityLevel) : null;
  const currentProfileRecommendedProtein = canCalculateProfileTDEE && userProfileData.currentWeight && userProfileData.activityLevel ? calculateRecommendedProtein(userProfileData.currentWeight, userProfileData.activityLevel) : null;


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
                      <Input type="number" placeholder="e.g., 500 (from tracker)" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseFloat(e.target.value) || undefined)} />
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
                        <PopoverContent className="w-96 text-sm max-h-96 overflow-y-auto">
                          <div className="space-y-2">
                            <h4 className="font-medium leading-none">
                              🔢 Estimated Required Daily Calories: {currentProfileTDEE ? `${Math.round(currentProfileTDEE)} kcal` : 'N/A (Profile incomplete)'}
                            </h4>
                            <p className="text-xs text-muted-foreground">
                              (Based on the Mifflin-St Jeor Equation and your activity level. Your diet goal adjustment is applied separately.)
                            </p>
                            <div className="font-semibold mt-2">🔹 Mifflin-St Jeor Equation (BMR):</div>
                            <p className="text-xs">This calculates your Basal Metabolic Rate, the calories your body burns at rest.</p>
                            <ul className="list-disc pl-5 space-y-1 text-xs">
                              <li><strong>Men:</strong> BMR = (10 × weight in kg) + (6.25 × height in cm) - (5 × age) + 5</li>
                              <li><strong>Women:</strong> BMR = (10 × weight in kg) + (6.25 × height in cm) - (5 × age) - 161</li>
                            </ul>
                            
                            <div className="font-semibold mt-2">🔹 Activity Multiplier (TDEE):</div>
                             <p className="text-xs">BMR is multiplied by an activity factor to estimate Total Daily Energy Expenditure.</p>
                            <ul className="list-disc pl-5 space-y-1 text-xs">
                              {activityLevels.map(level => (
                                <li key={level.value}>
                                  {level.label} → <strong>×{level.activityFactor}</strong>
                                </li>
                              ))}
                            </ul>
                             <p className="text-xs text-muted-foreground pt-2">
                              🔹 Your chosen <strong>diet goal</strong> (lose, maintain, gain weight) further adjusts this TDEE to get your target.
                            </p>
                            <p className="text-xs text-muted-foreground pt-2">
                              🔹 If you <strong>leave this blank</strong>, the app will automatically calculate your target calories based on your profile inputs and diet goal upon saving.
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
                        value={field.value === 0 && estimatedCaloriesFromProfile ? '' : field.value ?? ''} 
                        onChange={e => field.onChange(parseFloat(e.target.value) || 0)} 
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
                     <div className="flex items-center space-x-1">
                        <FormLabel>Target Daily Protein (g)</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0">
                              <Info className="h-4 w-4 text-muted-foreground hover:text-accent" />
                              <span className="sr-only">How is protein calculated?</span>
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-96 text-sm max-h-96 overflow-y-auto">
                            <div className="space-y-2">
                              <h4 className="font-medium leading-none">
                                💪 Estimated Protein Intake: {currentProfileRecommendedProtein ? `${Math.round(currentProfileRecommendedProtein)} g` : 'N/A (Profile incomplete)'}
                              </h4>
                              <p className="text-xs text-muted-foreground">
                                (Based on {userProfileData.activityLevel ? activityLevels.find(al => al.value === userProfileData.activityLevel)?.proteinFactorPerKg : '0.8'}g per kg of body weight and your activity level)
                              </p>
                              <div className="font-semibold mt-2">🔹 Protein Intake Guidelines (grams per kg of body weight):</div>
                              <p className="text-xs">We calculate protein needs based on your body weight and activity level, following sports nutrition guidelines.</p>
                              <ul className="list-disc pl-5 space-y-1 text-xs">
                                {activityLevels.map(level => (
                                  <li key={level.value}>
                                    {level.label} → <strong>{level.proteinFactorPerKg}g per kg</strong>
                                  </li>
                                ))}
                              </ul>
                              <p className="text-xs text-muted-foreground pt-2">
                                🔹 If you <strong>leave this blank</strong>, we use the recommended intake based on your activity level and current weight upon saving.
                              </p>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder={estimatedProteinFromProfile ? `Auto: ${Math.round(estimatedProteinFromProfile)} g` : "Leave blank for auto-calc"} 
                        {...field} 
                        value={field.value === 0 && estimatedProteinFromProfile ? '' : field.value ?? ''} 
                        onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                     <FormDescription>Leave blank to auto-calculate based on your profile.</FormDescription>
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
                      <Input type="number" placeholder="e.g., 200 g" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseFloat(e.target.value) || 0)}/>
                    </FormControl>
                     <FormDescription>Adjust as needed. Auto-calculated if calories/protein are auto-set.</FormDescription>
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
                      <Input type="number" placeholder="e.g., 60 g" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} />
                    </FormControl>
                    <FormDescription>Adjust as needed. Auto-calculated if calories/protein are auto-set.</FormDescription>
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
            
            <Button type="submit" className="w-full text-lg py-6" disabled={isSubmitting || isLoading}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSubmitting ? "Saving..." : "Save Daily Targets"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
