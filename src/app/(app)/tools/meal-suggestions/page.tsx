
"use client";

import React, { useState, useEffect, Suspense, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { zodResolver } from "@hookform/resolvers/zod"; 
import { useForm, Controller } from "react-hook-form"; 
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"; 
import { Textarea } from "@/components/ui/textarea"; 
import { Loader2, ChefHat, AlertTriangle, Sparkles, Settings } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"; 
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { ProfileFormValues as FullProfileType } from '@/lib/schemas'; 
import { MealSuggestionPreferencesSchema, type MealSuggestionPreferencesValues } from '@/lib/schemas'; 
import { suggestMealsForMacros, type SuggestMealsForMacrosInput, type SuggestMealsForMacrosOutput } from '@/ai/flows/suggest-meals-for-macros';
import { mealNames, defaultMacroPercentages, preferredDiets } from '@/lib/constants'; 
import { calculateEstimatedDailyTargets } from '@/lib/nutrition-calculator';

async function getProfileDataForSuggestions(userId: string): Promise<Partial<FullProfileType>> {
  const storedProfile = localStorage.getItem(`nutriplan_profile_${userId}`);
  if (storedProfile) {
    try {
      const parsedProfile = JSON.parse(storedProfile) as FullProfileType;
      const arrayFields: (keyof FullProfileType)[] = [
        'preferredCuisines', 'dispreferredCuisines', 'preferredIngredients', 'dispreferredIngredients',
        'allergies', 'preferredMicronutrients', 'medicalConditions', 'medications', 
        'injuries', 'surgeries', 'exerciseGoals', 'exercisePreferences', 'equipmentAccess'
      ];
      arrayFields.forEach(field => {
        if ((parsedProfile as any)[field] && typeof (parsedProfile as any)[field] === 'string') {
           (parsedProfile as any)[field] = ((parsedProfile as any)[field] as string).split(',').map((s: string) => s.trim()).filter((s: string) => s !== '');
        } else if (!Array.isArray((parsedProfile as any)[field])) {
            (parsedProfile as any)[field] = [];
        }
      });
      return parsedProfile;
    } catch (error) {
      console.error("Error parsing stored profile data for suggestions:", error);
      return {};
    }
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
  const [isLoadingTargets, setIsLoadingTargets] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestMealsForMacrosOutput['suggestions']>([]);
  const [error, setError] = useState<string | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);

  const preferenceForm = useForm<MealSuggestionPreferencesValues>({
    resolver: zodResolver(MealSuggestionPreferencesSchema),
    defaultValues: {
      preferredDiet: undefined,
      preferredCuisines: [],
      dispreferredCuisines: [],
      preferredIngredients: [],
      dispreferredIngredients: [],
      allergies: [],
      preferredMicronutrients: [],
      medicalConditions: [],
      medications: [],
    },
  });

  // Fetch profile data on mount or when user changes
  useEffect(() => {
    if (user?.id) {
      setIsLoadingProfile(true);
      getProfileDataForSuggestions(user.id)
        .then(data => {
          setFullProfileData(data);
          preferenceForm.reset({
            preferredDiet: data.preferredDiet,
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
        .catch(() => toast({title: "Error", description: "Could not load profile data.", variant: "destructive"}))
        .finally(() => setIsLoadingProfile(false));
    } else {
      setIsLoadingProfile(false);
      // If no user, populate form with empty defaults or specific initial values if needed
      preferenceForm.reset({
            preferredDiet: undefined,
            preferredCuisines: [],
            dispreferredCuisines: [],
            preferredIngredients: [],
            dispreferredIngredients: [],
            allergies: [],
            preferredMicronutrients: [],
            medicalConditions: [],
            medications: [],
      });
    }
  }, [user, toast, preferenceForm]);

  // Handle initial URL parameters
  useEffect(() => {
    const mealNameParam = searchParams.get('mealName');
    const caloriesParam = searchParams.get('calories');
    const proteinParam = searchParams.get('protein');
    const carbsParam = searchParams.get('carbs');
    const fatParam = searchParams.get('fat');

    if (mealNameParam && caloriesParam && proteinParam && carbsParam && fatParam && mealNames.includes(mealNameParam)) {
      setSelectedMealName(mealNameParam);
      setTargetMacros({
        mealName: mealNameParam,
        calories: parseFloat(caloriesParam),
        protein: parseFloat(proteinParam),
        carbs: parseFloat(carbsParam),
        fat: parseFloat(fatParam),
      });
      setIsDemoMode(false);
      setError(null);
    }
  }, [searchParams]);

  const calculateTargetsForSelectedMeal = useCallback(() => {
    if (!selectedMealName) {
      setTargetMacros(null);
      return;
    }

    if (isLoadingProfile) {
      setIsLoadingTargets(true);
      return;
    }
    setIsLoadingTargets(true);

    if (fullProfileData && fullProfileData.age) {
      const dailyTotals = calculateEstimatedDailyTargets(fullProfileData);
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
        setError(null);
      } else {
        setTargetMacros({ mealName: selectedMealName, calories: 500, protein: 30, carbs: 60, fat: 20 });
        setIsDemoMode(true);
        if(!isDemoMode) toast({ title: "Using Example Targets", description: `Could not calculate specific targets for ${selectedMealName} from profile.`, duration: 4000 });
      }
    } else {
      setTargetMacros({ mealName: selectedMealName, calories: 500, protein: 30, carbs: 60, fat: 20 });
      setIsDemoMode(true);
      if(!isDemoMode) toast({ title: "Profile Incomplete", description: `Showing example targets for ${selectedMealName}. Please complete your profile for personalized calculations.`, duration: 5000 });
    }
    setSuggestions([]);
    setError(null);
    setIsLoadingTargets(false);
  }, [selectedMealName, fullProfileData, toast, isLoadingProfile, isDemoMode]);

  useEffect(() => {
    if (selectedMealName && (!targetMacros || targetMacros.mealName !== selectedMealName)) {
        calculateTargetsForSelectedMeal();
    }
  }, [selectedMealName, fullProfileData, calculateTargetsForSelectedMeal, targetMacros]);

  const handleMealSelectionChange = (mealValue: string) => {
    setSelectedMealName(mealValue);
  };

  const handleGetSuggestions = async () => {
    if (!targetMacros) {
      toast({title: "Error", description: "Target macros not loaded.", variant: "destructive"});
      return;
    }
    if (!user && !isDemoMode) {
        toast({title: "Please wait", description: "User profile is still loading or not available.", variant: "default"});
        return;
    }
    if (isLoadingProfile && !isDemoMode){
        toast({title: "Please wait", description: "User profile is still loading.", variant: "default"});
        return;
    }

    setIsLoadingAiSuggestions(true);
    setSuggestions([]);
    setError(null);

    const currentPreferences = preferenceForm.getValues();

    const aiInput: SuggestMealsForMacrosInput = {
      mealName: targetMacros.mealName,
      targetCalories: targetMacros.calories,
      targetProteinGrams: targetMacros.protein,
      targetCarbsGrams: targetMacros.carbs,
      targetFatGrams: targetMacros.fat,
      age: fullProfileData?.age,
      gender: fullProfileData?.gender,
      activityLevel: fullProfileData?.activityLevel,
      dietGoal: fullProfileData?.dietGoal,
      preferredDiet: currentPreferences.preferredDiet,
      preferredCuisines: currentPreferences.preferredCuisines,
      dispreferredCuisines: currentPreferences.dispreferredCuisines,
      preferredIngredients: currentPreferences.preferredIngredients,
      dispreferredIngredients: currentPreferences.dispreferredIngredients,
      allergies: currentPreferences.allergies,
    };

    try {
      const result = await suggestMealsForMacros(aiInput);
      if (result && result.suggestions) {
        setSuggestions(result.suggestions);
      } else {
        setError("AI did not return valid suggestions.");
        toast({title: "AI Response Error", description: "Received an unexpected response from the AI.", variant: "destructive"});
      }
    } catch (err) {
      console.error("Error getting meal suggestions:", err);
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred";
      setError(`Failed to fetch meal suggestions: ${errorMessage}. Please try again.`);
      toast({title: "AI Error", description: `Could not get meal suggestions from AI: ${errorMessage}`, variant: "destructive", duration: 7000});
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
            <FormControl>
              <Textarea
                placeholder={placeholder}
                value={displayValue}
                onChange={(e) => field.onChange(e.target.value.split(',').map(s => s.trim()).filter(s => s))}
                className="h-10 resize-none" 
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );

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
        <CardContent>
          <Accordion type="single" collapsible className="w-full mb-6" defaultValue="preferences">
            <AccordionItem value="preferences">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                    <Settings className="h-5 w-5 text-primary" /> 
                    <span className="text-lg font-semibold">Adjust Preferences for this Suggestion</span>
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
                                <FormControl><SelectTrigger><SelectValue placeholder="Select preferred diet" /></SelectTrigger></FormControl>
                                <SelectContent>{preferredDiets.map(pd => <SelectItem key={pd.value} value={pd.value}>{pd.label}</SelectItem>)}</SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        {renderPreferenceTextarea("allergies" as keyof MealSuggestionPreferencesValues, "Allergies (comma-separated)", "e.g., Peanuts, Shellfish")}
                        {renderPreferenceTextarea("preferredCuisines" as keyof MealSuggestionPreferencesValues, "Preferred Cuisines", "e.g., Italian, Mexican")}
                        {renderPreferenceTextarea("dispreferredCuisines" as keyof MealSuggestionPreferencesValues, "Dispreferred Cuisines", "e.g., Thai, French")}
                        {renderPreferenceTextarea("preferredIngredients" as keyof MealSuggestionPreferencesValues, "Preferred Ingredients", "e.g., Chicken, Broccoli")}
                        {renderPreferenceTextarea("dispreferredIngredients" as keyof MealSuggestionPreferencesValues, "Dispreferred Ingredients", "e.g., Tofu, Mushrooms")}
                        {renderPreferenceTextarea("preferredMicronutrients" as keyof MealSuggestionPreferencesValues, "Targeted Micronutrients", "e.g., Vitamin D, Iron")}
                      </CardContent>
                    </Card>
                      <Card>
                      <CardHeader><CardTitle className="text-xl">Medical Information (for AI awareness)</CardTitle></CardHeader>
                      <CardContent className="grid md:grid-cols-2 gap-x-6 gap-y-4">
                        {renderPreferenceTextarea("medicalConditions" as keyof MealSuggestionPreferencesValues, "Medical Conditions", "e.g., Diabetes, Hypertension")}
                        {renderPreferenceTextarea("medications" as keyof MealSuggestionPreferencesValues, "Medications", "e.g., Metformin, Lisinopril")}
                      </CardContent>
                    </Card>
                  </form>
                </Form>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <div className="mb-6 space-y-2">
            <Label htmlFor="meal-select" className="text-lg font-semibold text-primary">Choose a Meal:</Label>
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

          {isLoadingTargets && selectedMealName && (
            <div className="flex justify-center items-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="ml-2">Calculating targets for {selectedMealName}...</p>
            </div>
          )}

          {selectedMealName && !isLoadingTargets && targetMacros && (
            <>
              <div className="mb-6 p-4 border rounded-md bg-muted/50">
                <h3 className="text-lg font-semibold mb-2 text-primary">Target Macros for {targetMacros.mealName}:</h3>
                {isDemoMode && <p className="text-sm text-amber-600 dark:text-amber-400 mb-2">(Displaying example targets as profile is incomplete or direct calculation was not possible.)</p>}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <p><span className="font-medium">Calories:</span> {targetMacros.calories.toFixed(0)} kcal</p>
                  <p><span className="font-medium">Protein:</span> {targetMacros.protein.toFixed(1)} g</p>
                  <p><span className="font-medium">Carbs:</span> {targetMacros.carbs.toFixed(1)} g</p>
                  <p><span className="font-medium">Fat:</span> {targetMacros.fat.toFixed(1)} g</p>
                </div>
              </div>

              <Button onClick={handleGetSuggestions} disabled={isLoadingAiSuggestions || (isLoadingProfile && !isDemoMode)} size="lg" className="w-full md:w-auto">
                {isLoadingAiSuggestions ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Sparkles className="mr-2 h-5 w-5" />}
                {(isLoadingProfile && !isDemoMode) && !isLoadingAiSuggestions ? "Loading Profile..." : (isLoadingAiSuggestions ? "Getting Suggestions..." : "Get AI Meal Suggestions")}
              </Button>
              
              {error && (<p className="text-destructive mt-4"><AlertTriangle className="inline mr-1 h-4 w-4" />{error}</p>)}
            </>
          )}
        </CardContent>
      </Card>

      {isLoadingAiSuggestions && (
        <div className="flex justify-center items-center py-8">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="ml-3 text-lg">Fetching creative meal ideas...</p>
        </div>
      )}

      {suggestions.length > 0 && !isLoadingAiSuggestions && (
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-primary">Here are some ideas for your {selectedMealName || 'meal'}:</h2>
          {suggestions.map((suggestion, index) => (
            <Card key={index} className="shadow-md hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="text-xl">{suggestion.mealTitle}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-3">{suggestion.description}</p>
                <div className="mb-3">
                  <h4 className="font-semibold text-sm mb-1">Key Ingredients:</h4>
                  <ul className="list-disc list-inside text-sm text-muted-foreground">
                    {suggestion.keyIngredients.map((ing, i) => <li key={i}>{ing}</li>)}
                  </ul>
                </div>
                {suggestion.estimatedMacros && (
                   <div className="text-xs p-2 border rounded-md bg-muted/30">
                    <h4 className="font-semibold mb-1">Estimated Macros:</h4>
                    <p>Cals: {suggestion.estimatedMacros.calories.toFixed(0)}, Prot: {suggestion.estimatedMacros.protein.toFixed(1)}g, Carbs: {suggestion.estimatedMacros.carbs.toFixed(1)}g, Fat: {suggestion.estimatedMacros.fat.toFixed(1)}g</p>
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

    
