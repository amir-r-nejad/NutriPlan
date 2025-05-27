
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
import { AlertCircle, CheckCircle, Leaf, Calculator, Info, Edit3, RefreshCcw, AlertTriangle, SplitSquareHorizontal, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { 
  onboardingStepsData, 
  genders, 
  activityLevels, 
  preferredDiets, 
  mealsPerDayOptions,
  smartPlannerDietGoals, // Added this
  mealNames as defaultMealNames, 
  defaultMacroPercentages,     
} from "@/lib/constants";
import { OnboardingFormSchema, type OnboardingFormValues, type MealMacroDistribution } from "@/lib/schemas"; 
import { calculateBMR, calculateTDEE, calculateEstimatedDailyTargets, calculateRecommendedProtein } from "@/lib/nutrition-calculator";
import { Slider } from "@/components/ui/slider";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface CalculatedTargets {
  bmr?: number;
  tdee?: number;
  targetCalories?: number;
  targetProtein?: number;
  targetCarbs?: number;
  targetFat?: number;
  current_weight_for_calc?: number; 
}

interface CustomCalculatedTargets {
  totalCalories?: number;
  proteinGrams?: number;
  proteinCalories?: number;
  proteinPct?: number;
  carbGrams?: number;
  carbCalories?: number;
  carbPct?: number;
  fatGrams?: number;
  fatCalories?: number;
  fatPct?: number;
}

interface TotalsForSplitter {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
}


export default function OnboardingPage() {
  const { completeOnboarding, user } = useAuth();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);

  const [calculatedTargets, setCalculatedTargets] = useState<CalculatedTargets | null>(null);
  const [customCalculatedTargets, setCustomCalculatedTargets] = useState<CustomCalculatedTargets | null>(null);
  const [totalsForSplitter, setTotalsForSplitter] = useState<TotalsForSplitter | null>(null);
  

  const form = useForm<OnboardingFormValues>({
    resolver: zodResolver(OnboardingFormSchema),
    mode: "onChange", 
    defaultValues: {
      age: undefined, gender: undefined, height_cm: undefined, current_weight: undefined,
      goal_weight_1m: undefined, activityLevel: undefined, dietGoalOnboarding: undefined,
      bf_current: undefined, bf_target: undefined, bf_ideal: undefined,
      mm_current: undefined, mm_target: undefined, mm_ideal: undefined,
      bw_current: undefined, bw_target: undefined, bw_ideal: undefined,
      waist_current: undefined, waist_goal_1m: undefined, waist_ideal: undefined,
      hips_current: undefined, hips_goal_1m: undefined, hips_ideal: undefined,
      right_leg_current: undefined, right_leg_goal_1m: undefined, right_leg_ideal: undefined,
      left_leg_current: undefined, left_leg_goal_1m: undefined, left_leg_ideal: undefined,
      right_arm_current: undefined, right_arm_goal_1m: undefined, right_arm_ideal: undefined,
      left_arm_current: undefined, left_arm_goal_1m: undefined, left_arm_ideal: undefined,
      preferredDiet: "", allergies: "", preferredCuisines: "", dispreferredCuisines: "",
      preferredIngredients: "", dispreferredIngredients: "", mealsPerDay: 3,
      preferredMicronutrients: "", medicalConditions: "", medications: "",
      custom_total_calories: undefined, custom_protein_per_kg: undefined, remaining_calories_carb_pct: 50,
      manual_target_calories: undefined, manual_protein_g: undefined, manual_carbs_g: undefined, manual_fat_g: undefined,
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

  // Calculate Smart Targets (Step 7)
  useEffect(() => {
    if (currentStep === 7) {
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
            ...estimatedTargets,
            current_weight_for_calc: data.current_weight 
        });
      } else {
        setCalculatedTargets(null);
      }
    }
  }, [currentStep, form]);

  const watchedCustomInputs = form.watch([
    "custom_total_calories", "custom_protein_per_kg", "remaining_calories_carb_pct", "current_weight"
  ]);

  // Calculate Custom Targets (Step 8)
  useEffect(() => {
    if (currentStep !== 8) return;

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

    const effectiveProteinPerKg = customProteinPerKg !== undefined && customProteinPerKg >=0 
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
  }, [currentStep, watchedCustomInputs, calculatedTargets, customCalculatedTargets, form]);

  // Determine totals for Macro Splitter (Step 10)
  useEffect(() => {
    if (currentStep === 10) {
        const formValues = form.getValues();
        let sourceTotals: TotalsForSplitter | null = null;

        if (formValues.manual_target_calories && formValues.manual_protein_g && formValues.manual_carbs_g && formValues.manual_fat_g) {
            sourceTotals = { calories: formValues.manual_target_calories, protein_g: formValues.manual_protein_g, carbs_g: formValues.manual_carbs_g, fat_g: formValues.manual_fat_g };
        } else if (customCalculatedTargets && customCalculatedTargets.totalCalories !== undefined && customCalculatedTargets.proteinGrams !== undefined && customCalculatedTargets.carbGrams !== undefined && customCalculatedTargets.fatGrams !== undefined) {
            sourceTotals = { calories: customCalculatedTargets.totalCalories, protein_g: customCalculatedTargets.proteinGrams, carbs_g: customCalculatedTargets.carbGrams, fat_g: customCalculatedTargets.fatGrams };
        } else if (calculatedTargets && calculatedTargets.targetCalories !== undefined && calculatedTargets.targetProtein !== undefined && calculatedTargets.targetCarbs !== undefined && calculatedTargets.targetFat !== undefined) {
            sourceTotals = { calories: calculatedTargets.targetCalories, protein_g: calculatedTargets.targetProtein, carbs_g: calculatedTargets.targetCarbs, fat_g: calculatedTargets.targetFat };
        }
        setTotalsForSplitter(sourceTotals);
        if (!sourceTotals) {
            toast({title: "Input Needed", description: "Please complete a previous target calculation step (Smart, Custom, or Manual) before distributing macros.", variant: "destructive", duration: 5000});
        }
    }
  }, [currentStep, form, calculatedTargets, customCalculatedTargets, toast]);

  const watchedMealDistributions = form.watch("mealDistributions");
  const calculateColumnSum = (macroKey: keyof Omit<MealMacroDistribution, 'mealName'>) => {
    return watchedMealDistributions?.reduce((sum, meal) => sum + (Number(meal[macroKey]) || 0), 0) || 0;
  };


  const handleNext = async () => {
    if (activeStepData?.fieldsToValidate && activeStepData.fieldsToValidate.length > 0) {
      const result = await form.trigger(activeStepData.fieldsToValidate as FieldPath<OnboardingFormValues>[]);
      if (!result) return; 
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

  const processAndSaveData = (data: OnboardingFormValues) => {
    const fullProfileData: any = { ...data };
    const stringToArray = (str: string | undefined) => str ? str.split(',').map(s => s.trim()).filter(s => s) : [];
    
    fullProfileData.allergies = stringToArray(data.allergies);
    fullProfileData.preferredCuisines = stringToArray(data.preferredCuisines);
    fullProfileData.dispreferredCuisines = stringToArray(data.dispreferredCuisines);
    fullProfileData.preferredIngredients = stringToArray(data.preferredIngredients);
    fullProfileData.dispreferredIngredients = stringToArray(data.dispreferredIngredients);
    fullProfileData.preferredMicronutrients = stringToArray(data.preferredMicronutrients);
    fullProfileData.medicalConditions = stringToArray(data.medicalConditions);
    fullProfileData.medications = stringToArray(data.medications);
    
    // Store dietGoalOnboarding as dietGoal for consistency with other tools
    fullProfileData.dietGoal = data.dietGoalOnboarding; 
    delete fullProfileData.dietGoalOnboarding;


    // Include calculated/customized targets if they exist
    if (calculatedTargets) fullProfileData.systemCalculatedTargets = calculatedTargets;
    if (customCalculatedTargets) fullProfileData.userCustomizedTargets = customCalculatedTargets;
    
    // Determine final targets to save for smart planner tools
    let finalTargetsForStorage: Partial<CalculatedTargets & CustomCalculatedTargets> = {};
    if (data.manual_target_calories && data.manual_protein_g && data.manual_carbs_g && data.manual_fat_g) {
        finalTargetsForStorage = {
            targetCalories: data.manual_target_calories,
            targetProtein: data.manual_protein_g,
            targetCarbs: data.manual_carbs_g,
            targetFat: data.manual_fat_g,
        };
    } else if (customCalculatedTargets?.totalCalories !== undefined) {
        finalTargetsForStorage = {
            targetCalories: customCalculatedTargets.totalCalories,
            targetProtein: customCalculatedTargets.proteinGrams,
            targetCarbs: customCalculatedTargets.carbGrams,
            targetFat: customCalculatedTargets.fatGrams,
        };
    } else if (calculatedTargets?.targetCalories !== undefined) {
         finalTargetsForStorage = { ...calculatedTargets };
    }


    if (user?.uid) { // Ensure user.uid is used for consistency with AuthContext
        localStorage.setItem(`nutriplan_profile_${user.uid}`, JSON.stringify(fullProfileData));
        // Save overall targets for smart planner tools
        if (Object.keys(finalTargetsForStorage).length > 0 && finalTargetsForStorage.targetCalories) {
             localStorage.setItem(`nutriplan_smart_planner_results_${user.uid}`, JSON.stringify({
                finalTargetCalories: finalTargetsForStorage.targetCalories,
                proteinGrams: finalTargetsForStorage.targetProtein,
                carbGrams: finalTargetsForStorage.targetCarbs,
                fatGrams: finalTargetsForStorage.targetFat,
                bmr: finalTargetsForStorage.bmr || calculatedTargets?.bmr, // try to preserve bmr/tdee if available
                tdee: finalTargetsForStorage.tdee || calculatedTargets?.tdee,
             }));
        }
    }
    
    completeOnboarding();
    toast({
      title: "Profile Setup Complete!",
      description: "Welcome to NutriPlan! You can now generate your AI meal plan.",
    });
  };

  const renderTextField = (name: FieldPath<OnboardingFormValues>, label: string, placeholder: string, description?: string) => (
    <FormField control={form.control} name={name}
      render={({ field }) => ( <FormItem> <FormLabel>{label}</FormLabel> <FormControl> <Input placeholder={placeholder} {...field} value={field.value as string || ''} /> </FormControl> {description && <FormDescription>{description}</FormDescription>} <FormMessage /> </FormItem> )} />
  );
  
  const renderNumberField = (name: FieldPath<OnboardingFormValues>, label: string, placeholder: string, description?: string, step?: string) => (
    <FormField control={form.control} name={name}
      render={({ field }) => ( <FormItem> <FormLabel>{label}</FormLabel> <FormControl> <Input type="number" placeholder={placeholder} {...field} value={field.value === undefined || field.value === null || isNaN(Number(field.value)) ? '' : String(field.value)} onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} step={step}/> </FormControl> {description && <FormDescription>{description}</FormDescription>} <FormMessage /> </FormItem> )} />
  );

  const renderSelectField = (name: FieldPath<OnboardingFormValues>, label: string, placeholder: string, options: {value: string | number, label: string}[], description?: string) => (
     <FormField control={form.control} name={name}
      render={({ field }) => ( <FormItem> <FormLabel>{label}</FormLabel> <Select onValueChange={field.onChange} value={String(field.value || '')} > <FormControl> <SelectTrigger> <SelectValue placeholder={placeholder} /> </SelectTrigger> </FormControl> <SelectContent> {options.map(opt => <SelectItem key={String(opt.value)} value={String(opt.value)}>{opt.label}</SelectItem>)} </SelectContent> </Select> {description && <FormDescription>{description}</FormDescription>} <FormMessage /> </FormItem> )} />
  );

  const renderTextareaField = (name: FieldPath<OnboardingFormValues>, label: string, placeholder: string, description?: string) => (
    <FormField control={form.control} name={name}
      render={({ field }) => ( <FormItem> <FormLabel>{label}</FormLabel> <FormControl> <Textarea placeholder={placeholder} {...field} value={field.value as string || ''} className="h-20"/> </FormControl> {description && <FormDescription>{description}</FormDescription>} <FormMessage /> </FormItem> )} />
  );

  if (!activeStepData) return <p>Loading step...</p>;
  if (!user) return <p>Loading user information...</p>;

  const progressValue = (currentStep / onboardingStepsData.length) * 100;
  
  const macroPctKeys: (keyof Omit<MealMacroDistribution, 'mealName'>)[] = ['calories_pct', 'protein_pct', 'carbs_pct', 'fat_pct'];
  const columnSums = {
    calories_pct: calculateColumnSum('calories_pct'),
    protein_pct: calculateColumnSum('protein_pct'),
    carbs_pct: calculateColumnSum('carbs_pct'),
    fat_pct: calculateColumnSum('fat_pct'),
  };

  return (
    <TooltipProvider>
    <Card className="w-full max-w-2xl shadow-xl">
      <CardHeader className="text-center">
        <div className="flex justify-center items-center mb-4"> <Leaf className="h-10 w-10 text-primary" /> </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <span><CardTitle className="text-2xl font-bold cursor-help">{activeStepData.title}</CardTitle></span>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs"> <p>{activeStepData.tooltipText}</p> </TooltipContent>
        </Tooltip>
        <CardDescription>{activeStepData.explanation}</CardDescription>
        <Progress value={progressValue} className="w-full mt-4" />
        <p className="text-sm text-muted-foreground mt-1">Step {currentStep} of {onboardingStepsData.length}</p>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(processAndSaveData)} className="space-y-8">
            {currentStep === 1 && ( <div className="text-center p-4"> {/* Welcome content can be enhanced here */} </div> )}
            {currentStep === 2 && ( <div className="grid grid-cols-1 md:grid-cols-2 gap-6"> {renderNumberField("age", "Age (Years)", "e.g., 30")} {renderSelectField("gender", "Biological Sex", "Select sex", genders)} {renderNumberField("height_cm", "Height (cm)", "e.g., 175")} {renderNumberField("current_weight", "Current Weight (kg)", "e.g., 70")} {renderNumberField("goal_weight_1m", "Target Weight After 1 Month (kg)", "e.g., 68")} {renderSelectField("activityLevel", "Physical Activity Level", "Select activity level", activityLevels)} {renderSelectField("dietGoalOnboarding", "Primary Diet Goal", "Select your diet goal", smartPlannerDietGoals)} </div> )}
            {currentStep === 3 && ( <div className="space-y-4"> <div className="grid grid-cols-4 gap-x-2 pb-1 border-b mb-2 text-sm font-medium text-muted-foreground"> <span className="col-span-1">Metric</span> <span className="text-center">Current (%)</span> <span className="text-center">Target (1 Mth) (%)</span> <span className="text-center">Ideal (%)</span> </div> {(['Body Fat', 'Muscle Mass', 'Body Water'] as const).map((metric) => { const keys = { 'Body Fat': ['bf_current', 'bf_target', 'bf_ideal'], 'Muscle Mass': ['mm_current', 'mm_target', 'mm_ideal'], 'Body Water': ['bw_current', 'bw_target', 'bw_ideal'], }[metric] as [FieldPath<OnboardingFormValues>, FieldPath<OnboardingFormValues>, FieldPath<OnboardingFormValues>]; return ( <div key={metric} className="grid grid-cols-4 gap-x-2 items-start py-1"> <FormLabel className="text-sm pt-2">{metric}</FormLabel> {keys.map(key => ( <FormField key={key} control={form.control} name={key} render={({ field }) => ( <FormItem className="text-center"> <FormControl> <Input type="number" placeholder="e.g., 20" {...field} value={field.value === undefined || field.value === null || isNaN(Number(field.value)) ? '' : String(field.value)} onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} className="w-full text-center text-sm h-9" /> </FormControl> <FormMessage className="text-xs text-center"/> </FormItem> )}/> ))} </div> ); })} </div> )}
            {currentStep === 4 && ( <div className="space-y-4"> <div className="grid grid-cols-4 gap-x-2 pb-1 border-b mb-2 text-sm font-medium text-muted-foreground"> <span className="col-span-1">Metric</span> <span className="text-center">Current (cm)</span> <span className="text-center">1-Mth Goal (cm)</span> <span className="text-center">Ideal (cm)</span> </div> {(['Waist', 'Hips', 'Right Leg', 'Left Leg', 'Right Arm', 'Left Arm'] as const).map((metric) => { const keys = { 'Waist': ['waist_current', 'waist_goal_1m', 'waist_ideal'], 'Hips': ['hips_current', 'hips_goal_1m', 'hips_ideal'], 'Right Leg': ['right_leg_current', 'right_leg_goal_1m', 'right_leg_ideal'], 'Left Leg': ['left_leg_current', 'left_leg_goal_1m', 'left_leg_ideal'], 'Right Arm': ['right_arm_current', 'right_arm_goal_1m', 'right_arm_ideal'], 'Left Arm': ['left_arm_current', 'left_arm_goal_1m', 'left_arm_ideal'], }[metric] as [FieldPath<OnboardingFormValues>, FieldPath<OnboardingFormValues>, FieldPath<OnboardingFormValues>]; return ( <div key={metric} className="grid grid-cols-4 gap-x-2 items-start py-1"> <FormLabel className="text-sm pt-2">{metric}</FormLabel> {keys.map(key => ( <FormField key={key} control={form.control} name={key} render={({ field }) => ( <FormItem className="text-center"> <FormControl> <Input type="number" placeholder="e.g., 80" {...field} value={field.value === undefined || field.value === null || isNaN(Number(field.value)) ? '' : String(field.value)} onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} className="w-full text-center text-sm h-9" /> </FormControl> <FormMessage className="text-xs text-center"/> </FormItem> )}/> ))} </div> ); })} </div> )}
            {currentStep === 5 && ( <div className="grid grid-cols-1 md:grid-cols-2 gap-6"> {renderSelectField("preferredDiet", "Preferred Diet (Optional)", "e.g., Vegetarian", preferredDiets)} {renderSelectField("mealsPerDay", "Meals Per Day", "Select number of meals", mealsPerDayOptions)} {renderTextareaField("allergies", "Allergies (comma-separated, Optional)", "e.g., Peanuts, Shellfish", "List any food allergies.")} {renderTextareaField("preferredCuisines", "Preferred Cuisines (comma-separated, Optional)", "e.g., Italian, Mexican")} {renderTextareaField("dispreferredCuisines", "Dispreferred Cuisines (comma-separated, Optional)", "e.g., Thai, Indian")} {renderTextareaField("preferredIngredients", "Favorite Ingredients (comma-separated, Optional)", "e.g., Chicken, Avocado")} {renderTextareaField("dispreferredIngredients", "Disliked Ingredients (comma-separated, Optional)", "e.g., Tofu, Olives")} {renderTextareaField("preferredMicronutrients", "Targeted Micronutrients (Optional)", "e.g., Vitamin D, Iron")} </div> )}
            {currentStep === 6 && ( <div className="grid grid-cols-1 md:grid-cols-2 gap-6"> {renderTextareaField("medicalConditions", "Medical Conditions (comma-separated, Optional)", "e.g., Diabetes, Hypertension", "Helps AI avoid conflicting foods.")} {renderTextareaField("medications", "Medications (comma-separated, Optional)", "e.g., Metformin, Lisinopril", "Helps AI avoid interactions.")} </div> )}
            {currentStep === 7 && ( <div className="space-y-4 p-4 border rounded-md bg-muted/50"> <h3 className="text-lg font-semibold text-primary">Your Estimated Daily Targets:</h3> {calculatedTargets ? ( <> <p><strong>Basal Metabolic Rate (BMR):</strong> {calculatedTargets.bmr?.toFixed(0) ?? 'N/A'} kcal</p> <p><strong>Maintenance Calories (TDEE):</strong> {calculatedTargets.tdee?.toFixed(0) ?? 'N/A'} kcal</p> <p className="font-bold text-primary mt-2">Target Daily Calories: {calculatedTargets.targetCalories?.toFixed(0) ?? 'N/A'} kcal</p> <p>Target Protein: {calculatedTargets.targetProtein?.toFixed(1) ?? 'N/A'} g</p> <p>Target Carbs: {calculatedTargets.targetCarbs?.toFixed(1) ?? 'N/A'} g</p> <p>Target Fat: {calculatedTargets.targetFat?.toFixed(1) ?? 'N/A'} g</p> </> ) : ( <p className="text-destructive flex items-center"><AlertCircle className="mr-2 h-4 w-4" /> Not enough information from previous steps to calculate. Please go back and complete required fields.</p> )} <FormDescription className="text-xs mt-2">These are estimates. You can fine-tune these in the next step or later in the app's tools.</FormDescription> </div> )}
            {currentStep === 8 && ( <div className="space-y-6 p-4 border rounded-md bg-muted/50"> <h3 className="text-lg font-semibold text-primary mb-3">Customize Your Daily Targets</h3> {renderNumberField("custom_total_calories", "Custom Total Calories (Optional)", `e.g., ${calculatedTargets?.targetCalories?.toFixed(0) || '2000'}`)} {renderNumberField("custom_protein_per_kg", "Custom Protein (g/kg body weight) (Optional)", `e.g., ${(calculatedTargets?.targetProtein && calculatedTargets?.current_weight_for_calc ? (calculatedTargets.targetProtein / calculatedTargets.current_weight_for_calc).toFixed(1) : '1.6')}`, undefined, "0.1")} <FormField control={form.control} name="remaining_calories_carb_pct" render={({ field }) => { const carbPct = field.value ?? 50; const fatPct = 100 - carbPct; return ( <FormItem> <FormLabel>Remaining Calories Split (Carbs %)</FormLabel> <Slider value={[carbPct]} onValueChange={(value) => field.onChange(value[0])} min={0} max={100} step={1} /> <div className="flex justify-between text-xs text-muted-foreground"> <span>Carbs: {carbPct.toFixed(0)}%</span> <span>Fat: {fatPct.toFixed(0)}%</span> </div> <FormMessage /> </FormItem> ); }} /> {customCalculatedTargets && ( <div className="mt-4 space-y-1"> <h4 className="font-medium text-primary">Your Custom Plan:</h4> <p className="text-sm">Total Calories: {customCalculatedTargets.totalCalories?.toFixed(0) ?? 'N/A'} kcal</p> <p className="text-sm">Protein: {customCalculatedTargets.proteinGrams?.toFixed(1) ?? 'N/A'}g ({customCalculatedTargets.proteinPct?.toFixed(0) ?? 'N/A'}%)</p> <p className="text-sm">Carbs: {customCalculatedTargets.carbGrams?.toFixed(1) ?? 'N/A'}g ({customCalculatedTargets.carbPct?.toFixed(0) ?? 'N/A'}%)</p> <p className="text-sm">Fat: {customCalculatedTargets.fatGrams?.toFixed(1) ?? 'N/A'}g ({customCalculatedTargets.fatPct?.toFixed(0) ?? 'N/A'}%)</p> </div> )} </div> )}
            {currentStep === 9 && ( <div className="space-y-6 p-4 border rounded-md bg-muted/50"> <h3 className="text-lg font-semibold text-primary mb-3">Set Your Own Daily Targets (Optional)</h3> <div className="grid grid-cols-1 md:grid-cols-2 gap-4"> {renderNumberField("manual_target_calories", "Target Calories", "e.g., 2000")} {renderNumberField("manual_protein_g", "Protein (g)", "e.g., 150")} {renderNumberField("manual_carbs_g", "Carbohydrates (g)", "e.g., 250")} {renderNumberField("manual_fat_g", "Fat (g)", "e.g., 70")} </div> <FormDescription className="text-xs">If you fill these, they will be used for meal distribution in the next step, overriding previous calculations.</FormDescription> </div> )}
            {currentStep === 10 && ( <div className="space-y-4 p-4 border rounded-md bg-muted/50"> <h3 className="text-lg font-semibold text-primary mb-3">Distribute Macros Across Meals (Optional)</h3> {totalsForSplitter ? ( <> <div className="mb-2 text-sm"> <p><strong>Total Daily Macros for Splitting:</strong></p> <p>Calories: {totalsForSplitter.calories.toFixed(0)} kcal, Protein: {totalsForSplitter.protein_g.toFixed(1)}g, Carbs: {totalsForSplitter.carbs_g.toFixed(1)}g, Fat: {totalsForSplitter.fat_g.toFixed(1)}g </p> </div> <Table> <TableHeader> <TableRow> <TableHead className="w-[120px]">Meal</TableHead> {macroPctKeys.map(key => <TableHead key={key} className="text-right w-16">{key.replace('_pct', '%').replace('calories', 'Cal').replace('protein', 'P').replace('carbs', 'C').replace('fat', 'F')}</TableHead>)} <TableHead className="text-right w-20">Calc. Cal</TableHead> <TableHead className="text-right w-20">Calc. P(g)</TableHead> <TableHead className="text-right w-20">Calc. C(g)</TableHead> <TableHead className="text-right w-20">Calc. F(g)</TableHead> </TableRow> </TableHeader> <TableBody> {mealDistributionFields.map((field, index) => { const currentPercentages = watchedMealDistributions?.[index]; let mealCal = NaN, mealP = NaN, mealC = NaN, mealF = NaN; if (totalsForSplitter && currentPercentages) { mealCal = totalsForSplitter.calories * ((currentPercentages.calories_pct || 0) / 100); mealP = totalsForSplitter.protein_g * ((currentPercentages.protein_pct || 0) / 100); mealC = totalsForSplitter.carbs_g * ((currentPercentages.carbs_pct || 0) / 100); mealF = totalsForSplitter.fat_g * ((currentPercentages.fat_pct || 0) / 100); } return ( <TableRow key={field.id}> <TableCell className="font-medium py-1">{field.mealName}</TableCell> {macroPctKeys.map(macroKey => ( <TableCell key={macroKey} className="py-1"> <FormField control={form.control} name={`mealDistributions.${index}.${macroKey}`} render={({ field: itemField }) => ( <FormControl> <Input type="number" {...itemField} value={itemField.value ?? ''} onChange={e => itemField.onChange(parseFloat(e.target.value) || 0)} className="w-14 h-8 text-xs text-right tabular-nums px-1 py-0.5" /> </FormControl> )}/> </TableCell> ))} <TableCell className="text-right text-xs py-1 tabular-nums">{isNaN(mealCal) ? '-' : mealCal.toFixed(0)}</TableCell> <TableCell className="text-right text-xs py-1 tabular-nums">{isNaN(mealP) ? '-' : mealP.toFixed(1)}</TableCell> <TableCell className="text-right text-xs py-1 tabular-nums">{isNaN(mealC) ? '-' : mealC.toFixed(1)}</TableCell> <TableCell className="text-right text-xs py-1 tabular-nums">{isNaN(mealF) ? '-' : mealF.toFixed(1)}</TableCell> </TableRow> ); })} </TableBody> <TableFooter> <TableRow className="font-semibold text-xs"> <TableCell className="py-1">Input % Totals:</TableCell> {macroPctKeys.map(key => { const sum = columnSums[key]; const isSum100 = Math.round(sum) === 100; return ( <TableCell key={`sum-${key}`} className={cn("text-right py-1 tabular-nums", isSum100 ? 'text-green-600' : 'text-destructive')}> {sum.toFixed(0)}% {isSum100 ? <CheckCircle2 className="ml-1 h-3 w-3 inline-block" /> : <AlertTriangle className="ml-1 h-3 w-3 inline-block" />} </TableCell> ); })} <TableCell colSpan={4} className="py-1"></TableCell> </TableRow> </TableFooter> </Table> </> ) : ( <p className="text-destructive flex items-center"><AlertCircle className="mr-2 h-4 w-4" /> Please complete a target calculation (Smart, Custom, or Manual) in a previous step to enable meal distribution.</p> )} </div> )}
            {currentStep === 11 && ( <div> {renderTextareaField("typicalMealsDescription", "Describe Your Typical Meals", "e.g., Breakfast: Oats with berries. Lunch: Chicken salad sandwich...", "This helps our AI learn your habits.")} </div> )}
            {currentStep === 12 && ( <div className="text-center space-y-4"> <CheckCircle className="h-16 w-16 text-green-500 mx-auto" /> <p className="text-lg">You're all set! Your profile is complete.</p> <p className="text-muted-foreground">Click "Finish Onboarding" to save your profile and proceed to the dashboard. You can then generate your first AI-powered meal plan.</p> </div> )}
            
            <div className="flex justify-between items-center pt-6"> <Button type="button" variant="outline" onClick={handlePrevious} disabled={currentStep === 1}> Previous </Button> <div className="space-x-2"> {activeStepData.isOptional && currentStep < onboardingStepsData.length && ( <Button type="button" variant="ghost" onClick={handleSkip}> Skip </Button> )} {currentStep < onboardingStepsData.length ? ( <Button type="button" onClick={handleNext}> Next </Button> ) : ( <Button type="submit"> Finish Onboarding </Button> )} </div> </div>
          </form>
        </Form>
      </CardContent>
    </Card>
    </TooltipProvider>
  );
}

