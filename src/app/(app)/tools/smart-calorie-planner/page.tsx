
"use client";

import React, { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from "@/components/ui/table";
import { BrainCircuit, Calculator, HelpCircle, AlertTriangle } from "lucide-react";
import { SmartCaloriePlannerFormSchema, type SmartCaloriePlannerFormValues, MacroCalculatorFormSchema, type MacroCalculatorFormValues, type MacroResults } from "@/lib/schemas";
import { activityLevels, genders, smartPlannerDietGoals } from "@/lib/constants";
import { calculateBMR } from "@/lib/nutrition-calculator"; // Assuming calculateBMR is correctly exported
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Slider } from "@/components/ui/slider";

interface CalculationResults {
  bmr: number;
  tdee: number;
  targetCaloriesScenario1: number;
  targetCaloriesScenario2?: number;
  targetCaloriesScenario3?: number;
  finalTargetCalories: number;
  estimatedWeeklyWeightChangeKg: number;
  waistChangeWarning?: string;
  proteinTargetPct: number;
  proteinGrams: number;
  proteinCalories: number;
  carbsTargetPct: number;
  carbsGrams: number;
  carbsCalories: number;
  fatTargetPct: number;
  fatGrams: number;
  fatCalories: number;
}

function calculateManualMacros(
  weight_kg: number,
  protein_per_kg: number,
  target_calories: number,
  percent_carb_slider_value: number
): MacroResults {
  const CAL_PER_GRAM_PROTEIN = 4;
  const CAL_PER_GRAM_CARB = 4;
  const CAL_PER_GRAM_FAT = 9;

  const percent_carb_decimal = percent_carb_slider_value / 100;

  let protein_grams = weight_kg * protein_per_kg;
  let protein_cals = protein_grams * CAL_PER_GRAM_PROTEIN;

  let remaining_cals_for_carbs_fat = target_calories - protein_cals;
  
  if (remaining_cals_for_carbs_fat < 0) {
    // This scenario means protein calories alone exceed target calories.
    // Adjust protein to fit within target_calories if desired, or cap remaining_cals.
    // For simplicity here, let's assume protein cannot exceed target_calories.
    // A more robust solution might warn the user or adjust protein_per_kg.
    protein_cals = target_calories;
    protein_grams = protein_cals / CAL_PER_GRAM_PROTEIN;
    remaining_cals_for_carbs_fat = 0; // No calories left for carbs/fat
  }

  const carb_cals = remaining_cals_for_carbs_fat * percent_carb_decimal;
  const percent_fat_decimal = 1 - percent_carb_decimal;
  const fat_cals = remaining_cals_for_carbs_fat * percent_fat_decimal;

  const carb_grams = carb_cals / CAL_PER_GRAM_CARB;
  const fat_grams = fat_cals / CAL_PER_GRAM_FAT;
  
  // Ensure no negative values for grams due to extreme inputs
  const final_protein_grams = Math.max(0, protein_grams);
  const final_carb_grams = Math.max(0, carb_grams);
  const final_fat_grams = Math.max(0, fat_grams);

  const final_protein_cals = final_protein_grams * CAL_PER_GRAM_PROTEIN;
  const final_carb_cals = final_carb_grams * CAL_PER_GRAM_CARB;
  const final_fat_cals = final_fat_grams * CAL_PER_GRAM_FAT;

  const total_cals_calculated = final_protein_cals + final_carb_cals + final_fat_cals;
  
  const protein_pct = target_calories > 0 ? Math.round((final_protein_cals / target_calories) * 100) : 0;
  const carb_pct = target_calories > 0 ? Math.round((final_carb_cals / target_calories) * 100) : 0;
  let fat_pct_calculated = target_calories > 0 ? Math.round((final_fat_cals / target_calories) * 100) : 0;
  
  // Adjust fat_pct to make sum 100% if target_calories > 0
  if (target_calories > 0) {
    const current_sum_pct = protein_pct + carb_pct + fat_pct_calculated;
    if (current_sum_pct !== 100 && current_sum_pct > 0) { // Avoid division by zero or nonsensical adjustments
        fat_pct_calculated = 100 - protein_pct - carb_pct;
    }
  }


  return {
    Protein_g: Math.round(final_protein_grams),
    Carbs_g: Math.round(final_carb_grams),
    Fat_g: Math.round(final_fat_grams),
    Protein_cals: Math.round(final_protein_cals),
    Carb_cals: Math.round(final_carb_cals),
    Fat_cals: Math.round(final_fat_cals),
    Total_cals: Math.round(total_cals_calculated), // Sum of calculated cals, might slightly differ from target_calories due to rounding
    Protein_pct: protein_pct,
    Carb_pct: carb_pct,
    Fat_pct: Math.max(0, fat_pct_calculated), // Ensure fat_pct is not negative
  };
}


export default function SmartCaloriePlannerPage() {
  const [results, setResults] = useState<CalculationResults | null>(null);
  const [manualResults, setManualResults] = useState<MacroResults | null>(null);
  const [showManualCalculator, setShowManualCalculator] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const smartPlannerForm = useForm<SmartCaloriePlannerFormValues>({
    resolver: zodResolver(SmartCaloriePlannerFormSchema),
    defaultValues: {
      age: undefined, gender: undefined, height_cm: undefined, current_weight: undefined,
      goal_weight_1m: undefined, ideal_goal_weight: undefined, activity_factor_key: undefined,
      dietGoal: "fat_loss", // Default diet goal
      bf_current: undefined, bf_target: undefined, bf_ideal: undefined,
      mm_current: undefined, mm_target: undefined, mm_ideal: undefined,
      bw_current: undefined, bw_target: undefined, bw_ideal: undefined,
      waist_current: undefined, waist_goal_1m: undefined, waist_ideal: undefined,
      hips_current: undefined, hips_goal_1m: undefined, hips_ideal: undefined,
      right_leg_current: undefined, right_leg_goal_1m: undefined, right_leg_ideal: undefined,
      left_leg_current: undefined, left_leg_goal_1m: undefined, left_leg_ideal: undefined,
      right_arm_current: undefined, right_arm_goal_1m: undefined, right_arm_ideal: undefined,
      left_arm_current: undefined, left_arm_goal_1m: undefined, left_arm_ideal: undefined,
    },
  });

  const manualCalculatorForm = useForm<MacroCalculatorFormValues>({
    resolver: zodResolver(MacroCalculatorFormSchema),
    defaultValues: {
      weight_kg: undefined, 
      protein_per_kg: 1.5,
      target_calories: 2000,
      percent_carb: 60,
    },
  });

  const watchedPercentCarbManual = manualCalculatorForm.watch("percent_carb");


  useEffect(() => {
    if (user?.id) {
      // Load Smart Planner results
      const savedSmartResultsRaw = localStorage.getItem(`nutriplan_smart_planner_results_${user.id}`);
      if (savedSmartResultsRaw) {
        try {
          const savedResults = JSON.parse(savedSmartResultsRaw);
           setResults({
            bmr: savedResults.bmr || 0,
            tdee: savedResults.tdee || 0,
            targetCaloriesScenario1: savedResults.targetCaloriesScenario1 || 0,
            targetCaloriesScenario2: savedResults.targetCaloriesScenario2,
            targetCaloriesScenario3: savedResults.targetCaloriesScenario3,
            finalTargetCalories: savedResults.calories || 0, // from stored data
            estimatedWeeklyWeightChangeKg: savedResults.estimatedWeeklyWeightChangeKg || 0,
            waistChangeWarning: savedResults.waistChangeWarning,
            proteinTargetPct: savedResults.proteinTargetPct || 0,
            proteinGrams: savedResults.protein_g || 0,
            proteinCalories: (savedResults.protein_g || 0) * 4,
            carbsTargetPct: savedResults.carbsTargetPct || 0,
            carbsGrams: savedResults.carbs_g || 0,
            carbsCalories: (savedResults.carbs_g || 0) * 4,
            fatTargetPct: savedResults.fatTargetPct || 0,
            fatGrams: savedResults.fat_g || 0,
            fatCalories: (savedResults.fat_g || 0) * 9,
           });
          // toast({title: "Loaded Saved Smart Plan", description: "Previously calculated smart calorie plan loaded."});
        } catch (e) {
          console.error("Failed to parse saved smart planner results:", e);
          localStorage.removeItem(`nutriplan_smart_planner_results_${user.id}`);
        }
      }
      // Load Manual Calculator results
      const savedManualResultsRaw = localStorage.getItem(`nutriplan_macro_calculator_results_${user.id}`);
      if (savedManualResultsRaw) {
        try {
            const savedManualData = JSON.parse(savedManualResultsRaw);
            setManualResults(savedManualData);
            // Optionally pre-fill manual form if data exists for it
            // manualCalculatorForm.reset(...) 
            // toast({title: "Loaded Saved Manual Macros", description: "Previously calculated manual macro breakdown loaded."});
        } catch(e) {
            console.error("Failed to parse saved manual macro results:", e);
            localStorage.removeItem(`nutriplan_macro_calculator_results_${user.id}`);
        }
      }
    }
  }, [user, toast, manualCalculatorForm]);


  function onSubmit(data: SmartCaloriePlannerFormValues) {
    const selectedActivity = activityLevels.find(al => al.value === data.activity_factor_key);
    if (!selectedActivity) {
      smartPlannerForm.setError("activity_factor_key", { type: "manual", message: "Invalid activity level selected." });
      return;
    }
    const activityFactor = selectedActivity.activityFactor;

    const bmr = calculateBMR(data.gender, data.current_weight, data.height_cm, data.age);
    const tdee = Math.round(bmr * activityFactor);

    // Scenario 1: Base on weight goal
    let targetCaloriesS1 = tdee; // Default to TDEE if no weight goal
    if (data.current_weight !== undefined && data.goal_weight_1m !== undefined) {
        const weightDeltaS1 = data.current_weight - data.goal_weight_1m;
        const calorieAdjustmentS1 = (7700 * weightDeltaS1) / 30; // 7700 kcal per kg, over 30 days
        targetCaloriesS1 = tdee - calorieAdjustmentS1;
    }
    
    // Adjust S1 based on dietGoal
    if (data.dietGoal === "fat_loss") {
      // Ensure at least a 200 kcal deficit from TDEE, max reasonable deficit around 500-750 or 20-25% of TDEE
      // Take the more aggressive of weight-goal derived calories or TDEE-200, but not less than TDEE-750 (example cap)
      const deficitBasedOnGoal = targetCaloriesS1;
      const moderateDeficit = tdee - 200;
      const aggressiveDeficit = tdee - 500; // Typical fat loss deficit
      targetCaloriesS1 = Math.min(deficitBasedOnGoal, moderateDeficit);
      if (deficitBasedOnGoal > moderateDeficit && targetCaloriesS1 > aggressiveDeficit && tdee > aggressiveDeficit) {
          targetCaloriesS1 = aggressiveDeficit;
      }

    } else if (data.dietGoal === "muscle_gain") {
      // Ensure at least a 150 kcal surplus from TDEE, max reasonable surplus around 300-500
      const surplusBasedOnGoal = targetCaloriesS1;
      const moderateSurplus = tdee + 150;
      const typicalSurplus = tdee + 300;
      targetCaloriesS1 = Math.max(surplusBasedOnGoal, moderateSurplus);
       if (surplusBasedOnGoal < moderateSurplus && targetCaloriesS1 < typicalSurplus) {
          targetCaloriesS1 = typicalSurplus;
      }
    } else if (data.dietGoal === "recomp") {
      // Slight deficit, around TDEE - 200, or near maintenance.
      // Weight goal calculation already handles this, so we just ensure it's not a surplus.
      // If goal_weight_1m suggests gain, recomp might be TDEE - 200 or just TDEE.
      // For simplicity, let's target TDEE or a very slight deficit for recomp if weight goal is maintenance/gain
      if (data.goal_weight_1m !== undefined && data.current_weight <= data.goal_weight_1m) {
        targetCaloriesS1 = Math.min(targetCaloriesS1, tdee - 100); // Slight deficit for recomp
      } else { // If weight goal is loss, it's already a deficit
         targetCaloriesS1 = Math.min(targetCaloriesS1, tdee - 200); // Ensure recomp has some deficit if S1 was already a deficit
      }
    }
    targetCaloriesS1 = Math.round(targetCaloriesS1);


    // Scenario 2: With Body Fat %
    let targetCaloriesS2: number | undefined = undefined;
    if (data.bf_current !== undefined && data.bf_target !== undefined && data.current_weight > 0 && data.bf_current > 0 && data.bf_target > 0) {
      const referenceWeightForBFTarget = data.goal_weight_1m || data.current_weight; // Use goal weight if defined for BF target reference
      const fatMassLossKg = referenceWeightForBFTarget * ( (data.bf_current - data.bf_target) / 100 );
      const calorieAdjustmentS2 = (7700 * fatMassLossKg) / 30;
      targetCaloriesS2 = Math.round(tdee - calorieAdjustmentS2);
    }

    // Scenario 3: With Measurements (Waist)
    let targetCaloriesS3: number | undefined = undefined;
    let waistWarning: string | undefined = undefined;
    if (data.waist_current !== undefined && data.waist_goal_1m !== undefined && data.current_weight > 0 && data.waist_current > 0 && data.waist_goal_1m > 0) {
      const waistChangeCm = data.waist_current - data.waist_goal_1m;
      if (Math.abs(waistChangeCm) > 5) { // More than ~2 inches
        waistWarning = "Warning: A waist change of more than 4-5 cm in 4 weeks may be unrealistic or unsustainable.";
      }
      // Heuristic: approx 0.5% body fat change per 1cm waist change. This is very rough.
      const estimatedFatLossPercentFromWaist = waistChangeCm * 0.5; 
      const estimatedFatLossKgFromWaist = (estimatedFatLossPercentFromWaist / 100) * data.current_weight;
      const calorieAdjustmentS3 = (7700 * estimatedFatLossKgFromWaist) / 30;
      targetCaloriesS3 = Math.round(tdee - calorieAdjustmentS3);
    }

    // Determine final target calories
    let finalTargetCalories = targetCaloriesS1;
    if (targetCaloriesS2 !== undefined) {
      // If BF% target is provided, average S1 (diet goal adjusted) and S2
      finalTargetCalories = Math.round((targetCaloriesS1 + targetCaloriesS2) / 2);
    }
    
    // Ensure finalTargetCalories is not excessively low or high (e.g., min 1200 for safety)
    finalTargetCalories = Math.max(1200, finalTargetCalories); 

    const weeklyCalorieDelta = (tdee - finalTargetCalories) * 7;
    const estimatedWeeklyWeightChangeKg = parseFloat((weeklyCalorieDelta / 7700).toFixed(2));

    // Calculate macros based on finalTargetCalories and dietGoal
    let proteinTargetPct: number, carbsTargetPct: number, fatTargetPct: number;

    if (data.dietGoal === "fat_loss") {
      proteinTargetPct = 35; carbsTargetPct = 35; fatTargetPct = 30;
    } else if (data.dietGoal === "muscle_gain") {
      proteinTargetPct = 30; carbsTargetPct = 50; fatTargetPct = 20;
    } else { // Recomposition or other
      proteinTargetPct = 40; carbsTargetPct = 35; fatTargetPct = 25;
    }

    const proteinCalories = Math.round(finalTargetCalories * (proteinTargetPct / 100));
    const proteinGrams = Math.round(proteinCalories / 4);

    const carbsCalories = Math.round(finalTargetCalories * (carbsTargetPct / 100));
    const carbsGrams = Math.round(carbsCalories / 4);
    
    const fatCalories = Math.round(finalTargetCalories * (fatTargetPct / 100));
    const fatGrams = Math.round(fatCalories / 9);

    const newResults: CalculationResults = {
      bmr: Math.round(bmr),
      tdee,
      targetCaloriesScenario1: targetCaloriesS1,
      targetCaloriesScenario2: targetCaloriesS2,
      targetCaloriesScenario3: targetCaloriesS3,
      finalTargetCalories,
      estimatedWeeklyWeightChangeKg,
      waistChangeWarning: waistWarning,
      proteinTargetPct,
      proteinGrams,
      proteinCalories,
      carbsTargetPct,
      carbsGrams,
      carbsCalories,
      fatTargetPct,
      fatGrams,
      fatCalories,
    };
    setResults(newResults);

    // Save to localStorage
    if (user?.id) {
      const dataToStore = {
        calories: newResults.finalTargetCalories,
        protein_g: newResults.proteinGrams,
        carbs_g: newResults.carbsGrams,
        fat_g: newResults.fatGrams,
        bmr: newResults.bmr,
        tdee: newResults.tdee,
        targetCaloriesScenario1: newResults.targetCaloriesScenario1,
        targetCaloriesScenario2: newResults.targetCaloriesScenario2,
        targetCaloriesScenario3: newResults.targetCaloriesScenario3,
        estimatedWeeklyWeightChangeKg: newResults.estimatedWeeklyWeightChangeKg,
        waistChangeWarning: newResults.waistChangeWarning,
        proteinTargetPct: newResults.proteinTargetPct,
        carbsTargetPct: newResults.carbsTargetPct,
        fatTargetPct: newResults.fatTargetPct,
      };
      localStorage.setItem(`nutriplan_smart_planner_results_${user.id}`, JSON.stringify(dataToStore));
      toast({title: "Smart Plan Calculated & Saved", description: "Your smart calorie plan has been calculated and saved."});
    }
  }

  function onManualSubmit(data: MacroCalculatorFormValues) {
    const calculated = calculateManualMacros(
      data.weight_kg,
      data.protein_per_kg,
      data.target_calories,
      data.percent_carb
    );
    setManualResults(calculated);
    if (user?.id) {
      localStorage.setItem(`nutriplan_macro_calculator_results_${user.id}`, JSON.stringify(calculated));
      toast({title: "Manual Macros Calculated & Saved", description: "Your manual macro breakdown has been saved."});
    }
  }
  
  const handleSmartPlannerReset = () => {
    smartPlannerForm.reset({
      age: undefined, gender: undefined, height_cm: undefined, current_weight: undefined,
      goal_weight_1m: undefined, ideal_goal_weight: undefined, activity_factor_key: undefined,
      dietGoal: "fat_loss", // Default diet goal
      bf_current: undefined, bf_target: undefined, bf_ideal: undefined,
      mm_current: undefined, mm_target: undefined, mm_ideal: undefined,
      bw_current: undefined, bw_target: undefined, bw_ideal: undefined,
      waist_current: undefined, waist_goal_1m: undefined, waist_ideal: undefined,
      hips_current: undefined, hips_goal_1m: undefined, hips_ideal: undefined,
      right_leg_current: undefined, right_leg_goal_1m: undefined, right_leg_ideal: undefined,
      left_leg_current: undefined, left_leg_goal_1m: undefined, left_leg_ideal: undefined,
      right_arm_current: undefined, right_arm_goal_1m: undefined, right_arm_ideal: undefined,
      left_arm_current: undefined, left_arm_goal_1m: undefined, left_arm_ideal: undefined,
    });
    setResults(null);
    if (user?.id) {
        localStorage.removeItem(`nutriplan_smart_planner_results_${user.id}`);
        toast({title: "Smart Planner Cleared", description: "Saved smart calorie plan has been cleared."});
    }
  };

  const handleManualCalculatorReset = () => {
    manualCalculatorForm.reset({
        weight_kg: undefined,
        protein_per_kg: 1.5,
        target_calories: 2000,
        percent_carb: 60,
    });
    setManualResults(null);
    if (user?.id) {
        localStorage.removeItem(`nutriplan_macro_calculator_results_${user.id}`);
        toast({title: "Manual Macros Cleared", description: "Saved manual macro breakdown has been cleared."});
    }
  };

  // Helper for rendering optional number inputs
  function renderOptionalNumberInput(
    control: any, // Control from useForm
    name: keyof SmartCaloriePlannerFormValues,
    placeholder: string,
    isOptional: boolean = true // Default to true, but can be overridden
  ) {
    return (
      <FormField
        control={control}
        name={name}
        render={({ field }) => (
          <FormItem>
            {/* <FormLabel>{label}</FormLabel> // Labels are now column headers */}
            <FormControl>
              <Input
                type="number"
                placeholder={placeholder}
                {...field}
                value={field.value ?? ''} // Ensure controlled component
                onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value) || undefined)}
                className="text-center h-9 text-sm" // Compact styling
              />
            </FormControl>
            <FormMessage className="text-xs px-1"/>
          </FormItem>
        )}
      />
    );
  }


  return (
    <div className="container mx-auto py-8">
      <Card className="max-w-3xl mx-auto shadow-xl">
        <CardHeader>
          <CardTitle className="text-3xl font-bold flex items-center">
            <BrainCircuit className="mr-3 h-8 w-8 text-primary" />
            Smart Calorie & Macro Planner
          </CardTitle>
          <CardDescription>
            Calculate your daily targets based on your stats and goals, or enter them manually.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...smartPlannerForm}>
            <form onSubmit={smartPlannerForm.handleSubmit(onSubmit)} className="space-y-8">
              <Accordion type="multiple" defaultValue={["basic-info"]} className="w-full">
                <AccordionItem value="basic-info">
                  <AccordionTrigger className="text-xl font-semibold">📋 Basic Info (Required)</AccordionTrigger>
                  <AccordionContent className="grid md:grid-cols-2 gap-x-6 gap-y-4 pt-4">
                    <FormField control={smartPlannerForm.control} name="age" render={({ field }) => ( <FormItem> <FormLabel>Age</FormLabel> <FormControl><Input type="number" placeholder="Years" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseFloat(e.target.value) || undefined)} /></FormControl> <FormMessage /> </FormItem> )} />
                    <FormField control={smartPlannerForm.control} name="gender" render={({ field }) => ( <FormItem> <FormLabel>Biological Sex</FormLabel> <Select onValueChange={field.onChange} value={field.value ?? undefined}> <FormControl><SelectTrigger><SelectValue placeholder="Select sex" /></SelectTrigger></FormControl> <SelectContent>{genders.map(g => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}</SelectContent> </Select> <FormMessage /> </FormItem> )} />
                    <FormField control={smartPlannerForm.control} name="height_cm" render={({ field }) => ( <FormItem> <FormLabel>Height (cm)</FormLabel> <FormControl><Input type="number" placeholder="cm" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseFloat(e.target.value) || undefined)}/></FormControl> <FormMessage /> </FormItem> )} />
                    <FormField control={smartPlannerForm.control} name="current_weight" render={({ field }) => ( <FormItem> <FormLabel>Current Weight (kg)</FormLabel> <FormControl><Input type="number" placeholder="kg" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseFloat(e.target.value) || undefined)}/></FormControl> <FormMessage /> </FormItem> )} />
                    <FormField control={smartPlannerForm.control} name="goal_weight_1m" render={({ field }) => ( <FormItem> <FormLabel>Target Weight (1 Month) (kg)</FormLabel> <FormControl><Input type="number" placeholder="kg" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseFloat(e.target.value) || undefined)}/></FormControl> <FormMessage /> </FormItem> )} />
                    <FormField control={smartPlannerForm.control} name="ideal_goal_weight" render={({ field }) => ( <FormItem> <FormLabel>Long-Term Goal Weight (kg)</FormLabel> <FormControl><Input type="number" placeholder="kg (Optional)" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseFloat(e.target.value) || undefined)}/></FormControl> <FormMessage /> </FormItem> )} />
                    {/* Activity Level and Diet Goal on the same line */}
                    <FormField control={smartPlannerForm.control} name="activity_factor_key" render={({ field }) => ( <FormItem> <FormLabel>Physical Activity Level</FormLabel> <Select onValueChange={field.onChange} value={field.value ?? undefined}> <FormControl><SelectTrigger><SelectValue placeholder="Select activity level" /></SelectTrigger></FormControl> <SelectContent>{activityLevels.map(al => <SelectItem key={al.value} value={al.value}>{al.label}</SelectItem>)}</SelectContent> </Select> <FormMessage /> </FormItem> )} />
                    <FormField control={smartPlannerForm.control} name="dietGoal" render={({ field }) => ( <FormItem> <FormLabel>Diet Goal</FormLabel> <Select onValueChange={field.onChange} value={field.value ?? undefined}> <FormControl><SelectTrigger><SelectValue placeholder="Select diet goal" /></SelectTrigger></FormControl> <SelectContent>{smartPlannerDietGoals.map(dg => <SelectItem key={dg.value} value={dg.value}>{dg.label}</SelectItem>)}</SelectContent> </Select> <FormMessage /> </FormItem> )} />
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="body-comp">
                    <AccordionTrigger className="text-xl font-semibold">💪 Body Composition (Optional)</AccordionTrigger>
                    <AccordionContent className="space-y-1 pt-4">
                        <div className="grid grid-cols-4 gap-x-2 pb-1 border-b mb-2 text-sm font-medium text-muted-foreground">
                            <span className="col-span-1">Metric</span>
                            <span className="text-center">Current (%)</span>
                            <span className="text-center">Target (1 Mth) (%)</span>
                            <span className="text-center">Ideal (%)</span>
                        </div>
                        {[
                            { name: "Body Fat", currentField: "bf_current", targetField: "bf_target", idealField: "bf_ideal", placeholder:"e.g. 20"},
                            { name: "Muscle Mass", currentField: "mm_current", targetField: "mm_target", idealField: "mm_ideal", placeholder:"e.g. 40"},
                            { name: "Body Water", currentField: "bw_current", targetField: "bw_target", idealField: "bw_ideal", placeholder:"e.g. 55"},
                        ].map(metric => (
                            <div key={metric.name} className="grid grid-cols-4 items-start gap-x-2 py-1.5">
                                <span className="pt-2 text-sm col-span-1">{metric.name}</span>
                                {renderOptionalNumberInput(smartPlannerForm.control, metric.currentField as keyof SmartCaloriePlannerFormValues, metric.placeholder)}
                                {renderOptionalNumberInput(smartPlannerForm.control, metric.targetField as keyof SmartCaloriePlannerFormValues, metric.placeholder)}
                                {renderOptionalNumberInput(smartPlannerForm.control, metric.idealField as keyof SmartCaloriePlannerFormValues, metric.placeholder)}
                            </div>
                        ))}
                    </AccordionContent>
                </AccordionItem>

                <AccordionItem value="measurements">
                    <AccordionTrigger className="text-xl font-semibold">📏 Measurements (Optional)</AccordionTrigger>
                     <AccordionContent className="space-y-1 pt-4">
                        <div className="grid grid-cols-4 gap-x-2 pb-1 border-b mb-2 text-sm font-medium text-muted-foreground">
                            <span className="col-span-1">Metric</span>
                            <span className="text-center">Current (cm)</span>
                            <span className="text-center">1-Mth Goal (cm)</span>
                            <span className="text-center">Ideal (cm)</span>
                        </div>
                        {[
                            { name: "Waist", currentField: "waist_current", goalField: "waist_goal_1m", idealField: "waist_ideal", placeholder:"e.g. 80"},
                            { name: "Hips", currentField: "hips_current", goalField: "hips_goal_1m", idealField: "hips_ideal", placeholder:"e.g. 95"},
                            { name: "Right Leg", currentField: "right_leg_current", goalField: "right_leg_goal_1m", idealField: "right_leg_ideal", placeholder:"e.g. 55"},
                            { name: "Left Leg", currentField: "left_leg_current", goalField: "left_leg_goal_1m", idealField: "left_leg_ideal", placeholder:"e.g. 55"},
                            { name: "Right Arm", currentField: "right_arm_current", goalField: "right_arm_goal_1m", idealField: "right_arm_ideal", placeholder:"e.g. 30"},
                            { name: "Left Arm", currentField: "left_arm_current", goalField: "left_arm_goal_1m", idealField: "left_arm_ideal", placeholder:"e.g. 30"},
                        ].map(metric => (
                            <div key={metric.name} className="grid grid-cols-4 items-start gap-x-2 py-1.5">
                                <span className="pt-2 text-sm col-span-1">{metric.name}</span>
                                {renderOptionalNumberInput(smartPlannerForm.control, metric.currentField as keyof SmartCaloriePlannerFormValues, metric.placeholder)}
                                {renderOptionalNumberInput(smartPlannerForm.control, metric.goalField as keyof SmartCaloriePlannerFormValues, metric.placeholder)}
                                {renderOptionalNumberInput(smartPlannerForm.control, metric.idealField as keyof SmartCaloriePlannerFormValues, metric.placeholder)}
                            </div>
                        ))}
                    </AccordionContent>
                </AccordionItem>

                <AccordionItem value="help-section">
                    <AccordionTrigger className="text-xl font-semibold">
                        <div className="flex items-center">
                        <HelpCircle className="mr-2 h-6 w-6 text-primary" /> How is this calculated?
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="text-sm space-y-4 pt-3 max-h-96 overflow-y-auto">
                        <p>This planner estimates daily calorie needs using established formulas and your goals.</p>
                        <div>
                        <h4 className="font-semibold text-base">1. Basal Metabolic Rate (BMR)</h4>
                        <p>We use the <strong className="text-primary">Mifflin-St Jeor Equation</strong> for BMR.</p>
                        <ul className="list-disc pl-5 space-y-1 mt-1">
                            <li><strong>Male/Other:</strong> BMR = (10 × weight kg) + (6.25 × height cm) - (5 × age) + 5</li>
                            <li><strong>Female:</strong> BMR = (10 × weight kg) + (6.25 × height cm) - (5 × age) - 161</li>
                        </ul>
                        </div>
                        <div>
                        <h4 className="font-semibold text-base mt-2">2. Total Daily Energy Expenditure (TDEE)</h4>
                        <p>BMR is multiplied by an <strong className="text-primary">activity factor</strong> for TDEE.</p>
                        <ul className="list-disc pl-5 space-y-1 mt-1">
                            {activityLevels.map(level => ( <li key={level.value}><strong>{level.label.split('(')[0].trim()}:</strong> ×{level.activityFactor}</li> ))}
                        </ul>
                        </div>
                        <div>
                        <h4 className="font-semibold text-base mt-2">3. Target Daily Calories</h4>
                        <p>Adjusted from TDEE based on your goals:</p>
                        <ul className="list-disc pl-5 space-y-1 mt-1">
                            <li><strong>Weight Goal:</strong> Calorie deficit/surplus for 1-month weight goal (7700 kcal/kg).</li>
                            <li><strong>Diet Goal Adjustment:</strong> Your selected "Diet Goal" (Fat loss, Muscle gain, Recomp) further refines this. E.g., "Fat loss" targets a deficit like TDEE - 500 kcal, "Muscle gain" a surplus like TDEE + 300 kcal, and "Recomp" a slight deficit like TDEE - 200 kcal. The most suitable of these or the weight-goal based calorie is chosen.</li>
                            <li><strong>Body Fat % Goal:</strong> If current/target BF% provided, estimates calorie needs for fat mass change. If set, this is averaged with the weight goal estimate.</li>
                            <li><strong>Waist Goal:</strong> A heuristic estimate (0.5% BF change per cm waist change) shown as an alternative if waist goals are set.</li>
                        </ul>
                        </div>
                         <div>
                        <h4 className="font-semibold text-base mt-2">4. Macro Split</h4>
                            <p>The suggested macro split (Protein/Carbs/Fat percentages) is based on your selected "Diet Goal":</p>
                            <ul className="list-disc pl-5 space-y-1 mt-1">
                                <li><strong>Fat Loss:</strong> 35% Protein / 35% Carbs / 30% Fat</li>
                                <li><strong>Muscle Gain:</strong> 30% Protein / 50% Carbs / 20% Fat</li>
                                <li><strong>Recomposition:</strong> 40% Protein / 35% Carbs / 25% Fat</li>
                            </ul>
                        </div>
                        <div>
                        <h4 className="font-semibold text-base mt-2">Calorie Deficit/Surplus</h4>
                        <p> Weight loss: <strong className="text-destructive">calorie deficit</strong> (target &lt; TDEE). Weight/muscle gain: <strong className="text-green-600">calorie surplus</strong> (target &gt; TDEE). </p>
                        </div>
                        <div>
                        <h4 className="font-semibold text-base mt-2">Safe Pace</h4>
                        <p>Loss: 0.5–1 kg/week. Gain: 0.25–0.5 kg/week. Large measurement changes in 1 month may be unrealistic.</p>
                        </div>
                    </AccordionContent>
                </AccordionItem>
              </Accordion>

              <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 mt-8">
                <Button type="submit" className="flex-1 text-lg py-3">
                  <Calculator className="mr-2 h-5 w-5" /> Calculate Smart Target
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowManualCalculator(prev => !prev)} className="flex-1 text-lg py-3">
                   {showManualCalculator ? "Hide Manual Calculator" : "Enter Macros Manually"}
                </Button>
              </div>
            </form>
          </Form>

          {results && (
            <Card className="mt-8 bg-muted/50 shadow-lg">
              <CardHeader>
                <CardTitle className="text-2xl">Your Smart Calorie Plan Results</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p><strong>Basal Metabolic Rate (BMR):</strong> {results.bmr} kcal/day</p>
                <p><strong>Maintenance Calories (TDEE):</strong> {results.tdee} kcal/day</p>
                <hr className="my-2 border-border" />
                <p className="text-primary font-semibold"><strong>Primary Target Daily Calories:</strong> {results.finalTargetCalories} kcal/day</p>
                {(results.targetCaloriesScenario2 !== undefined && smartPlannerForm.getValues("bf_current") && smartPlannerForm.getValues("bf_target")) || smartPlannerForm.getValues("dietGoal") ? (
                    <p className="text-sm text-muted-foreground">
                        (Adjusted based on your weight goal, selected diet goal{results.targetCaloriesScenario2 !== undefined && smartPlannerForm.getValues("bf_current") && smartPlannerForm.getValues("bf_target") ? ", and body fat % goal" : ""}. 
                        Weight goal alone suggested: {results.targetCaloriesScenario1} kcal. 
                        {results.targetCaloriesScenario2 !== undefined ? ` BF% goal alone suggested: ${results.targetCaloriesScenario2} kcal.` : ""})
                    </p>
                ) : ( <p className="text-sm text-muted-foreground"> (Derived from your weight goal: {results.targetCaloriesScenario1} kcal.) </p> )}
                 {results.targetCaloriesScenario3 !== undefined && smartPlannerForm.getValues("waist_current") && smartPlannerForm.getValues("waist_goal_1m") && (
                  <div className="mt-2 p-3 border border-dashed rounded-md">
                    <p className="text-indigo-600 dark:text-indigo-400"><strong>Alternative Target (Waist Goal):</strong> {results.targetCaloriesScenario3} kcal/day</p>
                    <p className="text-xs text-muted-foreground">(This is a heuristic estimate based on waist change.)</p>
                  </div> )}
                 {results.waistChangeWarning && ( <p className="text-sm text-amber-700 dark:text-amber-500 flex items-start mt-1"> <AlertTriangle className="h-4 w-4 mr-1.5 mt-0.5 shrink-0"/> {results.waistChangeWarning} </p> )}
                <hr className="my-2 border-border" />
                <p> <strong>Estimated Weekly Progress:</strong> {results.estimatedWeeklyWeightChangeKg < 0 ? ` Lose ${Math.abs(results.estimatedWeeklyWeightChangeKg)} kg/week` : results.estimatedWeeklyWeightChangeKg > 0 ? ` Gain ${results.estimatedWeeklyWeightChangeKg} kg/week` : ` Maintain weight`} </p>
                
                <div className="pt-4">
                    <CardTitle className="text-xl font-semibold mb-2 text-primary">Suggested Macronutrient Breakdown</CardTitle>
                    <Table>
                        <TableHeader>
                        <TableRow>
                            <TableHead>Macronutrient</TableHead>
                            <TableHead className="text-right">% of Daily Calories</TableHead>
                            <TableHead className="text-right">Grams per Day</TableHead>
                            <TableHead className="text-right">Calories per Day</TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        <TableRow>
                            <TableCell className="font-medium">Protein</TableCell>
                            <TableCell className="text-right">{results.proteinTargetPct}%</TableCell>
                            <TableCell className="text-right">{results.proteinGrams} g</TableCell>
                            <TableCell className="text-right">{results.proteinCalories} kcal</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell className="font-medium">Carbohydrates</TableCell>
                            <TableCell className="text-right">{results.carbsTargetPct}%</TableCell>
                            <TableCell className="text-right">{results.carbsGrams} g</TableCell>
                            <TableCell className="text-right">{results.carbsCalories} kcal</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell className="font-medium">Fat</TableCell>
                            <TableCell className="text-right">{results.fatTargetPct}%</TableCell>
                            <TableCell className="text-right">{results.fatGrams} g</TableCell>
                            <TableCell className="text-right">{results.fatCalories} kcal</TableCell>
                        </TableRow>
                        </TableBody>
                        <TableCaption className="text-xs text-muted-foreground mt-2 text-left">
                         This breakdown is based on your inputs and calculated goal. For custom macro adjustments, you can use the Manual Macro Breakdown section below.
                        </TableCaption>
                    </Table>
                </div>

                <div className="mt-4">
                    <Button type="button" variant="outline" onClick={handleSmartPlannerReset}>Reset Smart Planner Inputs</Button>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {showManualCalculator && (
        <Card className="mt-8 max-w-3xl mx-auto shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl font-bold flex items-center">
              <Calculator className="mr-2 h-7 w-7 text-accent" /> Manual Macro Breakdown
            </CardTitle>
            <CardDescription>
              Enter your target calories and preferred protein/carb/fat split.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...manualCalculatorForm}>
              <form onSubmit={manualCalculatorForm.handleSubmit(onManualSubmit)} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField control={manualCalculatorForm.control} name="weight_kg" render={({ field }) => (
                      <FormItem> <FormLabel>Your Weight (kg)</FormLabel> <FormControl> <Input type="number" placeholder="e.g., 70" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseFloat(e.target.value) || undefined)} /> </FormControl> <FormMessage /> </FormItem>
                    )} />
                  <FormField control={manualCalculatorForm.control} name="protein_per_kg" render={({ field }) => (
                      <FormItem> <FormLabel>Protein per kg of body weight</FormLabel> <FormControl> <Input type="number" step="0.1" placeholder="e.g., 1.5" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseFloat(e.target.value) || undefined)} /> </FormControl> <FormDescription>E.g., 1.2–2.2 g/kg</FormDescription> <FormMessage /> </FormItem>
                    )} />
                  <FormField control={manualCalculatorForm.control} name="target_calories" render={({ field }) => (
                      <FormItem> <FormLabel>Target Daily Calorie Intake</FormLabel> <FormControl> <Input type="number" placeholder="e.g., 2000" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseFloat(e.target.value) || undefined)} /> </FormControl> <FormMessage /> </FormItem>
                    )} />
                  <FormField control={manualCalculatorForm.control} name="percent_carb" render={({ field }) => (
                      <FormItem> 
                        <FormLabel>% of Remaining Calories from Carbs</FormLabel> 
                        <FormControl>
                          <div> {/* Wrapper div for Slider */}
                            <Slider 
                              value={[field.value ?? 0]} 
                              max={100} 
                              step={1} 
                              onValueChange={(value) => field.onChange(value[0])} 
                              className="my-2"
                            />
                          </div>
                        </FormControl> 
                        <div className="flex justify-between text-sm text-muted-foreground mt-1"> 
                          <span>Carbs: {watchedPercentCarbManual !== undefined ? watchedPercentCarbManual.toFixed(0) : 0}%</span> 
                          <span>Fat: {watchedPercentCarbManual !== undefined ? (100 - watchedPercentCarbManual).toFixed(0) : 100}%</span> 
                        </div> 
                        <FormMessage /> 
                      </FormItem>
                    )} />
                </div>
                <div className="flex space-x-4">
                  <Button type="submit" className="w-full"> <Calculator className="mr-2 h-4 w-4" /> Calculate Manual Macros </Button>
                  <Button type="button" variant="outline" onClick={handleManualCalculatorReset} className="w-full">Reset Manual Inputs</Button>
                </div>
              </form>
            </Form>
            {manualResults && (
            <Card className="mt-8 shadow-inner bg-background">
                <CardHeader> <CardTitle className="text-xl font-bold">Manual Macro Breakdown Results</CardTitle> </CardHeader>
                <CardContent>
                <Table>
                    <TableHeader> 
                        <TableRow> 
                            <TableHead>Macronutrient</TableHead> 
                            <TableHead className="text-right">Intake (g)</TableHead> 
                            <TableHead className="text-right">Calories (kcal)</TableHead> 
                            <TableHead className="text-right">% of Total Calories</TableHead> 
                        </TableRow> 
                    </TableHeader>
                    <TableBody>
                    <TableRow> 
                        <TableCell className="font-medium">Protein</TableCell> 
                        <TableCell className="text-right">{manualResults.Protein_g}</TableCell> 
                        <TableCell className="text-right">{manualResults.Protein_cals}</TableCell> 
                        <TableCell className="text-right">{manualResults.Protein_pct}%</TableCell> 
                    </TableRow>
                    <TableRow> 
                        <TableCell className="font-medium">Carbohydrates</TableCell> 
                        <TableCell className="text-right">{manualResults.Carbs_g}</TableCell> 
                        <TableCell className="text-right">{manualResults.Carb_cals}</TableCell> 
                        <TableCell className="text-right">{manualResults.Carb_pct}%</TableCell> 
                    </TableRow>
                    <TableRow> 
                        <TableCell className="font-medium">Fat</TableCell> 
                        <TableCell className="text-right">{manualResults.Fat_g}</TableCell> 
                        <TableCell className="text-right">{manualResults.Fat_cals}</TableCell> 
                        <TableCell className="text-right">{manualResults.Fat_pct}%</TableCell> 
                    </TableRow>
                    </TableBody>
                    <TableCaption className="text-lg font-semibold"> 
                        Total Estimated Calories: {manualResults.Total_cals} kcal 
                        (Target: {manualCalculatorForm.getValues("target_calories")} kcal, Sum of %: {(manualResults.Protein_pct + manualResults.Carb_pct + manualResults.Fat_pct).toFixed(0)}%)
                    </TableCaption>
                </Table>
                </CardContent>
            </Card>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

    