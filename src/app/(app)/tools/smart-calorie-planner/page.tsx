
"use client";

import React, { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
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
import { BrainCircuit, Calculator, HelpCircle, Info, RefreshCw, AlertTriangle } from "lucide-react";
import { SmartCaloriePlannerFormSchema, type SmartCaloriePlannerFormValues } from "@/lib/schemas";
import { activityLevels, genders } from "@/lib/constants";
import { calculateBMR, calculateTDEE } from "@/lib/nutrition-calculator";

interface CalculationResults {
  bmr: number;
  tdee: number;
  targetCaloriesScenario1?: number;
  targetCaloriesScenario2?: number;
  targetCaloriesScenario3?: number;
  finalTargetCalories: number;
  estimatedWeeklyWeightChangeKg: number;
  waistChangeWarning?: string;
}

export default function SmartCaloriePlannerPage() {
  const [results, setResults] = useState<CalculationResults | null>(null);

  const form = useForm<SmartCaloriePlannerFormValues>({
    resolver: zodResolver(SmartCaloriePlannerFormSchema),
    defaultValues: {
      // Basic Info
      age: undefined,
      gender: undefined,
      height_cm: undefined,
      current_weight: undefined,
      goal_weight_1m: undefined,
      ideal_goal_weight: undefined,
      activity_factor_key: undefined,
      // Body Comp
      bf_current: undefined,
      bf_target: undefined,
      // Measurements
      waist_current: undefined,
      waist_goal_1m: undefined,
      waist_ideal: undefined,
      hips_current: undefined,
      hips_goal_1m: undefined,
      hips_ideal: undefined,
    },
  });

  function onSubmit(data: SmartCaloriePlannerFormValues) {
    const selectedActivity = activityLevels.find(al => al.value === data.activity_factor_key);
    if (!selectedActivity) {
      form.setError("activity_factor_key", { type: "manual", message: "Invalid activity level selected." });
      return;
    }
    const activityFactor = selectedActivity.activityFactor;

    const bmr = calculateBMR(data.gender, data.current_weight, data.height_cm, data.age);
    const tdee = Math.round(bmr * activityFactor);

    // Scenario 1: Basic Goal (Required Fields Only)
    const weightDelta = data.current_weight - data.goal_weight_1m;
    const calorieAdjustmentS1 = (7700 * weightDelta) / 30;
    const targetCaloriesS1 = Math.round(tdee - calorieAdjustmentS1);

    let targetCaloriesS2: number | undefined = undefined;
    if (data.bf_current !== undefined && data.bf_target !== undefined) {
      const fatMassCurrentKg = data.current_weight * (data.bf_current / 100);
      const fatMassTargetKg = data.current_weight * (data.bf_target / 100); // As per prompt's Python
      const fatMassLossKg = fatMassCurrentKg - fatMassTargetKg;
      const calorieAdjustmentS2 = (7700 * fatMassLossKg) / 30;
      targetCaloriesS2 = Math.round(tdee - calorieAdjustmentS2);
    }

    let targetCaloriesS3: number | undefined = undefined;
    let waistWarning: string | undefined = undefined;
    if (data.waist_current !== undefined && data.waist_goal_1m !== undefined) {
      const waistChangeCm = data.waist_current - data.waist_goal_1m;
      if (Math.abs(waistChangeCm) > 5) {
        waistWarning = "Warning: A waist change of more than 4-5 cm in 4 weeks may be unrealistic or unsustainable.";
      }
      const estimatedFatLossPercentFromWaist = waistChangeCm * 0.5; // Heuristic
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


    setResults({
      bmr: Math.round(bmr),
      tdee,
      targetCaloriesScenario1: targetCaloriesS1,
      targetCaloriesScenario2,
      targetCaloriesScenario3,
      finalTargetCalories,
      estimatedWeeklyWeightChangeKg,
      waistChangeWarning: waistWarning,
    });
  }
  
  const handleReset = () => {
    form.reset({
      age: undefined, gender: undefined, height_cm: undefined, current_weight: undefined,
      goal_weight_1m: undefined, ideal_goal_weight: undefined, activity_factor_key: undefined,
      bf_current: undefined, bf_target: undefined, mm_current: undefined, mm_target: undefined,
      bw_current: undefined, bw_target: undefined, waist_current: undefined,
      waist_goal_1m: undefined, waist_ideal: undefined, hips_current: undefined,
      hips_goal_1m: undefined, hips_ideal: undefined,
    });
    setResults(null);
  }

  const renderOptionalNumberInput = (name: keyof SmartCaloriePlannerFormValues, label: string, placeholder?: string, unit?: string) => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <div className="flex items-center">
              <Input type="number" placeholder={placeholder} {...field} value={field.value ?? ''} onChange={e => field.onChange(parseFloat(e.target.value) || undefined)} />
              {unit && <span className="ml-2 text-sm text-muted-foreground">{unit}</span>}
            </div>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );


  return (
    <div className="container mx-auto py-8">
      <Card className="max-w-3xl mx-auto shadow-xl">
        <CardHeader>
          <CardTitle className="text-3xl font-bold flex items-center">
            <BrainCircuit className="mr-3 h-8 w-8 text-primary" />
            Smart Calorie Planner
          </CardTitle>
          <CardDescription>
            Calculate your daily calorie target based on your stats and goals.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <Accordion type="multiple" defaultValue={["basic-info"]} className="w-full">
                {/* Basic Info Section */}
                <AccordionItem value="basic-info">
                  <AccordionTrigger className="text-xl font-semibold">📋 Basic Info (Required)</AccordionTrigger>
                  <AccordionContent className="grid md:grid-cols-2 gap-6 pt-4">
                    <FormField control={form.control} name="age" render={({ field }) => ( <FormItem> <FormLabel>Age (Years)</FormLabel> <FormControl><Input type="number" placeholder="e.g., 30" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseFloat(e.target.value) || undefined)} /></FormControl> <FormMessage /> </FormItem> )} />
                    <FormField control={form.control} name="gender" render={({ field }) => ( <FormItem> <FormLabel>Biological Sex</FormLabel> <Select onValueChange={field.onChange} value={field.value ?? undefined}> <FormControl><SelectTrigger><SelectValue placeholder="Select sex" /></SelectTrigger></FormControl> <SelectContent>{genders.map(g => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}</SelectContent> </Select> <FormMessage /> </FormItem> )} />
                    <FormField control={form.control} name="height_cm" render={({ field }) => ( <FormItem> <FormLabel>Height (cm)</FormLabel> <FormControl><Input type="number" placeholder="e.g., 175" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseFloat(e.target.value) || undefined)} /></FormControl> <FormMessage /> </FormItem> )} />
                    <FormField control={form.control} name="current_weight" render={({ field }) => ( <FormItem> <FormLabel>Current Weight (kg)</FormLabel> <FormControl><Input type="number" placeholder="e.g., 70" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseFloat(e.target.value) || undefined)} /></FormControl> <FormMessage /> </FormItem> )} />
                    <FormField control={form.control} name="goal_weight_1m" render={({ field }) => ( <FormItem> <FormLabel>Target Weight After 1 Month (kg)</FormLabel> <FormControl><Input type="number" placeholder="e.g., 68" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseFloat(e.target.value) || undefined)} /></FormControl> <FormMessage /> </FormItem> )} />
                    {renderOptionalNumberInput("ideal_goal_weight" as keyof SmartCaloriePlannerFormValues, "Long-Term Goal Weight (kg)", "e.g., 65", "kg")}
                    <FormField control={form.control} name="activity_factor_key" render={({ field }) => ( <FormItem className="md:col-span-2"> <FormLabel>Physical Activity Level</FormLabel> <Select onValueChange={field.onChange} value={field.value ?? undefined}> <FormControl><SelectTrigger><SelectValue placeholder="Select activity level" /></SelectTrigger></FormControl> <SelectContent>{activityLevels.map(level => <SelectItem key={level.value} value={level.value}>{level.label}</SelectItem>)}</SelectContent> </Select> <FormMessage /> </FormItem> )} />
                  </AccordionContent>
                </AccordionItem>

                {/* Body Composition Section */}
                <AccordionItem value="body-comp">
                  <AccordionTrigger className="text-xl font-semibold">💪 Body Composition (Optional)</AccordionTrigger>
                  <AccordionContent className="grid md:grid-cols-2 gap-6 pt-4">
                    {renderOptionalNumberInput("bf_current" as keyof SmartCaloriePlannerFormValues, "Current Body Fat %", "e.g., 20", "%")}
                    {renderOptionalNumberInput("bf_target" as keyof SmartCaloriePlannerFormValues, "Target Body Fat % (1 Month)", "e.g., 18", "%")}
                    {renderOptionalNumberInput("mm_current" as keyof SmartCaloriePlannerFormValues, "Current Muscle Mass %", "e.g., 35", "%")}
                    {renderOptionalNumberInput("mm_target" as keyof SmartCaloriePlannerFormValues, "Target Muscle Mass % (1 Month)", "e.g., 36", "%")}
                    {renderOptionalNumberInput("bw_current" as keyof SmartCaloriePlannerFormValues, "Current Body Water %", "e.g., 55", "%")}
                    {renderOptionalNumberInput("bw_target" as keyof SmartCaloriePlannerFormValues, "Target Body Water % (1 Month)", "e.g., 56", "%")}
                  </AccordionContent>
                </AccordionItem>

                {/* Measurements Section */}
                <AccordionItem value="measurements">
                  <AccordionTrigger className="text-xl font-semibold">📏 Measurements (Optional)</AccordionTrigger>
                  <AccordionContent className="space-y-6 pt-4">
                    <Card>
                      <CardHeader><CardTitle className="text-lg">Waist (cm)</CardTitle></CardHeader>
                      <CardContent className="grid md:grid-cols-3 gap-4">
                        {renderOptionalNumberInput("waist_current" as keyof SmartCaloriePlannerFormValues, "Current", "e.g., 80")}
                        {renderOptionalNumberInput("waist_goal_1m" as keyof SmartCaloriePlannerFormValues, "1-Month Goal", "e.g., 78")}
                        {renderOptionalNumberInput("waist_ideal" as keyof SmartCaloriePlannerFormValues, "Ideal", "e.g., 75")}
                      </CardContent>
                    </Card>
                     <Card>
                      <CardHeader><CardTitle className="text-lg">Hips (cm)</CardTitle></CardHeader>
                      <CardContent className="grid md:grid-cols-3 gap-4">
                        {renderOptionalNumberInput("hips_current" as keyof SmartCaloriePlannerFormValues, "Current", "e.g., 95")}
                        {renderOptionalNumberInput("hips_goal_1m" as keyof SmartCaloriePlannerFormValues, "1-Month Goal", "e.g., 93")}
                        {renderOptionalNumberInput("hips_ideal" as keyof SmartCaloriePlannerFormValues, "Ideal", "e.g., 90")}
                      </CardContent>
                    </Card>
                    {/* Add Arms/Legs later if needed */}
                  </AccordionContent>
                </AccordionItem>

                {/* Help Section */}
                <AccordionItem value="help-section">
                    <AccordionTrigger className="text-xl font-semibold">
                        <div className="flex items-center">
                        <HelpCircle className="mr-2 h-6 w-6 text-primary" /> How is this calculated?
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="text-sm space-y-4 pt-3">
                        <p>This planner helps estimate your daily calorie needs based on established formulas and your goals.</p>
                        
                        <div>
                        <h4 className="font-semibold text-base">1. Basal Metabolic Rate (BMR)</h4>
                        <p>We use the <strong className="text-primary">Mifflin-St Jeor Equation</strong> to estimate your BMR – the calories your body burns at complete rest.</p>
                        <ul className="list-disc pl-5 space-y-1 mt-1">
                            <li><strong>Male/Other:</strong> BMR = (10 × weight in kg) + (6.25 × height in cm) - (5 × age) + 5</li>
                            <li><strong>Female:</strong> BMR = (10 × weight in kg) + (6.25 × height in cm) - (5 × age) - 161</li>
                        </ul>
                        </div>

                        <div>
                        <h4 className="font-semibold text-base mt-2">2. Total Daily Energy Expenditure (TDEE)</h4>
                        <p>Your BMR is multiplied by an <strong className="text-primary">activity factor</strong> to estimate your TDEE – your total daily maintenance calories.</p>
                        <ul className="list-disc pl-5 space-y-1 mt-1">
                            {activityLevels.map(level => (
                                <li key={level.value}><strong>{level.label.split('(')[0].trim()}:</strong> ×{level.activityFactor}</li>
                            ))}
                        </ul>
                        </div>
                        
                        <div>
                        <h4 className="font-semibold text-base mt-2">3. Target Daily Calories</h4>
                        <p>Your target calories are adjusted from your TDEE based on your goals:</p>
                        <ul className="list-disc pl-5 space-y-1 mt-1">
                            <li><strong>Weight Goal (Scenario 1):</strong> We estimate the calorie deficit/surplus needed to reach your 1-month weight goal (approx. 7700 kcal per kg of fat).</li>
                            <li><strong>Body Fat % Goal (Scenario 2):</strong> If you provide current and target body fat percentages, we estimate the calorie adjustment based on the targeted fat mass change. If both weight and BF% goals are set, your target calories will be an average of these two scenarios.</li>
                            <li><strong>Waist Goal (Scenario 3):</strong> If you provide waist measurements, we use a heuristic (approx. 0.5% body fat change per cm of waist change) to estimate an alternative target. This is a rough guide.</li>
                        </ul>
                        </div>

                        <div>
                        <h4 className="font-semibold text-base mt-2">Calorie Deficit/Surplus</h4>
                        <p>
                            To lose weight, you generally need a <strong className="text-destructive">calorie deficit</strong> (target calories < TDEE).
                            To gain weight/muscle, you generally need a <strong className="text-green-600">calorie surplus</strong> (target calories > TDEE).
                        </p>
                        </div>

                        <div>
                        <h4 className="font-semibold text-base mt-2">Safe Pace</h4>
                        <p>
                            A sustainable rate of weight loss is typically 0.5–1 kg (1–2 lbs) per week.
                            For muscle gain, 0.25–0.5 kg (0.5–1 lb) per week is a common goal.
                            Rapid changes suggested by large measurement differences might be unrealistic in 1 month.
                        </p>
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
              <CardContent className="space-y-4 text-lg">
                <p><strong>Basal Metabolic Rate (BMR):</strong> {results.bmr} kcal/day</p>
                <p><strong>Maintenance Calories (TDEE):</strong> {results.tdee} kcal/day</p>
                <hr className="my-2 border-border" />
                <p className="text-primary font-semibold"><strong>Primary Target Daily Calories:</strong> {results.finalTargetCalories} kcal/day</p>
                {results.targetCaloriesScenario2 !== undefined && (
                    <p className="text-sm text-muted-foreground">
                        (Based on averaging weight goal and body fat % goal scenarios. 
                        Weight goal alone: {results.targetCaloriesScenario1} kcal, 
                        BF% goal alone: {results.targetCaloriesScenario2} kcal)
                    </p>
                )}
                {results.targetCaloriesScenario3 !== undefined && (
                  <div className="mt-2 p-3 border border-dashed rounded-md">
                    <p className="text-indigo-600"><strong>Alternative Target (Waist Goal):</strong> {results.targetCaloriesScenario3} kcal/day</p>
                    <p className="text-xs text-muted-foreground">(This is a heuristic estimate based on waist change.)</p>
                  </div>
                )}
                 {results.waistChangeWarning && (
                    <p className="text-sm text-amber-700 flex items-start mt-1">
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
                <div className="mt-4 pt-3 border-t border-border">
                    <h4 className="font-semibold text-muted-foreground">Suggested Macro Breakdown (Example for Fat Loss):</h4>
                    <p className="text-sm">~40% Carbs, 30% Protein, 30% Fat (Adjust based on preference)</p>
                    <p className="text-xs text-muted-foreground">(This is a general guideline. Detailed macro planning can be done in the 'Daily Macro Breakdown' tool.)</p>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

