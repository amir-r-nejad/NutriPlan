
"use client";

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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfileFormSchema, type ProfileFormValues } from "@/lib/schemas";
import { useAuth } from "@/contexts/AuthContext"; 
import { useToast } from "@/hooks/use-toast";
import React, { useEffect, useState } from "react";
import { activityLevels, dietGoals, preferredDiets, mealsPerDayOptions, genders, exerciseFrequencies, exerciseIntensities } from "@/lib/constants";

// This type represents the full profile data structure potentially stored in localStorage
// It's distinct from ProfileFormValues which is now specific to this page's form.
interface FullProfileData {
  age?: number;
  gender?: string;
  height?: number;
  currentWeight?: number;
  goalWeight1Month?: number;
  goalWeightIdeal?: number;
  currentBodyFatPercentage?: number;
  targetBodyFatPercentage?: number;
  currentMuscleMassPercentage?: number;
  targetMuscleMassPercentage?: number;
  currentWaterPercentage?: number;
  targetWaterPercentage?: number;
  waistMeasurementCurrent?: number;
  waistMeasurementGoal1Month?: number;
  waistMeasurementIdeal?: number;
  hipsMeasurementCurrent?: number;
  hipsMeasurementGoal1Month?: number;
  hipsMeasurementIdeal?: number;
  rightLegMeasurementCurrent?: number;
  rightLegMeasurementGoal1Month?: number;
  rightLegMeasurementIdeal?: number;
  leftLegMeasurementCurrent?: number;
  leftLegMeasurementGoal1Month?: number;
  leftLegMeasurementIdeal?: number;
  rightArmMeasurementCurrent?: number;
  rightArmMeasurementGoal1Month?: number;
  rightArmMeasurementIdeal?: number;
  leftArmMeasurementCurrent?: number;
  leftArmMeasurementGoal1Month?: number;
  leftArmMeasurementIdeal?: number;
  activityLevel?: string;
  dietGoal?: string;
  preferredDiet?: string;
  mealsPerDay?: number;
  preferredCuisines?: string[];
  dispreferredCuisines?: string[];
  preferredIngredients?: string[];
  dispreferredIngredients?: string[];
  allergies?: string[];
  preferredMicronutrients?: string[];
  medicalConditions?: string[];
  medications?: string[];
  painMobilityIssues?: string;
  injuries?: string[];
  surgeries?: string[];
  exerciseGoals?: string[];
  exercisePreferences?: string[];
  exerciseFrequency?: string;
  exerciseIntensity?: string;
  equipmentAccess?: string[];
}


async function getProfileData(userId: string): Promise<Partial<ProfileFormValues>> {
  console.log("Fetching profile for user:", userId);
  await new Promise(resolve => setTimeout(resolve, 500));
  const storedProfile = localStorage.getItem(`nutriplan_profile_${userId}`);
  if (storedProfile) {
    try {
      const parsedProfile = JSON.parse(storedProfile) as FullProfileData; // Expect full data
      
      // Fields still managed by this form
      const relevantProfileData: Partial<ProfileFormValues> = {
        activityLevel: parsedProfile.activityLevel,
        dietGoal: parsedProfile.dietGoal,
        preferredDiet: parsedProfile.preferredDiet,
        mealsPerDay: parsedProfile.mealsPerDay,
        preferredCuisines: Array.isArray(parsedProfile.preferredCuisines) ? parsedProfile.preferredCuisines : (typeof parsedProfile.preferredCuisines === 'string' ? parsedProfile.preferredCuisines.split(',').map(s => s.trim()).filter(s => s) : []),
        dispreferredCuisines: Array.isArray(parsedProfile.dispreferredCuisines) ? parsedProfile.dispreferredCuisines : (typeof parsedProfile.dispreferredCuisines === 'string' ? parsedProfile.dispreferredCuisines.split(',').map(s => s.trim()).filter(s => s) : []),
        preferredIngredients: Array.isArray(parsedProfile.preferredIngredients) ? parsedProfile.preferredIngredients : (typeof parsedProfile.preferredIngredients === 'string' ? parsedProfile.preferredIngredients.split(',').map(s => s.trim()).filter(s => s) : []),
        dispreferredIngredients: Array.isArray(parsedProfile.dispreferredIngredients) ? parsedProfile.dispreferredIngredients : (typeof parsedProfile.dispreferredIngredients === 'string' ? parsedProfile.dispreferredIngredients.split(',').map(s => s.trim()).filter(s => s) : []),
        allergies: Array.isArray(parsedProfile.allergies) ? parsedProfile.allergies : (typeof parsedProfile.allergies === 'string' ? parsedProfile.allergies.split(',').map(s => s.trim()).filter(s => s) : []),
        preferredMicronutrients: Array.isArray(parsedProfile.preferredMicronutrients) ? parsedProfile.preferredMicronutrients : (typeof parsedProfile.preferredMicronutrients === 'string' ? parsedProfile.preferredMicronutrients.split(',').map(s => s.trim()).filter(s => s) : []),
        medicalConditions: Array.isArray(parsedProfile.medicalConditions) ? parsedProfile.medicalConditions : (typeof parsedProfile.medicalConditions === 'string' ? parsedProfile.medicalConditions.split(',').map(s => s.trim()).filter(s => s) : []),
        medications: Array.isArray(parsedProfile.medications) ? parsedProfile.medications : (typeof parsedProfile.medications === 'string' ? parsedProfile.medications.split(',').map(s => s.trim()).filter(s => s) : []),
        painMobilityIssues: parsedProfile.painMobilityIssues,
        injuries: Array.isArray(parsedProfile.injuries) ? parsedProfile.injuries : (typeof parsedProfile.injuries === 'string' ? parsedProfile.injuries.split(',').map(s => s.trim()).filter(s => s) : []),
        surgeries: Array.isArray(parsedProfile.surgeries) ? parsedProfile.surgeries : (typeof parsedProfile.surgeries === 'string' ? parsedProfile.surgeries.split(',').map(s => s.trim()).filter(s => s) : []),
        exerciseGoals: Array.isArray(parsedProfile.exerciseGoals) ? parsedProfile.exerciseGoals : (typeof parsedProfile.exerciseGoals === 'string' ? parsedProfile.exerciseGoals.split(',').map(s => s.trim()).filter(s => s) : []),
        exercisePreferences: Array.isArray(parsedProfile.exercisePreferences) ? parsedProfile.exercisePreferences : (typeof parsedProfile.exercisePreferences === 'string' ? parsedProfile.exercisePreferences.split(',').map(s => s.trim()).filter(s => s) : []),
        exerciseFrequency: parsedProfile.exerciseFrequency,
        exerciseIntensity: parsedProfile.exerciseIntensity,
        equipmentAccess: Array.isArray(parsedProfile.equipmentAccess) ? parsedProfile.equipmentAccess : (typeof parsedProfile.equipmentAccess === 'string' ? parsedProfile.equipmentAccess.split(',').map(s => s.trim()).filter(s => s) : []),
      };
      return relevantProfileData;
    } catch (error) {
      console.error("Error parsing stored profile data:", error);
    }
  }
  // Return default values for the fields managed by this form
  return {
    activityLevel: "moderate",
    dietGoal: "lose_weight",
    mealsPerDay: 3,
    preferredDiet: "none",
    preferredCuisines: [],
    dispreferredCuisines: [],
    preferredIngredients: [],
    dispreferredIngredients: [],
    allergies: [],
    preferredMicronutrients: [],
    medicalConditions: [],
    medications: [],
    painMobilityIssues: "",
    injuries: [],
    surgeries: [],
    exerciseGoals: [],
    exercisePreferences: [],
    equipmentAccess: [],
  };
}

async function saveProfileData(userId: string, data: ProfileFormValues) {
  console.log("Saving profile subset for user:", userId, data);
  
  // Fetch the full existing profile
  const storedProfile = localStorage.getItem(`nutriplan_profile_${userId}`);
  let fullProfile: FullProfileData = {};
  if (storedProfile) {
    try {
      fullProfile = JSON.parse(storedProfile);
    } catch (error) {
      console.error("Error parsing existing profile data for saving:", error);
      // If parsing fails, start with an empty object to avoid losing all data
    }
  }

  // Merge the data from this form (which is a subset) into the full profile
  const updatedFullProfile: FullProfileData = {
    ...fullProfile, // Preserve existing fields not managed by this form
    ...data,     // Overwrite with new values for fields managed by this form
  };

  // Convert arrays to comma-separated strings for storage example, if needed
  const dataToStore = { ...updatedFullProfile };
  const arrayFieldsToConvert: (keyof FullProfileData)[] = [
    'preferredCuisines', 'dispreferredCuisines', 'preferredIngredients', 'dispreferredIngredients',
    'allergies', 'preferredMicronutrients', 'medicalConditions', 'medications', 
    'injuries', 'surgeries', 'exerciseGoals', 'exercisePreferences', 'equipmentAccess'
  ];
  arrayFieldsToConvert.forEach((field) => {
    if (Array.isArray(dataToStore[field])) {
      (dataToStore as any)[field] = (dataToStore[field] as string[]).join(',');
    }
  });
  
  localStorage.setItem(`nutriplan_profile_${userId}`, JSON.stringify(dataToStore));
  await new Promise(resolve => setTimeout(resolve, 500));
  return { success: true };
}


export default function ProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(ProfileFormSchema),
    defaultValues: {
      activityLevel: "moderate",
      dietGoal: "lose_weight",
      mealsPerDay: 3,
      preferredDiet: "none",
      preferredCuisines: [],
      dispreferredCuisines: [],
      preferredIngredients: [],
      dispreferredIngredients: [],
      allergies: [],
      preferredMicronutrients: [],
      medicalConditions: [],
      medications: [],
      painMobilityIssues: "",
      injuries: [],
      surgeries: [],
      exerciseGoals: [],
      exercisePreferences: [],
      equipmentAccess: [],
      // Fields like age, gender, weight, etc., are no longer part of this form's defaultValues
    },
  });

  useEffect(() => {
    if (user?.id) {
      setIsLoading(true);
      getProfileData(user.id).then((profileDataSubset) => {
        form.reset(profileDataSubset); // Reset form with only the relevant subset
        setIsLoading(false);
      }).catch(error => {
        console.error("Error loading profile data:", error);
        toast({ title: "Error", description: "Could not load profile data.", variant: "destructive"});
        setIsLoading(false);
      });
    }
  }, [user, form, toast]);

  async function onSubmit(data: ProfileFormValues) {
    if (!user?.id) {
      toast({ title: "Error", description: "User not found.", variant: "destructive" });
      return;
    }
    try {
      await saveProfileData(user.id, data);
      toast({ title: "Profile Updated", description: "Your profile preferences have been successfully updated." });
    } catch (error) {
      toast({ title: "Update Failed", description: "Could not update profile. Please try again.", variant: "destructive" });
    }
  }
  
  const renderCommaSeparatedInput = (fieldName: keyof ProfileFormValues, label: string, placeholder: string) => (
    <FormField
      control={form.control}
      name={fieldName}
      render={({ field }) => {
        const displayValue = Array.isArray(field.value) ? field.value.join(', ') : (field.value || '');
        return (
          <FormItem>
            <FormLabel>{label}</FormLabel>
            <FormControl>
              <Textarea
                placeholder={placeholder}
                value={displayValue}
                onChange={(e) => field.onChange(e.target.value.split(',').map(s => s.trim()).filter(s => s))}
                className="h-10 resize-none" 
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );


  if (isLoading) {
    return <div className="flex justify-center items-center h-full"><p>Loading profile...</p></div>;
  }

  return (
    <Card className="max-w-4xl mx-auto shadow-lg">
      <CardHeader>
        <CardTitle className="text-3xl font-bold">Your Profile Preferences</CardTitle>
        <CardDescription>Manage your dietary preferences, medical information, and activity levels. Detailed physical metrics are managed in the Smart Calorie Planner.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <Accordion type="multiple" defaultValue={["item-4", "item-5", "item-6"]} className="w-full">
              {/* Basic Info, Body Composition, and Measurements sections are removed */}

              <AccordionItem value="item-4">
                <AccordionTrigger className="text-xl font-semibold">Activity & Diet Preferences</AccordionTrigger>
                <AccordionContent className="space-y-6 pt-4">
                  <div className="grid md:grid-cols-2 gap-6">
                    <FormField control={form.control} name="activityLevel" render={({ field }) => ( <FormItem> <FormLabel>Activity Level</FormLabel> <Select onValueChange={field.onChange} value={field.value ?? undefined}> <FormControl><SelectTrigger><SelectValue placeholder="Select activity level" /></SelectTrigger></FormControl> <SelectContent>{activityLevels.map(al => <SelectItem key={al.value} value={al.value}>{al.label}</SelectItem>)}</SelectContent> </Select> <FormMessage /> </FormItem> )} />
                    <FormField control={form.control} name="dietGoal" render={({ field }) => ( <FormItem> <FormLabel>Diet Goal</FormLabel> <Select onValueChange={field.onChange} value={field.value ?? undefined}> <FormControl><SelectTrigger><SelectValue placeholder="Select diet goal" /></SelectTrigger></FormControl> <SelectContent>{dietGoals.map(dg => <SelectItem key={dg.value} value={dg.value}>{dg.label}</SelectItem>)}</SelectContent> </Select> <FormMessage /> </FormItem> )} />
                    <FormField control={form.control} name="preferredDiet" render={({ field }) => ( <FormItem> <FormLabel>Preferred Diet</FormLabel> <Select onValueChange={field.onChange} value={field.value ?? undefined}> <FormControl><SelectTrigger><SelectValue placeholder="Select preferred diet" /></SelectTrigger></FormControl> <SelectContent>{preferredDiets.map(pd => <SelectItem key={pd.value} value={pd.value}>{pd.label}</SelectItem>)}</SelectContent> </Select> <FormMessage /> </FormItem> )} />
                     <FormField control={form.control} name="mealsPerDay" render={({ field }) => ( <FormItem> <FormLabel>Meals Per Day</FormLabel> <Select onValueChange={(v) => field.onChange(Number(v))} value={String(field.value ?? 3 )}> <FormControl><SelectTrigger><SelectValue placeholder="Select meals per day" /></SelectTrigger></FormControl> <SelectContent>{mealsPerDayOptions.map(m => <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>)}</SelectContent> </Select> <FormMessage /> </FormItem> )} />
                  </div>
                  {renderCommaSeparatedInput("preferredCuisines" as keyof ProfileFormValues, "Preferred Cuisines", "e.g., Italian, Mexican, Indian")}
                  {renderCommaSeparatedInput("dispreferredCuisines" as keyof ProfileFormValues, "Dispreferred Cuisines", "e.g., Thai, French")}
                  {renderCommaSeparatedInput("preferredIngredients" as keyof ProfileFormValues, "Preferred Ingredients", "e.g., Chicken, Broccoli, Avocado")}
                  {renderCommaSeparatedInput("dispreferredIngredients" as keyof ProfileFormValues, "Dispreferred Ingredients", "e.g., Tofu, Mushrooms")}
                  {renderCommaSeparatedInput("allergies" as keyof ProfileFormValues, "Allergies", "e.g., Peanuts, Shellfish, Gluten")}
                  {renderCommaSeparatedInput("preferredMicronutrients" as keyof ProfileFormValues, "Preferred Micronutrients", "e.g., Vitamin D, Iron, Omega-3")}
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-5">
                <AccordionTrigger className="text-xl font-semibold">Medical Info</AccordionTrigger>
                <AccordionContent className="space-y-6 pt-4">
                  {renderCommaSeparatedInput("medicalConditions" as keyof ProfileFormValues, "Medical Conditions", "e.g., Diabetes, Hypertension")}
                  {renderCommaSeparatedInput("medications" as keyof ProfileFormValues, "Medications", "e.g., Metformin, Lisinopril")}
                  <FormField control={form.control} name="painMobilityIssues" render={({ field }) => ( <FormItem> <FormLabel>Pain/Mobility Issues</FormLabel> <FormControl><Textarea placeholder="Describe any pain or mobility issues" value={field.value ?? ''} onChange={field.onChange} /></FormControl> <FormMessage /> </FormItem> )} />
                  {renderCommaSeparatedInput("injuries" as keyof ProfileFormValues, "Injuries", "e.g., ACL tear, Rotator cuff injury")}
                  {renderCommaSeparatedInput("surgeries" as keyof ProfileFormValues, "Surgeries", "e.g., Appendectomy, Knee replacement")}
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-6">
                <AccordionTrigger className="text-xl font-semibold">Exercise Preferences</AccordionTrigger>
                <AccordionContent className="space-y-6 pt-4">
                   <div className="grid md:grid-cols-2 gap-6">
                    <FormField control={form.control} name="exerciseFrequency" render={({ field }) => ( <FormItem> <FormLabel>Exercise Frequency</FormLabel> <Select onValueChange={field.onChange} value={field.value ?? undefined}> <FormControl><SelectTrigger><SelectValue placeholder="Select frequency" /></SelectTrigger></FormControl> <SelectContent>{exerciseFrequencies.map(ef => <SelectItem key={ef.value} value={ef.value}>{ef.label}</SelectItem>)}</SelectContent> </Select> <FormMessage /> </FormItem> )} />
                    <FormField control={form.control} name="exerciseIntensity" render={({ field }) => ( <FormItem> <FormLabel>Exercise Intensity</FormLabel> <Select onValueChange={field.onChange} value={field.value ?? undefined}> <FormControl><SelectTrigger><SelectValue placeholder="Select intensity" /></SelectTrigger></FormControl> <SelectContent>{exerciseIntensities.map(ei => <SelectItem key={ei.value} value={ei.value}>{ei.label}</SelectItem>)}</SelectContent> </Select> <FormMessage /> </FormItem> )} />
                  </div>
                  {renderCommaSeparatedInput("exerciseGoals" as keyof ProfileFormValues, "Exercise Goals", "e.g., Weight loss, Muscle gain, Endurance")}
                  {renderCommaSeparatedInput("exercisePreferences" as keyof ProfileFormValues, "Exercise Preferences", "e.g., Running, Weightlifting, Yoga")}
                  {renderCommaSeparatedInput("equipmentAccess" as keyof ProfileFormValues, "Equipment Access", "e.g., Dumbbells, Treadmill, Home gym")}
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <Button type="submit" className="w-full text-lg py-6" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Saving..." : "Save Profile Preferences"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
