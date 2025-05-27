
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Loader2, Wand2, Utensils, AlertTriangle, ChefHat, BarChart3 } from 'lucide-react';
import { generatePersonalizedMealPlan, type GeneratePersonalizedMealPlanInput, type GeneratePersonalizedMealPlanOutput } from '@/ai/flows/generate-meal-plan';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { ProfileFormValues as FullProfileType, WeeklyMealPlan, DailyMealPlan as AppDailyMealPlan, Meal as AppMeal, Ingredient as AppIngredient, CalculatedTargets, MacroResults } from '@/lib/schemas';
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { daysOfWeek, mealNames as appMealNames } from '@/lib/constants';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, LabelList } from "recharts";
import type { ChartConfig } from "@/components/ui/chart";
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/clientApp';


async function getFullProfileData(userId: string): Promise<Partial<FullProfileType>> {
  if (!userId) return {};
  try {
    const userProfileRef = doc(db, "users", userId);
    const docSnap = await getDoc(userProfileRef);
    if (docSnap.exists()) {
      return docSnap.data() as Partial<FullProfileType>;
    }
  } catch (error) {
    console.error("Error fetching full profile data from Firestore:", error);
  }
  return {};
}

async function saveOptimizedMealPlan(userId: string, planData: GeneratePersonalizedMealPlanOutput) {
  if (!userId) throw new Error("User ID required to save AI meal plan.");
  try {
    const userProfileRef = doc(db, "users", userId);
    await setDoc(userProfileRef, { aiGeneratedMealPlan: planData }, { merge: true });
  } catch (error) {
    console.error("Error saving AI meal plan data to Firestore:", error);
    throw error;
  }
}


export default function OptimizedMealPlanPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [mealPlan, setMealPlan] = useState<GeneratePersonalizedMealPlanOutput | null>(null);
  const [profileData, setProfileData] = useState<Partial<FullProfileType> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  useEffect(() => {
    if (user?.uid) {
      setIsLoadingProfile(true);
      getFullProfileData(user.uid).then(data => {
        setProfileData(data);
        if (data.aiGeneratedMealPlan) {
          setMealPlan(data.aiGeneratedMealPlan as GeneratePersonalizedMealPlanOutput); // Cast if necessary
        }
      }).catch(err => {
        console.error("Failed to load profile for AI meal plan", err);
        toast({ title: "Error", description: "Could not load your profile data.", variant: "destructive"});
      }).finally(() => setIsLoadingProfile(false));
    } else {
      setIsLoadingProfile(false);
    }
  }, [user, toast]);

  const handleGeneratePlan = async () => {
    if (!user?.uid) {
      toast({ title: "Authentication Error", description: "You must be logged in to generate a meal plan.", variant: "destructive" });
      return;
    }
    if (!profileData || Object.keys(profileData).length === 0) {
      toast({ title: "Profile Incomplete", description: "Please complete your onboarding profile before generating an AI meal plan.", variant: "destructive" });
      return;
    }
    
    // Map FullProfileType to GeneratePersonalizedMealPlanInput
    const input: GeneratePersonalizedMealPlanInput = {
      age: profileData.age!, // Assuming required fields from onboarding are present
      gender: profileData.gender!,
      height_cm: profileData.height_cm!,
      current_weight: profileData.current_weight!,
      goal_weight_1m: profileData.goal_weight_1m!,
      activityLevel: profileData.activityLevel!,
      dietGoal: profileData.dietGoal!, // This should map from 'dietGoalOnboarding' if that's the source
      
      // Optional fields
      ideal_goal_weight: profileData.ideal_goal_weight,
      bf_current: profileData.bf_current,
      bf_target: profileData.bf_target,
      bf_ideal: profileData.bf_ideal,
      mm_current: profileData.mm_current,
      mm_target: profileData.mm_target,
      mm_ideal: profileData.mm_ideal,
      bw_current: profileData.bw_current,
      bw_target: profileData.bw_target,
      bw_ideal: profileData.bw_ideal,
      waist_current: profileData.waist_current,
      waist_goal_1m: profileData.waist_goal_1m,
      waist_ideal: profileData.waist_ideal,
      hips_current: profileData.hips_current,
      hips_goal_1m: profileData.hips_goal_1m,
      hips_ideal: profileData.hips_ideal,
      right_leg_current: profileData.right_leg_current,
      right_leg_goal_1m: profileData.right_leg_goal_1m,
      right_leg_ideal: profileData.right_leg_ideal,
      left_leg_current: profileData.left_leg_current,
      left_leg_goal_1m: profileData.left_leg_goal_1m,
      left_leg_ideal: profileData.left_leg_ideal,
      right_arm_current: profileData.right_arm_current,
      right_arm_goal_1m: profileData.right_arm_goal_1m,
      right_arm_ideal: profileData.right_arm_ideal,
      left_arm_current: profileData.left_arm_current,
      left_arm_goal_1m: profileData.left_arm_goal_1m,
      left_arm_ideal: profileData.left_arm_ideal,
      preferredDiet: profileData.preferredDiet,
      mealsPerDay: profileData.mealsPerDay,
      allergies: profileData.allergies,
      preferredCuisines: profileData.preferredCuisines,
      dispreferredCuisines: profileData.dispreferredCuisines,
      preferredIngredients: profileData.preferredIngredients,
      dispreferredIngredients: profileData.dispreferredIngredients,
      preferredMicronutrients: profileData.preferredMicronutrients,
      medicalConditions: profileData.medicalConditions,
      medications: profileData.medications,
      typicalMealsDescription: profileData.typicalMealsDescription,
    };
    // Filter out undefined optional fields to keep AI input clean
    Object.keys(input).forEach(key => input[key as keyof GeneratePersonalizedMealPlanInput] === undefined && delete input[key as keyof GeneratePersonalizedMealPlanInput]);


    setIsLoading(true);
    setError(null);
    try {
      const result = await generatePersonalizedMealPlan(input);
      setMealPlan(result);
      await saveOptimizedMealPlan(user.uid, result);
      toast({ title: "Meal Plan Generated!", description: "Your AI-optimized weekly meal plan is ready." });
    } catch (err) {
      console.error("Error generating meal plan:", err);
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
      setError(`Failed to generate meal plan: ${errorMessage}`);
      toast({ title: "Generation Failed", description: errorMessage, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const chartConfig = {
    calories: { label: "Calories (kcal)", color: "hsl(var(--chart-1))" },
    protein: { label: "Protein (g)", color: "hsl(var(--chart-2))" },
    fat: { label: "Fat (g)", color: "hsl(var(--chart-3))" },
    carbs: { label: "Carbs (g)", color: "hsl(var(--chart-4))" }, 
  } satisfies ChartConfig;


  if (isLoadingProfile) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="h-12 w-12 animate-spin text-primary" /><p className="ml-4 text-lg">Loading profile data...</p></div>;
  }

  return (
    <div className="container mx-auto py-8">
      <Card className="shadow-xl">
        <CardHeader className="flex flex-col md:flex-row justify-between items-start md:items-center">
          <div>
            <CardTitle className="text-3xl font-bold">AI-Optimized Weekly Meal Plan</CardTitle>
            <CardDescription>Generate a personalized meal plan based on your profile, goals, and preferences.</CardDescription>
          </div>
          <Button onClick={handleGeneratePlan} disabled={isLoading || isLoadingProfile} size="lg" className="mt-4 md:mt-0">
            {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Wand2 className="mr-2 h-5 w-5" />}
            {isLoading ? "Generating..." : "Generate New Plan"}
          </Button>
        </CardHeader>
        <CardContent>
          {error && <p className="text-destructive text-center py-4"><AlertTriangle className="inline mr-2"/> {error}</p>}
          
          {!mealPlan && !isLoading && !error && (
            <div className="text-center py-10 text-muted-foreground">
              <Utensils className="mx-auto h-12 w-12 mb-4" />
              <p className="text-lg">Your AI-generated meal plan will appear here.</p>
              <p>Click "Generate New Plan" to get started!</p>
            </div>
          )}

          {mealPlan && (
            <div className="space-y-8 mt-6">
              {mealPlan.weeklySummary && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-2xl flex items-center"><BarChart3 className="mr-2 h-6 w-6 text-primary"/>Weekly Nutritional Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center mb-6">
                      <div><p className="text-sm text-muted-foreground">Total Calories</p><p className="text-xl font-bold">{mealPlan.weeklySummary.totalCalories.toFixed(0)} kcal</p></div>
                      <div><p className="text-sm text-muted-foreground">Total Protein</p><p className="text-xl font-bold">{mealPlan.weeklySummary.totalProtein.toFixed(1)} g</p></div>
                      <div><p className="text-sm text-muted-foreground">Total Carbs</p><p className="text-xl font-bold">{mealPlan.weeklySummary.totalCarbs.toFixed(1)} g</p></div>
                      <div><p className="text-sm text-muted-foreground">Total Fat</p><p className="text-xl font-bold">{mealPlan.weeklySummary.totalFat.toFixed(1)} g</p></div>
                    </div>
                     <ChartContainer config={chartConfig} className="w-full h-[250px]">
                      <BarChart
                        accessibilityLayer
                        data={[
                          { name: "Protein", value: mealPlan.weeklySummary.totalProtein, fill: "var(--color-protein)" },
                          { name: "Carbs", value: mealPlan.weeklySummary.totalCarbs, fill: "var(--color-carbs)" },
                          { name: "Fat", value: mealPlan.weeklySummary.totalFat, fill: "var(--color-fat)" },
                        ]}
                        margin={{ top: 20, right: 0, left: -20, bottom: 5 }}
                      >
                        <CartesianGrid vertical={false} strokeDasharray="3 3" />
                        <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} />
                        <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                        <ChartTooltip content={<ChartTooltipContent hideIndicator />} />
                        <Bar dataKey="value" radius={5}>
                           <LabelList position="top" offset={8} className="fill-foreground text-xs" formatter={(value: number) => `${value.toFixed(0)}g`} />
                        </Bar>
                      </BarChart>
                    </ChartContainer>
                  </CardContent>
                </Card>
              )}

              <Tabs defaultValue={mealPlan.weeklyMealPlan[0]?.day || daysOfWeek[0]} className="w-full">
                <ScrollArea className="w-full whitespace-nowrap rounded-md border">
                  <TabsList className="inline-flex h-auto bg-muted p-1">
                    {mealPlan.weeklyMealPlan.map((dayPlan) => (
                      <TabsTrigger key={dayPlan.day} value={dayPlan.day} className="px-4 py-2 text-base data-[state=active]:bg-background data-[state=active]:shadow-sm">
                        {dayPlan.day}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>

                {mealPlan.weeklyMealPlan.map((dayPlan) => (
                  <TabsContent key={dayPlan.day} value={dayPlan.day} className="mt-6">
                    <div className="space-y-6">
                      {dayPlan.meals.map((meal, mealIndex) => (
                        <Card key={mealIndex} className="shadow-md">
                          <CardHeader>
                            <CardTitle className="text-xl font-semibold flex items-center"><ChefHat className="mr-2 h-5 w-5 text-accent"/>{meal.meal_name}</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <h4 className="font-medium text-md mb-2 text-primary">Ingredients:</h4>
                            <ScrollArea className="w-full mb-4">
                              <Table className="min-w-[500px]">
                                <TableHeader>
                                  <TableRow>
                                    <TableHead className="w-[40%]">Ingredient</TableHead>
                                    <TableHead className="text-right w-[15%]">Qty (g)</TableHead>
                                    <TableHead className="text-right w-[15%]">Calories</TableHead>
                                    <TableHead className="text-right w-[15%]">Protein (g)</TableHead>
                                    <TableHead className="text-right w-[15%]">Fat (g)</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {meal.ingredients.map((ing, ingIndex) => (
                                    <TableRow key={ingIndex}>
                                      <TableCell className="font-medium py-1.5">{ing.ingredient_name}</TableCell>
                                      <TableCell className="text-right py-1.5">{ing.quantity_g.toFixed(0)}</TableCell>
                                      <TableCell className="text-right py-1.5">{ing.macros_per_100g.calories ? (ing.macros_per_100g.calories * ing.quantity_g / 100).toFixed(0) : 'N/A'}</TableCell>
                                      <TableCell className="text-right py-1.5">{ing.macros_per_100g.protein_g ? (ing.macros_per_100g.protein_g * ing.quantity_g / 100).toFixed(1) : 'N/A'}</TableCell>
                                      <TableCell className="text-right py-1.5">{ing.macros_per_100g.fat_g ? (ing.macros_per_100g.fat_g * ing.quantity_g / 100).toFixed(1) : 'N/A'}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                              <ScrollBar orientation="horizontal" />
                            </ScrollArea>
                            <div className="text-sm font-semibold p-2 border-t border-muted-foreground/20 bg-muted/40 rounded-b-md">
                              Total: {meal.total_calories.toFixed(0)} kcal | 
                              Protein: {meal.total_protein_g.toFixed(1)}g | 
                              Fat: {meal.total_fat_g.toFixed(1)}g
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
