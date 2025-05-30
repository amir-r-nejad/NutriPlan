
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { MacroSplitterFormSchema, type MacroSplitterFormValues, type FullProfileType, type CalculatedMealMacros, type MealMacroDistribution, type GlobalCalculatedTargets, type MacroResults } from '@/lib/schemas';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { mealNames as defaultMealNames, defaultMacroPercentages } from '@/lib/constants';
import { Loader2, RefreshCw, Calculator, AlertTriangle, CheckCircle2, SplitSquareHorizontal, Lightbulb, Info } from 'lucide-react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { calculateEstimatedDailyTargets } from '@/lib/nutrition-calculator';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cn } from "@/lib/utils";
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/clientApp';

interface TotalMacros {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  source?: string;
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
    if (!user?.uid) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    let targets: TotalMacros | null = null;
    let sourceMessage = "";

    try {
      const userProfileRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(userProfileRef);

      if (docSnap.exists()) {
        const profileData = docSnap.data() as FullProfileType;

        if (profileData.mealDistributions && Array.isArray(profileData.mealDistributions) && profileData.mealDistributions.length === defaultMealNames.length) {
          form.reset({ mealDistributions: profileData.mealDistributions });
           if (toast && toast.toasts && !toast.toasts.find(t => t.description === "Your previously saved macro split percentages have been loaded.")) {
            toast({ title: "Loaded Saved Split", description: "Your previously saved macro split percentages have been loaded.", duration: 3000 });
          }
        } else {
           form.reset({
            mealDistributions: defaultMealNames.map(name => ({
              mealName: name,
              calories_pct: defaultMacroPercentages[name]?.calories_pct || 0,
              protein_pct: defaultMacroPercentages[name]?.protein_pct || 0,
              carbs_pct: defaultMacroPercentages[name]?.carbs_pct || 0,
              fat_pct: defaultMacroPercentages[name]?.fat_pct || 0,
            }))
          });
        }


        // Determine daily targets priority: Manual Results -> Smart Planner Results -> Profile Estimation
        if (profileData.manualMacroResults && profileData.manualMacroResults.Total_cals) {
          targets = {
            calories: profileData.manualMacroResults.Total_cals,
            protein_g: profileData.manualMacroResults.Protein_g,
            carbs_g: profileData.manualMacroResults.Carbs_g,
            fat_g: profileData.manualMacroResults.Fat_g,
            source: "Manual Macro Breakdown (Smart Planner)"
          };
          sourceMessage = "Daily totals sourced from 'Manual Macro Breakdown' in the Smart Planner. Adjust there for changes.";
        }
        else if (profileData.smartPlannerData?.results && profileData.smartPlannerData.results.finalTargetCalories) {
          const smartResults = profileData.smartPlannerData.results;
          targets = {
            calories: smartResults.finalTargetCalories,
            protein_g: smartResults.proteinGrams || 0,
            carbs_g: smartResults.carbGrams || 0,
            fat_g: smartResults.fatGrams || 0,
            source: "Smart Calorie Planner"
          };
          sourceMessage = "Daily totals sourced from 'Smart Calorie Planner'. Adjust there for changes.";
        }
        else if (profileData.age && profileData.gender && profileData.current_weight && profileData.height_cm && profileData.activityLevel && profileData.dietGoalOnboarding) {
          const estimatedTargets = calculateEstimatedDailyTargets({
            age: profileData.age,
            gender: profileData.gender,
            currentWeight: profileData.current_weight,
            height: profileData.height_cm,
            activityLevel: profileData.activityLevel,
            dietGoal: profileData.dietGoalOnboarding,
          });
          if (estimatedTargets.targetCalories && estimatedTargets.targetProtein && estimatedTargets.targetCarbs && estimatedTargets.targetFat) {
            targets = {
              calories: estimatedTargets.targetCalories,
              protein_g: estimatedTargets.targetProtein,
              carbs_g: estimatedTargets.targetCarbs,
              fat_g: estimatedTargets.targetFat,
              source: "Profile Estimation"
            };
            sourceMessage = "Daily totals estimated from your Profile. Complete your profile or use calculation tools for more precision.";
          } else {
             toast({ title: "Profile Incomplete for Calculation", description: "Could not calculate daily totals from your profile. Ensure all basic info, activity level, and diet goal are set.", variant: "destructive", duration: 5000});
          }
        } else {
          toast({ title: "Profile Incomplete", description: "Your user profile is incomplete. Please fill it out to calculate daily totals for the Macro Splitter.", variant: "destructive", duration: 5000 });
        }
      } else {
         toast({ title: "Profile Not Found", description: "Could not find your user profile to calculate daily totals.", variant: "destructive", duration: 5000 });
      }
    } catch (error) {
      toast({ title: "Error Loading Data", description: "Failed to load data for macro estimation.", variant: "destructive" });
      console.error("Error in loadDataForSplitter:", error);
    }
    
    setDailyTargets(targets);

    if (targets && sourceMessage) {
      const shouldShowToast = (toast && Array.isArray(toast.toasts)) ? !toast.toasts.find(t => t.description === sourceMessage) : true;
      if (shouldShowToast) {
         toast({ 
          title: "Daily Totals Loaded", 
          description: sourceMessage, 
          duration: 6000 
        });
      }
    } else if (!targets) {
        toast({ title: "No Daily Totals", description: "Could not find or calculate daily macro totals. Please use calculation tools or complete your profile.", variant: "destructive", duration: 6000 });
    }

    setIsLoading(false);
  }, [user, toast, form]);

  useEffect(() => {
    loadDataForSplitter();
  }, [loadDataForSplitter]);

  const onSubmit = async (data: MacroSplitterFormValues) => {
    if (!dailyTargets) {
      toast({ title: "Error", description: "Daily macro totals not available. Please ensure your profile is complete or use other calculation tools.", variant: "destructive" });
      return;
    }
    if (!user?.uid) {
      toast({ title: "Error", description: "User not authenticated.", variant: "destructive" });
      return;
    }

    const result = customMacroSplit(dailyTargets, data.mealDistributions);
    setCalculatedSplit(result);
    
    try {
      const userProfileRef = doc(db, "users", user.uid);
      await setDoc(userProfileRef, { mealDistributions: data.mealDistributions }, { merge: true });
      toast({ title: "Split Calculated & Saved", description: "Macro split calculated and your percentages have been saved." });
    } catch (error) {
      toast({ title: "Calculation Complete (Save Failed)", description: "Macro split calculated, but failed to save percentages.", variant: "destructive" });
      console.error("Error saving meal distributions:", error);
    }
  };

  const handleReset = async () => {
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
     if (user?.uid) {
      try {
        const userProfileRef = doc(db, "users", user.uid);
        await setDoc(userProfileRef, { mealDistributions: null }, { merge: true });
        toast({ title: "Reset Complete", description: "Percentages reset to defaults and saved state cleared." });
      } catch (error) {
         toast({ title: "Reset Warning", description: "Percentages reset locally, but failed to clear saved state.", variant: "destructive" });
         console.error("Error clearing meal distributions from Firestore:", error);
      }
    } else {
      toast({ title: "Reset Complete", description: "Percentages reset to defaults." });
    }
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

  const calculateColumnSum = (macroKey: keyof Omit<MealMacroDistribution, 'mealName'>) => {
    return watchedMealDistributions.reduce((sum, meal) => sum + (Number(meal[macroKey]) || 0), 0);
  };

  const columnSums = {
    calories_pct: calculateColumnSum('calories_pct'),
    protein_pct: calculateColumnSum('protein_pct'),
    carbs_pct: calculateColumnSum('carbs_pct'),
    fat_pct: calculateColumnSum('fat_pct'),
  };
  
  const headerLabels = [
    { key: "meal", label: "Meal", className: "sticky left-0 bg-background z-10 w-[120px] text-left font-medium" },
    { key: "cal_pct", label: "%Cal", className: "text-right min-w-[70px]" },
    { key: "p_pct", label: "%P", className: "text-right min-w-[70px]" },
    { key: "c_pct", label: "%C", className: "text-right min-w-[70px]" },
    { key: "f_pct", label: "%F", className: "text-right min-w-[70px] border-r" },
    { key: "kcal", label: "kcal", className: "text-right min-w-[60px]" },
    { key: "p_g", label: "P(g)", className: "text-right min-w-[60px]" },
    { key: "c_g", label: "C(g)", className: "text-right min-w-[60px]" },
    { key: "f_g", label: "F(g)", className: "text-right min-w-[60px]" },
  ];
  
  const macroPctKeys: (keyof Omit<MealMacroDistribution, 'mealName'>)[] = ['calories_pct', 'protein_pct', 'carbs_pct', 'fat_pct'];


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
            Distribute your total daily macros across your meals by percentage.
          </CardDescription>
        </CardHeader>
        {dailyTargets ? (
          <CardContent>
            <h3 className="text-xl font-semibold mb-1 text-primary">Your Estimated Total Daily Macros:</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 border rounded-md bg-muted/50 mb-3">
              <p><span className="font-medium">Calories:</span> {dailyTargets.calories.toFixed(0)} kcal</p>
              <p><span className="font-medium">Protein:</span> {dailyTargets.protein_g.toFixed(1)} g</p>
              <p><span className="font-medium">Carbs:</span> {dailyTargets.carbs_g.toFixed(1)} g</p>
              <p><span className="font-medium">Fat:</span> {dailyTargets.fat_g.toFixed(1)} g</p>
            </div>
            {dailyTargets.source && (
              <div className="text-sm text-muted-foreground flex items-center gap-2 p-2 rounded-md border border-dashed bg-background">
                <Info className="h-4 w-4 text-accent shrink-0" />
                <span>
                  These totals are sourced from your <strong>{dailyTargets.source}</strong>. 
                  Adjustments can be made in the respective tool or by updating your profile for estimations.
                </span>
              </div>
            )}
          </CardContent>
        ) : (
          <CardContent>
            <div className="text-destructive text-center p-4 border border-destructive/50 rounded-md bg-destructive/10">
              <p className="mb-2">Could not load or calculate your total daily macros.</p>
              <p className="text-sm">Please ensure your profile is complete or use the <Link href="/tools/smart-calorie-planner" className="underline hover:text-destructive/80">Smart Calorie Planner</Link> to set your targets.</p>
            </div>
          </CardContent>
        )}
      </Card>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl">Meal Macro Percentage & Value Distribution</CardTitle>
              <CardDescription>Enter percentages (decimals allowed, e.g., 22.5). Each percentage column must sum to 100%. Calculated values update live.</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="w-full border rounded-md">
                <Table className="min-w-[800px]"> 
                  <TableHeader>
                    <TableRow>
                      {headerLabels.map(header => (
                        <TableHead key={header.key} className={cn("px-2 py-2 text-xs font-medium h-9", header.className)}>
                          {header.label}
                        </TableHead>
                      ))}
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
                          <TableCell className="font-medium sticky left-0 bg-background z-10 px-2 py-1 text-sm h-10">{field.mealName}</TableCell>
                          {macroPctKeys.map(macroKey => (
                            <TableCell key={macroKey} className={cn("px-1 py-1 text-right tabular-nums h-10", macroKey === 'fat_pct' ? 'border-r' : '')}>
                              <FormField
                                control={form.control}
                                name={`mealDistributions.${index}.${macroKey}`}
                                render={({ field: itemField }) => (
                                  <FormItem className="inline-block">
                                    <FormControl><div>
                                      <Input
                                        type="number"
                                        step="0.1"
                                        {...itemField}
                                        value={itemField.value ?? ''}
                                        onChange={e => itemField.onChange(parseFloat(e.target.value) || 0)}
                                        className="w-16 text-right tabular-nums text-sm px-1 py-0.5 h-8"
                                        min="0"
                                        max="100"
                                      /></div>
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                            </TableCell>
                          ))}
                          <TableCell className="px-2 py-1 text-sm text-right tabular-nums h-10">{isNaN(mealCalories) ? 'N/A' : mealCalories.toFixed(0)}</TableCell>
                          <TableCell className="px-2 py-1 text-sm text-right tabular-nums h-10">{isNaN(mealProteinGrams) ? 'N/A' : mealProteinGrams.toFixed(1)}</TableCell>
                          <TableCell className="px-2 py-1 text-sm text-right tabular-nums h-10">{isNaN(mealCarbsGrams) ? 'N/A' : mealCarbsGrams.toFixed(1)}</TableCell>
                          <TableCell className="px-2 py-1 text-sm text-right tabular-nums h-10">{isNaN(mealFatGrams) ? 'N/A' : mealFatGrams.toFixed(1)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                  <TableFooter>
                    <TableRow className="font-semibold text-xs h-10">
                      <TableCell className="sticky left-0 bg-background z-10 px-2 py-1">Input % Totals:</TableCell>
                      {macroPctKeys.map(key => {
                          const sum = columnSums[key];
                          const isSum100 = Math.abs(sum - 100) < 0.1; // Allow for small floating point discrepancies
                          return (
                              <TableCell key={`sum-${key}`} className={cn("px-2 py-1 text-right tabular-nums", isSum100 ? 'text-green-600' : 'text-destructive', key === 'fat_pct' ? 'border-r' : '')}>
                                  {sum.toFixed(1)}%
                                  {isSum100 ? <CheckCircle2 className="ml-1 h-3 w-3 inline-block" /> : <AlertTriangle className="ml-1 h-3 w-3 inline-block" />}
                              </TableCell>
                          );
                      })}
                      <TableCell colSpan={4} className="px-2 py-1"></TableCell> 
                    </TableRow>
                    <TableRow className="font-semibold text-sm bg-muted/70 h-10">
                       <TableCell className="sticky left-0 bg-muted/70 z-10 px-2 py-1">Calc. Value Totals:</TableCell>
                       <TableCell colSpan={4} className="px-2 py-1 border-r"></TableCell>
                       {dailyTargets ? (
                        <>
                          <TableCell className="px-2 py-1 text-right tabular-nums">
                            {watchedMealDistributions.reduce((sum, meal) => sum + (dailyTargets.calories * ((meal.calories_pct || 0) / 100)), 0).toFixed(0)}
                          </TableCell>
                          <TableCell className="px-2 py-1 text-right tabular-nums">
                            {watchedMealDistributions.reduce((sum, meal) => sum + (dailyTargets.protein_g * ((meal.protein_pct || 0) / 100)), 0).toFixed(1)}
                          </TableCell>
                          <TableCell className="px-2 py-1 text-right tabular-nums">
                            {watchedMealDistributions.reduce((sum, meal) => sum + (dailyTargets.carbs_g * ((meal.carbs_pct || 0) / 100)), 0).toFixed(1)}
                          </TableCell>
                          <TableCell className="px-2 py-1 text-right tabular-nums">
                            {watchedMealDistributions.reduce((sum, meal) => sum + (dailyTargets.fat_g * ((meal.fat_pct || 0) / 100)), 0).toFixed(1)}
                          </TableCell>
                        </>
                       ) : (
                        <TableCell colSpan={4} className="px-2 py-1 text-right">N/A</TableCell>
                       )}
                    </TableRow>
                  </TableFooter>
                </Table>
              <ScrollBar orientation="horizontal" />
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
              Save &amp; Show Final Split
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
            <CardDescription>This was the calculated split when you last clicked "Save &amp; Show Final Split".</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="w-full">
            <Table className="min-w-[700px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-background z-10 w-[150px] px-2 py-2 text-left text-xs font-medium">Meal</TableHead>
                  <TableHead className="px-2 py-2 text-right text-xs font-medium">Calories (kcal)</TableHead>
                  <TableHead className="px-2 py-2 text-right text-xs font-medium">Protein (g)</TableHead>
                  <TableHead className="px-2 py-2 text-right text-xs font-medium">Carbs (g)</TableHead>
                  <TableHead className="px-2 py-2 text-right text-xs font-medium">Fat (g)</TableHead>
                  <TableHead className="px-2 py-2 text-right text-xs font-medium w-[180px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {calculatedSplit.map((mealData) => (
                  <TableRow key={mealData.mealName}>
                    <TableCell className="font-medium sticky left-0 bg-background z-10 px-2 py-1 text-sm">{mealData.mealName}</TableCell>
                    <TableCell className="px-2 py-1 text-sm text-right tabular-nums">{mealData.Calories}</TableCell>
                    <TableCell className="px-2 py-1 text-sm text-right tabular-nums">{mealData['Protein (g)']}</TableCell>
                    <TableCell className="px-2 py-1 text-sm text-right tabular-nums">{mealData['Carbs (g)']}</TableCell>
                    <TableCell className="px-2 py-1 text-sm text-right tabular-nums">{mealData['Fat (g)']}</TableCell>
                    <TableCell className="px-2 py-1 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSuggestMeals(mealData)}
                        className="h-8 text-xs"
                      >
                        <Lightbulb className="mr-1.5 h-3.5 w-3.5" /> Suggest Meals
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-semibold border-t-2 text-sm bg-muted/70">
                    <TableCell className="sticky left-0 bg-muted/70 z-10 px-2 py-1">Total</TableCell>
                    <TableCell className="px-2 py-1 text-right tabular-nums">{calculatedSplit.reduce((sum, meal) => sum + meal.Calories, 0)}</TableCell>
                    <TableCell className="px-2 py-1 text-right tabular-nums">{calculatedSplit.reduce((sum, meal) => sum + meal['Protein (g)'], 0).toFixed(1)}</TableCell>
                    <TableCell className="px-2 py-1 text-right tabular-nums">{calculatedSplit.reduce((sum, meal) => sum + meal['Carbs (g)'], 0).toFixed(1)}</TableCell>
                    <TableCell className="px-2 py-1 text-right tabular-nums">{calculatedSplit.reduce((sum, meal) => sum + meal['Fat (g)'], 0).toFixed(1)}</TableCell>
                    <TableCell className="px-2 py-1"></TableCell>
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
