
"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Loader2, ChefHat, AlertTriangle, Sparkles } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { ProfileFormValues } from '@/lib/schemas';
import { suggestMealsForMacros, type SuggestMealsForMacrosInput, type SuggestMealsForMacrosOutput } from '@/ai/flows/suggest-meals-for-macros'; // Adjust path as needed

async function getProfileDataForSuggestions(userId: string): Promise<Partial<ProfileFormValues>> {
  const storedProfile = localStorage.getItem(`nutriplan_profile_${userId}`);
  if (storedProfile) {
    try {
      return JSON.parse(storedProfile) as ProfileFormValues;
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

  const [targetMacros, setTargetMacros] = useState<{
    mealName: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  } | null>(null);

  const [profileData, setProfileData] = useState<Partial<ProfileFormValues> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [suggestions, setSuggestions] = useState<SuggestMealsForMacrosOutput['suggestions']>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const mealName = searchParams.get('mealName');
    const calories = searchParams.get('calories');
    const protein = searchParams.get('protein');
    const carbs = searchParams.get('carbs');
    const fat = searchParams.get('fat');

    if (mealName && calories && protein && carbs && fat) {
      setTargetMacros({
        mealName,
        calories: parseFloat(calories),
        protein: parseFloat(protein),
        carbs: parseFloat(carbs),
        fat: parseFloat(fat),
      });
    } else {
      setError("Missing required meal macro information in URL.");
    }

    if (user?.id) {
      setIsLoadingProfile(true);
      getProfileDataForSuggestions(user.id)
        .then(data => {
          setProfileData(data);
          if (!data.age) { // Simple check for incomplete profile
            toast({
              title: "Profile Incomplete",
              description: "For best suggestions, please complete your user profile.",
              variant: "default",
              duration: 5000
            });
          }
        })
        .catch(() => {
          toast({title: "Error", description: "Could not load profile data.", variant: "destructive"})
        })
        .finally(() => setIsLoadingProfile(false));
    } else {
        setIsLoadingProfile(false);
    }

  }, [searchParams, user, toast]);

  const handleGetSuggestions = async () => {
    if (!targetMacros) {
      toast({title: "Error", description: "Target macros not loaded.", variant: "destructive"});
      return;
    }
    if (!user || isLoadingProfile) {
        toast({title: "Please wait", description: "User profile is still loading or not available.", variant: "default"});
        return;
    }

    setIsLoading(true);
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
      // Placeholder for AI call
      // const result = await suggestMealsForMacros(aiInput);
      // setSuggestions(result.suggestions);
      
      // Mock AI call
      await new Promise(resolve => setTimeout(resolve, 1500));
      const mockSuggestions: SuggestMealsForMacrosOutput['suggestions'] = [
        {
          mealTitle: "Protein-Packed Oatmeal",
          description: "A hearty bowl of oatmeal with protein powder, berries, and nuts. Perfectly balanced for your morning energy and muscle recovery.",
          keyIngredients: ["Rolled Oats", "Protein Powder", "Mixed Berries", "Almonds"],
          estimatedMacros: { calories: targetMacros.calories * 0.95, protein: targetMacros.protein * 1.0, carbs: targetMacros.carbs * 0.9, fat: targetMacros.fat * 0.9 }
        },
        {
          mealTitle: "Quick Chicken & Veggie Stir-fry",
          description: "Lean chicken breast stir-fried with colorful vegetables in a light soy-ginger sauce. Quick, easy, and hits your macro targets.",
          keyIngredients: ["Chicken Breast", "Broccoli", "Bell Peppers", "Soy Sauce", "Ginger"],
          estimatedMacros: { calories: targetMacros.calories * 1.02, protein: targetMacros.protein * 0.98, carbs: targetMacros.carbs * 1.05, fat: targetMacros.fat * 1.0 }
        },
      ];
      setSuggestions(mockSuggestions);

    } catch (err) {
      console.error("Error getting meal suggestions:", err);
      setError("Failed to fetch meal suggestions. Please try again.");
      toast({title: "AI Error", description: "Could not get meal suggestions from AI.", variant: "destructive"});
    } finally {
      setIsLoading(false);
    }
  };

  if (error) {
    return (
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl text-destructive flex items-center">
            <AlertTriangle className="mr-2 h-6 w-6" /> Error Loading Page
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p>{error}</p>
          <Button onClick={() => window.history.back()} className="mt-4">Go Back</Button>
        </CardContent>
      </Card>
    );
  }

  if (!targetMacros) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Loading meal data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-3xl font-bold flex items-center">
            <ChefHat className="mr-3 h-8 w-8 text-primary" />
            AI Meal Suggestions for {targetMacros.mealName}
          </CardTitle>
          <CardDescription>
            Get AI-powered meal ideas tailored to your specific macronutrient targets for this meal.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6 p-4 border rounded-md bg-muted/50">
            <h3 className="text-lg font-semibold mb-2 text-primary">Target Macros for this {targetMacros.mealName}:</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <p><span className="font-medium">Calories:</span> {targetMacros.calories.toFixed(0)} kcal</p>
              <p><span className="font-medium">Protein:</span> {targetMacros.protein.toFixed(1)} g</p>
              <p><span className="font-medium">Carbs:</span> {targetMacros.carbs.toFixed(1)} g</p>
              <p><span className="font-medium">Fat:</span> {targetMacros.fat.toFixed(1)} g</p>
            </div>
          </div>

          <Button onClick={handleGetSuggestions} disabled={isLoading || isLoadingProfile} size="lg" className="w-full md:w-auto">
            {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Sparkles className="mr-2 h-5 w-5" />}
            {isLoadingProfile && !isLoading ? "Loading Profile..." : (isLoading ? "Getting Suggestions..." : "Get AI Meal Suggestions")}
          </Button>
        </CardContent>
      </Card>

      {isLoading && (
        <div className="flex justify-center items-center py-8">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="ml-3 text-lg">Fetching creative meal ideas...</p>
        </div>
      )}

      {suggestions.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-primary">Here are some ideas:</h2>
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
    // Suspense is necessary because useSearchParams() suspends rendering
    <Suspense fallback={<div className="flex justify-center items-center h-screen"><Loader2 className="h-12 w-12 animate-spin text-primary" /><p className="ml-4 text-lg">Loading...</p></div>}>
      <MealSuggestionsContent />
    </Suspense>
  );
}
