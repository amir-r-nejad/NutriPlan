
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller, FieldPath, useFieldArray } from "react-hook-form";
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
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertCircle, CheckCircle, Leaf, Info, AlertTriangle, CheckCircle2, Edit3 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  onboardingStepsData,
  genders,
  activityLevels,
  preferredDiets,
  smartPlannerDietGoals,
  mealNames as defaultMealNames,
  defaultMacroPercentages,
} from "@/lib/constants";
import { OnboardingFormSchema, type OnboardingFormValues, type MealMacroDistribution, type CustomCalculatedTargets, type CalculatedTargets as GlobalCalculatedTargets, FullProfileType } from "@/lib/schemas"; // Added FullProfileType
import { calculateBMR, calculateTDEE, calculateEstimatedDailyTargets } from "@/lib/nutrition-calculator";
import { Slider } from "@/components/ui/slider";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

// Interface for calculated targets to be displayed in Step 7
interface Step7CalculatedTargets {
  bmr?: number;
  tdee?: number;
  targetCalories?: number;
  targetProtein?: number;
  targetCarbs?: number;
  targetFat?: number;
  current_weight_for_calc?: number;
}

interface TotalsForSplitter {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}


export default function OnboardingPage() {
  const { user, completeOnboarding } = useAuth();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);

  const [calculatedTargets, setCalculatedTargets] = useState<Step7CalculatedTargets | null>(null);
  const [customCalculatedTargets, setCustomCalculatedTargets] = useState<CustomCalculatedTargets | null>(null);
  const [totalsForSplitter, setTotalsForSplitter] = useState<TotalsForSplitter | null>(null);


  const form = useForm<OnboardingFormValues>({
    resolver: zodResolver(OnboardingFormSchema),
    mode: "onChange",
    defaultValues: {
      age: undefined, gender: undefined, height_cm: undefined, current_weight: undefined,
      goal_weight_1m: undefined, ideal_goal_weight: undefined, activityLevel: undefined, dietGoalOnboarding: "fat_loss",
      bf_current: undefined, bf_target: undefined, bf_ideal: undefined,
      mm_current: undefined, mm_target: undefined, mm_ideal: undefined,
      bw_current: undefined, bw_target: undefined, bw_ideal: undefined,
      waist_current: undefined, waist_goal_1m: undefined, waist_ideal: undefined,
      hips_current: undefined, hips_goal_1m: undefined, hips_ideal: undefined,
      right_leg_current: undefined, right_leg_goal_1m: undefined, right_leg_ideal: undefined,
      left_leg_current: undefined, left_leg_goal_1m: undefined, left_leg_ideal: undefined,
      right_arm_current: undefined, right_arm_goal_1m: undefined, right_arm_ideal: undefined,
      left_arm_current: undefined, left_arm_goal_1m: undefined, left_arm_ideal: undefined,
      preferredDiet: "none", allergies: "", preferredCuisines: "", dispreferredCuisines: "",
      preferredIngredients: "", dispreferredIngredients: "",
      // mealsPerDay removed
      preferredMicronutrients: "", medicalConditions: "", medications: "",
      custom_total_calories: undefined, custom_protein_per_kg: undefined, remaining_calories_carb_pct: 50,
      // manual_target_calories etc. removed
      mealDistributions: defaultMealNames.map(name => ({
        mealName: name,
        calories_pct: defaultMacroPercentages[name]?.calories_pct || 0,
        protein_pct: defaultMacroPercentages[name]?.protein_pct || 0,
        carbs_pct: defaultMacroPercentages[name]?.carbs_pct || 0,
        fat_pct: defaultMacroPercentages[name]?.fat_pct || 0,
      })),
      typicalMealsDescription: "",
    },
  });

  const { fields: mealDistributionFields, replace: replaceMealDistributions } = useFieldArray({
    control: form.control,
    name: "mealDistributions",
  });

  const activeStepData = onboardingStepsData.find(s => s.stepNumber === currentStep);

  const updateCalculatedTargetsForStep7 = useCallback(() => {
    const data = form.getValues();
    if (data.age && data.gender && data.height_cm && data.current_weight && data.activityLevel && data.dietGoalOnboarding) {
      const bmr = calculateBMR(data.gender, data.current_weight, data.height_cm, data.age);
      const tdee = calculateTDEE(bmr, data.activityLevel);
      const estimatedTargets = calculateEstimatedDailyTargets({
        age: data.age, gender: data.gender, height: data.height_cm,
        currentWeight: data.current_weight, activityLevel: data.activityLevel,
        dietGoal: data.dietGoalOnboarding, 
      });
      setCalculatedTargets({
        bmr: Math.round(bmr), tdee: Math.round(tdee),
        targetCalories: estimatedTargets.targetCalories ? Math.round(estimatedTargets.targetCalories) : undefined,
        targetProtein: estimatedTargets.targetProtein ? Math.round(estimatedTargets.targetProtein) : undefined,
        targetCarbs: estimatedTargets.targetCarbs ? Math.round(estimatedTargets.targetCarbs) : undefined,
        targetFat: estimatedTargets.targetFat ? Math.round(estimatedTargets.targetFat) : undefined,
        current_weight_for_calc: data.current_weight
      });
    } else {
      setCalculatedTargets(null);
    }
  }, [form]);

  useEffect(() => {
    if (currentStep === 7) { // Smart Calculation & Macros
      updateCalculatedTargetsForStep7();
    }
  }, [currentStep, updateCalculatedTargetsForStep7, form]);

  const watchedCustomInputs = form.watch([
    "custom_total_calories", "custom_protein_per_kg", "remaining_calories_carb_pct", "current_weight"
  ]);

  useEffect(() => {
    if (currentStep !== 8 || !calculatedTargets) {
      if (customCalculatedTargets !== null) setCustomCalculatedTargets(null);
      return;
    }

    const [customTotalCalories, customProteinPerKg, remainingCarbPct, formCurrentWeight] = watchedCustomInputs;
    const baseWeight = formCurrentWeight || calculatedTargets?.current_weight_for_calc;

    if (!baseWeight || baseWeight <= 0) {
      if (customCalculatedTargets !== null) setCustomCalculatedTargets(null);
      return;
    }

    const effectiveTotalCalories = customTotalCalories !== undefined && customTotalCalories > 0
      ? customTotalCalories
      : (calculatedTargets?.targetCalories || 0);

    const defaultProteinPerKg = (calculatedTargets?.targetProtein && calculatedTargets?.current_weight_for_calc && calculatedTargets.current_weight_for_calc > 0)
      ? calculatedTargets.targetProtein / calculatedTargets.current_weight_for_calc
      : 1.6;

    const effectiveProteinPerKg = customProteinPerKg !== undefined && customProteinPerKg >= 0
      ? customProteinPerKg
      : defaultProteinPerKg;

    const calculatedProteinGrams = baseWeight * effectiveProteinPerKg;
    const calculatedProteinCalories = calculatedProteinGrams * 4;
    let remainingCaloriesForCustom = effectiveTotalCalories - calculatedProteinCalories;

    let calculatedCarbGrams = 0, calculatedFatGrams = 0;
    let calculatedCarbCalories = 0, calculatedFatCalories = 0;

    if (remainingCaloriesForCustom > 0) {
      const carbRatio = (remainingCarbPct ?? 50) / 100;
      const fatRatio = 1 - carbRatio;
      calculatedCarbCalories = remainingCaloriesForCustom * carbRatio;
      calculatedFatCalories = remainingCaloriesForCustom * fatRatio;
      calculatedCarbGrams = calculatedCarbCalories / 4;
      calculatedFatGrams = calculatedFatCalories / 9;
    } else {
      remainingCaloriesForCustom = 0; 
    }

    const finalCustomTotalCalories = calculatedProteinCalories + calculatedCarbCalories + calculatedFatCalories;

    const newCustomPlan: CustomCalculatedTargets = {
      totalCalories: Math.round(finalCustomTotalCalories),
      proteinGrams: Math.round(calculatedProteinGrams),
      proteinCalories: Math.round(calculatedProteinCalories),
      proteinPct: finalCustomTotalCalories > 0 ? Math.round((calculatedProteinCalories / finalCustomTotalCalories) * 100) : (calculatedProteinGrams > 0 ? 100 : 0),
      carbGrams: Math.round(Math.max(0, calculatedCarbGrams)),
      carbCalories: Math.round(Math.max(0, calculatedCarbCalories)),
      carbPct: finalCustomTotalCalories > 0 ? Math.round((Math.max(0, calculatedCarbCalories) / finalCustomTotalCalories) * 100) : 0,
      fatGrams: Math.round(Math.max(0, calculatedFatGrams)),
      fatCalories: Math.round(Math.max(0, calculatedFatCalories)),
      fatPct: finalCustomTotalCalories > 0 ? Math.round((Math.max(0, calculatedFatCalories) / finalCustomTotalCalories) * 100) : 0,
    };

    if (JSON.stringify(customCalculatedTargets) !== JSON.stringify(newCustomPlan)) {
      setCustomCalculatedTargets(newCustomPlan);
    }
  }, [currentStep, watchedCustomInputs, calculatedTargets, customCalculatedTargets]);


  const updateTotalsForSplitter = useCallback(() => {
    // const formValues = form.getValues(); // Not needed here as we use states
    let sourceTotals: TotalsForSplitter | null = null;

    // Priority: Step 8 Custom > Step 7 System Calculated
    if (customCalculatedTargets && customCalculatedTargets.totalCalories !== undefined && customCalculatedTargets.proteinGrams !== undefined && customCalculatedTargets.carbGrams !== undefined && customCalculatedTargets.fatGrams !== undefined) {
      sourceTotals = {
        calories: customCalculatedTargets.totalCalories,
        protein_g: customCalculatedTargets.proteinGrams,
        carbs_g: customCalculatedTargets.carbGrams,
        fat_g: customCalculatedTargets.fatGrams
      };
    } else if (calculatedTargets && calculatedTargets.targetCalories !== undefined && calculatedTargets.targetProtein !== undefined && calculatedTargets.targetCarbs !== undefined && calculatedTargets.targetFat !== undefined) {
      sourceTotals = {
        calories: calculatedTargets.targetCalories,
        protein_g: calculatedTargets.targetProtein,
        carbs_g: calculatedTargets.targetCarbs,
        fat_g: calculatedTargets.targetFat
      };
    }
    setTotalsForSplitter(sourceTotals);
    if (currentStep === 9 && !sourceTotals) { // New Step 9 is Macro Splitter
      toast({ title: "Input Needed", description: "Please complete a target calculation step (Smart or Custom) before distributing macros.", variant: "destructive", duration: 5000 });
    }
  }, [calculatedTargets, customCalculatedTargets, toast, currentStep]);


  useEffect(() => {
    if (currentStep === 9) { // New Step 9 is Macro Splitter
      updateTotalsForSplitter();
      const currentMealDist = form.getValues("mealDistributions");
      if (!currentMealDist || currentMealDist.length === 0) {
        replaceMealDistributions(defaultMealNames.map(name => ({
          mealName: name,
          calories_pct: defaultMacroPercentages[name]?.calories_pct || 0,
          protein_pct: defaultMacroPercentages[name]?.protein_pct || 0,
          carbs_pct: defaultMacroPercentages[name]?.carbs_pct || 0,
          fat_pct: defaultMacroPercentages[name]?.fat_pct || 0,
        })));
      }
    }
  }, [currentStep, updateTotalsForSplitter, form, replaceMealDistributions]);

  const watchedMealDistributions = form.watch("mealDistributions");
  const calculateColumnSum = (macroKey: keyof Omit<MealMacroDistribution, 'mealName'>) => {
    return watchedMealDistributions?.reduce((sum, meal) => sum + (Number(meal[macroKey]) || 0), 0) || 0;
  };

  const handleNext = async () => {
    if (activeStepData?.fieldsToValidate && activeStepData.fieldsToValidate.length > 0) {
      const result = await form.trigger(activeStepData.fieldsToValidate as FieldPath<OnboardingFormValues>[]);
      if (!result) {
        activeStepData.fieldsToValidate.forEach(field => {
          const fieldError = form.formState.errors[field as keyof OnboardingFormValues];
          if (fieldError && fieldError.message) {
            toast({ title: `Input Error: ${activeStepData.title}`, description: fieldError.message, variant: "destructive" });
          }
        });
        return;
      }
    }
    if (currentStep === 7) {
      updateCalculatedTargetsForStep7();
    }
    if (currentStep < onboardingStepsData.length) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSkip = () => {
    if (activeStepData?.isOptional && currentStep < onboardingStepsData.length) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const processAndSaveData = async (data: OnboardingFormValues) => {
    if (!user) {
      toast({ title: "Error", description: "User not authenticated.", variant: "destructive" });
      return;
    }

    const processedFormValues: Record<string, any> = { ...data };
    for (const key in processedFormValues) {
      if (processedFormValues[key] === undefined) {
        processedFormValues[key] = null;
      }
    }

    const arrayFields: (keyof OnboardingFormValues)[] = ['allergies', 'preferredCuisines', 'dispreferredCuisines', 'preferredIngredients', 'dispreferredIngredients', 'preferredMicronutrients', 'medicalConditions', 'medications'];
    arrayFields.forEach(field => {
      if (typeof processedFormValues[field] === 'string') {
        processedFormValues[field] = (processedFormValues[field] as string).split(',').map(s => s.trim()).filter(s => s);
      } else if (processedFormValues[field] === null || processedFormValues[field] === undefined) {
        processedFormValues[field] = [];
      }
    });

    let resultsToSave: GlobalCalculatedTargets | null = null;

    if (customCalculatedTargets && customCalculatedTargets.totalCalories !== undefined) {
      resultsToSave = {
        finalTargetCalories: customCalculatedTargets.totalCalories,
        proteinGrams: customCalculatedTargets.proteinGrams,
        proteinCalories: customCalculatedTargets.proteinCalories,
        proteinTargetPct: customCalculatedTargets.proteinPct,
        carbGrams: customCalculatedTargets.carbGrams,
        carbCalories: customCalculatedTargets.carbCalories,
        carbTargetPct: customCalculatedTargets.carbPct,
        fatGrams: customCalculatedTargets.fatGrams,
        fatCalories: customCalculatedTargets.fatCalories,
        fatTargetPct: customCalculatedTargets.fatPct,
        bmr: calculatedTargets?.bmr,
        tdee: calculatedTargets?.tdee,
        current_weight_for_custom_calc: data.current_weight,
        // estimatedWeeklyWeightChangeKg: // Recalculate if needed based on final targets
      };
    } else if (calculatedTargets && calculatedTargets.targetCalories !== undefined) {
      resultsToSave = {
        finalTargetCalories: calculatedTargets.targetCalories,
        proteinGrams: calculatedTargets.targetProtein,
        carbGrams: calculatedTargets.targetCarbs,
        fatGrams: calculatedTargets.targetFat,
        bmr: calculatedTargets.bmr,
        tdee: calculatedTargets.tdee,
        current_weight_for_custom_calc: data.current_weight,
      };
       // Calculate percentages and individual calories for Step 7 results
      if (resultsToSave.finalTargetCalories && resultsToSave.finalTargetCalories > 0) {
        if (resultsToSave.proteinGrams !== undefined) {
          resultsToSave.proteinCalories = resultsToSave.proteinGrams * 4;
          resultsToSave.proteinTargetPct = (resultsToSave.proteinCalories / resultsToSave.finalTargetCalories) * 100;
        }
        if (resultsToSave.carbGrams !== undefined) {
          resultsToSave.carbCalories = resultsToSave.carbGrams * 4;
          resultsToSave.carbTargetPct = (resultsToSave.carbCalories / resultsToSave.finalTargetCalories) * 100;
        }
        if (resultsToSave.fatGrams !== undefined) {
          resultsToSave.fatCalories = resultsToSave.fatGrams * 9;
          resultsToSave.fatTargetPct = (resultsToSave.fatCalories / resultsToSave.finalTargetCalories) * 100;
        }
      }
    }

    // Estimate weekly weight change for the final targets
    if (resultsToSave?.finalTargetCalories !== undefined && resultsToSave?.tdee !== undefined) {
      resultsToSave.estimatedWeeklyWeightChangeKg = (resultsToSave.tdee - resultsToSave.finalTargetCalories) * 7 / 7700;
    }


    const dataForFirestore: FullProfileType = {
      // Core profile data from form
      age: processedFormValues.age,
      gender: processedFormValues.gender,
      height_cm: processedFormValues.height_cm,
      current_weight: processedFormValues.current_weight,
      goal_weight_1m: processedFormValues.goal_weight_1m,
      ideal_goal_weight: processedFormValues.ideal_goal_weight,
      activityLevel: processedFormValues.activityLevel,
      dietGoalOnboarding: processedFormValues.dietGoalOnboarding,
      
      bf_current: processedFormValues.bf_current,
      bf_target: processedFormValues.bf_target,
      bf_ideal: processedFormValues.bf_ideal,
      mm_current: processedFormValues.mm_current,
      mm_target: processedFormValues.mm_target,
      mm_ideal: processedFormValues.mm_ideal,
      bw_current: processedFormValues.bw_current,
      bw_target: processedFormValues.bw_target,
      bw_ideal: processedFormValues.bw_ideal,
      
      waist_current: processedFormValues.waist_current,
      waist_goal_1m: processedFormValues.waist_goal_1m,
      waist_ideal: processedFormValues.waist_ideal,
      hips_current: processedFormValues.hips_current,
      hips_goal_1m: processedFormValues.hips_goal_1m,
      hips_ideal: processedFormValues.hips_ideal,
      right_leg_current: processedFormValues.right_leg_current,
      right_leg_goal_1m: processedFormValues.right_leg_goal_1m,
      right_leg_ideal: processedFormValues.right_leg_ideal,
      left_leg_current: processedFormValues.left_leg_current,
      left_leg_goal_1m: processedFormValues.left_leg_goal_1m,
      left_leg_ideal: processedFormValues.left_leg_ideal,
      right_arm_current: processedFormValues.right_arm_current,
      right_arm_goal_1m: processedFormValues.right_arm_goal_1m,
      right_arm_ideal: processedFormValues.right_arm_ideal,
      left_arm_current: processedFormValues.left_arm_current,
      left_arm_goal_1m: processedFormValues.left_arm_goal_1m,
      left_arm_ideal: processedFormValues.left_arm_ideal,

      preferredDiet: processedFormValues.preferredDiet,
      allergies: processedFormValues.allergies,
      preferredCuisines: processedFormValues.preferredCuisines,
      dispreferredCuisines: processedFormValues.dispreferredCuisines,
      preferredIngredients: processedFormValues.preferredIngredients,
      dispreferredIngredients: processedFormValues.dispreferredIngredients,
      preferredMicronutrients: processedFormValues.preferredMicronutrients,
      medicalConditions: processedFormValues.medicalConditions,
      medications: processedFormValues.medications,
      typicalMealsDescription: processedFormValues.typicalMealsDescription,

      // Customization and distribution from onboarding
      custom_total_calories: processedFormValues.custom_total_calories,
      custom_protein_per_kg: processedFormValues.custom_protein_per_kg,
      remaining_calories_carb_pct: processedFormValues.remaining_calories_carb_pct,
      mealDistributions: processedFormValues.mealDistributions,

      // Store the calculated/customized targets
      smartPlannerData: {
        formValues: { // Store the inputs that led to the primary calculation
          age: processedFormValues.age,
          gender: processedFormValues.gender,
          height_cm: processedFormValues.height_cm,
          current_weight: processedFormValues.current_weight,
          activity_factor_key: processedFormValues.activityLevel,
          dietGoal: processedFormValues.dietGoalOnboarding,
          // Include custom inputs if they were part of the final target determination
          custom_total_calories: processedFormValues.custom_total_calories,
          custom_protein_per_kg: processedFormValues.custom_protein_per_kg,
          remaining_calories_carb_pct: processedFormValues.remaining_calories_carb_pct,
        },
        results: resultsToSave,
      },
      onboardingComplete: true,
      email: user?.email || null,
    };

    await completeOnboarding(dataForFirestore); // Pass the FullProfileType compatible object
    toast({ title: "Onboarding Complete!", description: "Your profile has been saved. Welcome to NutriPlan!" });
  };

  const renderTextField = (name: FieldPath<OnboardingFormValues>, label: string, placeholder: string, description?: string) => (
    <FormField control={form.control} name={name}
      render={({ field }) => ( <FormItem> <FormLabel>{label}</FormLabel> <FormControl><div><Input placeholder={placeholder} {...field} value={field.value as string || ''} /></div></FormControl> {description && <FormDescription>{description}</FormDescription>} <FormMessage /> </FormItem> )} />
  );

  const renderNumberField = (name: FieldPath<OnboardingFormValues>, label: string, placeholder: string, description?: string, step?: string) => (
    <FormField control={form.control} name={name}
      render={({ field }) => ( <FormItem> <FormLabel>{label}</FormLabel> <FormControl><div><Input type="number" placeholder={placeholder} {...field} value={field.value === undefined || field.value === null || isNaN(Number(field.value)) ? '' : String(field.value)} onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} step={step}/></div></FormControl> {description && <FormDescription>{description}</FormDescription>} <FormMessage /> </FormItem> )} />
  );

  const renderSelectField = (name: FieldPath<OnboardingFormValues>, label: string, placeholder: string, options: {value: string | number, label: string}[], description?: string) => (
     <FormField control={form.control} name={name}
      render={({ field }) => ( <FormItem> <FormLabel>{label}</FormLabel> <Select onValueChange={field.onChange} value={String(field.value || '')} > <FormControl><div><SelectTrigger> <SelectValue placeholder={placeholder} /> </SelectTrigger></div></FormControl> <SelectContent> {options.map(opt => <SelectItem key={String(opt.value)} value={String(opt.value)}>{opt.label}</SelectItem>)} </SelectContent> </Select> {description && <FormDescription>{description}</FormDescription>} <FormMessage /> </FormItem> )} />
  );

  const renderTextareaField = (name: FieldPath<OnboardingFormValues>, label: string, placeholder: string, description?: string) => (
    <FormField control={form.control} name={name}
      render={({ field }) => ( <FormItem> <FormLabel>{label}</FormLabel> <FormControl><div><Textarea placeholder={placeholder} {...field} value={field.value as string || ''} className="h-20"/></div></FormControl> {description && <FormDescription>{description}</FormDescription>} <FormMessage /> </FormItem> )} />
  );

  if (!activeStepData) return <div className="flex justify-center items-center h-screen"><p>Loading step...</p></div>;
  if (!user) return <div className="flex justify-center items-center h-screen"><p>Loading user information...</p></div>;

  const progressValue = (currentStep / onboardingStepsData.length) * 100;

  const macroPctKeys: (keyof Omit<MealMacroDistribution, 'mealName'>)[] = ['calories_pct', 'protein_pct', 'carbs_pct', 'fat_pct'];
  const columnSums = {
    calories_pct: calculateColumnSum('calories_pct'),
    protein_pct: calculateColumnSum('protein_pct'),
    carbs_pct: calculateColumnSum('carbs_pct'),
    fat_pct: calculateColumnSum('fat_pct'),
  };
  const tableHeaderLabels = [
    { key: "meal", label: "Meal", className: "sticky left-0 bg-card z-10 w-[120px] text-left font-medium" },
    { key: "cal_pct", label: "%Cal", className: "text-right min-w-[70px]" },
    { key: "p_pct", label: "%P", className: "text-right min-w-[70px]" },
    { key: "c_pct", label: "%C", className: "text-right min-w-[70px]" },
    { key: "f_pct", label: "%F", className: "text-right min-w-[70px] border-r" },
    { key: "kcal", label: "Cal", className: "text-right min-w-[60px]" },
    { key: "p_g", label: "P(g)", className: "text-right min-w-[60px]" },
    { key: "c_g", label: "C(g)", className: "text-right min-w-[60px]" },
    { key: "f_g", label: "F(g)", className: "text-right min-w-[60px]" },
  ];


  return (
    <TooltipProvider>
    <Card className="w-full max-w-2xl shadow-xl">
      <CardHeader className="text-center">
        <div className="flex justify-center items-center mb-4"> <Leaf className="h-10 w-10 text-primary" /> </div>
        <Tooltip>
            <TooltipTrigger asChild><span><CardTitle className="text-2xl font-bold cursor-help">{activeStepData.title}</CardTitle></span></TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs"> <p>{activeStepData.tooltipText}</p> </TooltipContent>
        </Tooltip>
        <CardDescription>{activeStepData.explanation}</CardDescription>
        <Progress value={progressValue} className="w-full mt-4" />
        <p className="text-sm text-muted-foreground mt-1">Step {currentStep} of {onboardingStepsData.length}</p>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(processAndSaveData)} className="space-y-8">
            {currentStep === 1 && ( <div className="text-center p-4">  </div> )}
            {currentStep === 2 && ( <div className="grid grid-cols-1 md:grid-cols-2 gap-6"> {renderNumberField("age", "Age (Years)", "e.g., 30")} {renderSelectField("gender", "Biological Sex", "Select sex", genders)} {renderNumberField("height_cm", "Height (cm)", "e.g., 175")} {renderNumberField("current_weight", "Current Weight (kg)", "e.g., 70")} {renderNumberField("goal_weight_1m", "Target Weight After 1 Month (kg)", "e.g., 68")} {renderNumberField("ideal_goal_weight", "Long-Term Goal Weight (kg, Optional)", "e.g., 65")} {renderSelectField("activityLevel", "Physical Activity Level", "Select activity level", activityLevels)} {renderSelectField("dietGoalOnboarding", "Primary Diet Goal", "Select your diet goal", smartPlannerDietGoals)} </div> )}
            {currentStep === 3 && ( <div className="space-y-4"> <div className="grid grid-cols-4 gap-x-2 pb-1 border-b mb-2 text-sm font-medium text-muted-foreground"> <span className="col-span-1">Metric</span> <span className="text-center">Current (%)</span> <span className="text-center">Target (1 Mth) (%)</span> <span className="text-center">Ideal (%)</span> </div> {(['Body Fat', 'Muscle Mass', 'Body Water'] as const).map((metric) => { const keys = { 'Body Fat': ['bf_current', 'bf_target', 'bf_ideal'], 'Muscle Mass': ['mm_current', 'mm_target', 'mm_ideal'], 'Body Water': ['bw_current', 'bw_target', 'bw_ideal'], }[metric] as [FieldPath<OnboardingFormValues>, FieldPath<OnboardingFormValues>, FieldPath<OnboardingFormValues>]; return ( <div key={metric} className="grid grid-cols-4 gap-x-2 items-start py-1"> <FormLabel className="text-sm pt-2">{metric}</FormLabel> {keys.map(key => ( <FormField key={key} control={form.control} name={key} render={({ field }) => ( <FormItem className="text-center"> <FormControl><div><Input type="number" placeholder="e.g., 20" {...field} value={field.value === undefined || field.value === null || isNaN(Number(field.value)) ? '' : String(field.value)} onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} className="w-full text-center text-sm h-9" /></div></FormControl> <FormMessage className="text-xs text-center"/> </FormItem> )}/> ))} </div> ); })} </div> )}
            {currentStep === 4 && ( <div className="space-y-4"> <div className="grid grid-cols-4 gap-x-2 pb-1 border-b mb-2 text-sm font-medium text-muted-foreground"> <span className="col-span-1">Metric</span> <span className="text-center">Current (cm)</span> <span className="text-center">1-Mth Goal (cm)</span> <span className="text-center">Ideal (cm)</span> </div> {(['Waist', 'Hips', 'Right Leg', 'Left Leg', 'Right Arm', 'Left Arm'] as const).map((metric) => { const keys = { 'Waist': ['waist_current', 'waist_goal_1m', 'waist_ideal'], 'Hips': ['hips_current', 'hips_goal_1m', 'hips_ideal'], 'Right Leg': ['right_leg_current', 'right_leg_goal_1m', 'right_leg_ideal'], 'Left Leg': ['left_leg_current', 'left_leg_goal_1m', 'left_leg_ideal'], 'Right Arm': ['right_arm_current', 'right_arm_goal_1m', 'right_arm_ideal'], 'Left Arm': ['left_arm_current', 'left_arm_goal_1m', 'left_arm_ideal'], }[metric] as [FieldPath<OnboardingFormValues>, FieldPath<OnboardingFormValues>, FieldPath<OnboardingFormValues>]; return ( <div key={metric} className="grid grid-cols-4 gap-x-2 items-start py-1"> <FormLabel className="text-sm pt-2">{metric}</FormLabel> {keys.map(key => ( <FormField key={key} control={form.control} name={key} render={({ field }) => ( <FormItem className="text-center"> <FormControl><div><Input type="number" placeholder="e.g., 80" {...field} value={field.value === undefined || field.value === null || isNaN(Number(field.value)) ? '' : String(field.value)} onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} className="w-full text-center text-sm h-9" /></div></FormControl> <FormMessage className="text-xs text-center"/> </FormItem> )}/> ))} </div> ); })} </div> )}
            {currentStep === 5 && ( <div className="grid grid-cols-1 md:grid-cols-2 gap-6"> {renderSelectField("preferredDiet", "Preferred Diet (Optional)", "e.g., Vegetarian", preferredDiets)}  {renderTextareaField("allergies", "Allergies (comma-separated, Optional)", "e.g., Peanuts, Shellfish", "List any food allergies.")} {renderTextareaField("preferredCuisines", "Preferred Cuisines (comma-separated, Optional)", "e.g., Italian, Mexican")} {renderTextareaField("dispreferredCuisines", "Dispreferred Cuisines (comma-separated, Optional)", "e.g., Thai, Indian")} {renderTextareaField("preferredIngredients", "Favorite Ingredients (comma-separated, Optional)", "e.g., Chicken, Avocado")} {renderTextareaField("dispreferredIngredients", "Disliked Ingredients (comma-separated, Optional)", "e.g., Tofu, Olives")} {renderTextareaField("preferredMicronutrients", "Targeted Micronutrients (Optional)", "e.g., Vitamin D, Iron")} </div> )}
            {currentStep === 6 && ( <div className="grid grid-cols-1 md:grid-cols-2 gap-6"> {renderTextareaField("medicalConditions", "Medical Conditions (comma-separated, Optional)", "e.g., Diabetes, Hypertension", "Helps AI avoid conflicting foods.")} {renderTextareaField("medications", "Medications (comma-separated, Optional)", "e.g., Metformin, Lisinopril", "Helps AI avoid interactions.")} </div> )}
            {currentStep === 7 && ( <div className="space-y-4 p-4 border rounded-md bg-muted/50"> <h3 className="text-lg font-semibold text-primary">Your Estimated Daily Targets:</h3> {calculatedTargets ? ( <> <p><strong>Basal Metabolic Rate (BMR):</strong> {calculatedTargets.bmr?.toFixed(0) ?? 'N/A'} kcal</p> <p><strong>Maintenance Calories (TDEE):</strong> {calculatedTargets.tdee?.toFixed(0) ?? 'N/A'} kcal</p> <p className="font-bold text-primary mt-2">Target Daily Calories: {calculatedTargets.targetCalories?.toFixed(0) ?? 'N/A'} kcal</p> <p>Target Protein: {calculatedTargets.targetProtein?.toFixed(1) ?? 'N/A'} g</p> <p>Target Carbs: {calculatedTargets.targetCarbs?.toFixed(1) ?? 'N/A'} g</p> <p>Target Fat: {calculatedTargets.targetFat?.toFixed(1) ?? 'N/A'} g</p> </> ) : ( <p className="text-destructive flex items-center"><AlertCircle className="mr-2 h-4 w-4" /> Not enough information from previous steps to calculate. Please go back and complete required fields.</p> )} <FormDescription className="text-xs mt-2">These are estimates. You can fine-tune these in the next step or later in the app's tools.</FormDescription> </div> )}
            {currentStep === 8 && ( <div className="space-y-6 p-4 border rounded-md bg-muted/50"> <h3 className="text-lg font-semibold text-primary mb-3">Customize Your Daily Targets</h3> {renderNumberField("custom_total_calories", "Custom Total Calories (Optional)", `e.g., ${calculatedTargets?.targetCalories?.toFixed(0) || '2000'}`)} {renderNumberField("custom_protein_per_kg", "Custom Protein (g/kg body weight) (Optional)", `e.g., ${(calculatedTargets?.targetProtein && calculatedTargets?.current_weight_for_calc ? (calculatedTargets.targetProtein / calculatedTargets.current_weight_for_calc).toFixed(1) : '1.6')}`, undefined, "0.1")} <FormField control={form.control} name="remaining_calories_carb_pct" render={({ field }) => { const carbPct = field.value ?? 50; const fatPct = 100 - carbPct; return ( <FormItem> <FormLabel>Remaining Calories Split (Carbs %)</FormLabel> <FormControl><div><Slider value={[carbPct]} onValueChange={(value) => field.onChange(value[0])} min={0} max={100} step={1} /></div></FormControl> <div className="flex justify-between text-xs text-muted-foreground"> <span>Carbs: {carbPct.toFixed(0)}%</span> <span>Fat: {fatPct.toFixed(0)}%</span> </div> <FormMessage /> </FormItem> ); }} /> {customCalculatedTargets && ( <div className="mt-4 space-y-1"> <h4 className="font-medium text-primary">Your Custom Plan:</h4> <p className="text-sm">Total Calories: {customCalculatedTargets.totalCalories?.toFixed(0) ?? 'N/A'} kcal</p> <p className="text-sm">Protein: {customCalculatedTargets.proteinGrams?.toFixed(1) ?? 'N/A'}g ({customCalculatedTargets.proteinPct?.toFixed(0) ?? 'N/A'}%)</p> <p className="text-sm">Carbs: {customCalculatedTargets.carbGrams?.toFixed(1) ?? 'N/A'}g ({customCalculatedTargets.carbPct?.toFixed(0) ?? 'N/A'}%)</p> <p className="text-sm">Fat: {customCalculatedTargets.fatGrams?.toFixed(1) ?? 'N/A'}g ({customCalculatedTargets.fatPct?.toFixed(0) ?? 'N/A'}%)</p> </div> )} </div> )}
            {/* Old Step 9 for Manual Macro Targets is Removed */}
            {currentStep === 9 && ( // This is the new Step 9 (was Step 10) - Macro Splitter
              <div className="space-y-4 p-4 border rounded-md bg-muted/50">
                <h3 className="text-lg font-semibold text-primary mb-1">Distribute Macros Across Meals</h3>
                {totalsForSplitter ? (
                  <>
                    <div className="mb-3 text-sm">
                      <p className="font-medium">Total Daily Macros for Splitting:</p>
                      <p>
                        Calories: {totalsForSplitter.calories.toFixed(0)} kcal, Protein: {totalsForSplitter.protein_g.toFixed(1)}g,
                        Carbs: {totalsForSplitter.carbs_g.toFixed(1)}g, Fat: {totalsForSplitter.fat_g.toFixed(1)}g
                      </p>
                    </div>
                    <ScrollArea className="w-full border rounded-md">
                      <Table className="min-w-[700px]">
                        <TableHeader>
                          <TableRow>
                            {tableHeaderLabels.map(header => (
                              <TableHead key={header.key} className={cn("px-2 py-1 text-xs font-medium h-9", header.className)}>
                                {header.label}
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {mealDistributionFields.map((item, index) => {
                            const currentPercentages = watchedMealDistributions?.[index];
                            let mealCal = NaN, mealP = NaN, mealC = NaN, mealF = NaN;
                            if (totalsForSplitter && currentPercentages) {
                              mealCal = totalsForSplitter.calories * ((currentPercentages.calories_pct || 0) / 100);
                              mealP = totalsForSplitter.protein_g * ((currentPercentages.protein_pct || 0) / 100);
                              mealC = totalsForSplitter.carbs_g * ((currentPercentages.carbs_pct || 0) / 100);
                              mealF = totalsForSplitter.fat_g * ((currentPercentages.fat_pct || 0) / 100);
                            }
                            return (
                              <TableRow key={item.id}>
                                <TableCell className="font-medium sticky left-0 bg-card z-10 px-2 py-1 text-sm h-10">{item.mealName}</TableCell>
                                {macroPctKeys.map(macroKey => (
                                  <TableCell key={macroKey} className={cn("px-1 py-1 text-right tabular-nums h-10", macroKey === 'fat_pct' ? 'border-r' : '')}>
                                    <FormField
                                      control={form.control}
                                      name={`mealDistributions.${index}.${macroKey}`}
                                      render={({ field }) => (
                                        <FormItem>
                                        <FormControl><div><Input type="number" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} className="w-16 h-8 text-xs text-right tabular-nums px-1 py-0.5" /></div></FormControl>
                                        <FormMessage />
                                        </FormItem>
                                      )}/>
                                  </TableCell>
                                ))}
                                <TableCell className="text-right text-xs py-1 tabular-nums h-10">{isNaN(mealCal) ? '-' : mealCal.toFixed(0)}</TableCell>
                                <TableCell className="text-right text-xs py-1 tabular-nums h-10">{isNaN(mealP) ? '-' : mealP.toFixed(1)}</TableCell>
                                <TableCell className="text-right text-xs py-1 tabular-nums h-10">{isNaN(mealC) ? '-' : mealC.toFixed(1)}</TableCell>
                                <TableCell className="text-right text-xs py-1 tabular-nums h-10">{isNaN(mealF) ? '-' : mealF.toFixed(1)}</TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                        <TableFooter>
                          <TableRow className="font-semibold text-xs h-10">
                            <TableCell className="sticky left-0 bg-card z-10 px-2 py-1">Input % Totals:</TableCell>
                            {macroPctKeys.map(key => {
                              const sum = columnSums[key];
                              const isSum100 = Math.round(sum) === 100;
                              return (
                                <TableCell key={`sum-${key}`} className={cn("text-right py-1 tabular-nums", isSum100 ? 'text-green-600' : 'text-destructive', key === 'fat_pct' ? 'border-r' : '')}>
                                  {sum.toFixed(0)}%
                                  {isSum100 ? <CheckCircle2 className="ml-1 h-3 w-3 inline-block" /> : <AlertTriangle className="ml-1 h-3 w-3 inline-block" />}
                                </TableCell>
                              );
                            })}
                            <TableCell colSpan={4} className="py-1"></TableCell>
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
                  </>
                ) : (
                  <p className="text-destructive flex items-center"><AlertCircle className="mr-2 h-4 w-4" /> Please complete a target calculation (Smart or Custom) in a previous step to enable meal distribution.</p>
                )}
              </div>
            )}
            {currentStep === 10 && ( <div> {renderTextareaField("typicalMealsDescription", "Describe Your Typical Meals", "e.g., Breakfast: Oats with berries. Lunch: Chicken salad sandwich...", "This helps our AI learn your habits.")} </div> )}
            {currentStep === 11 && ( <div className="text-center space-y-4"> <CheckCircle className="h-16 w-16 text-green-500 mx-auto" /> <p className="text-lg">You're all set! Your profile is complete.</p> <p className="text-muted-foreground">Click "Finish Onboarding" to save your profile and proceed to the dashboard. You can then generate your first AI-powered meal plan.</p> </div> )}

            <div className="flex justify-between items-center pt-6"> <Button type="button" variant="outline" onClick={handlePrevious} disabled={currentStep === 1}> Previous </Button> <div className="space-x-2"> {activeStepData.isOptional && currentStep < onboardingStepsData.length && ( <Button type="button" variant="ghost" onClick={handleSkip}> Skip </Button> )} {currentStep < onboardingStepsData.length ? ( <Button type="button" onClick={handleNext}> Next </Button> ) : ( <Button type="submit"> Finish Onboarding </Button> )} </div> </div>
          </form>
        </Form>
      </CardContent>
    </Card>
    </TooltipProvider>
  );
}
