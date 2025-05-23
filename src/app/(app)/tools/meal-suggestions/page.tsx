
"use client";

import React, { useState, useEffect, Suspense, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Loader2, ChefHat, AlertTriangle, Sparkles } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { ProfileFormValues } from '@/lib/schemas';
import { suggestMealsForMacros, type SuggestMealsForMacrosInput, type SuggestMealsForMacrosOutput } from '@/ai/flows/suggest-meals-for-macros';
import { mealNames, defaultMacroPercentages } from '@/lib/constants';
import { calculateEstimatedDailyTargets } from '@/lib/nutrition-calculator';

async function getProfileDataForSuggestions(userId: string): Promise<Partial<ProfileFormValues>> {
  const storedProfile = localStorage.getItem(`nutriplan_profile_${userId}`);
  if (storedProfile) {
    try {
      const parsedProfile = JSON.parse(storedProfile) as ProfileFormValues;
      const arrayFields: (keyof ProfileFormValues)[] = [
        'preferredCuisines', 'dispreferredCuisines', 'preferredIngredients', 'dispreferredIngredients',
        'allergies', 'preferredMicronutrients', 'medicalConditions', 'medications',
        'injuries', 'surgeries', 'exerciseGoals', 'exercisePreferences', 'equipmentAccess'
      ];
      arrayFields.forEach(field => {
        if (parsedProfile[field] && typeof parsedProfile[field] === 'string') {
           (parsedProfile as any)[field] = (parsedProfile[field] as unknown as string).split(',').map((s: string) => s.trim()).filter((s: string) => s !== '');
        } else if (!Array.isArray(parsedProfile[field])) {
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

  const [profileData, setProfileData] = useState<Partial<ProfileFormValues> | null>(null);
  const [isLoadingAiSuggestions, setIsLoadingAiSuggestions] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isLoadingTargets, setIsLoadingTargets] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestMealsForMacrosOutput['suggestions']>([]);
  const [error, setError] = useState<string | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);

  // Fetch profile data on mount or when user changes
  useEffect(() => {
    if (user?.id) {
      setIsLoadingProfile(true);
      getProfileDataForSuggestions(user.id)
        .then(data => {
          setProfileData(data);
        })
        .catch(() => toast({title: "Error", description: "Could not load profile data.", variant: "destructive"}))
        .finally(() => setIsLoadingProfile(false));
    } else {
      setIsLoadingProfile(false);
    }
  }, [user, toast]);

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


  // Calculate target macros when selectedMealName or profileData changes
  const calculateTargetsForSelectedMeal = useCallback(() => {
    if (!selectedMealName) {
      setTargetMacros(null); // Clear targets if no meal is selected
      return;
    }

    if (isLoadingProfile) {
      setIsLoadingTargets(true); // Still waiting for profile
      return;
    }
    setIsLoadingTargets(true);

    if (profileData && profileData.age) { // Basic check for profile completeness
      const dailyTotals = calculateEstimatedDailyTargets(profileData);
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
         // Fallback to demo if calculation is not possible
        setTargetMacros({ mealName: selectedMealName, calories: 500, protein: 30, carbs: 60, fat: 20 }); // Example targets
        setIsDemoMode(true);
        if(!isDemoMode) toast({ title: "Using Example Targets", description: `Could not calculate specific targets for ${selectedMealName} from profile.`, duration: 4000 });
      }
    } else {
      // Profile incomplete, use generic demo targets for the selected meal
      setTargetMacros({ mealName: selectedMealName, calories: 500, protein: 30, carbs: 60, fat: 20 }); // Example targets
      setIsDemoMode(true);
      if(!isDemoMode) toast({ title: "Profile Incomplete", description: `Showing example targets for ${selectedMealName}. Please complete your profile for personalized calculations.`, duration: 5000 });
    }
    setSuggestions([]); // Clear previous suggestions
    setError(null);
    setIsLoadingTargets(false);
  }, [selectedMealName, profileData, toast, isLoadingProfile, isDemoMode]);

  useEffect(() => {
    // Only auto-calculate if targetMacros aren't already set from URL params for the current selectedMealName
    if (selectedMealName && (!targetMacros || targetMacros.mealName !== selectedMealName)) {
        calculateTargetsForSelectedMeal();
    }
  }, [selectedMealName, profileData, calculateTargetsForSelectedMeal, targetMacros]);


  const handleMealSelectionChange = (mealValue: string) => {
    setSelectedMealName(mealValue);
    // Target macros will be recalculated by the useEffect hook watching selectedMealName
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

    const aiInput: SuggestMealsForMacrosInput = {
      mealName: targetMacros.mealName,
      targetCalories: targetMacros.calories,
      targetProteinGrams: targetMacros.protein,
      targetCarbsGrams: targetMacros.carbs,
      targetFatGrams: targetMacros.fat,
      age: profileData?.age,
      gender: profileData?.gender,
      activityLevel: profileData?.activityLevel,
      dietGoal: profileData?.dietGoal,
      preferredDiet: profileData?.preferredDiet,
      preferredCuisines: profileData?.preferredCuisines,
      dispreferredCuisines: profileData?.dispreferredCuisines,
      preferredIngredients: profileData?.preferredIngredients,
      dispreferredIngredients: profileData?.dispreferredIngredients,
      allergies: profileData?.allergies,
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

  return (
    <div className="space-y-6">
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-3xl font-bold flex items-center">
            <ChefHat className="mr-3 h-8 w-8 text-primary" />
            AI Meal Suggestions
          </CardTitle>
          <CardDescription>
            Select a meal to get AI-powered ideas tailored to your macronutrient targets.
          </CardDescription>
        </CardHeader>
        <CardContent>
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
          <h2 className="text-2xl font-semibold text-primary">Here are some ideas for {selectedMealName}:</h2>
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

    