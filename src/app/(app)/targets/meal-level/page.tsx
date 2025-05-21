
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Form, FormField, FormItem } from "@/components/ui/form";
import { MealLevelTargetsSchema, DailyTargetsSchema, type MealLevelTargets, type DailyTargets, type MealTarget } from '@/lib/schemas';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { mealNames as defaultMealNames } from '@/lib/constants';
import { Trash2, PlusCircle, Loader2 } from 'lucide-react';

// Mock functions
async function getDailyTargetsData(userId: string): Promise<Partial<DailyTargets>> {
  const storedData = localStorage.getItem(`nutriplan_daily_targets_${userId}`);
  if (storedData) return JSON.parse(storedData);
  return { targetCalories: 2000, targetProtein: 150, targetCarbs: 200, targetFat: 60, mealsPerDay: 3 };
}

async function getMealLevelTargetsData(userId: string, numMeals: number): Promise<Partial<MealLevelTargets>> {
  const storedData = localStorage.getItem(`nutriplan_meal_level_targets_${userId}`);
  if (storedData) {
    const parsed = JSON.parse(storedData);
    // Ensure correct number of meals, adjust if daily target for mealsPerDay changed
    if (parsed.mealTargets.length !== numMeals) {
        parsed.mealTargets = defaultMealNames.slice(0, numMeals).map(name => ({
            mealName: name, targetCalories: 0, targetProtein: 0, targetCarbs: 0, targetFat: 0
        }));
    }
    return parsed;
  }
  return { 
    mealTargets: defaultMealNames.slice(0, numMeals).map(name => ({
        mealName: name, targetCalories: 0, targetProtein: 0, targetCarbs: 0, targetFat: 0
    }))
  };
}

async function saveMealLevelTargetsData(userId: string, data: MealLevelTargets) {
  localStorage.setItem(`nutriplan_meal_level_targets_${userId}`, JSON.stringify(data));
  return { success: true };
}


export default function MealLevelTargetsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [dailyTargets, setDailyTargets] = useState<Partial<DailyTargets>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const numMeals = dailyTargets?.mealsPerDay || 3;

  const form = useForm<MealLevelTargets>({
    resolver: zodResolver(MealLevelTargetsSchema),
    defaultValues: { mealTargets: [] },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "mealTargets",
  });

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const dt = await getDailyTargetsData(user.id);
      setDailyTargets(dt);
      const mlt = await getMealLevelTargetsData(user.id, dt.mealsPerDay || 3);
      form.reset({ mealTargets: mlt.mealTargets || [] });
    } catch (error) {
      toast({ title: "Error", description: "Failed to load target data.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [user, form, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Adjust meals if dailyTargets.mealsPerDay changes
   useEffect(() => {
    if (dailyTargets.mealsPerDay && fields.length !== dailyTargets.mealsPerDay) {
        const currentMeals = form.getValues("mealTargets");
        const newMealTargets: MealTarget[] = [];
        for (let i = 0; i < dailyTargets.mealsPerDay; i++) {
            newMealTargets.push(
                currentMeals[i] || {
                    mealName: defaultMealNames[i] || `Meal ${i + 1}`,
                    targetCalories: 0, targetProtein: 0, targetCarbs: 0, targetFat: 0
                }
            );
        }
        form.setValue("mealTargets", newMealTargets);
    }
  }, [dailyTargets.mealsPerDay, fields.length, form]);


  const onSubmit = async (data: MealLevelTargets) => {
    if (!user?.id) return;
    setIsSubmitting(true);
    try {
      await saveMealLevelTargetsData(user.id, data);
      toast({ title: "Success", description: "Meal-level targets saved." });
    } catch (error) {
      toast({ title: "Error", description: "Failed to save targets.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const watchedMealTargets = form.watch("mealTargets");

  const calculateTotals = (nutrient: keyof Omit<MealTarget, 'mealName'>) => {
    return watchedMealTargets.reduce((sum, meal) => sum + (Number(meal[nutrient]) || 0), 0);
  };

  const totalCalories = calculateTotals('targetCalories');
  const totalProtein = calculateTotals('targetProtein');
  const totalCarbs = calculateTotals('targetCarbs');
  const totalFat = calculateTotals('targetFat');

  const getProgressVariant = (current: number, target?: number) => {
    if (target === undefined || target === 0) return "default";
    const percentage = (current / target) * 100;
    if (percentage > 110 || percentage < 90) return "destructive";
    if (percentage > 105 || percentage < 95) return "accent";
    return "default";
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Loading meal-level targets...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Card className="shadow-xl mb-6">
        <CardHeader>
          <CardTitle className="text-2xl">Daily Target Summary</CardTitle>
          <CardDescription>Your overall daily goals. Adjust these in Daily Targets page.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div><Label>Calories:</Label> <p>{dailyTargets.targetCalories || 0} kcal</p></div>
          <div><Label>Protein:</Label> <p>{dailyTargets.targetProtein || 0} g</p></div>
          <div><Label>Carbs:</Label> <p>{dailyTargets.targetCarbs || 0} g</p></div>
          <div><Label>Fat:</Label> <p>{dailyTargets.targetFat || 0} g</p></div>
        </CardContent>
      </Card>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card className="shadow-xl">
            <CardHeader>
              <CardTitle className="text-3xl font-bold">Meal-Level Nutrient Breakdown</CardTitle>
              <CardDescription>Distribute your daily targets across {numMeals} meals. Ensure sums match daily goals.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {fields.map((field, index) => (
                <Card key={field.id} className="p-4 bg-background/50">
                  <div className="flex justify-between items-center mb-2">
                     <Controller
                        control={form.control}
                        name={`mealTargets.${index}.mealName`}
                        render={({ field: mealNameField }) => (
                           <Input placeholder={`Meal ${index + 1} Name`} {...mealNameField} className="text-lg font-semibold !border-0 !ring-0 !shadow-none p-0 focus-visible:ring-0 w-1/2" />
                        )}
                      />
                    {fields.length > 1 && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => remove(index)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <FormField control={form.control} name={`mealTargets.${index}.targetCalories`} render={({ field: calorieField }) => ( <FormItem> <Label>Calories</Label> <Input type="number" {...calorieField} onChange={e => calorieField.onChange(parseFloat(e.target.value))} /> </FormItem> )} />
                    <FormField control={form.control} name={`mealTargets.${index}.targetProtein`} render={({ field: proteinField }) => ( <FormItem> <Label>Protein (g)</Label> <Input type="number" {...proteinField} onChange={e => proteinField.onChange(parseFloat(e.target.value))} /> </FormItem> )} />
                    <FormField control={form.control} name={`mealTargets.${index}.targetCarbs`} render={({ field: carbField }) => ( <FormItem> <Label>Carbs (g)</Label> <Input type="number" {...carbField} onChange={e => carbField.onChange(parseFloat(e.target.value))} /> </FormItem> )} />
                    <FormField control={form.control} name={`mealTargets.${index}.targetFat`} render={({ field: fatField }) => ( <FormItem> <Label>Fat (g)</Label> <Input type="number" {...fatField} onChange={e => fatField.onChange(parseFloat(e.target.value))} /> </FormItem> )} />
                  </div>
                </Card>
              ))}
              {/* This button might not be needed if meals are fixed by daily target mealsPerDay */}
              {/* <Button type="button" variant="outline" onClick={() => append({ mealName: `Meal ${fields.length + 1}`, targetCalories: 0, targetProtein: 0, targetCarbs: 0, targetFat: 0 })}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Meal
              </Button> */}
            </CardContent>
          </Card>

          <Card className="shadow-xl">
            <CardHeader><CardTitle>Totals & Progress</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Total Calories: {totalCalories.toFixed(0)} / {dailyTargets.targetCalories || 0} kcal</Label>
                <Progress value={(totalCalories / (dailyTargets.targetCalories || 1)) * 100} className={getProgressVariant(totalCalories, dailyTargets.targetCalories) === "destructive" ? "h-3 [&>*]:bg-destructive" : getProgressVariant(totalCalories, dailyTargets.targetCalories) === "accent" ? "h-3 [&>*]:bg-accent" : "h-3"} />
              </div>
              <div>
                <Label>Total Protein: {totalProtein.toFixed(1)} / {dailyTargets.targetProtein || 0} g</Label>
                <Progress value={(totalProtein / (dailyTargets.targetProtein || 1)) * 100} className={getProgressVariant(totalProtein, dailyTargets.targetProtein) === "destructive" ? "h-3 [&>*]:bg-destructive" : getProgressVariant(totalProtein, dailyTargets.targetProtein) === "accent" ? "h-3 [&>*]:bg-accent" : "h-3"} />
              </div>
              <div>
                <Label>Total Carbs: {totalCarbs.toFixed(1)} / {dailyTargets.targetCarbs || 0} g</Label>
                <Progress value={(totalCarbs / (dailyTargets.targetCarbs || 1)) * 100} className={getProgressVariant(totalCarbs, dailyTargets.targetCarbs) === "destructive" ? "h-3 [&>*]:bg-destructive" : getProgressVariant(totalCarbs, dailyTargets.targetCarbs) === "accent" ? "h-3 [&>*]:bg-accent" : "h-3"} />
              </div>
              <div>
                <Label>Total Fat: {totalFat.toFixed(1)} / {dailyTargets.targetFat || 0} g</Label>
                <Progress value={(totalFat / (dailyTargets.targetFat || 1)) * 100} className={getProgressVariant(totalFat, dailyTargets.targetFat) === "destructive" ? "h-3 [&>*]:bg-destructive" : getProgressVariant(totalFat, dailyTargets.targetFat) === "accent" ? "h-3 [&>*]:bg-accent" : "h-3"} />
              </div>
            </CardContent>
          </Card>
          
          <Button type="submit" className="w-full text-lg py-6" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSubmitting ? "Saving..." : "Save Meal-Level Targets"}
          </Button>
        </form>
      </Form>
    </div>
  );
}

