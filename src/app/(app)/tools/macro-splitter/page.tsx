
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from '@/components/ui/table';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { MacroSplitterFormSchema, type MacroSplitterFormValues, type DailyTargets, type CalculatedMealMacros } from '@/lib/schemas';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { mealNames as defaultMealNames } from '@/lib/constants';
import { Loader2, RefreshCw, Calculator, AlertTriangle, CheckCircle2, SplitSquareHorizontal } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';

// Mock function to get daily targets (replace with actual data fetching if needed)
async function getDailyTargetsData(userId: string): Promise<Partial<DailyTargets>> {
  console.log("Fetching daily targets for user:", userId);
  const storedData = localStorage.getItem(`nutriplan_daily_targets_${userId}`);
  if (storedData) {
    try {
      return JSON.parse(storedData);
    } catch (e) {
      console.error("Error parsing daily targets from localStorage", e);
    }
  }
  // Fallback if no data found or parsing error
  return { targetCalories: 2000, targetProtein: 100, targetCarbs: 250, targetFat: 60, mealsPerDay: 3 };
}

interface TotalMacros {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
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
  const [dailyTargets, setDailyTargets] = useState<TotalMacros | null>(null);
  const [calculatedSplit, setCalculatedSplit] = useState<CalculatedMealMacros[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const form = useForm<MacroSplitterFormValues>({
    resolver: zodResolver(MacroSplitterFormSchema),
    defaultValues: {
      mealDistributions: defaultMealNames.map(name => ({
        mealName: name,
        calories_pct: 0,
        protein_pct: 0,
        carbs_pct: 0,
        fat_pct: 0,
      })),
    },
  });

  const { fields } = useFieldArray({
    control: form.control,
    name: "mealDistributions",
  });

  const loadDailyTargets = useCallback(async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const dt = await getDailyTargetsData(user.id);
      if (dt.targetCalories && dt.targetProtein && dt.targetCarbs && dt.targetFat) {
        setDailyTargets({
          calories: dt.targetCalories,
          protein_g: dt.targetProtein,
          carbs_g: dt.targetCarbs,
          fat_g: dt.targetFat,
        });
      } else {
        toast({ title: "Missing Daily Targets", description: "Please set your daily targets first.", variant: "destructive"});
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to load daily targets.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    loadDailyTargets();
  }, [loadDailyTargets]);

  const onSubmit = (data: MacroSplitterFormValues) => {
    if (!dailyTargets) {
      toast({ title: "Error", description: "Daily targets not loaded.", variant: "destructive" });
      return;
    }
    const result = customMacroSplit(dailyTargets, data.mealDistributions);
    setCalculatedSplit(result);
    toast({ title: "Calculation Complete", description: "Macro split calculated successfully." });
  };

  const handleReset = () => {
    form.reset({
      mealDistributions: defaultMealNames.map(name => ({
        mealName: name, calories_pct: 0, protein_pct: 0, carbs_pct: 0, fat_pct: 0,
      })),
    });
    setCalculatedSplit(null);
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
  
  const macroKeys = Object.keys(macroLabels) as (keyof typeof macroLabels)[];


  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg">Loading daily targets...</p>
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
        {dailyTargets && (
          <CardContent>
            <h3 className="text-xl font-semibold mb-2 text-primary">Your Total Daily Macros:</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 border rounded-md bg-muted/50 mb-6">
              <p><span className="font-medium">Calories:</span> {dailyTargets.calories.toFixed(0)} kcal</p>
              <p><span className="font-medium">Protein:</span> {dailyTargets.protein_g.toFixed(1)} g</p>
              <p><span className="font-medium">Carbs:</span> {dailyTargets.carbs_g.toFixed(1)} g</p>
              <p><span className="font-medium">Fat:</span> {dailyTargets.fat_g.toFixed(1)} g</p>
            </div>
          </CardContent>
        )}
      </Card>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl">Meal Macro Percentage Distribution</CardTitle>
              <CardDescription>Enter the percentage of each macro for each meal. Each column must sum to 100%.</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="w-full">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[150px]">Meal</TableHead>
                      {macroKeys.map(key => <TableHead key={key} className="text-right">{macroLabels[key]}</TableHead>)}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fields.map((field, index) => (
                      <TableRow key={field.id}>
                        <TableCell className="font-medium">{field.mealName}</TableCell>
                        {macroKeys.map(macroKey => (
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
                      </TableRow>
                    ))}
                  </TableBody>
                   <TableCaption className="mt-4">
                    <div className="grid grid-cols-5 gap-2 items-center font-semibold p-2 border-t">
                        <div className="text-left">Column Totals:</div>
                        {macroKeys.map(key => {
                            const sum = columnSums[key];
                            const isSum100 = Math.round(sum) === 100;
                            return (
                                <div key={key} className={`flex items-center justify-end text-right ${isSum100 ? 'text-green-600' : 'text-destructive'}`}>
                                     {sum.toFixed(1)}%
                                    {isSum100 ? <CheckCircle2 className="ml-1 h-4 w-4" /> : <AlertTriangle className="ml-1 h-4 w-4" />}
                                </div>
                            );
                        })}
                    </div>
                  </TableCaption>
                </Table>
              </ScrollArea>
              {Object.values(form.formState.errors).find(err => err.mealDistributions?.root?.message) && (
                <p className="text-sm font-medium text-destructive mt-2">
                    { (form.formState.errors.mealDistributions?.root?.message as string) || 
                      (form.formState.errors.mealDistributions?.[0]?.calories_pct?.message as string) ||
                      (form.formState.errors.mealDistributions?.[0]?.protein_pct?.message as string) ||
                      (form.formState.errors.mealDistributions?.[0]?.carbs_pct?.message as string) ||
                      (form.formState.errors.mealDistributions?.[0]?.fat_pct?.message as string)
                    }
                </p>
              )}
            </CardContent>
          </Card>
          
          <div className="flex space-x-4 mt-6">
            <Button type="submit" className="flex-1 text-lg py-3" disabled={!dailyTargets || form.formState.isSubmitting}>
              <Calculator className="mr-2 h-5 w-5" />
              {form.formState.isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
              Calculate Split
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
            <CardTitle className="text-2xl">Calculated Meal Macros</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[150px]">Meal</TableHead>
                  <TableHead className="text-right">Calories (kcal)</TableHead>
                  <TableHead className="text-right">Protein (g)</TableHead>
                  <TableHead className="text-right">Carbs (g)</TableHead>
                  <TableHead className="text-right">Fat (g)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {calculatedSplit.map((mealData) => (
                  <TableRow key={mealData.mealName}>
                    <TableCell className="font-medium">{mealData.mealName}</TableCell>
                    <TableCell className="text-right tabular-nums">{mealData.Calories}</TableCell>
                    <TableCell className="text-right tabular-nums">{mealData['Protein (g)']}</TableCell>
                    <TableCell className="text-right tabular-nums">{mealData['Carbs (g)']}</TableCell>
                    <TableCell className="text-right tabular-nums">{mealData['Fat (g)']}</TableCell>
                  </TableRow>
                ))}
                 <TableRow className="font-semibold border-t-2">
                    <TableCell>Total</TableCell>
                    <TableCell className="text-right tabular-nums">{calculatedSplit.reduce((sum, meal) => sum + meal.Calories, 0)}</TableCell>
                    <TableCell className="text-right tabular-nums">{calculatedSplit.reduce((sum, meal) => sum + meal['Protein (g)'], 0)}</TableCell>
                    <TableCell className="text-right tabular-nums">{calculatedSplit.reduce((sum, meal) => sum + meal['Carbs (g)'], 0)}</TableCell>
                    <TableCell className="text-right tabular-nums">{calculatedSplit.reduce((sum, meal) => sum + meal['Fat (g)'], 0)}</TableCell>
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
