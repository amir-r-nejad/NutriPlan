
"use client";

import React, { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
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
import { BrainCircuit, Calculator, HelpCircle, Info, RefreshCw, AlertTriangle } from "lucide-react";
import { SmartCaloriePlannerFormSchema, type SmartCaloriePlannerFormValues } from "@/lib/schemas";
import { activityLevels, genders, smartPlannerDietGoals } from "@/lib/constants";
import { calculateBMR } from "@/lib/nutrition-calculator";

interface CalculationResults {
  bmr: number;
  tdee: number;
  targetCaloriesScenario1: number;
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
      if (S1TargetCaloriesBase > tdee - 200 && S1TargetCaloriesAdjusted > tdee - 500) S1TargetCaloriesAdjusted = tdee - 500; 
    } else if (data.dietGoal === "muscle_gain") {
      S1TargetCaloriesAdjusted = Math.max(S1TargetCaloriesBase, tdee + 150); 
      if (S1TargetCaloriesBase < tdee + 150 && S1TargetCaloriesAdjusted < tdee + 300) S1TargetCaloriesAdjusted = tdee + 300; 
    } else if (data.dietGoal === "recomp") {
      S1TargetCaloriesAdjusted = tdee - 200; 
    }
    
    const targetCaloriesS1 = Math.round(S1TargetCaloriesAdjusted);

    let targetCaloriesS2: number | undefined = undefined;
    if (data.bf_current !== undefined && data.bf_target !== undefined && data.bf_current > 0 && data.bf_target > 0) {
      const fatMassCurrentKg = data.current_weight * (data.bf_current / 100);
      const referenceWeightForBFTarget = data.goal_weight_1m || data.current_weight;
      const fatMassTargetKg = referenceWeightForBFTarget * (data.bf_target / 100); 
      const fatMassLossKg = fatMassCurrentKg - fatMassTargetKg;
      const calorieAdjustmentS2 = (7700 * fatMassLossKg) / 30;
      targetCaloriesS2 = Math.round(tdee - calorieAdjustmentS2);
    }

    let targetCaloriesS3: number | undefined = undefined;
    let waistWarning: string | undefined = undefined;
    if (data.waist_current !== undefined && data.waist_goal_1m !== undefined && data.waist_current > 0 && data.waist_goal_1m > 0) {
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

    setResults({
      bmr: Math.round(bmr),
      tdee,
      targetCaloriesScenario1: targetCaloriesS1,
      targetCaloriesScenario2: targetCaloriesS2,
      targetCaloriesScenario3: targetCaloriesS3,
      finalTargetCalories,
      estimatedWeeklyWeightChangeKg,
      waistChangeWarning: waistWarning,
    });
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
            Calculate your daily calorie target based on your stats and goals.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <Accordion type="multiple" defaultValue={["basic-info", "body-comp", "measurements"]} className="w-full">
                <AccordionItem value="basic-info">
                  <AccordionTrigger className="text-xl font-semibold">📋 Basic Info (Required)</AccordionTrigger>
                  <AccordionContent className="grid md:grid-cols-2 gap-6 pt-4">
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
                  <AccordionContent className="space-y-3 pt-4">
                    <div className="grid grid-cols-4 gap-x-4 pb-1 border-b">
                      <span className="text-sm font-medium text-muted-foreground">Metric</span>
                      <span className="text-sm font-medium text-muted-foreground">Current (%)</span>
                      <span className="text-sm font-medium text-muted-foreground">Target (1 Month) (%)</span>
                      <span className="text-sm font-medium text-muted-foreground">Ideal (%)</span>
                    </div>
                    {[
                      { name: "Body Fat", currentField: "bf_current", targetField: "bf_target", idealField: "bf_ideal", placeholderSuffix: "%" },
                      { name: "Muscle Mass", currentField: "mm_current", targetField: "mm_target", idealField: "mm_ideal", placeholderSuffix: "%" },
                      { name: "Body Water", currentField: "bw_current", targetField: "bw_target", idealField: "bw_ideal", placeholderSuffix: "%" },
                    ].map(metric => (
                      <div key={metric.name} className="grid grid-cols-4 items-start gap-x-4 py-2">
                        <span className="text-sm font-medium pt-2">{metric.name}</span>
                        <FormField
                          control={form.control}
                          name={metric.currentField as keyof SmartCaloriePlannerFormValues}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input type="number" placeholder={`e.g., 20${metric.placeholderSuffix}`} {...field} value={field.value ?? ''} onChange={e => field.onChange(parseFloat(e.target.value) || undefined)} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={metric.targetField as keyof SmartCaloriePlannerFormValues}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input type="number" placeholder={`e.g., 18${metric.placeholderSuffix}`} {...field} value={field.value ?? ''} onChange={e => field.onChange(parseFloat(e.target.value) || undefined)} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={metric.idealField as keyof SmartCaloriePlannerFormValues}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input type="number" placeholder={`e.g., 15${metric.placeholderSuffix}`} {...field} value={field.value ?? ''} onChange={e => field.onChange(parseFloat(e.target.value) || undefined)} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    ))}
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="measurements">
                  <AccordionTrigger className="text-xl font-semibold">📏 Measurements (Optional)</AccordionTrigger>
                  <AccordionContent className="space-y-3 pt-4">
                    <div className="grid grid-cols-4 gap-x-4 pb-1 border-b">
                      <span className="text-sm font-medium text-muted-foreground">Metric</span>
                      <span className="text-sm font-medium text-muted-foreground">Current (cm)</span>
                      <span className="text-sm font-medium text-muted-foreground">1-Month Goal (cm)</span>
                      <span className="text-sm font-medium text-muted-foreground">Ideal (cm)</span>
                    </div>
                    {[
                      { name: "Waist", currentField: "waist_current", goalField: "waist_goal_1m", idealField: "waist_ideal" },
                      { name: "Hips", currentField: "hips_current", goalField: "hips_goal_1m", idealField: "hips_ideal" },
                      { name: "Right Leg", currentField: "right_leg_current", goalField: "right_leg_goal_1m", idealField: "right_leg_ideal" },
                      { name: "Left Leg", currentField: "left_leg_current", goalField: "left_leg_goal_1m", idealField: "left_leg_ideal" },
                      { name: "Right Arm", currentField: "right_arm_current", goalField: "right_arm_goal_1m", idealField: "right_arm_ideal" },
                      { name: "Left Arm", currentField: "left_arm_current", goalField: "left_arm_goal_1m", idealField: "left_arm_ideal" },
                    ].map(metric => (
                      <div key={metric.name} className="grid grid-cols-4 items-start gap-x-4 py-2">
                        <span className="text-sm font-medium pt-2">{metric.name}</span>
                        <FormField
                          control={form.control}
                          name={metric.currentField as keyof SmartCaloriePlannerFormValues}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input type="number" placeholder="cm" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseFloat(e.target.value) || undefined)} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={metric.goalField as keyof SmartCaloriePlannerFormValues}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input type="number" placeholder="cm" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseFloat(e.target.value) || undefined)} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={metric.idealField as keyof SmartCaloriePlannerFormValues}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input type="number" placeholder="cm" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseFloat(e.target.value) || undefined)} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
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
                        <p>Your BMR is multiplied by an <strong className="text-primary">activity factor</strong> (selected from Physical Activity Level) to estimate your TDEE – your total daily maintenance calories.</p>
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
                            <li><strong>Weight Goal (Primary Factor):</strong> We estimate the calorie deficit/surplus needed to reach your 1-month weight goal (approx. 7700 kcal per kg of change).</li>
                            <li><strong>Diet Goal Adjustment:</strong> Your selected "Diet Goal" (Fat loss, Muscle gain, Recomp) further refines this estimate to better suit your primary objective. For example, "Fat loss" ensures a deficit, "Muscle gain" ensures a surplus, and "Recomp" aims for a slight deficit.</li>
                            <li><strong>Body Fat % Goal (If provided):</strong> If you provide current and target body fat percentages, we estimate calorie adjustments based on targeted fat mass change. If this and your weight goal (adjusted by diet goal) are set, your final target calories will be an average of these two scenarios for a more balanced approach.</li>
                            <li><strong>Waist Goal (Alternative Estimate):</strong> If you provide waist measurements, we use a heuristic (approx. 0.5% body fat change of current weight per cm of waist change) to estimate an alternative target. This is shown separately as a rough guide.</li>
                        </ul>
                        </div>

                        <div>
                        <h4 className="font-semibold text-base mt-2">Calorie Deficit/Surplus</h4>
                        <p>
                            To lose weight, you generally need a <strong className="text-destructive">calorie deficit</strong> (target calories &lt; TDEE).
                            To gain weight/muscle, you generally need a <strong className="text-green-600">calorie surplus</strong> (target calories &gt; TDEE).
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
                {results.targetCaloriesScenario2 !== undefined && form.getValues("bf_current") && form.getValues("bf_target") ? (
                    <p className="text-sm text-muted-foreground">
                        (Derived from averaging your weight goal (adjusted by diet goal: {results.targetCaloriesScenario1} kcal) and body fat % goal ({results.targetCaloriesScenario2} kcal) scenarios.)
                    </p>
                ) : (
                    <p className="text-sm text-muted-foreground">
                        (Derived from your weight goal, adjusted by your selected diet goal: {results.targetCaloriesScenario1} kcal.)
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
