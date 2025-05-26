
"use client";

import React, { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller, FieldPath } from "react-hook-form";
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
import { AlertCircle, CheckCircle, Leaf } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { 
  onboardingStepsData, 
  genders, 
  activityLevels, 
  preferredDiets, 
  mealsPerDayOptions,
  smartPlannerDietGoals
} from "@/lib/constants";
import { OnboardingFormSchema, type OnboardingFormValues } from "@/lib/schemas";
import { calculateBMR, calculateTDEE, calculateEstimatedDailyTargets } from "@/lib/nutrition-calculator";

export default function OnboardingPage() {
  const { completeOnboarding, user } = useAuth();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);

  const [calculatedTargets, setCalculatedTargets] = useState<{
    bmr?: number;
    tdee?: number;
    targetCalories?: number;
    targetProtein?: number;
    targetCarbs?: number;
    targetFat?: number;
  } | null>(null);

  const form = useForm<OnboardingFormValues>({
    resolver: zodResolver(OnboardingFormSchema),
    mode: "onChange", // Validate on change for better UX with step validation
    defaultValues: {
      age: undefined,
      gender: undefined,
      height_cm: undefined,
      current_weight: undefined,
      goal_weight_1m: undefined,
      activityLevel: undefined,
      dietGoalOnboarding: undefined,
      mealsPerDay: 3,
      // Optional fields default to undefined or empty strings/arrays as per schema
      bf_current: undefined, bf_target: undefined, bf_ideal: undefined,
      mm_current: undefined, mm_target: undefined, mm_ideal: undefined,
      bw_current: undefined, bw_target: undefined, bw_ideal: undefined,
      waist_current: undefined, waist_goal_1m: undefined, waist_ideal: undefined,
      hips_current: undefined, hips_goal_1m: undefined, hips_ideal: undefined,
      right_leg_current: undefined, right_leg_goal_1m: undefined, right_leg_ideal: undefined,
      left_leg_current: undefined, left_leg_goal_1m: undefined, left_leg_ideal: undefined,
      right_arm_current: undefined, right_arm_goal_1m: undefined, right_arm_ideal: undefined,
      left_arm_current: undefined, left_arm_goal_1m: undefined, left_arm_ideal: undefined,
      preferredDiet: "",
      allergies: "",
      preferredCuisines: "",
      dispreferredCuisines: "",
      preferredIngredients: "",
      dispreferredIngredients: "",
      preferredMicronutrients: "",
      medicalConditions: "",
      medications: "",
      typicalMealsDescription: "",
    },
  });

  const activeStepData = onboardingStepsData.find(s => s.stepNumber === currentStep);

  useEffect(() => {
    if (currentStep === 7) { // Smart Calculation Step
      const data = form.getValues();
      if (data.age && data.gender && data.height_cm && data.current_weight && data.activityLevel && data.dietGoalOnboarding) {
        const bmr = calculateBMR(data.gender, data.current_weight, data.height_cm, data.age);
        const tdee = calculateTDEE(bmr, data.activityLevel);
        const estimatedTargets = calculateEstimatedDailyTargets({
          age: data.age,
          gender: data.gender,
          height: data.height_cm, // Assuming calculateEstimatedDailyTargets expects 'height'
          currentWeight: data.current_weight,
          activityLevel: data.activityLevel,
          dietGoal: data.dietGoalOnboarding, // Use dietGoalOnboarding
        });
        setCalculatedTargets({ 
            bmr: Math.round(bmr), 
            tdee: Math.round(tdee),
            ...estimatedTargets 
        });
      } else {
        setCalculatedTargets(null); // Not enough data
      }
    }
  }, [currentStep, form]);

  const handleNext = async () => {
    if (activeStepData?.fieldsToValidate && activeStepData.fieldsToValidate.length > 0) {
      const result = await form.trigger(activeStepData.fieldsToValidate as FieldPath<OnboardingFormValues>[]);
      if (!result) return; // Validation failed for current step fields
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
    // Create a full profile object to save. This matches a broader structure than just ProfileFormValues.
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
    
    // Rename dietGoalOnboarding to dietGoal for consistency in profile
    fullProfileData.dietGoal = data.dietGoalOnboarding;
    delete fullProfileData.dietGoalOnboarding;


    if (user?.id) {
        localStorage.setItem(`nutriplan_profile_${user.id}`, JSON.stringify(fullProfileData));
    }
    
    completeOnboarding();
    toast({
      title: "Profile Setup Complete!",
      description: "Welcome to NutriPlan! You can now generate your AI meal plan.",
    });
  };


  const renderTextField = (name: FieldPath<OnboardingFormValues>, label: string, placeholder: string, description?: string) => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input placeholder={placeholder} {...field} value={field.value as string || ''} />
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
  
  const renderNumberField = (name: FieldPath<OnboardingFormValues>, label: string, placeholder: string, description?: string) => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input type="number" placeholder={placeholder} {...field} 
             value={field.value === undefined || field.value === null || isNaN(Number(field.value)) ? '' : String(field.value)}
             onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} 
            />
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );

  const renderSelectField = (name: FieldPath<OnboardingFormValues>, label: string, placeholder: string, options: {value: string | number, label: string}[], description?: string) => (
     <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <Select onValueChange={field.onChange} value={String(field.value || '')} >
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {options.map(opt => <SelectItem key={String(opt.value)} value={String(opt.value)}>{opt.label}</SelectItem>)}
            </SelectContent>
          </Select>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );

  const renderTextareaField = (name: FieldPath<OnboardingFormValues>, label: string, placeholder: string, description?: string) => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Textarea placeholder={placeholder} {...field} value={field.value as string || ''} />
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );


  if (!activeStepData) return <p>Loading step...</p>;
  if (!user) return <p>Loading user information...</p>;

  const progressValue = (currentStep / onboardingStepsData.length) * 100;

  return (
    <TooltipProvider>
    <Card className="w-full max-w-2xl shadow-xl">
      <CardHeader className="text-center">
        <div className="flex justify-center items-center mb-4">
          <Leaf className="h-10 w-10 text-primary" />
        </div>
        <Tooltip>
            <TooltipTrigger asChild>
                <CardTitle className="text-2xl font-bold cursor-help">{activeStepData.title}</CardTitle>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
                <p>{activeStepData.tooltipText}</p>
            </TooltipContent>
        </Tooltip>
        <CardDescription>{activeStepData.explanation}</CardDescription>
        <Progress value={progressValue} className="w-full mt-4" />
        <p className="text-sm text-muted-foreground mt-1">Step {currentStep} of {onboardingStepsData.length}</p>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(processAndSaveData)} className="space-y-8">
            {currentStep === 2 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {renderNumberField("age", "Age (Years)", "e.g., 30")}
                {renderSelectField("gender", "Biological Sex", "Select sex", genders)}
                {renderNumberField("height_cm", "Height (cm)", "e.g., 175")}
                {renderNumberField("current_weight", "Current Weight (kg)", "e.g., 70")}
                {renderNumberField("goal_weight_1m", "Target Weight After 1 Month (kg)", "e.g., 68")}
                {renderSelectField("activityLevel", "Physical Activity Level", "Select activity level", activityLevels)}
                {renderSelectField("dietGoalOnboarding", "Diet Goal", "Select your diet goal", smartPlannerDietGoals)}
              </div>
            )}

            {currentStep === 3 && ( // Body Composition (Optional)
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-x-2 pb-1 border-b mb-2 text-sm font-medium text-muted-foreground">
                    <span className="col-span-1">Metric</span>
                    <span className="text-center">Current (%)</span>
                    <span className="text-center">Target (1 Mth) (%)</span>
                    <span className="text-center">Ideal (%)</span>
                </div>
                {(['Body Fat', 'Muscle Mass', 'Body Water'] as const).map((metric) => {
                    const keys = {
                        'Body Fat': ['bf_current', 'bf_target', 'bf_ideal'],
                        'Muscle Mass': ['mm_current', 'mm_target', 'mm_ideal'],
                        'Body Water': ['bw_current', 'bw_target', 'bw_ideal'],
                    }[metric] as [FieldPath<OnboardingFormValues>, FieldPath<OnboardingFormValues>, FieldPath<OnboardingFormValues>];
                    return (
                        <div key={metric} className="grid grid-cols-4 gap-x-2 items-start py-1">
                            <FormLabel className="text-sm pt-2">{metric}</FormLabel>
                            {keys.map(key => (
                                <FormField key={key} control={form.control} name={key}
                                    render={({ field }) => (
                                        <FormItem className="text-center">
                                            <FormControl>
                                                <Input type="number" placeholder="e.g., 20" {...field} 
                                                    value={field.value === undefined || field.value === null || isNaN(Number(field.value)) ? '' : String(field.value)}
                                                    onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))}
                                                    className="w-full text-center text-sm h-9" />
                                            </FormControl>
                                            <FormMessage className="text-xs text-center"/>
                                        </FormItem>
                                    )}
                                />
                            ))}
                        </div>
                    );
                })}
              </div>
            )}
            
            {currentStep === 4 && ( // Measurements (Optional)
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-x-2 pb-1 border-b mb-2 text-sm font-medium text-muted-foreground">
                    <span className="col-span-1">Metric</span>
                    <span className="text-center">Current (cm)</span>
                    <span className="text-center">1-Mth Goal (cm)</span>
                    <span className="text-center">Ideal (cm)</span>
                </div>
                {(['Waist', 'Hips', 'Right Leg', 'Left Leg', 'Right Arm', 'Left Arm'] as const).map((metric) => {
                    const keys = {
                        'Waist': ['waist_current', 'waist_goal_1m', 'waist_ideal'],
                        'Hips': ['hips_current', 'hips_goal_1m', 'hips_ideal'],
                        'Right Leg': ['right_leg_current', 'right_leg_goal_1m', 'right_leg_ideal'],
                        'Left Leg': ['left_leg_current', 'left_leg_goal_1m', 'left_leg_ideal'],
                        'Right Arm': ['right_arm_current', 'right_arm_goal_1m', 'right_arm_ideal'],
                        'Left Arm': ['left_arm_current', 'left_arm_goal_1m', 'left_arm_ideal'],
                    }[metric] as [FieldPath<OnboardingFormValues>, FieldPath<OnboardingFormValues>, FieldPath<OnboardingFormValues>];
                     return (
                        <div key={metric} className="grid grid-cols-4 gap-x-2 items-start py-1">
                             <FormLabel className="text-sm pt-2">{metric}</FormLabel>
                            {keys.map(key => (
                                <FormField key={key} control={form.control} name={key}
                                    render={({ field }) => (
                                        <FormItem className="text-center">
                                            <FormControl>
                                                <Input type="number" placeholder="e.g., 80" {...field} 
                                                    value={field.value === undefined || field.value === null || isNaN(Number(field.value)) ? '' : String(field.value)}
                                                    onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))}
                                                    className="w-full text-center text-sm h-9" />
                                            </FormControl>
                                            <FormMessage className="text-xs text-center"/>
                                        </FormItem>
                                    )}
                                />
                            ))}
                        </div>
                    );
                })}
              </div>
            )}

            {currentStep === 5 && ( // Dietary Preferences
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {renderSelectField("preferredDiet", "Preferred Diet (Optional)", "e.g., Vegetarian", preferredDiets)}
                {renderSelectField("mealsPerDay", "Meals Per Day", "Select number of meals", mealsPerDayOptions)}
                {renderTextareaField("allergies", "Allergies (comma-separated, Optional)", "e.g., Peanuts, Shellfish", "List any food allergies.")}
                {renderTextareaField("preferredCuisines", "Preferred Cuisines (comma-separated, Optional)", "e.g., Italian, Mexican")}
                {renderTextareaField("dispreferredCuisines", "Dispreferred Cuisines (comma-separated, Optional)", "e.g., Thai, Indian")}
                {renderTextareaField("preferredIngredients", "Favorite Ingredients (comma-separated, Optional)", "e.g., Chicken, Avocado")}
                {renderTextareaField("dispreferredIngredients", "Disliked Ingredients (comma-separated, Optional)", "e.g., Tofu, Olives")}
                {renderTextareaField("preferredMicronutrients", "Targeted Micronutrients (Optional)", "e.g., Vitamin D, Iron")}
              </div>
            )}

            {currentStep === 6 && ( // Medical Info
              <div className="space-y-6">
                {renderTextareaField("medicalConditions", "Medical Conditions (comma-separated, Optional)", "e.g., Diabetes, Hypertension", "Helps AI avoid conflicting foods.")}
                {renderTextareaField("medications", "Medications (comma-separated, Optional)", "e.g., Metformin, Lisinopril", "Helps AI avoid interactions.")}
              </div>
            )}

            {currentStep === 7 && ( // Smart Calculation Display
              <div className="space-y-4 p-4 border rounded-md bg-muted/50">
                <h3 className="text-lg font-semibold text-primary">Your Estimated Daily Targets:</h3>
                {calculatedTargets ? (
                  <>
                    <p><strong>Basal Metabolic Rate (BMR):</strong> {calculatedTargets.bmr?.toFixed(0) ?? 'N/A'} kcal</p>
                    <p><strong>Maintenance Calories (TDEE):</strong> {calculatedTargets.tdee?.toFixed(0) ?? 'N/A'} kcal</p>
                    <p className="font-bold text-primary mt-2">Target Daily Calories: {calculatedTargets.targetCalories?.toFixed(0) ?? 'N/A'} kcal</p>
                    <p>Target Protein: {calculatedTargets.targetProtein?.toFixed(1) ?? 'N/A'} g</p>
                    <p>Target Carbs: {calculatedTargets.targetCarbs?.toFixed(1) ?? 'N/A'} g</p>
                    <p>Target Fat: {calculatedTargets.targetFat?.toFixed(1) ?? 'N/A'} g</p>
                  </>
                ) : (
                  <p className="text-destructive flex items-center"><AlertCircle className="mr-2 h-4 w-4" /> Not enough information from previous steps to calculate. Please go back and complete required fields.</p>
                )}
                 <FormDescription className="text-xs mt-2">These are estimates based on your inputs. You can fine-tune these later in the app's tools.</FormDescription>
              </div>
            )}

            {currentStep === 8 && ( // Current Meal Plan Input
              renderTextareaField("typicalMealsDescription", "Describe Your Typical Meals", "e.g., Breakfast: Oats with berries. Lunch: Chicken salad sandwich...", "This helps our AI learn your habits.")
            )}

            {currentStep === 9 && ( // AI Meal Plan Generation Confirmation
              <div className="text-center space-y-4">
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
                <p className="text-lg">You're all set! Your profile is complete.</p>
                <p className="text-muted-foreground">Click "Finish Onboarding" to save your profile and proceed to the dashboard. You can then generate your first AI-powered meal plan.</p>
              </div>
            )}
            
            <div className="flex justify-between items-center pt-6">
              <Button type="button" variant="outline" onClick={handlePrevious} disabled={currentStep === 1}>
                Previous
              </Button>
              <div className="space-x-2">
                {activeStepData.isOptional && currentStep < onboardingStepsData.length && (
                  <Button type="button" variant="ghost" onClick={handleSkip}>
                    Skip
                  </Button>
                )}
                {currentStep < onboardingStepsData.length ? (
                  <Button type="button" onClick={handleNext}>
                    Next
                  </Button>
                ) : (
                  <Button type="submit"> {/* This is the "Finish Onboarding" button */}
                    Finish Onboarding
                  </Button>
                )}
              </div>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
    </TooltipProvider>
  );
}
