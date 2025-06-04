
"use client";

import React, { useState, useEffect, Suspense, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ChefHat, AlertTriangle, Sparkles, Settings } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { FullProfileType, MealSuggestionType, SuggestMealsForMacrosInputType } from '@/lib/schemas';
import { MealSuggestionPreferencesSchema, type MealSuggestionPreferencesValues } from '@/lib/schemas';
import { suggestMealsForMacros } from '@/ai/flows/suggest-meals-for-macros';
import { mealNames, defaultMacroPercentages, preferredDiets } from '@/lib/constants';
import { calculateEstimatedDailyTargets } from '@/lib/nutrition-calculator';
import { getProfileData } from '@/app/api/user/database';

async function getProfileDataForSuggestions(userId: string): Promise<Partial<FullProfileType>> {
  if (!userId) return {};
  try {
    const profileData = await getProfileData(userId)
    console.log("Profile data from Profile suggestion", profileData)
    return  profileData
  } catch (error) {
    console.error("Error fetching profile data from Firestore for suggestions:", error);
  }
  return {};
}


function MealSuggestionsContent() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { toast } = useToast();

  const [selectedMealName, setSelectedMealName] = useState<string | null>(null);
  const [targetMacros, setTargetMacros] = useState<{
    mealName: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  } | null>(null);

  const [fullProfileData, setFullProfileData] = useState<Partial<FullProfileType> | null>(null);
  const [isLoadingAiSuggestions, setIsLoadingAiSuggestions] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  
  const [suggestions, setSuggestions] = useState<MealSuggestionType[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);

  const preferenceForm = useForm<MealSuggestionPreferencesValues>({
    resolver: zodResolver(MealSuggestionPreferencesSchema),
    defaultValues: {
      preferredDiet: undefined, preferredCuisines: [], dispreferredCuisines: [],
      preferredIngredients: [], dispreferredIngredients: [], allergies: [],
      preferredMicronutrients: [], medicalConditions: [], medications: [],
    },
  });

  useEffect(() => {
    if (user?.uid) {
      setIsLoadingProfile(true);
      getProfileDataForSuggestions(user.uid)
        .then(data => {
          setFullProfileData(data);
          preferenceForm.reset({
            preferredDiet: data.preferredDiet || undefined,
            preferredCuisines: data.preferredCuisines || [],
            dispreferredCuisines: data.dispreferredCuisines || [],
            preferredIngredients: data.preferredIngredients || [],
            dispreferredIngredients: data.dispreferredIngredients || [],
            allergies: data.allergies || [],
            preferredMicronutrients: data.preferredMicronutrients || [],
            medicalConditions: data.medicalConditions || [],
            medications: data.medications || [],
          });
        })
        .catch(() => toast({ title: "Error", description: "Could not load profile data.", variant: "destructive" }))
        .finally(() => setIsLoadingProfile(false));
    } else {
      setIsLoadingProfile(false);
      preferenceForm.reset({
        preferredDiet: undefined, preferredCuisines: [], dispreferredCuisines: [],
        preferredIngredients: [], dispreferredIngredients: [], allergies: [],
        preferredMicronutrients: [], medicalConditions: [], medications: [],
      });
    }
  }, [user, toast, preferenceForm]);

  const calculateTargetsForSelectedMeal = useCallback(() => {
    if (!selectedMealName) {
      setTargetMacros(null);
      setIsDemoMode(false);
      return;
    }
    setError(null); 
    setSuggestions([]);

    const profileToUse = fullProfileData;
    const exampleTargets = { mealName: selectedMealName, calories: 500, protein: 30, carbs: 60, fat: 20 };
    
    const requiredProfileFields: (keyof FullProfileType)[] = ['age', 'gender', 'current_weight', 'height_cm', 'activityLevel', 'dietGoalOnboarding'];
    const missingFields = requiredProfileFields.filter(field => !profileToUse?.[field]);

    if (missingFields.length === 0 && profileToUse) {
      const dailyTotals = calculateEstimatedDailyTargets({
        age: profileToUse.age!,
        gender: profileToUse.gender!,
        currentWeight: profileToUse.current_weight!,
        height: profileToUse.height_cm!,
        activityLevel: profileToUse.activityLevel!,
        dietGoal: profileToUse.dietGoalOnboarding!,
      });
      const mealDistribution = defaultMacroPercentages[selectedMealName];

      if (dailyTotals.targetCalories && dailyTotals.targetProtein && dailyTotals.targetCarbs && dailyTotals.targetFat && mealDistribution) {
        setTargetMacros({
          mealName: selectedMealName,
          calories: Math.round(dailyTotals.targetCalories * (mealDistribution.calories_pct / 100)),
          protein: Math.round(dailyTotals.targetProtein * (mealDistribution.protein_pct / 100)),
          carbs: Math.round(dailyTotals.targetCarbs * (mealDistribution.carbs_pct / 100)),
          fat: Math.round(dailyTotals.targetFat * (mealDistribution.fat_pct / 100)),
        });
        setIsDemoMode(false);
      } else {
        setTargetMacros(exampleTargets);
        setIsDemoMode(true);
        toast({ title: "Using Example Targets", description: `Could not calculate specific targets for ${selectedMealName} from profile. Ensure profile basics (age, weight, height, gender, activity, goal) are complete.`, duration: 6000, variant: "default" });
      }
    } else {
      setTargetMacros(exampleTargets);
      setIsDemoMode(true);
      toast({ title: "Profile Incomplete or Demo", description: `Showing example targets for ${selectedMealName}. Please complete your profile via Onboarding or Smart Calorie Planner for personalized calculations.`, duration: 7000, variant: "default" });
    }
  }, [selectedMealName, fullProfileData, toast]);


  useEffect(() => {
    if (!searchParams) return;

    const mealNameParam = searchParams.get('mealName');
    const caloriesParam = searchParams.get('calories');
    const proteinParam = searchParams.get('protein');
    const carbsParam = searchParams.get('carbs');
    const fatParam = searchParams.get('fat');

    if (mealNameParam && mealNames.includes(mealNameParam) &&
        caloriesParam && proteinParam && carbsParam && fatParam) {
      
      const newTargets = {
        mealName: mealNameParam,
        calories: parseFloat(caloriesParam),
        protein: parseFloat(proteinParam),
        carbs: parseFloat(carbsParam),
        fat: parseFloat(fatParam),
      };
      
      setSelectedMealName(mealNameParam);
      setTargetMacros(newTargets);
      setIsDemoMode(false);
      setSuggestions([]);
      setError(null);
    } else if (mealNameParam && mealNames.includes(mealNameParam)) {
      setSelectedMealName(mealNameParam);
    }
  }, [searchParams]);

  useEffect(() => {
    if (selectedMealName && !targetMacros && !isLoadingProfile) {
      calculateTargetsForSelectedMeal();
    }
  }, [selectedMealName, targetMacros, isLoadingProfile, calculateTargetsForSelectedMeal]);


  const handleMealSelectionChange = (mealValue: string) => {
    setSelectedMealName(mealValue); 
    setTargetMacros(null); 
    setSuggestions([]);
    setError(null);
    setIsDemoMode(false);
  };

  const handleGetSuggestions = async () => {
    if (!targetMacros) {
      toast({ title: "Error", description: "Target macros not loaded. Select a meal first.", variant: "destructive" });
      return;
    }
    if (isLoadingProfile && !isDemoMode && (!fullProfileData || Object.keys(fullProfileData).length === 0)) {
      toast({ title: "Please wait", description: "User profile is still loading.", variant: "default" });
      return;
    }

    setIsLoadingAiSuggestions(true);
    setSuggestions([]);
    setError(null);

    const currentPreferences = preferenceForm.getValues();
    
    const aiInput: SuggestMealsForMacrosInputType = {
      mealName: targetMacros.mealName,
      targetCalories: targetMacros.calories,
      targetProteinGrams: targetMacros.protein,
      targetCarbsGrams: targetMacros.carbs,
      targetFatGrams: targetMacros.fat,
      age: !isDemoMode ? fullProfileData?.age  : undefined,
      gender: !isDemoMode ? fullProfileData?.gender : undefined,
      activityLevel: !isDemoMode ? fullProfileData?.activityLevel : undefined,
      dietGoal: !isDemoMode ? fullProfileData?.dietGoalOnboarding : undefined,
      preferredDiet: currentPreferences.preferredDiet,
      preferredCuisines: currentPreferences.preferredCuisines,
      dispreferredCuisines: currentPreferences.dispreferredCuisines,
      preferredIngredients: currentPreferences.preferredIngredients,
      dispreferredIngredients: currentPreferences.dispreferredIngredients,
      allergies: currentPreferences.allergies,
    };

    Object.keys(aiInput).forEach(key => aiInput[key as keyof SuggestMealsForMacrosInputType] === undefined && delete aiInput[key as keyof SuggestMealsForMacrosInputType]);

    try {
      const result = await suggestMealsForMacros(aiInput);
      if (result && result.suggestions) {
        setSuggestions(result.suggestions);
      } else {
        setError("AI did not return valid suggestions.");
        toast({ title: "AI Response Error", description: "Received an unexpected response from the AI.", variant: "destructive" });
      }
    } catch (err: any) {
      console.error("Error getting meal suggestions:", err);
      console.error("Full AI error object (MealSuggestionsPage):", err);
      const errorMessage = err.message || "An unknown error occurred";
      setError(`Failed to fetch meal suggestions: ${errorMessage}. Please try again.`);
      toast({ title: "AI Error", description: `Could not get meal suggestions from AI: ${errorMessage}`, variant: "destructive", duration: 7000 });
    } finally {
      setIsLoadingAiSuggestions(false);
    }
  };

  const renderPreferenceTextarea = (
    fieldName: keyof MealSuggestionPreferencesValues,
    label: string,
    placeholder: string
  ) => (
    <FormField
      control={preferenceForm.control}
      name={fieldName}
      render={({ field }) => {
        const displayValue = Array.isArray(field.value) ? field.value.join(', ') : (field.value || '');
        return (
          <FormItem>
            <FormLabel>{label}</FormLabel>
            <FormControl><div>
              <Textarea
                placeholder={placeholder}
                value={displayValue}
                onChange={(e) => field.onChange(e.target.value.split(',').map(s => s.trim()).filter(s => s))}
                className="h-10 resize-none"
                onWheel={(e) => (e.currentTarget as HTMLTextAreaElement).blur()}
              /></div>
            </FormControl>
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );

  const showContentBelowSelection = selectedMealName && targetMacros && !isLoadingProfile;

  return (
    <div className="space-y-6">
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-3xl font-bold flex items-center">
            <ChefHat className="mr-3 h-8 w-8 text-primary" />
            AI Meal Suggestions
          </CardTitle>
          <CardDescription>
            Select a meal, adjust preferences if needed, and get AI-powered ideas tailored to your macronutrient targets.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Accordion type="single" collapsible className="w-full" defaultValue="preferences">
            <AccordionItem value="preferences">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-primary" />
                  <span className="text-lg font-semibold">1. Adjust Preferences for this Suggestion (Optional)</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <Form {...preferenceForm}>
                  <form className="space-y-6 pt-4">
                    <Card>
                      <CardHeader><CardTitle className="text-xl">Dietary Preferences & Restrictions</CardTitle></CardHeader>
                      <CardContent className="grid md:grid-cols-2 gap-x-6 gap-y-4">
                        <FormField
                          control={preferenceForm.control}
                          name="preferredDiet"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Preferred Diet</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value ?? undefined}>
                                <FormControl><div><SelectTrigger><SelectValue placeholder="Select preferred diet" /></SelectTrigger></div></FormControl>
                                <SelectContent>{preferredDiets.map(pd => <SelectItem key={pd.value} value={pd.value}>{pd.label}</SelectItem>)}</SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        {renderPreferenceTextarea("allergies", "Allergies (comma-separated)", "e.g., Peanuts, Shellfish")}
                        {renderPreferenceTextarea("preferredCuisines", "Preferred Cuisines", "e.g., Italian, Mexican")}
                        {renderPreferenceTextarea("dispreferredCuisines", "Dispreferred Cuisines", "e.g., Thai, French")}
                        {renderPreferenceTextarea("preferredIngredients", "Preferred Ingredients", "e.g., Chicken, Broccoli")}
                        {renderPreferenceTextarea("dispreferredIngredients", "Dispreferred Ingredients", "e.g., Tofu, Mushrooms")}
                        {renderPreferenceTextarea("preferredMicronutrients", "Targeted Micronutrients (Optional)", "e.g., Vitamin D, Iron")}
                        {renderPreferenceTextarea("medicalConditions", "Medical Conditions (Optional)", "e.g., Diabetes, Hypertension")}
                        {renderPreferenceTextarea("medications", "Medications (Optional)", "e.g., Metformin, Lisinopril")}
                      </CardContent>
                    </Card>
                  </form>
                </Form>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <div className="space-y-2">
            <Label htmlFor="meal-select" className="text-lg font-semibold text-primary">2. Choose a Meal:</Label>
            <Select onValueChange={handleMealSelectionChange} value={selectedMealName || ""}>
              <SelectTrigger id="meal-select" className="w-full md:w-1/2 lg:w-1/3">
                <SelectValue placeholder="Select a meal..." />
              </SelectTrigger>
              <SelectContent>
                {mealNames.map(name => (
                  <SelectItem key={name} value={name}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {isLoadingProfile && !selectedMealName && (
            <div className="flex justify-center items-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="ml-2">Loading profile data...</p>
            </div>
          )}
          
          {selectedMealName && !targetMacros && isLoadingProfile && (
             <div className="flex justify-center items-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="ml-2">Loading profile and calculating targets for {selectedMealName}...</p>
            </div>
          )}


          {showContentBelowSelection && (
            <>
              <div className="p-4 border rounded-md bg-muted/50">
                <h3 className="text-lg font-semibold mb-2 text-primary">Target Macros for {targetMacros.mealName}:</h3>
                {isDemoMode && <p className="text-sm text-amber-600 dark:text-amber-400 mb-2">(Displaying example targets. Complete your profile via Onboarding or Smart Calorie Planner for personalized calculations.)</p>}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <p><span className="font-medium">Calories:</span> {targetMacros.calories.toFixed(0)} kcal</p>
                  <p><span className="font-medium">Protein:</span> {targetMacros.protein.toFixed(1)} g</p>
                  <p><span className="font-medium">Carbs:</span> {targetMacros.carbs.toFixed(1)} g</p>
                  <p><span className="font-medium">Fat:</span> {targetMacros.fat.toFixed(1)} g</p>
                </div>
              </div>

              <Button onClick={handleGetSuggestions} disabled={isLoadingAiSuggestions || (isLoadingProfile && !isDemoMode)} size="lg" className="w-full md:w-auto">
                {isLoadingAiSuggestions ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Sparkles className="mr-2 h-5 w-5" />}
                { (isLoadingProfile && !isDemoMode && !isLoadingAiSuggestions) ? "Loading Profile..." : (isLoadingAiSuggestions ? "Getting Suggestions..." : "3. Get AI Meal Suggestions")}
              </Button>

              {error && (<p className="text-destructive mt-4"><AlertTriangle className="inline mr-1 h-4 w-4" />{error}</p>)}
            </>
          )}
          
          {!selectedMealName && !isLoadingProfile && (
             <div className="text-center py-6 text-muted-foreground">
                <p>Please select a meal type above to get started.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {isLoadingAiSuggestions && (
        <div className="flex flex-col items-center justify-center py-8 space-y-2">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-lg text-muted-foreground">Fetching creative meal ideas for your {targetMacros?.mealName || 'meal'}...</p>
        </div>
      )}

      {suggestions.length > 0 && !isLoadingAiSuggestions && (
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-primary mt-8 mb-4">Here are some ideas for your {targetMacros?.mealName || 'meal'}:</h2>
          {suggestions.map((suggestion, index) => (
            <Card key={index} className="shadow-md hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="text-xl font-semibold">{suggestion.mealTitle}</CardTitle>
                <CardDescription className="text-sm">{suggestion.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <h4 className="font-medium text-md mb-2 text-primary">Ingredients:</h4>
                <ScrollArea className="w-full mb-4">
                  <Table className="min-w-[500px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[30%]">Ingredient</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-right">Unit</TableHead>
                        <TableHead className="text-right">Calories</TableHead>
                        <TableHead className="text-right">Macros (P/C/F)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {suggestion.ingredients.map((ing, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium py-1.5">{ing.name}</TableCell>
                          <TableCell className="text-right py-1.5">{ing.amount}</TableCell>
                          <TableCell className="text-right py-1.5">{ing.unit}</TableCell>
                          <TableCell className="text-right py-1.5">{ing.calories.toFixed(0)}</TableCell>
                          <TableCell className="text-right py-1.5 whitespace-nowrap">{ing.macrosString}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>

                <div className="text-sm font-semibold p-2 border-t border-muted-foreground/20 bg-muted/40 rounded-b-md">
                  Total: {suggestion.totalCalories.toFixed(0)} kcal |
                  Protein: {suggestion.totalProtein.toFixed(1)}g |
                  Carbs: {suggestion.totalCarbs.toFixed(1)}g |
                  Fat: {suggestion.totalFat.toFixed(1)}g
                </div>

                {suggestion.instructions && (
                  <div className="mt-4">
                    <h4 className="font-medium text-md mb-1 text-primary">Instructions:</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-line">{suggestion.instructions}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}


export default function MealSuggestionsPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center h-screen"><Loader2 className="h-12 w-12 animate-spin text-primary" /><p className="ml-4 text-lg">Loading...</p></div>}>
      <MealSuggestionsContent />
    </Suspense>
  );
}

    