
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
import { exerciseFrequencies, exerciseIntensities } from "@/lib/constants";

// This type represents the full profile data structure potentially stored in localStorage
interface FullProfileData {
  age?: number;
  gender?: string;
  height?: number;
  currentWeight?: number;
  goalWeight1Month?: number;
  goalWeightIdeal?: number;
  activityLevel?: string; 
  dietGoal?: string; 
  mealsPerDay?: number; 
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

  // Fields previously on this form, now moved or managed elsewhere
  preferredDiet?: string;
  preferredCuisines?: string[];
  dispreferredCuisines?: string[];
  preferredIngredients?: string[];
  dispreferredIngredients?: string[];
  allergies?: string[];
  preferredMicronutrients?: string[];
  medicalConditions?: string[];
  medications?: string[];

  // Fields remaining on this form
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
      const parsedProfile = JSON.parse(storedProfile) as FullProfileData; 
      
      const relevantProfileData: Partial<ProfileFormValues> = {
        // Only map fields remaining in ProfileFormSchema
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
    painMobilityIssues: "",
    injuries: [],
    surgeries: [],
    exerciseGoals: [],
    exercisePreferences: [],
    equipmentAccess: [],
  };
}

async function saveProfileData(userId: string, data: ProfileFormValues) {
  console.log("Saving profile subset (preferences, medical, exercise) for user:", userId, data);
  
  const storedProfile = localStorage.getItem(`nutriplan_profile_${userId}`);
  let fullProfile: FullProfileData = {};
  if (storedProfile) {
    try {
      fullProfile = JSON.parse(storedProfile);
    } catch (error) {
      console.error("Error parsing existing profile data for saving:", error);
    }
  }

  // Merge data from this form (ProfileFormValues) into the full profile structure
  const updatedFullProfile: FullProfileData = {
    ...fullProfile, 
    ...data, // This will only update fields present in ProfileFormValues (pain, injuries, exercise etc.)
  };
  
  // Convert array fields to comma-separated strings for localStorage
  const dataToStore = { ...updatedFullProfile };
  const arrayFieldsToConvert: (keyof FullProfileData)[] = [
    // Keep all potential array fields from FullProfileData to ensure they are stored as strings if they exist
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
      painMobilityIssues: "",
      injuries: [],
      surgeries: [],
      exerciseGoals: [],
      exercisePreferences: [],
      exerciseFrequency: undefined,
      exerciseIntensity: undefined,
      equipmentAccess: [],
    },
  });

  useEffect(() => {
    if (user?.id) {
      setIsLoading(true);
      getProfileData(user.id).then((profileDataSubset) => {
        form.reset(profileDataSubset); 
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
        const displayValue = Array.isArray(field.value) ? field.value.join(', ') : '';
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
        <CardTitle className="text-3xl font-bold">Your Profile</CardTitle>
        <CardDescription>Manage your general medical information and activity preferences. Detailed dietary preferences are managed on the Meal Suggestions page. Physical metrics are on the Smart Calorie Planner.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <Accordion type="multiple" defaultValue={["item-1", "item-2"]} className="w-full">
              {/* Dietary Preferences & Restrictions AccordionItem REMOVED */}
              <AccordionItem value="item-1">
                <AccordionTrigger className="text-xl font-semibold">Medical Info & Physical Limitations</AccordionTrigger>
                <AccordionContent className="space-y-6 pt-4">
                  {/* medicalConditions and medications fields REMOVED */}
                  <FormField control={form.control} name="painMobilityIssues" render={({ field }) => ( <FormItem> <FormLabel>Pain/Mobility Issues</FormLabel> <FormControl><Textarea placeholder="Describe any pain or mobility issues" value={field.value ?? ''} onChange={field.onChange} /></FormControl> <FormMessage /> </FormItem> )} />
                  {renderCommaSeparatedInput("injuries" as keyof ProfileFormValues, "Injuries (comma-separated)", "e.g., ACL tear, Rotator cuff injury")}
                  {renderCommaSeparatedInput("surgeries" as keyof ProfileFormValues, "Surgeries (comma-separated)", "e.g., Appendectomy, Knee replacement")}
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-2">
                <AccordionTrigger className="text-xl font-semibold">Exercise Preferences</AccordionTrigger>
                <AccordionContent className="space-y-6 pt-4">
                   <div className="grid md:grid-cols-2 gap-6">
                    <FormField control={form.control} name="exerciseFrequency" render={({ field }) => ( <FormItem> <FormLabel>Exercise Frequency</FormLabel> <Select onValueChange={field.onChange} value={field.value ?? undefined}> <FormControl><SelectTrigger><SelectValue placeholder="Select frequency" /></SelectTrigger></FormControl> <SelectContent>{exerciseFrequencies.map(ef => <SelectItem key={ef.value} value={ef.value}>{ef.label}</SelectItem>)}</SelectContent> </Select> <FormMessage /> </FormItem> )} />
                    <FormField control={form.control} name="exerciseIntensity" render={({ field }) => ( <FormItem> <FormLabel>Exercise Intensity</FormLabel> <Select onValueChange={field.onChange} value={field.value ?? undefined}> <FormControl><SelectTrigger><SelectValue placeholder="Select intensity" /></SelectTrigger></FormControl> <SelectContent>{exerciseIntensities.map(ei => <SelectItem key={ei.value} value={ei.value}>{ei.label}</SelectItem>)}</SelectContent> </Select> <FormMessage /> </FormItem> )} />
                  </div>
                  {renderCommaSeparatedInput("exerciseGoals" as keyof ProfileFormValues, "Exercise Goals (comma-separated)", "e.g., Weight loss, Muscle gain, Endurance")}
                  {renderCommaSeparatedInput("exercisePreferences" as keyof ProfileFormValues, "Exercise Preferences (comma-separated)", "e.g., Running, Weightlifting, Yoga")}
                  {renderCommaSeparatedInput("equipmentAccess" as keyof ProfileFormValues, "Equipment Access (comma-separated)", "e.g., Dumbbells, Treadmill, Home gym")}
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <Button type="submit" className="w-full text-lg py-6" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Saving..." : "Save Profile Information"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
