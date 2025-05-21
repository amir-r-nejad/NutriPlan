
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Wand2, AlertTriangle, Settings2, Info } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { generatePersonalizedMealPlan, type GeneratePersonalizedMealPlanInput, type GeneratePersonalizedMealPlanOutput } from '@/ai/flows/generate-meal-plan';
import { suggestIngredientSwap, type SuggestIngredientSwapInput, type SuggestIngredientSwapOutput } from '@/ai/flows/suggest-ingredient-swap';
import { type ProfileFormValues, AiGeneratedMealPlanOutputSchema, type AiGeneratedMealPlanOutput as MealPlanType, type AiGeneratedDayPlanSchema as DayPlan, type AiGeneratedMealSchema as MealData, ProfileFormSchema } from '@/lib/schemas'; // Use AI specific schema for output
import { ResponsiveContainer, BarChart, XAxis, YAxis, Tooltip as ChartTooltip, Legend, Bar } from 'recharts';
import { ChartConfig, ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { daysOfWeek } from '@/lib/constants';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";


async function getFullProfileData(userId: string): Promise<Partial<ProfileFormValues>> {
  const storedProfile = localStorage.getItem(`nutriplan_profile_${userId}`);
  if (storedProfile) {
    try {
      const parsed = JSON.parse(storedProfile);
      // Ensure array fields are properly parsed if stored as comma-separated strings
      const arrayFields: (keyof ProfileFormValues)[] = [
        'preferredCuisines', 'dispreferredCuisines', 'preferredIngredients', 'dispreferredIngredients',
        'allergies', 'preferredMicronutrients', 'medicalConditions', 'medications', 
        'injuries', 'surgeries', 'exerciseGoals', 'exercisePreferences', 'equipmentAccess'
      ];
      arrayFields.forEach(field => {
        if (typeof parsed[field] === 'string') {
          parsed[field] = parsed[field] ? parsed[field].split(',').map((s: string) => s.trim()).filter((s: string) => s !== '') : [];
        } else if (!Array.isArray(parsed[field])) {
            parsed[field] = [];
        }
      });
      return parsed;
    } catch (e) { console.error("Error parsing profile for AI:", e); return {}; }
  }
  return {};
}


export default function OptimizedMealPlanPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [mealPlan, setMealPlan] = useState<MealPlanType | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [isSwapModalOpen, setIsSwapModalOpen] = useState(false);
  const [currentMealForSwap, setCurrentMealForSwap] = useState<MealData | null>(null);
  const [swapSuggestions, setSwapSuggestions] = useState<SuggestIngredientSwapOutput>([]);
  const [isLoadingSwap, setIsLoadingSwap] = useState(false);


  const handleGeneratePlan = async () => {
    if (!user) {
      toast({ title: "Error", description: "You must be logged in.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    setError(null);
    setMealPlan(null);

    try {
      const profileData = await getFullProfileData(user.id);
      
      // Validate and provide defaults for required fields for the AI model
      // This is a simplified example; production code would need more robust handling
      const aiInput: GeneratePersonalizedMealPlanInput = {
        age: profileData.age || 30,
        gender: profileData.gender || "male",
        height: profileData.height || 170,
        currentWeight: profileData.currentWeight || 70,
        goalWeight: profileData.goalWeight || 65,
        bodyFatPercentage: profileData.currentBodyFatPercentage || 20,
        muscleMassPercentage: profileData.currentMuscleMassPercentage || 40,
        waterPercentage: profileData.currentWaterPercentage || 55,
        waistMeasurement: profileData.waistMeasurementCurrent || 80,
        hipsMeasurement: profileData.hipsMeasurementCurrent || 90,
        limbsMeasurement: profileData.limbsMeasurementCurrent || 50,
        activityLevel: profileData.activityLevel || "moderate",
        dietGoal: profileData.dietGoal || "lose_weight",
        preferredDiet: profileData.preferredDiet || "none",
        preferredCuisines: Array.isArray(profileData.preferredCuisines) ? profileData.preferredCuisines : [],
        dispreferredCuisines: Array.isArray(profileData.dispreferredCuisines) ? profileData.dispreferredCuisines : [],
        preferredIngredients: Array.isArray(profileData.preferredIngredients) ? profileData.preferredIngredients : [],
        dispreferredIngredients: Array.isArray(profileData.dispreferredIngredients) ? profileData.dispreferredIngredients : [],
        allergies: Array.isArray(profileData.allergies) ? profileData.allergies : [],
        mealsPerDay: profileData.mealsPerDay || 3,
        preferredMicronutrients: Array.isArray(profileData.preferredMicronutrients) ? profileData.preferredMicronutrients : [],
        medicalConditions: Array.isArray(profileData.medicalConditions) ? profileData.medicalConditions : [],
        medications: Array.isArray(profileData.medications) ? profileData.medications : [],
        painMobilityIssues: profileData.painMobilityIssues || "none",
        injuries: Array.isArray(profileData.injuries) ? profileData.injuries : [],
        surgeries: Array.isArray(profileData.surgeries) ? profileData.surgeries : [],
        exerciseGoals: Array.isArray(profileData.exerciseGoals) ? profileData.exerciseGoals : [],
        exercisePreferences: Array.isArray(profileData.exercisePreferences) ? profileData.exercisePreferences : [],
        exerciseFrequency: profileData.exerciseFrequency || "3-4_days",
        exerciseIntensity: profileData.exerciseIntensity || "moderate",
        equipmentAccess: Array.isArray(profileData.equipmentAccess) ? profileData.equipmentAccess : [],
      };
      
      const result = await generatePersonalizedMealPlan(aiInput);
      const parsedResult = AiGeneratedMealPlanOutputSchema.safeParse(result);

      if (parsedResult.success) {
        setMealPlan(parsedResult.data);
        toast({ title: "Meal Plan Generated!", description: "Your AI-optimized meal plan is ready." });
      } else {
        console.error("AI Output Validation Error:", parsedResult.error.flatten());
        setError("Failed to understand AI response. The format was unexpected.");
        toast({ title: "Error", description: "AI response format was incorrect.", variant: "destructive" });
      }
    } catch (e: any) {
      console.error("AI Generation Error:", e);
      setError(e.message || "An unknown error occurred while generating the meal plan.");
      toast({ title: "Generation Failed", description: e.message || "Unknown error.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };
  
  const openSwapModal = async (meal: MealData) => {
    if (!user) return;
    setCurrentMealForSwap(meal);
    setIsSwapModalOpen(true);
    setIsLoadingSwap(true);
    setSwapSuggestions([]);
    try {
      const profileData = await getFullProfileData(user.id);
      // Map MealData to SuggestIngredientSwapInput.ingredients
      const ingredientsForAI = meal.ingredients.map(ing => ({
        name: ing.ingredient_name,
        quantity: ing.quantity_g,
        caloriesPer100g: ing.macros_per_100g.calories,
        proteinPer100g: ing.macros_per_100g.protein_g,
        fatPer100g: ing.macros_per_100g.fat_g,
      }));

      const swapInput: SuggestIngredientSwapInput = {
        mealName: meal.meal_name,
        ingredients: ingredientsForAI,
        dietaryPreferences: profileData.preferredDiet || "none",
        dislikedIngredients: Array.isArray(profileData.dispreferredIngredients) ? profileData.dispreferredIngredients : [],
        allergies: Array.isArray(profileData.allergies) ? profileData.allergies : [],
        // These targets ideally come from meal-level targets or are estimated
        nutrientTargets: { 
          calories: meal.total_calories, 
          protein: meal.total_protein_g, 
          carbohydrates: 0, // AI output doesn't have carbs per meal yet, placeholder
          fat: meal.total_fat_g 
        },
      };
      const suggestions = await suggestIngredientSwap(swapInput);
      setSwapSuggestions(suggestions);
    } catch (e: any) {
      toast({ title: "Swap Suggestion Error", description: e.message || "Could not get suggestions.", variant: "destructive" });
    } finally {
      setIsLoadingSwap(false);
    }
  };


  const chartConfig: ChartConfig = {
    calories: { label: "Calories (kcal)", color: "hsl(var(--chart-1))" },
    protein: { label: "Protein (g)", color: "hsl(var(--chart-2))" },
    fat: { label: "Fat (g)", color: "hsl(var(--chart-3))" },
    carbs: { label: "Carbs (g)", color: "hsl(var(--chart-4))" }, // if available
  };


  return (
    <div className="container mx-auto py-8">
      <Card className="shadow-xl">
        <CardHeader className="flex flex-col md:flex-row justify-between items-start md:items-center">
          <div>
            <CardTitle className="text-3xl font-bold">AI-Optimized Weekly Meal Plan</CardTitle>
            <CardDescription>Generate a personalized meal plan based on your profile and preferences.</CardDescription>
          </div>
          <Button onClick={handleGeneratePlan} disabled={isLoading} size="lg" className="mt-4 md:mt-0">
            {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Wand2 className="mr-2 h-5 w-5" />}
            {isLoading ? "Generating..." : "Generate New Plan"}
          </Button>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {!mealPlan && !isLoading && !error && (
             <Alert className="mb-6 border-primary/50 text-primary">
              <Info className="h-4 w-4" />
              <AlertTitle>Ready to Plan?</AlertTitle>
              <AlertDescription>Click the "Generate New Plan" button to create your AI-optimized meal schedule. Ensure your profile is up-to-date for the best results!</AlertDescription>
            </Alert>
          )}
          
          {mealPlan && (
            <>
              <Card className="mb-8 bg-muted/30">
                <CardHeader><CardTitle>Weekly Summary</CardTitle></CardHeader>
                <CardContent>
                   <p>Total Calories: {mealPlan.weeklySummary.totalCalories.toFixed(0)} kcal</p>
                   <p>Total Protein: {mealPlan.weeklySummary.totalProtein.toFixed(1)} g</p>
                   <p>Total Fat: {mealPlan.weeklySummary.totalFat.toFixed(1)} g</p>
                   {mealPlan.weeklySummary.totalCarbs && <p>Total Carbs: {mealPlan.weeklySummary.totalCarbs.toFixed(1)} g</p> }
                  
                  <ChartContainer config={chartConfig} className="mx-auto aspect-video max-h-[300px] mt-4">
                    <BarChart accessibilityLayer data={[
                        { type: 'Calories', value: mealPlan.weeklySummary.totalCalories / 7, fill: "var(--color-calories)" }, // Daily average
                        { type: 'Protein', value: mealPlan.weeklySummary.totalProtein / 7, fill: "var(--color-protein)" },
                        { type: 'Fat', value: mealPlan.weeklySummary.totalFat / 7, fill: "var(--color-fat)"},
                        // { type: 'Carbs', value: mealPlan.weeklySummary.totalCarbs / 7, fill: "var(--color-carbs)" },
                      ]}>
                      <XAxis dataKey="type" tickLine={false} tickMargin={10} axisLine={false} />
                      <YAxis />
                      <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                      <Bar dataKey="value" radius={8} />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              <Tabs defaultValue={mealPlan.weeklyMealPlan[0]?.day || daysOfWeek[0]} className="w-full">
                <ScrollArea className="w-full whitespace-nowrap rounded-md">
                  <TabsList className="inline-flex h-auto">
                    {mealPlan.weeklyMealPlan.map(dayPlan => (
                      <TabsTrigger key={dayPlan.day} value={dayPlan.day} className="px-4 py-2 text-base">{dayPlan.day}</TabsTrigger>
                    ))}
                  </TabsList>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
                
                {mealPlan.weeklyMealPlan.map((dayPlan) => (
                  <TabsContent key={dayPlan.day} value={dayPlan.day} className="mt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {dayPlan.meals.map((meal, mealIndex) => (
                        <Card key={`${dayPlan.day}-${meal.meal_name}-${mealIndex}`} className="flex flex-col">
                          <CardHeader>
                            <CardTitle className="text-xl">{meal.meal_name}</CardTitle>
                          </CardHeader>
                          <CardContent className="flex-grow">
                            <h4 className="font-semibold mb-1 text-sm">Ingredients:</h4>
                            <ul className="space-y-1 text-xs text-muted-foreground mb-3">
                              {meal.ingredients.map((ing, ingIndex) => (
                                <li key={ingIndex}>
                                  {ing.ingredient_name} ({ing.quantity_g}g)
                                  <span className="text-primary/80 ml-1">
                                    (C: {ing.macros_per_100g.calories*ing.quantity_g/100:.0f}, P: {ing.macros_per_100g.protein_g*ing.quantity_g/100:.1f}g, F: {ing.macros_per_100g.fat_g*ing.quantity_g/100:.1f}g)
                                  </span>
                                </li>
                              ))}
                            </ul>
                             <div className="text-xs font-medium border-t pt-2">
                                <p>Total Calories: {meal.total_calories.toFixed(0)}</p>
                                <p>Total Protein: {meal.total_protein_g.toFixed(1)}g</p>
                                <p>Total Fat: {meal.total_fat_g.toFixed(1)}g</p>
                            </div>
                          </CardContent>
                           <div className="p-4 border-t">
                            <Button variant="outline" size="sm" onClick={() => openSwapModal(meal)}>
                              <Settings2 className="mr-2 h-4 w-4" /> Suggest Swaps
                            </Button>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </>
          )}
        </CardContent>
      </Card>
      
      <Dialog open={isSwapModalOpen} onOpenChange={setIsSwapModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ingredient Swap Suggestions</DialogTitle>
            <DialogDescription>
              For meal: {currentMealForSwap?.meal_name}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 max-h-[60vh] overflow-y-auto">
            {isLoadingSwap ? (
              <div className="flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /> <span className="ml-2">Loading suggestions...</span></div>
            ) : swapSuggestions.length > 0 ? (
              <ul className="space-y-3">
                {swapSuggestions.map((suggestion, index) => (
                  <li key={index} className="p-3 border rounded-md bg-muted/50">
                    <p className="font-semibold text-primary">{suggestion.ingredientName}</p>
                    <p className="text-sm text-muted-foreground">{suggestion.reason}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-center text-muted-foreground">No specific swap suggestions found, or the meal is already well-optimized for your preferences!</p>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}

