
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller, FieldPath } from "react-hook-form";
import { Button } from "../../../../components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../../../../components/ui/form";
import { Input } from "../../../../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../../components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../../components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../../../../components/ui/accordion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from "../../../../components/ui/table";
import { BrainCircuit, Calculator, HelpCircle, AlertTriangle, RefreshCcw, Edit3, Info } from "lucide-react";
import { SmartCaloriePlannerFormSchema, type SmartCaloriePlannerFormValues, type FullProfileType, type GlobalCalculatedTargets, type CustomCalculatedTargets } from "../../../../lib/schemas";
import { activityLevels, genders, smartPlannerDietGoals } from "../../../../lib/constants";
import { calculateBMR, calculateTDEE } from "../../../../lib/nutrition-calculator";
import { useAuth } from "../../../../contexts/AuthContext";
import { useToast } from "../../../../hooks/use-toast";
import { Slider } from "../../../../components/ui/slider";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../../../../components/ui/tooltip";
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../../../lib/firebase/clientApp';
import { preprocessDataForFirestore } from "../../../../lib/schemas";
import { getSmartPlannerData} from "../../../../app/api/user/database"



async function saveSmartPlannerData(userId: string, data: { formValues: SmartCaloriePlannerFormValues, results: GlobalCalculatedTargets | null }) {
  if (!userId) throw new Error("User ID is required.");
  try {
    const userProfileRef = doc(db, "users", userId);
    const dataToSave = { smartPlannerData: preprocessDataForFirestore(data) };
    await setDoc(userProfileRef, dataToSave, { merge: true });
  } catch (error) {
    console.error("Error saving smart planner data to Firestore:", error);
    throw error;
  }
}

async function saveManualMacroResults(userId: string, results: CustomCalculatedTargets | null) {
  if (!userId) throw new Error("User ID required to save manual macro results.");
  try {
    const userProfileRef = doc(db, "users", userId);
    const dataToSave = { manualMacroResults: preprocessDataForFirestore(results) };
    await setDoc(userProfileRef, dataToSave, { merge: true });
  } catch (error) {
    console.error("Error saving manual macro results to Firestore:", error);
    throw error;
  }
}


export default function SmartCaloriePlannerPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [results, setResults] = useState<GlobalCalculatedTargets | null>(null);
  const [customPlanResults, setCustomPlanResults] = useState<GlobalCalculatedTargets | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);


  const smartPlannerForm = useForm<SmartCaloriePlannerFormValues>({
    resolver: zodResolver(SmartCaloriePlannerFormSchema),
    defaultValues: {
      age: undefined, gender: undefined, height_cm: undefined, current_weight: undefined,
      goal_weight_1m: undefined, ideal_goal_weight: undefined, activity_factor_key: "moderate", dietGoal: "fat_loss",
      bf_current: undefined, bf_target: undefined, bf_ideal: undefined, 
      mm_current: undefined, mm_target: undefined, mm_ideal: undefined,
      bw_current: undefined, bw_target: undefined, bw_ideal: undefined,
      waist_current: undefined, waist_goal_1m: undefined, waist_ideal: undefined,
      hips_current: undefined, hips_goal_1m: undefined, hips_ideal: undefined,
      right_leg_current: undefined, right_leg_goal_1m: undefined, right_leg_ideal: undefined,
      left_leg_current: undefined, left_leg_goal_1m: undefined, left_leg_ideal: undefined,
      right_arm_current: undefined, right_arm_goal_1m: undefined, right_arm_ideal: undefined,
      left_arm_current: undefined, left_arm_goal_1m: undefined, left_arm_ideal: undefined,
      custom_total_calories: undefined, custom_protein_per_kg: undefined, remaining_calories_carb_pct: 50,
    },
  });

  useEffect(() => {
    if (user?.uid) {
      setIsLoadingData(true);
      getSmartPlannerData(user.uid).then(data => {
        if (data.formValues) smartPlannerForm.reset(data.formValues);
        if (data.results && typeof data.results.tdee === 'number' && typeof data.results.bmr === 'number') {
             setResults(data.results);
        } else {
            setResults(null); 
        }
        setIsLoadingData(false);
      }).catch(err => {
        toast({title: "Error", description: "Could not load saved planner data.", variant: "destructive"});
        setIsLoadingData(false);
      });
    } else {
      setIsLoadingData(false);
    }
  }, [user, smartPlannerForm, toast]);


  const onSubmit = async (data: SmartCaloriePlannerFormValues) => {
    const activity = activityLevels.find(al => al.value === data.activity_factor_key);
    if (!activity || !data.gender || !data.current_weight || !data.height_cm || !data.age || !data.goal_weight_1m || !data.dietGoal) {
      toast({ title: "Missing Information", description: "Please fill all required basic info fields.", variant: "destructive" });
      return;
    }

    const bmr = calculateBMR(data.gender, data.current_weight, data.height_cm, data.age); 
    const tdee = calculateTDEE(bmr, data.activity_factor_key!);

    let targetCaloriesS1: number;
    const weightDeltaKg1M = data.current_weight - data.goal_weight_1m;
    const calorieAdjustmentS1 = (7700 * weightDeltaKg1M) / 30; 
    targetCaloriesS1 = tdee - calorieAdjustmentS1;

    if (data.dietGoal === 'fat_loss') {
      targetCaloriesS1 = Math.min(targetCaloriesS1, tdee - 200); 
      targetCaloriesS1 = Math.max(targetCaloriesS1, bmr + 200, 1200); 
    } else if (data.dietGoal === 'muscle_gain') { 
      targetCaloriesS1 = Math.max(targetCaloriesS1, tdee + 150); 
    } else if (data.dietGoal === 'recomp') { 
      targetCaloriesS1 = Math.min(Math.max(targetCaloriesS1, tdee - 300), tdee + 100); 
      targetCaloriesS1 = Math.max(targetCaloriesS1, bmr + 100, 1400); 
    }


    let finalTargetCalories = targetCaloriesS1;
    let targetCaloriesS2: number | undefined = undefined;
    let targetCaloriesS3: number | undefined = undefined;

    if (data.bf_current !== undefined && data.bf_target !== undefined && data.current_weight && data.bf_current > 0 && data.bf_target > 0 && data.bf_current > data.bf_target) {
      const fatMassLossKg = data.current_weight * ( (data.bf_current - data.bf_target) / 100);
      const calorieAdjustmentS2 = (7700 * fatMassLossKg) / 30; 
      targetCaloriesS2 = tdee - calorieAdjustmentS2;
      finalTargetCalories = (finalTargetCalories + targetCaloriesS2) / 2; 
    }

    if (data.waist_current !== undefined && data.waist_goal_1m !== undefined && data.current_weight && data.waist_current > 0 && data.waist_goal_1m > 0 && data.waist_current > data.waist_goal_1m) {
      const waistChangeCm = data.waist_current - data.waist_goal_1m;
      if (Math.abs(waistChangeCm) > 5) {
        toast({ title: "Waist Goal Warning", description: "A waist change of more than 5cm in 1 month may be unrealistic. Results are indicative.", variant: "default", duration: 7000 });
      }
      const estimatedFatLossPercent = waistChangeCm * 0.5; 
      const estimatedFatLossKg = (estimatedFatLossPercent / 100) * data.current_weight;
      const calorieAdjustmentS3 = (7700 * estimatedFatLossKg) / 30;
      targetCaloriesS3 = tdee - calorieAdjustmentS3;
    }
    
    finalTargetCalories = Math.max(bmr + 100, Math.round(finalTargetCalories)); 

    const estimatedWeeklyWeightChangeKg = (tdee - finalTargetCalories) * 7 / 7700;

    let proteinTargetPct = 0, carbTargetPct = 0, fatTargetPct = 0;
    if (data.dietGoal === 'fat_loss') { proteinTargetPct = 0.35; carbTargetPct = 0.35; fatTargetPct = 0.30; }
    else if (data.dietGoal === 'muscle_gain') { proteinTargetPct = 0.30; carbTargetPct = 0.50; fatTargetPct = 0.20; }
    else if (data.dietGoal === 'recomp') { proteinTargetPct = 0.40; carbTargetPct = 0.35; fatTargetPct = 0.25; } 


    const proteinCalories = finalTargetCalories * proteinTargetPct;
    const proteinGrams = proteinCalories / 4;
    const carbCalories = finalTargetCalories * carbTargetPct;
    const carbGrams = carbCalories / 4;
    const fatCalories = finalTargetCalories * fatTargetPct;
    const fatGrams = fatCalories / 9;

    const newResults: GlobalCalculatedTargets = {
      bmr: Math.round(bmr),
      tdee: Math.round(tdee),
      finalTargetCalories: Math.round(finalTargetCalories),
      estimatedWeeklyWeightChangeKg: estimatedWeeklyWeightChangeKg,
      proteinTargetPct: proteinTargetPct,
      proteinGrams: proteinGrams,
      proteinCalories: proteinCalories,
      carbTargetPct: carbTargetPct,
      carbGrams: carbGrams,
      carbCalories: carbCalories,
      fatTargetPct: fatTargetPct,
      fatGrams: fatGrams,
      fatCalories: fatCalories,
      current_weight_for_custom_calc: data.current_weight,
    };
    setResults(newResults);
    if (user?.uid) {
      try {
        await saveSmartPlannerData(user.uid, {formValues: data, results: newResults});
        toast({ title: "Calculation Complete", description: "Your smart calorie plan has been generated and saved." });
      } catch (error) {
        toast({ title: "Save Error", description: "Could not save calculation results.", variant: "destructive" });
      }
    }
  };
  
  const handleSmartPlannerReset = async () => {
    smartPlannerForm.reset({
      age: undefined, gender: undefined, height_cm: undefined, current_weight: undefined,
      goal_weight_1m: undefined, ideal_goal_weight: undefined, activity_factor_key: "moderate", dietGoal: "fat_loss",
      bf_current: undefined, bf_target: undefined, bf_ideal: undefined, mm_current: undefined, mm_target: undefined, mm_ideal: undefined,
      bw_current: undefined, bw_target: undefined, bw_ideal: undefined, waist_current: undefined, waist_goal_1m: undefined, waist_ideal: undefined,
      hips_current: undefined, hips_goal_1m: undefined, hips_ideal: undefined,
      right_leg_current: undefined, right_leg_goal_1m: undefined, right_leg_ideal: undefined, left_leg_current: undefined, left_leg_goal_1m: undefined, left_leg_ideal: undefined,
      right_arm_current: undefined, right_arm_goal_1m: undefined, right_arm_ideal: undefined, left_arm_current: undefined, left_arm_goal_1m: undefined, left_arm_ideal: undefined,
      custom_total_calories: undefined, custom_protein_per_kg: undefined, remaining_calories_carb_pct: 50,
    });
    setResults(null);
    setCustomPlanResults(null); 
    if (user?.uid) {
      await saveSmartPlannerData(user.uid, { formValues: smartPlannerForm.getValues(), results: null });
    }
    toast({ title: "Smart Planner Reset", description: "All smart planner inputs and results cleared." });
  };

  const handleCustomPlanReset = () => {
    smartPlannerForm.reset({
        ...smartPlannerForm.getValues(), 
        custom_total_calories: undefined,
        custom_protein_per_kg: undefined,
        remaining_calories_carb_pct: 50,
    });
    setCustomPlanResults(null); 
    // No need to save to Firestore on custom reset, as the main form save does that
    toast({ title: "Custom Plan Reset", description: "Custom plan inputs have been reset." });
  };

  const watchedCustomInputs = smartPlannerForm.watch([ "custom_total_calories", "custom_protein_per_kg", "remaining_calories_carb_pct", "current_weight"]);
  
  useEffect(() => {
    const [customTotalCalories, customProteinPerKg, remainingCarbPct, currentWeightMainForm] = watchedCustomInputs;

    if (!results || currentWeightMainForm === undefined || currentWeightMainForm <= 0) {
        if (customPlanResults !== null) setCustomPlanResults(null);
        return;
    }
    
    const weightForCalc = currentWeightMainForm; 

    const effectiveTotalCalories = customTotalCalories !== undefined && customTotalCalories > 0 
                                  ? customTotalCalories 
                                  : (results.finalTargetCalories || 0);
    
    const defaultProteinPerKg = results.proteinGrams && results.current_weight_for_custom_calc && results.current_weight_for_custom_calc > 0
                              ? results.proteinGrams / results.current_weight_for_custom_calc
                              : 1.6; 

    const effectiveProteinPerKg = customProteinPerKg !== undefined && customProteinPerKg >=0 
                                  ? customProteinPerKg 
                                  : defaultProteinPerKg;

    const calculatedProteinGrams = weightForCalc * effectiveProteinPerKg;
    const calculatedProteinCalories = calculatedProteinGrams * 4;
    let remainingCaloriesForCustom = effectiveTotalCalories - calculatedProteinCalories;

    let calculatedCarbGrams = 0;
    let calculatedFatGrams = 0;
    let calculatedCarbCalories = 0;
    let calculatedFatCalories = 0;

    if (remainingCaloriesForCustom > 0) {
      const carbRatio = (remainingCarbPct ?? 50) / 100; 
      const fatRatio = 1 - carbRatio;

      calculatedCarbCalories = remainingCaloriesForCustom * carbRatio;
      calculatedFatCalories = remainingCaloriesForCustom * fatRatio;
      
      calculatedCarbGrams = calculatedCarbCalories / 4;
      calculatedFatGrams = calculatedFatCalories / 9;

    } else if (remainingCaloriesForCustom < 0) {
      remainingCaloriesForCustom = 0; 
    }
    
    calculatedCarbGrams = Math.max(0, calculatedCarbGrams);
    calculatedFatGrams = Math.max(0, calculatedFatGrams);
    calculatedCarbCalories = Math.max(0, calculatedCarbCalories);
    calculatedFatCalories = Math.max(0, calculatedFatCalories);
    
    const finalCustomTotalCalories = calculatedProteinCalories + calculatedCarbCalories + calculatedFatCalories;

    const newCustomPlan: GlobalCalculatedTargets = {
      finalTargetCalories: Math.round(finalCustomTotalCalories),
      proteinGrams: Math.round(calculatedProteinGrams),
      proteinCalories: Math.round(calculatedProteinCalories),
      proteinTargetPct: finalCustomTotalCalories > 0 ? Math.round((calculatedProteinCalories / finalCustomTotalCalories) * 100) : (calculatedProteinGrams > 0 ? 100 : 0),
      carbGrams: Math.round(calculatedCarbGrams),
      carbCalories: Math.round(calculatedCarbCalories),
      carbTargetPct: finalCustomTotalCalories > 0 ? Math.round((calculatedCarbCalories / finalCustomTotalCalories) * 100) : 0,
      fatGrams: Math.round(calculatedFatGrams),
      fatCalories: Math.round(calculatedFatCalories),
      fatTargetPct: finalCustomTotalCalories > 0 ? Math.round((calculatedFatCalories / finalCustomTotalCalories) * 100) : 0,
      bmr: results?.bmr,
      tdee: results?.tdee,
      current_weight_for_custom_calc: weightForCalc,
      estimatedWeeklyWeightChangeKg: (results?.tdee && finalCustomTotalCalories) ? (results.tdee - finalCustomTotalCalories) * 7 / 7700 : undefined,
    };
    
    if (JSON.stringify(customPlanResults) !== JSON.stringify(newCustomPlan)) {
        setCustomPlanResults(newCustomPlan);
    }
    
  }, [watchedCustomInputs, results, customPlanResults, toast]);


  if (isLoadingData) {
    return <div className="flex justify-center items-center h-screen"><p>Loading planner data...</p></div>;
  }

  return (
    <TooltipProvider>
    <div className="container mx-auto py-4"> 
      <Card className="max-w-3xl mx-auto shadow-xl">
        <CardHeader>
          <CardTitle className="text-3xl font-bold flex items-center">
            <BrainCircuit className="mr-3 h-8 w-8 text-primary" />
            Smart Calorie & Macro Planner
          </CardTitle>
          <CardDescription>
            Calculate your daily targets based on your stats and goals. Saved data will be used across other tools.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...smartPlannerForm}>
            <form onSubmit={smartPlannerForm.handleSubmit(onSubmit)} className="space-y-8">
              <Accordion type="multiple" defaultValue={["basic-info"]} className="w-full">
                <AccordionItem value="basic-info">
                  <AccordionTrigger className="text-xl font-semibold">📋 Basic Info (Required)</AccordionTrigger>
                  <AccordionContent className="grid md:grid-cols-2 gap-x-6 gap-y-4 pt-4 px-1"> 
                    <FormField control={smartPlannerForm.control} name="age" render={({ field }) => (<FormItem><FormLabel>Age (Years)</FormLabel><FormControl><div><Input type="number" placeholder="e.g., 30" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : parseInt(e.target.value, 10))} step="1" onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()} /></div></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={smartPlannerForm.control} name="gender" render={({ field }) => (<FormItem><FormLabel>Biological Sex</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><div><SelectTrigger><SelectValue placeholder="Select sex" /></SelectTrigger></div></FormControl><SelectContent>{genders.map(g => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                    <FormField control={smartPlannerForm.control} name="height_cm" render={({ field }) => (<FormItem><FormLabel>Height (cm)</FormLabel><FormControl><div><Input type="number" placeholder="e.g., 175" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} step="0.1" onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()} /></div></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={smartPlannerForm.control} name="current_weight" render={({ field }) => (<FormItem><FormLabel>Current Weight (kg)</FormLabel><FormControl><div><Input type="number" placeholder="e.g., 70" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} step="0.1" onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()} /></div></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={smartPlannerForm.control} name="goal_weight_1m" render={({ field }) => (<FormItem><FormLabel>Target Weight After 1 Month (kg)</FormLabel><FormControl><div><Input type="number" placeholder="e.g., 68" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} step="0.1" onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()} /></div></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={smartPlannerForm.control} name="ideal_goal_weight" render={({ field }) => (<FormItem><FormLabel>Long-Term Goal Weight (kg) <span className="text-xs text-muted-foreground">(Optional)</span></FormLabel><FormControl><div><Input type="number" placeholder="e.g., 65" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} step="0.1" onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()} /></div></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={smartPlannerForm.control} name="activity_factor_key" render={({ field }) => (<FormItem><FormLabel>Physical Activity Level</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><div><SelectTrigger><SelectValue placeholder="Select activity level" /></SelectTrigger></div></FormControl><SelectContent>{activityLevels.map(al => <SelectItem key={al.value} value={al.value}>{al.label}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                    <FormField control={smartPlannerForm.control} name="dietGoal" render={({ field }) => (<FormItem><FormLabel>Diet Goal</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><div><SelectTrigger><SelectValue placeholder="Select diet goal" /></SelectTrigger></div></FormControl><SelectContent>{smartPlannerDietGoals.map(dg => <SelectItem key={dg.value} value={dg.value}>{dg.label}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                  </AccordionContent>
                </AccordionItem>

                 <AccordionItem value="body-comp">
                    <AccordionTrigger className="text-xl font-semibold">💪 Body Composition (Optional)</AccordionTrigger>
                    <AccordionContent className="space-y-1 pt-4 px-1">
                        <div className="grid grid-cols-4 gap-x-2 pb-1 border-b mb-2 text-sm font-medium text-muted-foreground">
                            <FormLabel className="col-span-1">Metric</FormLabel>
                            <FormLabel className="text-center">Current (%)</FormLabel>
                            <FormLabel className="text-center">Target (1 Mth) (%)</FormLabel>
                            <FormLabel className="text-center">Ideal (%)</FormLabel>
                        </div>
                        {(['Body Fat', 'Muscle Mass', 'Body Water'] as const).map((metric) => {
                            const keys = {
                                'Body Fat': ['bf_current', 'bf_target', 'bf_ideal'],
                                'Muscle Mass': ['mm_current', 'mm_target', 'mm_ideal'],
                                'Body Water': ['bw_current', 'bw_target', 'bw_ideal'],
                            }[metric] as [FieldPath<SmartCaloriePlannerFormValues>, FieldPath<SmartCaloriePlannerFormValues>, FieldPath<SmartCaloriePlannerFormValues>];
                            return (
                                <div key={metric} className="grid grid-cols-4 gap-x-2 items-start py-1"> 
                                    <FormLabel className="text-sm pt-2">{metric}</FormLabel> 
                                    {keys.map(key => (
                                        <FormField key={key} control={smartPlannerForm.control} name={key}
                                          render={({ field }) => (
                                            <FormItem className="text-center">
                                              <FormControl>
                                                <div>
                                                  <Input 
                                                    type="number" 
                                                    placeholder="e.g., 20" 
                                                    {...field} 
                                                    value={field.value ?? ''} 
                                                    onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} 
                                                    className="w-full text-center text-sm h-9" 
                                                    step="0.1"
                                                    onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
                                                  />
                                                </div>
                                              </FormControl>
                                              <FormMessage className="text-xs text-center"/>
                                            </FormItem>
                                          )}
                                        />
                                    ))}
                                </div>
                            );
                        })}
                    </AccordionContent>
                </AccordionItem>

                <AccordionItem value="measurements">
                    <AccordionTrigger className="text-xl font-semibold">📏 Measurements (Optional)</AccordionTrigger>
                     <AccordionContent className="space-y-1 pt-4 px-1">
                        <div className="grid grid-cols-4 gap-x-2 pb-1 border-b mb-2 text-sm font-medium text-muted-foreground">
                            <FormLabel className="col-span-1">Metric</FormLabel>
                            <FormLabel className="text-center">Current (cm)</FormLabel>
                            <FormLabel className="text-center">1-Mth Goal (cm)</FormLabel>
                            <FormLabel className="text-center">Ideal (cm)</FormLabel>
                        </div>
                        {(['Waist', 'Hips', 'Right Leg', 'Left Leg', 'Right Arm', 'Left Arm'] as const).map((metric) => {
                             const keys = {
                                'Waist': ['waist_current', 'waist_goal_1m', 'waist_ideal'],
                                'Hips': ['hips_current', 'hips_goal_1m', 'hips_ideal'],
                                'Right Leg': ['right_leg_current', 'right_leg_goal_1m', 'right_leg_ideal'],
                                'Left Leg': ['left_leg_current', 'left_leg_goal_1m', 'left_leg_ideal'],
                                'Right Arm': ['right_arm_current', 'right_arm_goal_1m', 'right_arm_ideal'],
                                'Left Arm': ['left_arm_current', 'left_arm_goal_1m', 'left_arm_ideal'],
                            }[metric] as [FieldPath<SmartCaloriePlannerFormValues>, FieldPath<SmartCaloriePlannerFormValues>, FieldPath<SmartCaloriePlannerFormValues>];
                            return (
                                <div key={metric} className="grid grid-cols-4 gap-x-2 items-start py-1"> 
                                    <FormLabel className="text-sm pt-2">{metric}</FormLabel> 
                                    {keys.map(key => (
                                        <FormField key={key} control={smartPlannerForm.control} name={key}
                                            render={({ field }) => (
                                              <FormItem className="text-center">
                                                <FormControl>
                                                  <div>
                                                    <Input 
                                                      type="number" 
                                                      placeholder="e.g., 80" 
                                                      {...field} 
                                                      value={field.value ?? ''}  
                                                      onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} 
                                                      className="w-full text-center text-sm h-9" 
                                                      step="0.1"
                                                      onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
                                                    />
                                                  </div>
                                                </FormControl>
                                                <FormMessage className="text-xs text-center"/>
                                              </FormItem>
                                            )}
                                        />
                                    ))}
                                </div>
                            );
                        })}
                    </AccordionContent>
                </AccordionItem>


                <AccordionItem value="help-section">
                    <AccordionTrigger className="text-xl font-semibold"> <div className="flex items-center"> <HelpCircle className="mr-2 h-6 w-6 text-primary" /> How is this calculated? </div> </AccordionTrigger>
                    <AccordionContent className="text-sm space-y-4 pt-3 max-h-96 overflow-y-auto">
                        <div> <h4 className="font-semibold text-base">1. Basal Metabolic Rate (BMR) & Total Daily Energy Expenditure (TDEE)</h4> <p>We use the <strong className="text-primary">Mifflin-St Jeor Equation</strong> for BMR, then multiply by an <strong className="text-primary">activity factor</strong> (derived from your selected 'Physical Activity Level') for TDEE.</p></div>
                        <div>
                           <h4 className="font-semibold text-base mt-2">2. Target Daily Calories</h4>
                           <p>This is determined based on your goals, selected "Diet Goal", and optionally, body composition changes:</p>
                           <ul className="list-disc pl-5 space-y-1 mt-1">
                            <li><strong>Primary Goal (Weight & Diet Goal):</strong> Initially calculated from your 1-month weight target. Your "Diet Goal" (e.g., "Fat loss," "Muscle gain") then refines this. For example, "Fat loss" aims for a deficit (e.g., TDEE - 200 to -500 kcal), while "Muscle gain" aims for a surplus (e.g., TDEE + 150 to +300 kcal). "Recomposition" targets a slight deficit or near-maintenance calories. These adjustments ensure the calorie target aligns with your primary objective.</li>
                            <li><strong>Body Fat % Goal (Optional Refinement):</strong> If you provide current and target body fat percentages, the calorie target may be further refined by averaging the weight-goal-based calories with calories estimated to achieve your body fat change.</li>
                            <li><strong>Waist Goal (Alternative View):</strong> If waist goals are provided, an alternative calorie target is estimated for perspective. This is not the primary target but an additional indicator.</li>
                           </ul>
                        </div>
                         <div> 
                           <h4 className="font-semibold text-base mt-2">3. Suggested Macro Split (Default)</h4> 
                           <p>The default suggested protein/carb/fat percentage split (shown in the 'Original Plan' results) is based on your selected "Diet Goal":</p> 
                           <ul className="list-disc pl-5 space-y-1 mt-1"> 
                             <li><strong>Fat Loss:</strong> Approx. 35% Protein / 35% Carbs / 30% Fat</li> 
                             <li><strong>Muscle Gain:</strong> Approx. 30% Protein / 50% Carbs / 20% Fat</li> 
                             <li><strong>Recomposition:</strong> Approx. 40% Protein / 35% Carbs / 25% Fat</li> 
                           </ul> 
                            <p className="mt-1">You can further customize this in the "Customize Your Plan" section below.</p>
                         </div>
                        <div> <h4 className="font-semibold text-base mt-2">4. Safe Pace</h4> <p>Sustainable weight loss is often around 0.5–1 kg (1–2 lbs) per week. Muscle gain is slower, around 0.25–0.5 kg (0.5–1 lb) per week. Large body composition or measurement changes in just 1 month may be unrealistic for many.</p> </div>
                    </AccordionContent>
                </AccordionItem>
              </Accordion>

              <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 mt-8">
                <Button type="submit" className="flex-1 text-lg py-3" disabled={smartPlannerForm.formState.isSubmitting}> <Calculator className="mr-2 h-5 w-5" /> {smartPlannerForm.formState.isSubmitting ? "Calculating..." : "Calculate Smart Target"} </Button>
              </div>
                 <div className="mt-4 flex justify-end">
                    <Button type="button" variant="ghost" onClick={handleSmartPlannerReset} className="text-sm"> <RefreshCcw className="mr-2 h-4 w-4" /> Reset Smart Planner Inputs </Button>
                </div>
            </form>
          </Form>

          {results && (
            <Card className="mt-8 bg-muted/30 shadow-inner">
              <CardHeader>
                <CardTitle className="text-2xl font-semibold text-primary">Original Plan (System Generated)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4 text-base">
                    <p><strong>Maintenance Calories (TDEE):</strong> {results.tdee?.toFixed(0) ?? 'N/A'} kcal</p>
                    <p><strong>Basal Metabolic Rate (BMR):</strong> {results.bmr?.toFixed(0) ?? 'N/A'} kcal</p>
                </div>
                <hr/>
                <p className="text-lg font-medium"><strong>Primary Target Daily Calories: <span className="text-primary">{results.finalTargetCalories?.toFixed(0) ?? 'N/A'} kcal</span></strong></p>
                 <p className="text-sm text-muted-foreground"> (Based on your weight &amp; diet goals. Optional BF% goal may refine this.)</p>
                
                <p><strong>Estimated Weekly Progress:</strong> {results.estimatedWeeklyWeightChangeKg !== undefined && results.estimatedWeeklyWeightChangeKg >= 0 ? `${(results.estimatedWeeklyWeightChangeKg ?? 0)?.toFixed(2)} kg surplus/week (Potential Gain)` : `${Math.abs(results.estimatedWeeklyWeightChangeKg ?? 0).toFixed(2)} kg deficit/week (Potential Loss)`}</p>
                <hr/>
                <div className="pt-4">
                    <CardTitle className="text-xl font-semibold mb-3 text-primary">Suggested Macronutrient Breakdown</CardTitle>
                    <Table>
                        <TableHeader>
                            <TableRow>{/* */}
                                <TableHead>Macronutrient</TableHead>{/* */}
                                <TableHead className="text-right">% of Daily Calories</TableHead>{/* */}
                                <TableHead className="text-right">Grams per Day</TableHead>{/* */}
                                <TableHead className="text-right">Calories per Day</TableHead>{/* */}
                            </TableRow>{/* */}
                        </TableHeader>
                        <TableBody>
                            <TableRow>{/* */}
                                <TableCell className="font-medium">Protein</TableCell>{/* */}
                                <TableCell className="text-right">{results.proteinTargetPct !== undefined ? (results.proteinTargetPct * 100)?.toFixed(0) : 'N/A'}%</TableCell>{/* */}
                                <TableCell className="text-right">{results.proteinGrams?.toFixed(1) ?? 'N/A'} g</TableCell>{/* */}
                                <TableCell className="text-right">{results.proteinCalories?.toFixed(0) ?? 'N/A'} kcal</TableCell>{/* */}
                            </TableRow>{/* */}
                            <TableRow>{/* */}
                                <TableCell className="font-medium">Carbohydrates</TableCell>{/* */}
                                <TableCell className="text-right">{results.carbTargetPct !== undefined ? (results.carbTargetPct * 100)?.toFixed(0) : 'N/A'}%</TableCell>{/* */}
                                <TableCell className="text-right">{results.carbGrams?.toFixed(1) ?? 'N/A'} g</TableCell>{/* */}
                                <TableCell className="text-right">{results.carbCalories?.toFixed(0) ?? 'N/A'} kcal</TableCell>{/* */}
                            </TableRow>{/* */}
                             <TableRow>{/* */}
                                <TableCell className="font-medium">Fat</TableCell>{/* */}
                                <TableCell className="text-right">{results.fatTargetPct !== undefined ? (results.fatTargetPct * 100)?.toFixed(0) : 'N/A'}%</TableCell>{/* */}
                                <TableCell className="text-right">{results.fatGrams?.toFixed(1) ?? 'N/A'} g</TableCell>{/* */}
                                <TableCell className="text-right">{results.fatCalories?.toFixed(0) ?? 'N/A'} kcal</TableCell>{/* */}
                            </TableRow>{/* */}
                        </TableBody>
                         <TableCaption className="text-xs mt-2 text-left"> This breakdown is based on your inputs and calculated goal. For custom macro adjustments, use the 'Customize Your Plan' section below. </TableCaption>
                    </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {results && (
            <Card className="mt-8">
                <CardHeader>
                    <CardTitle className="text-2xl font-semibold flex items-center">
                        <Edit3 className="mr-2 h-6 w-6 text-primary"/> Customize Your Plan
                    </CardTitle>
                    <CardDescription>Adjust the system-generated plan with your preferences.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...smartPlannerForm}> {/* This Form tag is redundant here if the outer one covers all inputs */}
                        <form className="space-y-6"> {/* This form tag is also redundant */}
                            <div className="grid md:grid-cols-2 gap-x-6 gap-y-4 items-start">
                                <FormField
                                    control={smartPlannerForm.control}
                                    name="custom_total_calories"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="flex items-center">
                                                Custom Total Calories
                                                <Tooltip>
                                                    <TooltipTrigger asChild><span><Button variant="ghost" size="icon" className="h-5 w-5 ml-1 p-0"><Info className="h-3 w-3"/></Button></span></TooltipTrigger>
                                                    <TooltipContent className="w-64"><p>Override the system-calculated total daily calories. Leave blank to use the original estimate: {results.finalTargetCalories?.toFixed(0) ?? 'N/A'} kcal.</p></TooltipContent>
                                                </Tooltip>
                                            </FormLabel>
                                            <FormControl><div><Input type="number" placeholder={`e.g., ${results.finalTargetCalories?.toFixed(0) ?? '2000'}`} {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : parseInt(e.target.value,10))} step="1" onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()} /></div></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={smartPlannerForm.control}
                                    name="custom_protein_per_kg"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="flex items-center">
                                                Custom Protein (g/kg)
                                                <Tooltip>
                                                    <TooltipTrigger asChild><span><Button variant="ghost" size="icon" className="h-5 w-5 ml-1 p-0"><Info className="h-3 w-3"/></Button></span></TooltipTrigger>
                                                    <TooltipContent className="w-64"><p>Set your desired protein intake in grams per kg of your current body weight ({results.current_weight_for_custom_calc?.toFixed(1) ?? smartPlannerForm.getValues("current_weight")?.toFixed(1) ?? 'N/A'} kg). Affects protein, carbs, and fat distribution. Original estimate: {results.current_weight_for_custom_calc && results.current_weight_for_custom_calc > 0 && results.proteinGrams ? (results.proteinGrams / results.current_weight_for_custom_calc).toFixed(1) : 'N/A'} g/kg.</p></TooltipContent>
                                                </Tooltip>
                                            </FormLabel>
                                            <FormControl><div><Input type="number" placeholder={`e.g., ${results.current_weight_for_custom_calc && results.current_weight_for_custom_calc > 0 && results.proteinGrams ? (results.proteinGrams / results.current_weight_for_custom_calc).toFixed(1) : '1.6'}`} {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} step="0.1" onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()} /></div></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                 <FormField
                                    control={smartPlannerForm.control}
                                    name="remaining_calories_carb_pct"
                                    render={({ field }) => {
                                      const currentCarbPct = field.value ?? 50;
                                      const currentFatPct = 100 - currentCarbPct;
                                      return (
                                        <FormItem className="md:col-span-2">
                                            <FormLabel className="flex items-center">
                                                Remaining Calories from Carbs (%)
                                                 <Tooltip>
                                                    <TooltipTrigger asChild><span><Button variant="ghost" size="icon" className="h-5 w-5 ml-1 p-0"><Info className="h-3 w-3"/></Button></span></TooltipTrigger>
                                                    <TooltipContent className="w-64"><p>After protein is set, this slider determines how the remaining calories are split between carbohydrates and fat. Slide to adjust the carbohydrate percentage; fat will be the remainder.</p></TooltipContent>
                                                </Tooltip>
                                            </FormLabel>
                                            <FormControl>
                                              <div className="flex flex-col space-y-2 pt-1">
                                                <Slider
                                                    value={[currentCarbPct]}
                                                    onValueChange={(value) => field.onChange(value[0])}
                                                    min={0}
                                                    max={100}
                                                    step={1}
                                                />
                                                <div className="flex justify-between text-xs text-muted-foreground">
                                                    <span>Carbs: {currentCarbPct.toFixed(0)}%</span>
                                                    <span>Fat: {currentFatPct.toFixed(0)}%</span>
                                                </div>
                                              </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                      );
                                    }}
                                />
                            </div>
                             <div className="mt-2 flex justify-end">
                                <Button type="button" variant="ghost" onClick={handleCustomPlanReset} size="sm">
                                    <RefreshCcw className="mr-2 h-3 w-3" /> Reset Custom Inputs
                                </Button>
                            </div>

                            {customPlanResults && (
                                <div className="mt-6">
                                    <h4 className="text-xl font-semibold mb-2 text-primary">Your Custom Plan Breakdown</h4>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>{/* */}
                                                <TableHead>Macronutrient</TableHead>{/* */}
                                                <TableHead className="text-right">% of Daily Calories</TableHead>{/* */}
                                                <TableHead className="text-right">Grams per Day</TableHead>{/* */}
                                                <TableHead className="text-right">Calories per Day</TableHead>{/* */}
                                            </TableRow>{/* */}
                                        </TableHeader>
                                        <TableBody>
                                            <TableRow>{/* */}
                                                <TableCell className="font-medium">Protein</TableCell>{/* */}
                                                <TableCell className="text-right">{customPlanResults.proteinTargetPct?.toFixed(0) ?? 'N/A'}%</TableCell>{/* */}
                                                <TableCell className="text-right">{customPlanResults.proteinGrams?.toFixed(1) ?? 'N/A'} g</TableCell>{/* */}
                                                <TableCell className="text-right">{customPlanResults.proteinCalories?.toFixed(0) ?? 'N/A'} kcal</TableCell>{/* */}
                                            </TableRow>{/* */}
                                            <TableRow>{/* */}
                                                <TableCell className="font-medium">Carbohydrates</TableCell>{/* */}
                                                <TableCell className="text-right">{customPlanResults.carbTargetPct?.toFixed(0) ?? 'N/A'}%</TableCell>{/* */}
                                                <TableCell className="text-right">{customPlanResults.carbGrams?.toFixed(1) ?? 'N/A'} g</TableCell>{/* */}
                                                <TableCell className="text-right">{customPlanResults.carbCalories?.toFixed(0) ?? 'N/A'} kcal</TableCell>{/* */}
                                            </TableRow>{/* */}
                                             <TableRow>{/* */}
                                                <TableCell className="font-medium">Fat</TableCell>{/* */}
                                                <TableCell className="text-right">{customPlanResults.fatTargetPct?.toFixed(0) ?? 'N/A'}%</TableCell>{/* */}
                                                <TableCell className="text-right">{customPlanResults.fatGrams?.toFixed(1) ?? 'N/A'} g</TableCell>{/* */}
                                                <TableCell className="text-right">{customPlanResults.fatCalories?.toFixed(0) ?? 'N/A'} kcal</TableCell>{/* */}
                                            </TableRow>{/* */}
                                            <TableRow className="font-semibold bg-muted/50">{/* */}
                                                <TableCell>Total</TableCell>{/* */}
                                                <TableCell className="text-right">100%</TableCell>{/* */}
                                                <TableCell className="text-right">-</TableCell>{/* */}
                                                <TableCell className="text-right">{customPlanResults.totalCalories?.toFixed(0) ?? 'N/A'} kcal</TableCell>{/* */}
                                            </TableRow>{/* */}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </form>
                    </Form>
                </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
    </TooltipProvider>
  );
}
;
