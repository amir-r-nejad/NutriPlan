
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
import { BrainCircuit, Calculator, HelpCircle, RefreshCw, AlertTriangle } from "lucide-react";
import { SmartCaloriePlannerFormSchema, type SmartCaloriePlannerFormValues } from "@/lib/schemas";
import { activityLevels, genders, smartPlannerDietGoals } from "@/lib/constants";
import { calculateBMR } from "@/lib/nutrition-calculator";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

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

// Helper to render optional number inputs for body comp and measurements
function renderPlannerInput(
  control: any, // Control type from react-hook-form
  name: keyof SmartCaloriePlannerFormValues,
  placeholder: string,
  isOptional: boolean = true
) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormControl>
            <Input
              type="number"
              placeholder={placeholder}
              {...field}
              value={field.value ?? ''}
              onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value) || undefined)}
              className="text-center h-9 text-sm"
            />
          </FormControl>
          <FormMessage className="text-xs px-1"/>
        </FormItem>
      )}
    />
  );
}


export default function SmartCaloriePlannerPage() {
  const [results, setResults] = useState<CalculationResults | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const form = useForm<SmartCaloriePlannerFormValues>({
    resolver: zodResolver(SmartCaloriePlannerFormSchema),
    defaultValues: {
      age: undefined,
      gender: undefined,
      height_cm: undefined,
      current_weight: undefined,
      goal_weight_1m: undefined,
      ideal_goal_weight: undefined,
      activity_factor_key: undefined,
      dietGoal: "fat_loss",
      bf_current: undefined,
      bf_target: undefined,
      bf_ideal: undefined,
      mm_current: undefined,
      mm_target: undefined,
      mm_ideal: undefined,
      bw_current: undefined,
      bw_target: undefined,
      bw_ideal: undefined,
      waist_current: undefined,
      waist_goal_1m: undefined,
      waist_ideal: undefined,
      hips_current: undefined,
      hips_goal_1m: undefined,
      hips_ideal: undefined,
      right_leg_current: undefined,
      right_leg_goal_1m: undefined,
      right_leg_ideal: undefined,
      left_leg_current: undefined,
      left_leg_goal_1m: undefined,
      left_leg_ideal: undefined,
      right_arm_current: undefined,
      right_arm_goal_1m: undefined,
      right_arm_ideal: undefined,
      left_arm_current: undefined,
      left_arm_goal_1m: undefined,
      left_arm_ideal: undefined,
    },
  });

  // Load saved results on mount
  useEffect(() => {
    if (user?.id) {
      const savedResultsRaw = localStorage.getItem(`nutriplan_smart_planner_results_${user.id}`);
      if (savedResultsRaw) {
        try {
          const savedResults = JSON.parse(savedResultsRaw);
          // Reconstruct the full CalculationResults object if necessary or just relevant parts
          // For now, we'll focus on just showing the summary values
          // If form re-population is needed, we'd save the form values too.
           setResults({ // Assuming savedResults has the core values directly
            bmr: savedResults.bmr || 0, // Provide defaults or structure check
            tdee: savedResults.tdee || 0,
            targetCaloriesScenario1: savedResults.targetCaloriesScenario1 || 0,
            targetCaloriesScenario2: savedResults.targetCaloriesScenario2,
            targetCaloriesScenario3: savedResults.targetCaloriesScenario3,
            finalTargetCalories: savedResults.calories || 0,
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
          toast({title: "Loaded Saved Plan", description: "Previously calculated smart calorie plan loaded."});
        } catch (e) {
          console.error("Failed to parse saved smart planner results:", e);
          localStorage.removeItem(`nutriplan_smart_planner_results_${user.id}`);
        }
      }
    }
  }, [user, toast]);

  function onSubmit(data: SmartCaloriePlannerFormValues) {
    const selectedActivity = activityLevels.find(al => al.value === data.activity_factor_key);
    if (!selectedActivity) {
      form.setError("activity_factor_key", { type: "manual", message: "Invalid activity level selected." });
      return;
    }
    const activityFactor = selectedActivity.activityFactor;

    const bmr = calculateBMR(data.gender, data.current_weight, data.height_cm, data.age);
    const tdee = Math.round(bmr * activityFactor);

    let S1TargetCaloriesBase = tdee;
    if (data.current_weight !== undefined && data.goal_weight_1m !== undefined) {
        const weightDeltaS1 = data.current_weight - data.goal_weight_1m;
        const calorieAdjustmentS1 = (7700 * weightDeltaS1) / 30;
        S1TargetCaloriesBase = tdee - calorieAdjustmentS1;
    }
    
    let S1TargetCaloriesAdjusted = S1TargetCaloriesBase;

    if (data.dietGoal === "fat_loss") {
      S1TargetCaloriesAdjusted = Math.min(S1TargetCaloriesBase, tdee - 200);
      if (S1TargetCaloriesBase > tdee - 200 && S1TargetCaloriesAdjusted > tdee - 500 && tdee > 500) S1TargetCaloriesAdjusted = tdee - 500;
    } else if (data.dietGoal === "muscle_gain") {
      S1TargetCaloriesAdjusted = Math.max(S1TargetCaloriesBase, tdee + 150);
      if (S1TargetCaloriesBase < tdee + 150 && S1TargetCaloriesAdjusted < tdee + 300) S1TargetCaloriesAdjusted = tdee + 300;
    } else if (data.dietGoal === "recomp") {
      S1TargetCaloriesAdjusted = tdee - 200;
    }
    
    const targetCaloriesS1 = Math.round(S1TargetCaloriesAdjusted);

    let targetCaloriesS2: number | undefined = undefined;
    if (data.bf_current !== undefined && data.bf_target !== undefined && data.current_weight > 0 && data.bf_current > 0 && data.bf_target > 0) {
      const referenceWeightForBFTarget = data.goal_weight_1m || data.current_weight; // Use goal weight if available
      const fatMassLossKg = referenceWeightForBFTarget * ( (data.bf_current - data.bf_target) / 100 );
      const calorieAdjustmentS2 = (7700 * fatMassLossKg) / 30; // Calorie adjustment for 30 days
      targetCaloriesS2 = Math.round(tdee - calorieAdjustmentS2);
    }

    let targetCaloriesS3: number | undefined = undefined;
    let waistWarning: string | undefined = undefined;
    if (data.waist_current !== undefined && data.waist_goal_1m !== undefined && data.current_weight > 0 && data.waist_current > 0 && data.waist_goal_1m > 0) {
      const waistChangeCm = data.waist_current - data.waist_goal_1m;
      if (Math.abs(waistChangeCm) > 5) {
        waistWarning = "Warning: A waist change of more than 4-5 cm in 4 weeks may be unrealistic or unsustainable.";
      }
      const estimatedFatLossPercentFromWaist = waistChangeCm * 0.5; 
      const estimatedFatLossKgFromWaist = (estimatedFatLossPercentFromWaist / 100) * data.current_weight;
      const calorieAdjustmentS3 = (7700 * estimatedFatLossKgFromWaist) / 30;
      targetCaloriesS3 = Math.round(tdee - calorieAdjustmentS3);
    }

    let finalTargetCalories = targetCaloriesS1;
    if (targetCaloriesS2 !== undefined) {
      finalTargetCalories = Math.round((targetCaloriesS1 + targetCaloriesS2) / 2);
    }
    
    const weeklyCalorieDelta = (tdee - finalTargetCalories) * 7;
    const estimatedWeeklyWeightChangeKg = parseFloat((weeklyCalorieDelta / 7700).toFixed(2));

    let proteinTargetPct: number, carbsTargetPct: number, fatTargetPct: number;

    if (data.dietGoal === "fat_loss") {
      proteinTargetPct = 35; carbsTargetPct = 35; fatTargetPct = 30;
    } else if (data.dietGoal === "muscle_gain") {
      proteinTargetPct = 30; carbsTargetPct = 50; fatTargetPct = 20;
    } else { // recomp or other
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

    if (user?.id) {
      const dataToStore = {
        calories: newResults.finalTargetCalories,
        protein_g: newResults.proteinGrams,
        carbs_g: newResults.carbsGrams,
        fat_g: newResults.fatGrams,
        // Store other parts of CalculationResults if needed for restoring the full view later
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
      toast({title: "Plan Calculated & Saved", description: "Your smart calorie plan has been calculated and saved."});
    }
  }
  
  const handleReset = () => {
    form.reset({
      age: undefined, gender: undefined, height_cm: undefined, current_weight: undefined,
      goal_weight_1m: undefined, ideal_goal_weight: undefined, activity_factor_key: undefined,
      dietGoal: "fat_loss",
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
        toast({title: "Results Cleared", description: "Saved smart calorie plan has been cleared."});
    }
  };

  return (
    <div className="container mx-auto py-8">
      <Card className="max-w-3xl mx-auto shadow-xl">
        <CardHeader>
          <CardTitle className="text-3xl font-bold flex items-center">
            <BrainCircuit className="mr-3 h-8 w-8 text-primary" />
            Smart Calorie Planner
          </CardTitle>
          <CardDescription>
            Calculate your daily calorie target based on your stats and goals. Results are saved and can be used by other tools.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <Accordion type="multiple" defaultValue={["basic-info"]} className="w-full">
                <AccordionItem value="basic-info">
                  <AccordionTrigger className="text-xl font-semibold">📋 Basic Info (Required)</AccordionTrigger>
                  <AccordionContent className="grid md:grid-cols-2 gap-x-6 gap-y-4 pt-4">
                    <FormField control={form.control} name="age" render={({ field }) => ( <FormItem> <FormLabel>Age</FormLabel> <FormControl><Input type="number" placeholder="Years" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseFloat(e.target.value) || undefined)} /></FormControl> <FormMessage /> </FormItem> )} />
                    <FormField control={form.control} name="gender" render={({ field }) => ( <FormItem> <FormLabel>Biological Sex</FormLabel> <Select onValueChange={field.onChange} value={field.value ?? undefined}> <FormControl><SelectTrigger><SelectValue placeholder="Select sex" /></SelectTrigger></FormControl> <SelectContent>{genders.map(g => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}</SelectContent> </Select> <FormMessage /> </FormItem> )} />
                    <FormField control={form.control} name="height_cm" render={({ field }) => ( <FormItem> <FormLabel>Height (cm)</FormLabel> <FormControl><Input type="number" placeholder="cm" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseFloat(e.target.value) || undefined)}/></FormControl> <FormMessage /> </FormItem> )} />
                    <FormField control={form.control} name="current_weight" render={({ field }) => ( <FormItem> <FormLabel>Current Weight (kg)</FormLabel> <FormControl><Input type="number" placeholder="kg" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseFloat(e.target.value) || undefined)}/></FormControl> <FormMessage /> </FormItem> )} />
                    <FormField control={form.control} name="goal_weight_1m" render={({ field }) => ( <FormItem> <FormLabel>Target Weight (1 Month) (kg)</FormLabel> <FormControl><Input type="number" placeholder="kg" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseFloat(e.target.value) || undefined)}/></FormControl> <FormMessage /> </FormItem> )} />
                    <FormField control={form.control} name="ideal_goal_weight" render={({ field }) => ( <FormItem> <FormLabel>Long-Term Goal Weight (kg)</FormLabel> <FormControl><Input type="number" placeholder="kg (Optional)" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseFloat(e.target.value) || undefined)}/></FormControl> <FormMessage /> </FormItem> )} />
                    <FormField control={form.control} name="activity_factor_key" render={({ field }) => ( <FormItem> <FormLabel>Physical Activity Level</FormLabel> <Select onValueChange={field.onChange} value={field.value ?? undefined}> <FormControl><SelectTrigger><SelectValue placeholder="Select activity level" /></SelectTrigger></FormControl> <SelectContent>{activityLevels.map(al => <SelectItem key={al.value} value={al.value}>{al.label}</SelectItem>)}</SelectContent> </Select> <FormMessage /> </FormItem> )} />
                    <FormField control={form.control} name="dietGoal" render={({ field }) => ( <FormItem> <FormLabel>Diet Goal</FormLabel> <Select onValueChange={field.onChange} value={field.value ?? undefined}> <FormControl><SelectTrigger><SelectValue placeholder="Select diet goal" /></SelectTrigger></FormControl> <SelectContent>{smartPlannerDietGoals.map(dg => <SelectItem key={dg.value} value={dg.value}>{dg.label}</SelectItem>)}</SelectContent> </Select> <FormMessage /> </FormItem> )} />
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
                                <FormLabel className="pt-2 text-sm col-span-1">{metric.name}</FormLabel>
                                {renderPlannerInput(form.control, metric.currentField as keyof SmartCaloriePlannerFormValues, metric.placeholder)}
                                {renderPlannerInput(form.control, metric.targetField as keyof SmartCaloriePlannerFormValues, metric.placeholder)}
                                {renderPlannerInput(form.control, metric.idealField as keyof SmartCaloriePlannerFormValues, metric.placeholder)}
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
                                <FormLabel className="pt-2 text-sm col-span-1">{metric.name}</FormLabel>
                                {renderPlannerInput(form.control, metric.currentField as keyof SmartCaloriePlannerFormValues, metric.placeholder)}
                                {renderPlannerInput(form.control, metric.goalField as keyof SmartCaloriePlannerFormValues, metric.placeholder)}
                                {renderPlannerInput(form.control, metric.idealField as keyof SmartCaloriePlannerFormValues, metric.placeholder)}
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
                            {activityLevels.map(level => (
                                <li key={level.value}><strong>{level.label.split('(')[0].trim()}:</strong> ×{level.activityFactor}</li>
                            ))}
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
                        <p>
                            Weight loss: <strong className="text-destructive">calorie deficit</strong> (target &lt; TDEE).
                            Weight/muscle gain: <strong className="text-green-600">calorie surplus</strong> (target &gt; TDEE).
                        </p>
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
                <Button type="button" variant="outline" onClick={handleReset} className="flex-1 text-lg py-3">
                  <RefreshCw className="mr-2 h-5 w-5" /> Reset Form
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
                {(results.targetCaloriesScenario2 !== undefined && form.getValues("bf_current") && form.getValues("bf_target")) || form.getValues("dietGoal") ? (
                    <p className="text-sm text-muted-foreground">
                        (Adjusted based on your weight goal, selected diet goal{results.targetCaloriesScenario2 !== undefined && form.getValues("bf_current") && form.getValues("bf_target") ? ", and body fat % goal" : ""}. 
                        Weight goal alone suggested: {results.targetCaloriesScenario1} kcal. 
                        {results.targetCaloriesScenario2 !== undefined && `BF% goal alone suggested: ${results.targetCaloriesScenario2} kcal.`})
                    </p>
                ) : (
                    <p className="text-sm text-muted-foreground">
                        (Derived from your weight goal: {results.targetCaloriesScenario1} kcal.)
                    </p>
                )}
                 {results.targetCaloriesScenario3 !== undefined && form.getValues("waist_current") && form.getValues("waist_goal_1m") && (
                  <div className="mt-2 p-3 border border-dashed rounded-md">
                    <p className="text-indigo-600 dark:text-indigo-400"><strong>Alternative Target (Waist Goal):</strong> {results.targetCaloriesScenario3} kcal/day</p>
                    <p className="text-xs text-muted-foreground">(This is a heuristic estimate based on waist change.)</p>
                  </div>
                )}
                 {results.waistChangeWarning && (
                    <p className="text-sm text-amber-700 dark:text-amber-500 flex items-start mt-1">
                        <AlertTriangle className="h-4 w-4 mr-1.5 mt-0.5 shrink-0"/> {results.waistChangeWarning}
                    </p>
                )}
                <hr className="my-2 border-border" />
                <p>
                  <strong>Estimated Weekly Progress:</strong> 
                  {results.estimatedWeeklyWeightChangeKg < 0 ? 
                    ` Lose ${Math.abs(results.estimatedWeeklyWeightChangeKg)} kg/week` : 
                  results.estimatedWeeklyWeightChangeKg > 0 ? 
                    ` Gain ${results.estimatedWeeklyWeightChangeKg} kg/week` : 
                    ` Maintain weight`}
                </p>
                
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
                        This breakdown is based on your inputs and calculated goal. For custom macro adjustments, visit the 'Daily Macro Breakdown' tool.
                        </TableCaption>
                    </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
