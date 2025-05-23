
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { MacroSplitterFormSchema, type MacroSplitterFormValues, type ProfileFormValues, type CalculatedMealMacros } from '@/lib/schemas';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { mealNames as defaultMealNames, defaultMacroPercentages } from '@/lib/constants';
import { Loader2, RefreshCw, Calculator, AlertTriangle, CheckCircle2, SplitSquareHorizontal, Lightbulb } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { calculateEstimatedDailyTargets } from '@/lib/nutrition-calculator';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface TotalMacros {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

// Helper function to fetch profile data (remains the same)
async function getProfileDataForMacroSplitter(userId: string): Promise<Partial<ProfileFormValues>> {
  console.log("Fetching profile for macro splitter, user:", userId);
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
      console.error("Error parsing stored profile data for macro splitter:", error);
      return {};
    }
  }
  return {};
}


function customMacroSplit(
  totalMacros: TotalMacros,
  mealMacroDistribution: MacroSplitterFormValues['mealDistributions']
): CalculatedMealMacros[] {
  return mealMacroDistribution.map(mealPct => ({
    mealName: mealPct.mealName,
    Calories: Math.round(totalMacros.calories * (mealPct.calories_pct / 100)),
    'Protein (g)': Math.round(totalMacros.protein_g * (mealPct.protein_pct / 100)),
    'Carbs (g)': Math.round(totalMacros.carbs_g * (mealPct.carbs_pct / 100)),
    'Fat (g)': Math.round(totalMacros.fat_g * (mealPct.fat_pct / 100)),
  }));
}


export default function MacroSplitterPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [dailyTargets, setDailyTargets] = useState<TotalMacros | null>(null);
  const [calculatedSplit, setCalculatedSplit] = useState<CalculatedMealMacros[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [profileData, setProfileData] = useState<Partial<ProfileFormValues> | null>(null);


  const form = useForm<MacroSplitterFormValues>({
    resolver: zodResolver(MacroSplitterFormSchema),
    defaultValues: {
      mealDistributions: defaultMealNames.map(name => ({
        mealName: name,
        calories_pct: defaultMacroPercentages[name]?.calories_pct || 0,
        protein_pct: defaultMacroPercentages[name]?.protein_pct || 0,
        carbs_pct: defaultMacroPercentages[name]?.carbs_pct || 0,
        fat_pct: defaultMacroPercentages[name]?.fat_pct || 0,
      })),
    },
  });

  const { fields } = useFieldArray({
    control: form.control,
    name: "mealDistributions",
  });

  const loadDataForSplitter = useCallback(async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const fetchedProfileData = await getProfileDataForMacroSplitter(user.id);
      setProfileData(fetchedProfileData); 
      if (fetchedProfileData.age && fetchedProfileData.gender && fetchedProfileData.currentWeight && fetchedProfileData.height && fetchedProfileData.activityLevel && fetchedProfileData.dietGoal) {
        const estimatedTargets = calculateEstimatedDailyTargets(fetchedProfileData);
        if (estimatedTargets.targetCalories && estimatedTargets.targetProtein && estimatedTargets.targetCarbs && estimatedTargets.targetFat) {
            setDailyTargets({
                calories: estimatedTargets.targetCalories,
                protein_g: estimatedTargets.targetProtein,
                carbs_g: estimatedTargets.targetCarbs,
                fat_g: estimatedTargets.targetFat,
            });
        } else {
             toast({ title: "Profile Incomplete for Calculation", description: "Could not calculate daily totals from your profile. Please ensure all basic info, activity level, and diet goal are set.", variant: "destructive", duration: 5000});
             setDailyTargets(null); 
        }
      } else {
        toast({ title: "Profile Incomplete", description: "Your user profile is incomplete. Please fill it out to calculate daily totals for the Macro Splitter.", variant: "destructive", duration: 5000 });
        setDailyTargets(null); 
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to load data for macro splitter.", variant: "destructive" });
      setDailyTargets(null);
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    loadDataForSplitter();
  }, [loadDataForSplitter]);

  const onSubmit = (data: MacroSplitterFormValues) => {
    if (!dailyTargets) {
      toast({ title: "Error", description: "Daily macro totals not available. Please ensure your profile is complete.", variant: "destructive" });
      return;
    }
    const result = customMacroSplit(dailyTargets, data.mealDistributions);
    setCalculatedSplit(result);
    toast({ title: "Calculation Complete", description: "Macro split calculated successfully." });
  };

  const handleReset = () => {
    form.reset({
      mealDistributions: defaultMealNames.map(name => ({
        mealName: name,
        calories_pct: defaultMacroPercentages[name]?.calories_pct || 0,
        protein_pct: defaultMacroPercentages[name]?.protein_pct || 0,
        carbs_pct: defaultMacroPercentages[name]?.carbs_pct || 0,
        fat_pct: defaultMacroPercentages[name]?.fat_pct || 0,
      })),
    });
    setCalculatedSplit(null);
  };

  const handleSuggestMeals = (mealData: CalculatedMealMacros) => {
    const queryParams = new URLSearchParams({
      mealName: mealData.mealName,
      calories: mealData.Calories.toString(),
      protein: mealData['Protein (g)'].toString(),
      carbs: mealData['Carbs (g)'].toString(),
      fat: mealData['Fat (g)'].toString(),
    }).toString();
    router.push(`/tools/meal-suggestions?${queryParams}`);
  };
  
  const watchedMealDistributions = form.watch("mealDistributions");

  const calculateColumnSum = (macroKey: keyof Omit<MacroSplitterFormValues['mealDistributions'][0], 'mealName'>) => {
    return watchedMealDistributions.reduce((sum, meal) => sum + (Number(meal[macroKey]) || 0), 0);
  };

  const columnSums = {
    calories_pct: calculateColumnSum('calories_pct'),
    protein_pct: calculateColumnSum('protein_pct'),
    carbs_pct: calculateColumnSum('carbs_pct'),
    fat_pct: calculateColumnSum('fat_pct'),
  };

  const macroLabels = {
    calories_pct: '% Calories',
    protein_pct: '% Protein',
    carbs_pct: '% Carbs',
    fat_pct: '% Fat',
  };
  
  const macroPctKeys = Object.keys(macroLabels) as (keyof typeof macroLabels)[];

  const calculatedValueLabels = {
    calc_calories: "Calc. Calories",
    calc_protein_g: "Calc. Protein (g)",
    calc_carbs_g: "Calc. Carbs (g)",
    calc_fat_g: "Calc. Fat (g)",
  };
  const calculatedValueKeys = Object.keys(calculatedValueLabels) as (keyof typeof calculatedValueLabels)[];


  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg">Loading data...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl font-bold flex items-center">
            <SplitSquareHorizontal className="mr-3 h-8 w-8 text-primary" />
            Macro Splitter Tool
          </CardTitle>
          <CardDescription>
            Distribute your total daily macros across your meals by percentage. Totals are derived from your user profile.
          </CardDescription>
        </CardHeader>
        {dailyTargets ? (
          <CardContent>
            <h3 className="text-xl font-semibold mb-2 text-primary">Your Estimated Total Daily Macros:</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 border rounded-md bg-muted/50 mb-6">
              <p><span className="font-medium">Calories:</span> {dailyTargets.calories.toFixed(0)} kcal</p>
              <p><span className="font-medium">Protein:</span> {dailyTargets.protein_g.toFixed(1)} g</p>
              <p><span className="font-medium">Carbs:</span> {dailyTargets.carbs_g.toFixed(1)} g</p>
              <p><span className="font-medium">Fat:</span> {dailyTargets.fat_g.toFixed(1)} g</p>
            </div>
          </CardContent>
        ) : (
          <CardContent>
            <p className="text-destructive text-center p-4 border border-destructive/50 rounded-md bg-destructive/10">
              Could not load or calculate your total daily macros. Please ensure your profile is complete by visiting the <Link href="/profile" className="underline hover:text-destructive/80">Profile page</Link>.
            </p>
          </CardContent>
        )}
      </Card>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl">Meal Macro Percentage & Value Distribution</CardTitle>
              <CardDescription>Enter percentages. Each percentage column must sum to 100%. Calculated values update live.</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="w-full">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[150px] sticky left-0 bg-background z-10">Meal</TableHead>
                      {macroPctKeys.map(key => <TableHead key={key} className="text-right min-w-[120px]">{macroLabels[key]}</TableHead>)}
                      {calculatedValueKeys.map(key => <TableHead key={key} className="text-right min-w-[120px]">{calculatedValueLabels[key]}</TableHead>)}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fields.map((field, index) => {
                      const currentPercentages = watchedMealDistributions[index];
                      let mealCalories = NaN, mealProteinGrams = NaN, mealCarbsGrams = NaN, mealFatGrams = NaN;

                      if (dailyTargets && currentPercentages) {
                        mealCalories = dailyTargets.calories * ((currentPercentages.calories_pct || 0) / 100);
                        mealProteinGrams = dailyTargets.protein_g * ((currentPercentages.protein_pct || 0) / 100);
                        mealCarbsGrams = dailyTargets.carbs_g * ((currentPercentages.carbs_pct || 0) / 100);
                        mealFatGrams = dailyTargets.fat_g * ((currentPercentages.fat_pct || 0) / 100);
                      }
                      
                      return (
                        <TableRow key={field.id}>
                          <TableCell className="font-medium sticky left-0 bg-background z-10">{field.mealName}</TableCell>
                          {macroPctKeys.map(macroKey => (
                            <TableCell key={macroKey} className="text-right">
                              <FormField
                                control={form.control}
                                name={`mealDistributions.${index}.${macroKey}`}
                                render={({ field: itemField }) => (
                                  <FormItem className="inline-block w-20">
                                    <FormControl>
                                      <Input
                                        type="number"
                                        {...itemField}
                                        value={itemField.value ?? 0}
                                        onChange={e => itemField.onChange(parseFloat(e.target.value) || 0)}
                                        className="text-right tabular-nums"
                                        min="0"
                                        max="100"
                                      />
                                    </FormControl>
                                    <FormMessage /> 
                                  </FormItem>
                                )}
                              />
                            </TableCell>
                          ))}
                          <TableCell className="text-right tabular-nums">{isNaN(mealCalories) ? 'N/A' : mealCalories.toFixed(0)}</TableCell>
                          <TableCell className="text-right tabular-nums">{isNaN(mealProteinGrams) ? 'N/A' : mealProteinGrams.toFixed(1)}</TableCell>
                          <TableCell className="text-right tabular-nums">{isNaN(mealCarbsGrams) ? 'N/A' : mealCarbsGrams.toFixed(1)}</TableCell>
                          <TableCell className="text-right tabular-nums">{isNaN(mealFatGrams) ? 'N/A' : mealFatGrams.toFixed(1)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                  <TableFooter>
                    <TableRow className="font-semibold">
                      <TableCell className="sticky left-0 bg-background z-10">Input % Totals:</TableCell>
                      {macroPctKeys.map(key => {
                          const sum = columnSums[key];
                          const isSum100 = Math.round(sum) === 100;
                          return (
                              <TableCell key={`sum-${key}`} className={`text-right ${isSum100 ? 'text-green-600' : 'text-destructive'}`}>
                                  {sum.toFixed(1)}%
                                  {isSum100 ? <CheckCircle2 className="ml-1 h-4 w-4 inline-block" /> : <AlertTriangle className="ml-1 h-4 w-4 inline-block" />}
                              </TableCell>
                          );
                      })}
                      <TableCell colSpan={4}></TableCell> 
                    </TableRow>
                    <TableRow className="font-semibold">
                       <TableCell className="sticky left-0 bg-background z-10">Calculated Value Totals:</TableCell>
                       <TableCell colSpan={4}></TableCell>
                       {dailyTargets ? (
                        <>
                          <TableCell className="text-right tabular-nums">
                            {watchedMealDistributions.reduce((sum, meal) => sum + (dailyTargets.calories * ((meal.calories_pct || 0) / 100)), 0).toFixed(0)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {watchedMealDistributions.reduce((sum, meal) => sum + (dailyTargets.protein_g * ((meal.protein_pct || 0) / 100)), 0).toFixed(1)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {watchedMealDistributions.reduce((sum, meal) => sum + (dailyTargets.carbs_g * ((meal.carbs_pct || 0) / 100)), 0).toFixed(1)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {watchedMealDistributions.reduce((sum, meal) => sum + (dailyTargets.fat_g * ((meal.fat_pct || 0) / 100)), 0).toFixed(1)}
                          </TableCell>
                        </>
                       ) : (
                        <TableCell colSpan={4} className="text-right">N/A</TableCell>
                       )}
                    </TableRow>
                  </TableFooter>
                </Table>
              </ScrollArea>
              {form.formState.errors.mealDistributions?.root?.message && (
                <p className="text-sm font-medium text-destructive mt-2">
                    {form.formState.errors.mealDistributions.root.message}
                </p>
              )}
            </CardContent>
          </Card>
          
          <div className="flex space-x-4 mt-6">
            <Button type="submit" className="flex-1 text-lg py-3" disabled={!dailyTargets || form.formState.isSubmitting || isLoading}>
              <Calculator className="mr-2 h-5 w-5" />
              {form.formState.isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
              Save & Show Final Split
            </Button>
            <Button type="button" variant="outline" onClick={handleReset} className="flex-1 text-lg py-3">
              <RefreshCw className="mr-2 h-5 w-5" /> Reset
            </Button>
          </div>
        </form>
      </Form>

      {calculatedSplit && (
        <Card className="shadow-lg mt-8">
          <CardHeader>
            <CardTitle className="text-2xl">Final Meal Macros (Snapshot)</CardTitle>
            <CardDescription>This was the calculated split when you last clicked "Save & Show Final Split".</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[150px] sticky left-0 bg-background z-10">Meal</TableHead>
                  <TableHead className="text-right">Calories (kcal)</TableHead>
                  <TableHead className="text-right">Protein (g)</TableHead>
                  <TableHead className="text-right">Carbs (g)</TableHead>
                  <TableHead className="text-right">Fat (g)</TableHead>
                  <TableHead className="text-right w-[180px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {calculatedSplit.map((mealData) => (
                  <TableRow key={mealData.mealName}>
                    <TableCell className="font-medium sticky left-0 bg-background z-10">{mealData.mealName}</TableCell>
                    <TableCell className="text-right tabular-nums">{mealData.Calories}</TableCell>
                    <TableCell className="text-right tabular-nums">{mealData['Protein (g)']}</TableCell>
                    <TableCell className="text-right tabular-nums">{mealData['Carbs (g)']}</TableCell>
                    <TableCell className="text-right tabular-nums">{mealData['Fat (g)']}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSuggestMeals(mealData)}
                      >
                        <Lightbulb className="mr-2 h-4 w-4" /> Suggest Meals
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-semibold border-t-2">
                    <TableCell className="sticky left-0 bg-background z-10">Total</TableCell>
                    <TableCell className="text-right tabular-nums">{calculatedSplit.reduce((sum, meal) => sum + meal.Calories, 0)}</TableCell>
                    <TableCell className="text-right tabular-nums">{calculatedSplit.reduce((sum, meal) => sum + meal['Protein (g)'], 0)}</TableCell>
                    <TableCell className="text-right tabular-nums">{calculatedSplit.reduce((sum, meal) => sum + meal['Carbs (g)'], 0)}</TableCell>
                    <TableCell className="text-right tabular-nums">{calculatedSplit.reduce((sum, meal) => sum + meal['Fat (g)'], 0)}</TableCell>
                    <TableCell></TableCell>
                </TableRow>
              </TableBody>
            </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

    

    