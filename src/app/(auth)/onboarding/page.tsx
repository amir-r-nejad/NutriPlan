
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
import { AlertCircle, CheckCircle, Leaf, Info, AlertTriangle, CheckCircle2 } from "lucide-react";
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
import { OnboardingFormSchema, type OnboardingFormValues, type MealMacroDistribution, type GlobalCalculatedTargets, preprocessDataForFirestore } from "@/lib/schemas";
import { calculateEstimatedDailyTargets } from "@/lib/nutrition-calculator";
import { Slider } from "@/components/ui/slider";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area"; // Added ScrollArea import

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

  const [calculatedTargets, setCalculatedTargets] = useState<GlobalCalculatedTargets | null>(null);
  const [customCalculatedTargets, setCustomCalculatedTargets] = useState<GlobalCalculatedTargets | null>(null);
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
      preferredMicronutrients: "", medicalConditions: "", medications: "",
      custom_total_calories: undefined, custom_protein_per_kg: undefined, remaining_calories_carb_pct: 50,
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
      const estimated = calculateEstimatedDailyTargets({
        age: data.age,
        gender: data.gender,
        current_weight: data.current_weight,
        height_cm: data.height_cm,
        activityLevel: data.activityLevel,
        dietGoalOnboarding: data.dietGoalOnboarding,
        goal_weight_1m: data.goal_weight_1m,
        bf_current: data.bf_current,
        bf_target: data.bf_target,
        waist_current: data.waist_current,
        waist_goal_1m: data.waist_goal_1m,
      });

      if (estimated.finalTargetCalories && estimated.proteinGrams && estimated.carbGrams && estimated.fatGrams) {
        const proteinCals = estimated.proteinGrams * 4;
        const carbCals = estimated.carbGrams * 4;
        const fatCals = estimated.fatGrams * 9;
         const newTargets: GlobalCalculatedTargets = {
          bmr: Math.round(estimated.bmr || 0),
          tdee: Math.round(estimated.tdee || 0),
          finalTargetCalories: Math.round(estimated.finalTargetCalories),
          proteinGrams: Math.round(estimated.proteinGrams),
          proteinCalories: Math.round(proteinCals),
          proteinTargetPct: estimated.finalTargetCalories > 0 ? Math.round((proteinCals / estimated.finalTargetCalories) * 100) : undefined,
          carbGrams: Math.round(estimated.carbGrams),
          carbCalories: Math.round(carbCals),
          carbTargetPct: estimated.finalTargetCalories > 0 ? Math.round((carbCals / estimated.finalTargetCalories) * 100) : undefined,
          fatGrams: Math.round(estimated.fatGrams),
          fatCalories: Math.round(fatCals),
          fatTargetPct: estimated.finalTargetCalories > 0 ? Math.round((fatCals / estimated.finalTargetCalories) * 100) : undefined,
          current_weight_for_custom_calc: data.current_weight,
          estimatedWeeklyWeightChangeKg: estimated.estimatedWeeklyWeightChangeKg,
        };
        setCalculatedTargets(newTargets);
      } else {
        setCalculatedTargets(null);
      }
    } else {
      setCalculatedTargets(null);
    }
  }, [form]);

  useEffect(() => {
    if (currentStep === 7) { 
      updateCalculatedTargetsForStep7();
    }
  }, [currentStep, updateCalculatedTargetsForStep7]);

  const watchedCustomInputs = form.watch([
    "custom_total_calories", "custom_protein_per_kg", "remaining_calories_carb_pct", "current_weight"
  ]);

  useEffect(() => {
    if (currentStep !== 8 || !calculatedTargets) {
      if (customCalculatedTargets !== null) setCustomCalculatedTargets(null);
      return;
    }

    const [customTotalCaloriesInput, customProteinPerKgInput, remainingCarbPctInput, formCurrentWeight] = watchedCustomInputs;
    
    const baseWeight = formCurrentWeight || calculatedTargets?.current_weight_for_custom_calc;

    if (!baseWeight || baseWeight <= 0) {
      if (customCalculatedTargets !== null) setCustomCalculatedTargets(null);
      return;
    }
    
    const effectiveTotalCalories = customTotalCaloriesInput !== undefined && customTotalCaloriesInput > 0
      ? customTotalCaloriesInput
      : (calculatedTargets?.finalTargetCalories || 0);

    const defaultProteinPerKg = (calculatedTargets?.proteinGrams && calculatedTargets?.current_weight_for_custom_calc && calculatedTargets.current_weight_for_custom_calc > 0)
      ? calculatedTargets.proteinGrams / calculatedTargets.current_weight_for_custom_calc
      : 1.6;

    const effectiveProteinPerKg = customProteinPerKgInput !== undefined && customProteinPerKgInput >= 0
      ? customProteinPerKgInput
      : defaultProteinPerKg;

    const calculatedProteinGrams = baseWeight * effectiveProteinPerKg;
    const calculatedProteinCalories = calculatedProteinGrams * 4;
    let remainingCaloriesForCustom = effectiveTotalCalories - calculatedProteinCalories;

    let calculatedCarbGrams = 0, calculatedFatGrams = 0;
    let calculatedCarbCalories = 0, calculatedFatCalories = 0;

    if (remainingCaloriesForCustom > 0) {
      const carbRatio = (remainingCarbPctInput ?? 50) / 100;
      const fatRatio = 1 - carbRatio;
      calculatedCarbCalories = remainingCaloriesForCustom * carbRatio;
      calculatedFatCalories = remainingCaloriesForCustom * fatRatio;
      calculatedCarbGrams = calculatedCarbCalories / 4;
      calculatedFatGrams = calculatedFatCalories / 9;
    } else {
      remainingCaloriesForCustom = 0; 
    }

    const finalCustomTotalCalories = calculatedProteinCalories + Math.max(0, calculatedCarbCalories) + Math.max(0, calculatedFatCalories);

    const newCustomPlan: GlobalCalculatedTargets = {
      finalTargetCalories: Math.round(finalCustomTotalCalories),
      proteinGrams: Math.round(calculatedProteinGrams),
      proteinCalories: Math.round(calculatedProteinCalories),
      proteinTargetPct: finalCustomTotalCalories > 0 ? Math.round((calculatedProteinCalories / finalCustomTotalCalories) * 100) : (calculatedProteinGrams > 0 ? 100 : 0),
      carbGrams: Math.round(Math.max(0, calculatedCarbGrams)),
      carbCalories: Math.round(Math.max(0, calculatedCarbCalories)),
      carbTargetPct: finalCustomTotalCalories > 0 ? Math.round((Math.max(0, calculatedCarbCalories) / finalCustomTotalCalories) * 100) : 0,
      fatGrams: Math.round(Math.max(0, calculatedFatGrams)),
      fatCalories: Math.round(Math.max(0, calculatedFatCalories)),
      fatTargetPct: finalCustomTotalCalories > 0 ? Math.round((Math.max(0, calculatedFatCalories) / finalCustomTotalCalories) * 100) : 0,
      bmr: calculatedTargets?.bmr,
      tdee: calculatedTargets?.tdee,
      current_weight_for_custom_calc: baseWeight,
      estimatedWeeklyWeightChangeKg: (calculatedTargets?.tdee && finalCustomTotalCalories) ? (calculatedTargets.tdee - finalCustomTotalCalories) * 7 / 7700 : undefined,
    };
    
    if (JSON.stringify(customCalculatedTargets) !== JSON.stringify(newCustomPlan)) {
        setCustomCalculatedTargets(newCustomPlan);
    }
  }, [currentStep, watchedCustomInputs, calculatedTargets, customCalculatedTargets]);


  const updateTotalsForSplitter = useCallback(() => {
    const formValues = form.getValues();
    let sourceTotals: TotalsForSplitter | null = null;

    if (customCalculatedTargets && customCalculatedTargets.finalTargetCalories !== undefined && (formValues.custom_total_calories !== undefined || formValues.custom_protein_per_kg !== undefined)) {
      sourceTotals = {
        calories: customCalculatedTargets.finalTargetCalories,
        protein_g: customCalculatedTargets.proteinGrams || 0,
        carbs_g: customCalculatedTargets.carbGrams || 0,
        fat_g: customCalculatedTargets.fatGrams || 0,
      };
    } else if (calculatedTargets && calculatedTargets.finalTargetCalories !== undefined) {
       sourceTotals = {
        calories: calculatedTargets.finalTargetCalories,
        protein_g: calculatedTargets.proteinGrams || 0,
        carbs_g: calculatedTargets.carbGrams || 0,
        fat_g: calculatedTargets.fatGrams || 0,
      };
    }
    setTotalsForSplitter(sourceTotals);
    if (currentStep === 9 && !sourceTotals) { 
      toast({ title: "Input Needed", description: "Please complete a target calculation step (Smart or Custom) before distributing macros.", variant: "destructive", duration: 5000 });
    }
  }, [calculatedTargets, customCalculatedTargets, toast, currentStep, form]);


  useEffect(() => {
    if (currentStep === 9) { 
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
        let firstErrorField: FieldPath<OnboardingFormValues> | undefined = undefined;
        for (const field of activeStepData.fieldsToValidate) {
            if (form.formState.errors[field as keyof OnboardingFormValues]) {
                firstErrorField = field as FieldPath<OnboardingFormValues>;
                break;
            }
        }
        const errorMessage = firstErrorField ? form.formState.errors[firstErrorField as keyof OnboardingFormValues]?.message : "Please correct the errors.";
        toast({ 
            title: `Input Error: ${activeStepData.title}`, 
            description: typeof errorMessage === 'string' ? errorMessage : "Please fill all required fields correctly.", 
            variant: "destructive" 
        });
        return;
      }
    }
    if (currentStep === 7) { 
      updateCalculatedTargetsForStep7(); 
    }
     if (currentStep === 8 && !customCalculatedTargets && calculatedTargets) { 
      setCustomCalculatedTargets(calculatedTargets); 
    }
    if (currentStep === 9){ 
        updateTotalsForSplitter(); 
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

    let processedData: Record<string, any> = { ...data };
    
    const arrayLikeFields: (keyof OnboardingFormValues)[] = ['allergies', 'preferredCuisines', 'dispreferredCuisines', 'preferredIngredients', 'dispreferredIngredients', 'preferredMicronutrients', 'medicalConditions', 'medications'];
    arrayLikeFields.forEach(field => {
      if (typeof processedData[field] === 'string' && (processedData[field] as string).trim() !== '') {
        processedData[field] = (processedData[field] as string).split(',').map(s => s.trim()).filter(s => s);
      } else if (typeof processedData[field] === 'string' && (processedData[field] as string).trim() === '') {
         processedData[field] = []; // Convert empty string to empty array
      } else if (processedData[field] === undefined || processedData[field] === null) {
         processedData[field] = []; // Convert undefined/null to empty array
      }
    });
    
    let finalResultsToSave: GlobalCalculatedTargets | null = null;
    if (customCalculatedTargets && (data.custom_total_calories !== undefined && data.custom_total_calories !== null || data.custom_protein_per_kg !== undefined && data.custom_protein_per_kg !== null)) {
        finalResultsToSave = customCalculatedTargets;
    } else if (calculatedTargets) {
        finalResultsToSave = calculatedTargets;
    }

    const smartPlannerFormValuesForStorage = {
        age: processedData.age,
        gender: processedData.gender,
        height_cm: processedData.height_cm,
        current_weight: processedData.current_weight,
        goal_weight_1m: processedData.goal_weight_1m,
        ideal_goal_weight: processedData.ideal_goal_weight,
        activity_factor_key: processedData.activityLevel, 
        dietGoal: processedData.dietGoalOnboarding, 
        bf_current: processedData.bf_current,
        bf_target: processedData.bf_target,
        bf_ideal: processedData.bf_ideal,
        mm_current: processedData.mm_current,
        mm_target: processedData.mm_target,
        mm_ideal: processedData.mm_ideal,
        bw_current: processedData.bw_current,
        bw_target: processedData.bw_target,
        bw_ideal: processedData.bw_ideal,
        waist_current: processedData.waist_current,
        waist_goal_1m: processedData.waist_goal_1m,
        waist_ideal: processedData.waist_ideal,
        hips_current: processedData.hips_current,
        hips_goal_1m: processedData.hips_goal_1m,
        hips_ideal: processedData.hips_ideal,
        right_leg_current: processedData.right_leg_current,
        right_leg_goal_1m: processedData.right_leg_goal_1m,
        right_leg_ideal: processedData.right_leg_ideal,
        left_leg_current: processedData.left_leg_current,
        left_leg_goal_1m: processedData.left_leg_goal_1m,
        left_leg_ideal: processedData.left_leg_ideal,
        right_arm_current: processedData.right_arm_current,
        right_arm_goal_1m: processedData.right_arm_goal_1m,
        right_arm_ideal: processedData.right_arm_ideal,
        left_arm_current: processedData.left_arm_current,
        left_arm_goal_1m: processedData.left_arm_goal_1m,
        left_arm_ideal: processedData.left_arm_ideal,
        custom_total_calories: processedData.custom_total_calories,
        custom_protein_per_kg: processedData.custom_protein_per_kg,
        remaining_calories_carb_pct: processedData.remaining_calories_carb_pct,
    };
    
    // Create a data structure for Firestore, ensuring all optional fields default to null if undefined
    const firestoreReadyData: Partial<FullProfileType> = {
      ...preprocessDataForFirestore(processedData), // Preprocess all top-level fields
      smartPlannerData: {
          formValues: preprocessDataForFirestore(smartPlannerFormValuesForStorage),
          results: preprocessDataForFirestore(finalResultsToSave)
      },
      mealDistributions: processedData.mealDistributions && processedData.mealDistributions.length > 0 
        ? preprocessDataForFirestore(processedData.mealDistributions)
        : defaultMealNames.map(name => ({ // Ensure this also gets preprocessed if necessary
            mealName: name,
            calories_pct: defaultMacroPercentages[name]?.calories_pct || 0,
            protein_pct: defaultMacroPercentages[name]?.protein_pct || 0,
            carbs_pct: defaultMacroPercentages[name]?.carbs_pct || 0,
            fat_pct: defaultMacroPercentages[name]?.fat_pct || 0,
          })),
    };
    
    // Remove fields that are now nested under smartPlannerData.formValues from the top level
    delete firestoreReadyData.custom_total_calories;
    delete firestoreReadyData.custom_protein_per_kg;
    delete firestoreReadyData.remaining_calories_carb_pct;
    
    await completeOnboarding(firestoreReadyData as FullProfileType); 
    toast({ title: "Onboarding Complete!", description: "Your profile has been saved. Welcome to NutriPlan!" });
  };

  const renderTextField = (name: FieldPath<OnboardingFormValues>, label: string, placeholder: string, description?: string) => (
    <FormField control={form.control} name={name}
      render={({ field }) => ( <FormItem> <FormLabel>{label}</FormLabel> <FormControl><div><Input placeholder={placeholder} {...field} value={field.value as string ?? ''} /></div></FormControl> {description && <FormDescription>{description}</FormDescription>} <FormMessage /> </FormItem> )} />
  );

  const renderNumberField = (name: FieldPath<OnboardingFormValues>, label: string, placeholder: string, description?: string, step: string = "1") => (
    <FormField control={form.control} name={name}
      render={({ field }) => ( <FormItem> <FormLabel>{label}</FormLabel> <FormControl><div><Input type="number" placeholder={placeholder} {...field} value={field.value === undefined || field.value === null || isNaN(Number(field.value)) ? '' : String(field.value)} onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} step={step} onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}/></div></FormControl> {description && <FormDescription>{description}</FormDescription>} <FormMessage /> </FormItem> )} />
  );

  const renderSelectField = (name: FieldPath<OnboardingFormValues>, label: string, placeholder: string, options: {value: string | number, label: string}[], description?: string) => (
     <FormField control={form.control} name={name}
      render={({ field }) => ( <FormItem> <FormLabel>{label}</FormLabel> <Select onValueChange={field.onChange} value={String(field.value || '')} > <FormControl><div><SelectTrigger> <SelectValue placeholder={placeholder} /> </SelectTrigger></div></FormControl> <SelectContent> {options.map(opt => <SelectItem key={String(opt.value)} value={String(opt.value)}>{opt.label}</SelectItem>)} </SelectContent> </Select> {description && <FormDescription>{description}</FormDescription>} <FormMessage /> </FormItem> )} />
  );

  const renderTextareaField = (name: FieldPath<OnboardingFormValues>, label: string, placeholder: string, description?: string) => (
    <FormField control={form.control} name={name}
      render={({ field }) => ( <FormItem> <FormLabel>{label}</FormLabel> <FormControl><div><Textarea placeholder={placeholder} {...field} value={field.value as string ?? ''} className="h-20"/></div></FormControl> {description && <FormDescription>{description}</FormDescription>} <FormMessage /> </FormItem> )} />
  );

  if (!activeStepData) return <div className="flex justify-center items-center h-screen"><p>Loading step...</p></div>;
  if (!user) return <div className="flex justify-center items-center h-screen"><p>Loading user information...</p></div>;

  const progressValue = (currentStep / onboardingStepsData.length) * 100;

  const columnSums = {
    calories_pct: calculateColumnSum('calories_pct'),
    protein_pct: calculateColumnSum('protein_pct'),
    carbs_pct: calculateColumnSum('carbs_pct'),
    fat_pct: calculateColumnSum('fat_pct'),
  };
  const tableHeaderLabels = [
    { key: "meal", label: "Meal", className: "sticky left-0 bg-card z-10 w-[120px] text-left font-medium text-xs" },
    { key: "cal_pct", label: "%Cal", className: "text-right min-w-[70px] text-xs" },
    { key: "p_pct", label: "%P", className: "text-right min-w-[70px] text-xs" },
    { key: "c_pct", label: "%C", className: "text-right min-w-[70px] text-xs" },
    { key: "f_pct", label: "%F", className: "text-right min-w-[70px] border-r text-xs" },
    { key: "kcal", label: "Cal", className: "text-right min-w-[60px] text-xs" },
    { key: "p_g", label: "P(g)", className: "text-right min-w-[60px] text-xs" },
    { key: "c_g", label: "C(g)", className: "text-right min-w-[60px] text-xs" },
    { key: "f_g", label: "F(g)", className: "text-right min-w-[60px] text-xs" },
  ];
  const macroPctKeys: (keyof Omit<MealMacroDistribution, 'mealName'>)[] = ['calories_pct', 'protein_pct', 'carbs_pct', 'fat_pct'];


  return (
    <TooltipProvider>
    <Card className="w-full max-w-2xl shadow-xl">
      <CardHeader className="text-center">
        <div className="flex justify-center items-center mb-4"> <Leaf className="h-10 w-10 text-primary" /> </div>
         <Tooltip> <TooltipTrigger asChild><span><CardTitle className="text-2xl font-bold cursor-help">{activeStepData.title}</CardTitle></span></TooltipTrigger> <TooltipContent side="top" className="max-w-xs"> <p>{activeStepData.tooltipText}</p> </TooltipContent> </Tooltip>
        <CardDescription>{activeStepData.explanation}</CardDescription>
        <Progress value={progressValue} className="w-full mt-4" />
        <p className="text-sm text-muted-foreground mt-1">Step {currentStep} of {onboardingStepsData.length}</p>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(processAndSaveData)} className="space-y-8">
            {currentStep === 1 && ( <div className="text-center p-4">  </div> )}
            {currentStep === 2 && ( <div className="grid grid-cols-1 md:grid-cols-2 gap-6"> {renderNumberField("age", "Age (Years)", "e.g., 30", undefined, "1")} {renderSelectField("gender", "Biological Sex", "Select sex", genders)} {renderNumberField("height_cm", "Height (cm)", "e.g., 175", undefined, "0.1")} {renderNumberField("current_weight", "Current Weight (kg)", "e.g., 70", undefined, "0.1")} {renderNumberField("goal_weight_1m", "Target Weight After 1 Month (kg)", "e.g., 68", undefined, "0.1")} {renderNumberField("ideal_goal_weight", "Long-Term Goal Weight (kg, Optional)", "e.g., 65", undefined, "0.1")} {renderSelectField("activityLevel", "Physical Activity Level", "Select activity level", activityLevels)} {renderSelectField("dietGoalOnboarding", "Primary Diet Goal", "Select your diet goal", smartPlannerDietGoals)} </div> )}
            {currentStep === 3 && ( <div className="space-y-4"> <div className="grid grid-cols-4 gap-x-2 pb-1 border-b mb-2 text-sm font-medium text-muted-foreground"> <span className="col-span-1">Metric</span> <span className="text-center">Current (%)</span> <span className="text-center">Target (1 Mth) (%)</span> <span className="text-center">Ideal (%)</span> </div> {(['Body Fat', 'Muscle Mass', 'Body Water'] as const).map((metric) => { const keys = { 'Body Fat': ['bf_current', 'bf_target', 'bf_ideal'], 'Muscle Mass': ['mm_current', 'mm_target', 'mm_ideal'], 'Body Water': ['bw_current', 'bw_target', 'bw_ideal'], }[metric] as [FieldPath<OnboardingFormValues>, FieldPath<OnboardingFormValues>, FieldPath<OnboardingFormValues>]; return ( <div key={metric} className="grid grid-cols-4 gap-x-2 items-start py-1"> <FormLabel className="text-sm pt-2">{metric}</FormLabel> {keys.map(key => ( <FormField key={key} control={form.control} name={key} render={({ field }) => ( <FormItem className="text-center"> <FormControl><div><Input type="number" placeholder="e.g., 20" {...field} value={field.value === undefined || field.value === null || isNaN(Number(field.value)) ? '' : String(field.value)} onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} className="w-full text-center text-sm h-9" step="0.1" onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}/></div></FormControl> <FormMessage className="text-xs text-center"/> </FormItem> )}/> ))} </div> ); })} </div> )}
            {currentStep === 4 && ( <div className="space-y-4"> <div className="grid grid-cols-4 gap-x-2 pb-1 border-b mb-2 text-sm font-medium text-muted-foreground"> <span className="col-span-1">Metric</span> <span className="text-center">Current (cm)</span> <span className="text-center">1-Mth Goal (cm)</span> <span className="text-center">Ideal (cm)</span> </div> {(['Waist', 'Hips', 'Right Leg', 'Left Leg', 'Right Arm', 'Left Arm'] as const).map((metric) => { const keys = { 'Waist': ['waist_current', 'waist_goal_1m', 'waist_ideal'], 'Hips': ['hips_current', 'hips_goal_1m', 'hips_ideal'], 'Right Leg': ['right_leg_current', 'right_leg_goal_1m', 'right_leg_ideal'], 'Left Leg': ['left_leg_current', 'left_leg_goal_1m', 'left_leg_ideal'], 'Right Arm': ['right_arm_current', 'right_arm_goal_1m', 'right_arm_ideal'], 'Left Arm': ['left_arm_current', 'left_arm_goal_1m', 'left_arm_ideal'], }[metric] as [FieldPath<OnboardingFormValues>, FieldPath<OnboardingFormValues>, FieldPath<OnboardingFormValues>]; return ( <div key={metric} className="grid grid-cols-4 gap-x-2 items-start py-1"> <FormLabel className="text-sm pt-2">{metric}</FormLabel> {keys.map(key => ( <FormField key={key} control={form.control} name={key} render={({ field }) => ( <FormItem className="text-center"> <FormControl><div><Input type="number" placeholder="e.g., 80" {...field} value={field.value === undefined || field.value === null || isNaN(Number(field.value)) ? '' : String(field.value)} onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} className="w-full text-center text-sm h-9" step="0.1" onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}/></div></FormControl> <FormMessage className="text-xs text-center"/> </FormItem> )}/> ))} </div> ); })} </div> )}
            {currentStep === 5 && ( <div className="grid grid-cols-1 md:grid-cols-2 gap-6"> {renderSelectField("preferredDiet", "Preferred Diet (Optional)", "e.g., Vegetarian", preferredDiets)}  {renderTextareaField("allergies", "Allergies (comma-separated, Optional)", "e.g., Peanuts, Shellfish", "List any food allergies.")} {renderTextareaField("preferredCuisines", "Preferred Cuisines (comma-separated, Optional)", "e.g., Italian, Mexican")} {renderTextareaField("dispreferredCuisines", "Dispreferred Cuisines (comma-separated, Optional)", "e.g., Thai, Indian")} {renderTextareaField("preferredIngredients", "Favorite Ingredients (comma-separated, Optional)", "e.g., Chicken, Avocado")} {renderTextareaField("dispreferredIngredients", "Disliked Ingredients (comma-separated, Optional)", "e.g., Tofu, Olives")} {renderTextareaField("preferredMicronutrients", "Targeted Micronutrients (Optional)", "e.g., Vitamin D, Iron")} </div> )}
            {currentStep === 6 && ( <div className="grid grid-cols-1 md:grid-cols-2 gap-6"> {renderTextareaField("medicalConditions", "Medical Conditions (comma-separated, Optional)", "e.g., Diabetes, Hypertension", "Helps AI avoid conflicting foods.")} {renderTextareaField("medications", "Medications (comma-separated, Optional)", "e.g., Metformin, Lisinopril", "Helps AI avoid interactions.")} </div> )}
            {currentStep === 7 && ( <div className="space-y-4 p-4 border rounded-md bg-muted/50"> <h3 className="text-lg font-semibold text-primary">Your Estimated Daily Targets:</h3> {calculatedTargets ? ( <> <p><strong>Basal Metabolic Rate (BMR):</strong> {calculatedTargets.bmr?.toFixed(0) ?? 'N/A'} kcal</p> <p><strong>Maintenance Calories (TDEE):</strong> {calculatedTargets.tdee?.toFixed(0) ?? 'N/A'} kcal</p> <p className="font-bold text-primary mt-2">Target Daily Calories: {calculatedTargets.finalTargetCalories?.toFixed(0) ?? 'N/A'} kcal</p> <p>Target Protein: {calculatedTargets.proteinGrams?.toFixed(1) ?? 'N/A'} g ({calculatedTargets.proteinTargetPct?.toFixed(0) ?? 'N/A'}%)</p> <p>Target Carbs: {calculatedTargets.carbGrams?.toFixed(1) ?? 'N/A'} g ({calculatedTargets.carbTargetPct?.toFixed(0) ?? 'N/A'}%)</p> <p>Target Fat: {calculatedTargets.fatGrams?.toFixed(1) ?? 'N/A'} g ({calculatedTargets.fatTargetPct?.toFixed(0) ?? 'N/A'}%)</p> <p className="text-sm">Estimated Weekly Progress: {calculatedTargets.estimatedWeeklyWeightChangeKg && calculatedTargets.estimatedWeeklyWeightChangeKg <= 0 ? `${Math.abs(calculatedTargets.estimatedWeeklyWeightChangeKg ?? 0).toFixed(2)} kg deficit/week (Potential Loss)` : `${(calculatedTargets.estimatedWeeklyWeightChangeKg ?? 0)?.toFixed(2)} kg surplus/week (Potential Gain)`}</p> </> ) : ( <p className="text-destructive flex items-center"><AlertCircle className="mr-2 h-4 w-4" /> Not enough information from previous steps to calculate. Please go back and complete required fields.</p> )} <FormDescription className="text-xs mt-2">These are estimates. You can fine-tune these in the next step or later in the app's tools.</FormDescription> </div> )}
            {currentStep === 8 && ( <div className="space-y-6 p-4 border rounded-md bg-muted/50"> <h3 className="text-lg font-semibold text-primary mb-3">Customize Your Daily Targets</h3> {renderNumberField("custom_total_calories", "Custom Total Calories (Optional)", `e.g., ${calculatedTargets?.finalTargetCalories?.toFixed(0) || '2000'}`, "Overrides system-calculated total daily calories.", "1")} {renderNumberField("custom_protein_per_kg", "Custom Protein (g/kg body weight) (Optional)", `e.g., ${(calculatedTargets?.proteinGrams && calculatedTargets?.current_weight_for_custom_calc ? (calculatedTargets.proteinGrams / calculatedTargets.current_weight_for_custom_calc).toFixed(1) : '1.6')}`, "Sets your protein intake in grams per kg of your current body weight.", "0.1")} <FormField control={form.control} name="remaining_calories_carb_pct" render={({ field }) => { const carbPct = field.value ?? 50; const fatPct = 100 - carbPct; return ( <FormItem> <FormLabel>Remaining Calories Split (Carbs %)</FormLabel> <FormControl><div><Slider value={[carbPct]} onValueChange={(value) => field.onChange(value[0])} min={0} max={100} step={1} /></div></FormControl> <div className="flex justify-between text-xs text-muted-foreground"> <span>Carbs: {carbPct.toFixed(0)}%</span> <span>Fat: {fatPct.toFixed(0)}%</span> </div> <FormMessage /> </FormItem> ); }} /> {customCalculatedTargets && ( <div className="mt-4 space-y-1"> <h4 className="font-medium text-primary">Your Custom Plan:</h4> <p className="text-sm">Total Calories: {customCalculatedTargets.finalTargetCalories?.toFixed(0) ?? 'N/A'} kcal</p> <p className="text-sm">Protein: {customCalculatedTargets.proteinGrams?.toFixed(1) ?? 'N/A'}g ({customCalculatedTargets.proteinTargetPct?.toFixed(0) ?? 'N/A'}%)</p> <p className="text-sm">Carbs: {customCalculatedTargets.carbGrams?.toFixed(1) ?? 'N/A'}g ({customCalculatedTargets.carbTargetPct?.toFixed(0) ?? 'N/A'}%)</p> <p className="text-sm">Fat: {customCalculatedTargets.fatGrams?.toFixed(1) ?? 'N/A'}g ({customCalculatedTargets.fatTargetPct?.toFixed(0) ?? 'N/A'}%)</p> <p className="text-sm">Estimated Weekly Progress: {customCalculatedTargets.estimatedWeeklyWeightChangeKg && customCalculatedTargets.estimatedWeeklyWeightChangeKg <= 0 ? `${Math.abs(customCalculatedTargets.estimatedWeeklyWeightChangeKg ?? 0).toFixed(2)} kg deficit/week (Potential Loss)` : `${(customCalculatedTargets.estimatedWeeklyWeightChangeKg ?? 0)?.toFixed(2)} kg surplus/week (Potential Gain)`}</p></div> )} </div> )}
            {currentStep === 9 && ( 
              <div className="space-y-4 p-4 border rounded-md bg-muted/50">
                <h3 className="text-lg font-semibold text-primary mb-1">Distribute Macros Across Meals</h3>
                 <p className="text-sm text-muted-foreground mb-2">
                  Please use whole numbers for percentages (e.g., 20, not 20.5). Each percentage column (for %Cal, %P, %C, %F) should sum to 100%.
                </p>
                {totalsForSplitter ? (
                  <>
                    <div className="mb-3 text-sm">
                      <p className="font-medium">Total Daily Macros for Splitting:</p>
                      <p>
                        Calories: {totalsForSplitter.calories.toFixed(0)} kcal, Protein: {totalsForSplitter.protein_g.toFixed(1)}g,
                        Carbs: {totalsForSplitter.carbs_g.toFixed(1)}g, Fat: {totalsForSplitter.fat_g.toFixed(1)}g
                      </p>
                    </div>
                    <ScrollArea className="w-full border rounded-md"> {/* Added ScrollArea */}
                      <Table className="min-w-[700px]"> {/* Added min-width */}
                        <TableHeader>
                          <TableRow>
                            {tableHeaderLabels.map(header => (
                              <TableHead key={header.key} className={cn("px-2 py-1 h-9 text-xs font-medium", header.className)}>
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
                                <TableCell className={cn("font-medium px-2 py-1 text-sm h-10", tableHeaderLabels[0].className)}>{item.mealName}</TableCell>
                                {macroPctKeys.map(macroKey => (
                                  <TableCell key={macroKey} className={cn("px-1 py-1 text-right tabular-nums h-10", macroKey === 'fat_pct' ? 'border-r' : '')}>
                                    <FormField
                                      control={form.control}
                                      name={`mealDistributions.${index}.${macroKey}`}
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormControl>
                                            <div>
                                              <Input type="number" step="1" {...field} 
                                                value={field.value ?? ''} 
                                                onChange={e => {
                                                  const val = e.target.value;
                                                  field.onChange(val === '' ? undefined : Number(val));
                                                }} 
                                                onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
                                                className="w-16 h-8 text-xs text-right tabular-nums px-1 py-0.5" 
                                              />
                                            </div>
                                          </FormControl>
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
                          <TableRow className="font-semibold text-xs h-10 bg-muted/70">
                            <TableCell className={cn("px-2 py-1", tableHeaderLabels[0].className)}>Input % Totals:</TableCell>
                            {macroPctKeys.map(key => {
                              const sum = columnSums[key];
                              const isSum100 = Math.abs(sum - 100) < 0.1;
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
                    </ScrollArea>
                     {form.formState.errors.mealDistributions?.root?.message && (
                        <p className="text-sm font-medium text-destructive mt-2">
                            {form.formState.errors.mealDistributions.root.message}
                        </p>
                    )}
                     {form.formState.errors.mealDistributions && !form.formState.errors.mealDistributions.root && (
                        Object.values(form.formState.errors.mealDistributions).map((errorObj, index) => {
                            if (errorObj && typeof errorObj === 'object' && errorObj !== null && !Array.isArray(errorObj)) {
                                return Object.entries(errorObj).map(([key, error]) => (
                                    error && typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string' && (
                                        <p key={`${index}-${key}`} className="text-sm font-medium text-destructive mt-1">
                                            Error in {defaultMealNames[index]} {key.replace('_pct', ' %')}: {error.message}
                                        </p>
                                    )
                                ));
                            }
                            return null;
                        })
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

