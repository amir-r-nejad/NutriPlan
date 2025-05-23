
"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import { Pencil, PlusCircle, Trash2, Wand2, Loader2 } from 'lucide-react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { daysOfWeek, mealNames, defaultMacroPercentages } from '@/lib/constants';
import type { Meal, DailyMealPlan, WeeklyMealPlan, Ingredient, ProfileFormValues } from '@/lib/schemas';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { calculateEstimatedDailyTargets } from '@/lib/nutrition-calculator';
import { adjustMealIngredients, type AdjustMealIngredientsInput } from '@/ai/flows/adjust-meal-ingredients';

// Mock function to get profile data - replace with actual API call
async function getProfileDataForOptimization(userId: string): Promise<Partial<ProfileFormValues>> {
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
      console.error("Error parsing stored profile data:", error);
      return {};
    }
  }
  return {};
}


// Mock data for current meal plan
const initialWeeklyPlan: WeeklyMealPlan = {
  days: daysOfWeek.map(day => ({
    dayOfWeek: day,
    meals: mealNames.map(mealName => {
      let customName = "";
      let ingredients: Ingredient[] = [];
      let totalCalories = 0;
      let totalProtein = 0;
      let totalCarbs = 0;
      let totalFat = 0;

      if (day === "Monday") {
        if (mealName === "Lunch") {
          customName = "Chicken Salad";
          ingredients = [
            { name: "Chicken Breast", quantity: 100, unit: "g", calories: 165, protein: 31, carbs: 0, fat: 3.6 },
            { name: "Lettuce", quantity: 50, unit: "g", calories: 7, protein: 0.5, carbs: 1.5, fat: 0.1 },
            { name: "Tomato", quantity: 30, unit: "g", calories: 5, protein: 0.2, carbs: 1.2, fat: 0.1 },
          ];
          totalCalories = 177;
          totalProtein = 31.7;
          totalCarbs = 2.7;
          totalFat = 3.8;
        } else if (mealName === "Afternoon Snack") {
            customName = "Apple Slices with Peanut Butter";
            ingredients = [
                { name: "Apple", quantity: 1, unit: "medium", calories: 95, protein: 0.5, carbs: 25, fat: 0.3 },
                { name: "Peanut Butter", quantity: 32, unit: "g", calories: 190, protein: 8, carbs: 7, fat: 16 }
            ];
            totalCalories = 285; totalProtein = 8.5; totalCarbs = 32; totalFat = 16.3;
        } else if (mealName === "Dinner") {
            customName = "Salmon & Asparagus";
            ingredients = [
                { name: "Salmon Fillet", quantity: 150, unit: "g", calories: 312, protein: 30, carbs: 0, fat: 20.4 },
                { name: "Asparagus", quantity: 100, unit: "g", calories: 20, protein: 2.2, carbs: 3.9, fat: 0.1 },
                { name: "Olive Oil", quantity: 5, unit: "ml", calories: 40, protein: 0, carbs: 0, fat: 4.5 },
            ];
            totalCalories = 372; totalProtein = 32.2; totalCarbs = 3.9; totalFat = 24.9;
        } else if (mealName === "Evening Snack") {
            customName = "Greek Yogurt with Berries";
            ingredients = [
                { name: "Greek Yogurt", quantity: 150, unit: "g", calories: 150, protein: 15, carbs: 6, fat: 8 },
                { name: "Mixed Berries", quantity: 50, unit: "g", calories: 25, protein: 0.5, carbs: 6, fat: 0.2 },
            ];
            totalCalories = 175; totalProtein = 15.5; totalCarbs = 12; totalFat = 8.2;
        }
      }

      return {
        name: mealName,
        customName,
        ingredients,
        totalCalories,
        totalProtein,
        totalCarbs,
        totalFat,
      };
    }),
  })),
};


export default function CurrentMealPlanPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyMealPlan>(initialWeeklyPlan);
  const [editingMeal, setEditingMeal] = useState<{dayIndex: number, mealIndex: number, meal: Meal} | null>(null);
  const [optimizingMealKey, setOptimizingMealKey] = useState<string | null>(null); // e.g., "Monday-Lunch-2"
  const [profileData, setProfileData] = useState<Partial<ProfileFormValues> | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  useEffect(() => {
    if (user?.id) {
      setIsLoadingProfile(true);
      getProfileDataForOptimization(user.id)
        .then(data => {
          setProfileData(data);
        })
        .catch(() => toast({ title: "Error", description: "Could not load profile data for optimization.", variant: "destructive" }))
        .finally(() => setIsLoadingProfile(false));
    } else {
      setIsLoadingProfile(false);
    }
  }, [user, toast]);


  const handleEditMeal = (dayIndex: number, mealIndex: number) => {
    setEditingMeal({dayIndex, mealIndex, meal: {...weeklyPlan.days[dayIndex].meals[mealIndex]}});
  };

  const handleSaveMeal = (updatedMeal: Meal) => {
    if (!editingMeal) return;
    const newWeeklyPlan = {...weeklyPlan};
    newWeeklyPlan.days[editingMeal.dayIndex].meals[editingMeal.mealIndex] = updatedMeal;
    setWeeklyPlan(newWeeklyPlan);
    setEditingMeal(null);
  };

  const handleOptimizeMeal = async (dayIndex: number, mealIndex: number) => {
    const mealToOptimize = weeklyPlan.days[dayIndex].meals[mealIndex];
    const mealKey = `${weeklyPlan.days[dayIndex].dayOfWeek}-${mealToOptimize.name}-${mealIndex}`;
    setOptimizingMealKey(mealKey);

    if (!profileData || Object.keys(profileData).length === 0) {
      toast({ title: "Profile Missing", description: "Please complete your user profile for AI optimization.", variant: "destructive" });
      setOptimizingMealKey(null);
      return;
    }
     if (isLoadingProfile) {
      toast({ title: "Loading", description: "Profile data is still loading. Please wait.", variant: "default" });
      setOptimizingMealKey(null);
      return;
    }

    try {
      const dailyTotals = calculateEstimatedDailyTargets(profileData);
      if (!dailyTotals.targetCalories || !dailyTotals.targetProtein || !dailyTotals.targetCarbs || !dailyTotals.targetFat) {
        toast({ title: "Calculation Error", description: "Could not calculate daily targets from profile. Ensure profile is complete.", variant: "destructive" });
        setOptimizingMealKey(null);
        return;
      }

      const mealDistribution = defaultMacroPercentages[mealToOptimize.name] || { calories_pct: 0, protein_pct: 0, carbs_pct: 0, fat_pct: 0 };

      const targetMacrosForMeal = {
        calories: Math.round(dailyTotals.targetCalories * (mealDistribution.calories_pct / 100)),
        protein: Math.round(dailyTotals.targetProtein * (mealDistribution.protein_pct / 100)),
        carbs: Math.round(dailyTotals.targetCarbs * (mealDistribution.carbs_pct / 100)),
        fat: Math.round(dailyTotals.targetFat * (mealDistribution.fat_pct / 100)),
      };
      
      // Ensure all ingredient macros are numbers, defaulting to 0 if undefined/null
      const preparedIngredients = mealToOptimize.ingredients.map(ing => ({
        ...ing,
        calories: Number(ing.calories) || 0,
        protein: Number(ing.protein) || 0,
        carbs: Number(ing.carbs) || 0,
        fat: Number(ing.fat) || 0,
      }));

      const aiInput: AdjustMealIngredientsInput = {
        originalMeal: {
            ...mealToOptimize,
            ingredients: preparedIngredients,
            totalCalories: Number(mealToOptimize.totalCalories) || 0,
            totalProtein: Number(mealToOptimize.totalProtein) || 0,
            totalCarbs: Number(mealToOptimize.totalCarbs) || 0,
            totalFat: Number(mealToOptimize.totalFat) || 0,
        },
        targetMacros: targetMacrosForMeal,
        userProfile: {
          age: profileData.age,
          gender: profileData.gender,
          activityLevel: profileData.activityLevel,
          dietGoal: profileData.dietGoal,
          preferredDiet: profileData.preferredDiet,
          allergies: profileData.allergies,
          dispreferredIngredients: profileData.dispreferredIngredients,
          preferredIngredients: profileData.preferredIngredients,
        }
      };

      const result = await adjustMealIngredients(aiInput);

      if (result.adjustedMeal) {
        const newWeeklyPlan = { ...weeklyPlan };
        newWeeklyPlan.days[dayIndex].meals[mealIndex] = result.adjustedMeal;
        setWeeklyPlan(newWeeklyPlan);
        toast({ title: `Meal Optimized: ${mealToOptimize.name}`, description: result.explanation || "AI has adjusted the ingredients." });
      } else {
        throw new Error("AI did not return an adjusted meal.");
      }

    } catch (error) {
      console.error("Error optimizing meal:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      toast({ title: "Optimization Failed", description: `Could not optimize meal: ${errorMessage}`, variant: "destructive" });
    } finally {
      setOptimizingMealKey(null);
    }
  };


  return (
    <div className="container mx-auto py-8">
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-3xl font-bold">Your Current Weekly Meal Plan</CardTitle>
          <CardDescription>View and manage your meals for the week. Click on a meal to edit or optimize with AI.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue={daysOfWeek[0]} className="w-full">
            <ScrollArea className="w-full whitespace-nowrap rounded-md">
              <TabsList className="inline-flex h-auto">
                {daysOfWeek.map(day => (
                  <TabsTrigger key={day} value={day} className="px-4 py-2 text-base">{day}</TabsTrigger>
                ))}
              </TabsList>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
            
            {weeklyPlan.days.map((dayPlan, dayIndex) => (
              <TabsContent key={dayPlan.dayOfWeek} value={dayPlan.dayOfWeek} className="mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {dayPlan.meals.map((meal, mealIndex) => {
                    const mealKey = `${dayPlan.dayOfWeek}-${meal.name}-${mealIndex}`;
                    const isOptimizing = optimizingMealKey === mealKey;
                    return (
                      <Card key={mealKey} className="flex flex-col">
                        <CardHeader>
                          <CardTitle className="text-xl">{meal.name}</CardTitle>
                          {meal.customName && <CardDescription>{meal.customName}</CardDescription>}
                        </CardHeader>
                        <CardContent className="flex-grow">
                          {meal.ingredients.length > 0 ? (
                            <ul className="space-y-1 text-sm text-muted-foreground">
                              {meal.ingredients.map((ing, ingIndex) => (
                                <li key={ingIndex}>{ing.name} - {ing.quantity}{ing.unit}</li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-sm text-muted-foreground italic">No ingredients added yet.</p>
                          )}
                          <div className="mt-2 text-xs space-y-0.5">
                              <p>Calories: {meal.totalCalories?.toFixed(0) ?? 'N/A'}</p>
                              <p>Protein: {meal.totalProtein?.toFixed(1) ?? 'N/A'}g</p>
                              <p>Carbs: {meal.totalCarbs?.toFixed(1) ?? 'N/A'}g</p>
                              <p>Fat: {meal.totalFat?.toFixed(1) ?? 'N/A'}g</p>
                          </div>
                        </CardContent>
                        <CardFooter className="border-t pt-4 flex-wrap gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleEditMeal(dayIndex, mealIndex)} disabled={isOptimizing}>
                            <Pencil className="mr-2 h-4 w-4" /> Edit Meal
                          </Button>
                          <Button variant="default" size="sm" onClick={() => handleOptimizeMeal(dayIndex, mealIndex)} disabled={isOptimizing || isLoadingProfile}>
                            {isOptimizing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                            {isOptimizing ? 'Optimizing...' : 'Optimize Meal'}
                          </Button>
                        </CardFooter>
                      </Card>
                    );
                  })}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {editingMeal && (
        <EditMealDialog
          meal={editingMeal.meal}
          onSave={handleSaveMeal}
          onClose={() => setEditingMeal(null)}
        />
      )}
    </div>
  );
}


interface EditMealDialogProps {
  meal: Meal;
  onSave: (updatedMeal: Meal) => void;
  onClose: () => void;
}

function EditMealDialog({ meal: initialMeal, onSave, onClose }: EditMealDialogProps) {
  const [meal, setMeal] = useState<Meal>({...initialMeal});

  const handleIngredientChange = (index: number, field: keyof Meal['ingredients'][0], value: string | number) => {
    const newIngredients = [...meal.ingredients];
    const targetIngredient = { ...newIngredients[index] };
    
    if (field === 'quantity' || field === 'calories' || field === 'protein' || field === 'carbs' || field === 'fat') {
        (targetIngredient as any)[field] = value === '' ? undefined : Number(value);
    } else {
        (targetIngredient as any)[field] = value;
    }
    newIngredients[index] = targetIngredient;
    setMeal(prev => ({ ...prev, ingredients: newIngredients }));
  };

  const addIngredient = () => {
    setMeal(prev => ({
      ...prev,
      ingredients: [...prev.ingredients, { name: '', quantity: 0, unit: 'g', calories: undefined, protein: undefined, carbs: undefined, fat: undefined }]
    }));
  };
  
  const removeIngredient = (index: number) => {
    setMeal(prev => ({
      ...prev,
      ingredients: prev.ingredients.filter((_, i) => i !== index)
    }));
  };

  const calculateTotals = () => {
    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;

    meal.ingredients.forEach(ing => {
        const quantity = Number(ing.quantity) || 0;
        const calories = Number(ing.calories) || 0;
        const protein = Number(ing.protein) || 0;
        const carbs = Number(ing.carbs) || 0;
        const fat = Number(ing.fat) || 0;

        // Assumption: macros in IngredientSchema are TOTAL for the given quantity.
        // If they were per 100g, logic here would need to adjust.
        // For example, if ing.unit is 'g' and calories are per 100g:
        // totalCalories += (calories / 100) * quantity;
        // But current schema implies calories are total for 'quantity'.
        totalCalories += calories;
        totalProtein += protein;
        totalCarbs += carbs;
        totalFat += fat;
    });
    setMeal(prev => ({...prev, totalCalories, totalProtein, totalCarbs, totalFat}));
  }


  const handleSubmit = () => {
    // Recalculate totals just before saving to ensure they are based on the latest ingredient data
    let finalTotalCalories = 0;
    let finalTotalProtein = 0;
    let finalTotalCarbs = 0;
    let finalTotalFat = 0;

    meal.ingredients.forEach(ing => {
        finalTotalCalories += Number(ing.calories) || 0;
        finalTotalProtein += Number(ing.protein) || 0;
        finalTotalCarbs += Number(ing.carbs) || 0;
        finalTotalFat += Number(ing.fat) || 0;
    });
    
    const mealToSave = {
        ...meal,
        totalCalories: finalTotalCalories,
        totalProtein: finalTotalProtein,
        totalCarbs: finalTotalCarbs,
        totalFat: finalTotalFat,
    };
    onSave(mealToSave);
  };


  return (
    <Dialog open={true} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-2xl"> {/* Increased width */}
        <DialogHeader>
          <DialogTitle>Edit {initialMeal.name}{initialMeal.customName ? ` - ${initialMeal.customName}` : ''}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-2"> {/* Added padding-right for scrollbar */}
          <div>
            <Label htmlFor="customMealName">Meal Name (e.g., Chicken Salad)</Label>
            <Input 
              id="customMealName" 
              value={meal.customName || ''} 
              onChange={(e) => setMeal({...meal, customName: e.target.value})}
              placeholder="Optional: e.g., Greek Yogurt with Berries"
            />
          </div>
          <Label>Ingredients</Label>
          {meal.ingredients.map((ing, index) => (
            <Card key={index} className="p-3 space-y-2">
              <div className="flex justify-between items-center gap-2">
                <Input 
                  placeholder="Ingredient Name" 
                  value={ing.name} 
                  onChange={(e) => handleIngredientChange(index, 'name', e.target.value)}
                  className="flex-grow"
                />
                <Button variant="ghost" size="icon" onClick={() => removeIngredient(index)} className="shrink-0">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                <Input 
                  type="number" 
                  placeholder="Qty" 
                  value={ing.quantity ?? ''} 
                  onChange={(e) => handleIngredientChange(index, 'quantity', e.target.value)}
                />
                <Input 
                  placeholder="Unit (g, ml, item)" 
                  value={ing.unit} 
                  onChange={(e) => handleIngredientChange(index, 'unit', e.target.value)}
                />
                 <div className="col-span-2 md:col-span-1 text-xs text-muted-foreground pt-2">
                    (Total for this quantity)
                 </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                 <Input type="number" placeholder="Cals" value={ing.calories ?? ''} onChange={(e) => handleIngredientChange(index, 'calories', e.target.value)} />
                 <Input type="number" placeholder="Protein (g)" value={ing.protein ?? ''} onChange={(e) => handleIngredientChange(index, 'protein', e.target.value)} />
                 <Input type="number" placeholder="Carbs (g)" value={ing.carbs ?? ''} onChange={(e) => handleIngredientChange(index, 'carbs', e.target.value)} />
                 <Input type="number" placeholder="Fat (g)" value={ing.fat ?? ''} onChange={(e) => handleIngredientChange(index, 'fat', e.target.value)} />
              </div>
            </Card>
          ))}
          <Button variant="outline" onClick={addIngredient} className="w-full">
            <PlusCircle className="mr-2 h-4 w-4" /> Add Ingredient
          </Button>

          <div className="mt-4 p-3 border rounded-md bg-muted/50">
            <h4 className="font-semibold mb-1">Calculated Totals:</h4>
            <p className="text-sm">Calories: {meal.totalCalories?.toFixed(0) ?? 'N/A'}</p>
            <p className="text-sm">Protein: {meal.totalProtein?.toFixed(1) ?? 'N/A'}g</p>
            <p className="text-sm">Carbs: {meal.totalCarbs?.toFixed(1) ?? 'N/A'}g</p>
            <p className="text-sm">Fat: {meal.totalFat?.toFixed(1) ?? 'N/A'}g</p>
             <Button onClick={calculateTotals} size="sm" variant="ghost" className="mt-1 text-xs">Recalculate Manually</Button>
          </div>

        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          </DialogClose>
          <Button type="button" onClick={handleSubmit}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
