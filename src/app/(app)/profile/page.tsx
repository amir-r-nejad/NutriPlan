
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
import { useAuth } from "@/contexts/AuthContext"; // Assuming you have this
import { useToast } from "@/hooks/use-toast";
import React, { useEffect, useState } from "react";
import { activityLevels, dietGoals, preferredDiets, mealsPerDayOptions, genders, exerciseFrequencies, exerciseIntensities } from "@/lib/constants";

// Mock function to get profile data - replace with actual API call
async function getProfileData(userId: string): Promise<Partial<ProfileFormValues>> {
  console.log("Fetching profile for user:", userId);
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 500));
  const storedProfile = localStorage.getItem(`nutriplan_profile_${userId}`);
  if (storedProfile) {
    try {
      const parsedProfile = JSON.parse(storedProfile);
      // Ensure array fields are arrays even if stored as empty strings or undefined
      const arrayFields: (keyof ProfileFormValues)[] = [
        'preferredCuisines', 'dispreferredCuisines', 'preferredIngredients', 'dispreferredIngredients',
        'allergies', 'preferredMicronutrients', 'medicalConditions', 'medications', 
        'injuries', 'surgeries', 'exerciseGoals', 'exercisePreferences', 'equipmentAccess'
      ];
      arrayFields.forEach(field => {
        if (typeof parsedProfile[field] === 'string') {
           parsedProfile[field] = parsedProfile[field] ? parsedProfile[field].split(',').map((s: string) => s.trim()).filter((s: string) => s !== '') : [];
        } else if (!Array.isArray(parsedProfile[field])) {
            parsedProfile[field] = [];
        }
      });
      return parsedProfile as ProfileFormValues;
    } catch (error) {
      console.error("Error parsing stored profile data:", error);
      return { mealsPerDay: 3 }; // Default
    }
  }
  return { // Default values if nothing stored
    age: 30,
    gender: "male",
    height: 175,
    currentWeight: 70,
    goalWeight: 65,
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

// Mock function to save profile data
async function saveProfileData(userId: string, data: ProfileFormValues) {
  console.log("Saving profile for user:", userId, data);
  // Convert arrays to comma-separated strings for storage example
  const dataToStore = { ...data };
   const arrayFields: (keyof ProfileFormValues)[] = [
    'preferredCuisines', 'dispreferredCuisines', 'preferredIngredients', 'dispreferredIngredients',
    'allergies', 'preferredMicronutrients', 'medicalConditions', 'medications', 
    'injuries', 'surgeries', 'exerciseGoals', 'exercisePreferences', 'equipmentAccess'
  ];
  arrayFields.forEach((field) => {
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
      mealsPerDay: 3, // Default meals per day
      preferredCuisines: [],
      dispreferredCuisines: [],
      preferredIngredients: [],
      dispreferredIngredients: [],
      allergies: [],
      preferredMicronutrients: [],
      medicalConditions: [],
      medications: [],
      injuries: [],
      surgeries: [],
      exerciseGoals: [],
      exercisePreferences: [],
      equipmentAccess: [],
    },
  });

  useEffect(() => {
    if (user?.id) {
      setIsLoading(true);
      getProfileData(user.id).then((profileData) => {
        // Transform comma-separated strings back to arrays for form
        const transformedData = { ...profileData };
        const arrayFields: (keyof ProfileFormValues)[] = [
          'preferredCuisines', 'dispreferredCuisines', 'preferredIngredients', 'dispreferredIngredients',
          'allergies', 'preferredMicronutrients', 'medicalConditions', 'medications', 
          'injuries', 'surgeries', 'exerciseGoals', 'exercisePreferences', 'equipmentAccess'
        ];
        arrayFields.forEach(field => {
          if (typeof transformedData[field] === 'string') {
            transformedData[field] = (transformedData[field] as string).split(',').map(s => s.trim()).filter(s => s !== '');
          } else if (!Array.isArray(transformedData[field])) {
            transformedData[field] = [];
        }
        });
        form.reset(transformedData);
        setIsLoading(false);
      });
    }
  }, [user, form]);

  async function onSubmit(data: ProfileFormValues) {
    if (!user?.id) {
      toast({ title: "Error", description: "User not found.", variant: "destructive" });
      return;
    }
    try {
      await saveProfileData(user.id, data);
      toast({ title: "Profile Updated", description: "Your profile has been successfully updated." });
    } catch (error) {
      toast({ title: "Update Failed", description: "Could not update profile. Please try again.", variant: "destructive" });
    }
  }
  
  const renderCommaSeparatedInput = (fieldName: keyof ProfileFormValues, label: string, placeholder: string) => (
    <FormField
      control={form.control}
      name={fieldName}
      render={({ field }) => {
        // Ensure field.value is always an array for join, and string for Textarea
        const displayValue = Array.isArray(field.value) ? field.value.join(', ') : (field.value || '');
        return (
          <FormItem>
            <FormLabel>{label}</FormLabel>
            <FormControl>
              <Textarea
                placeholder={placeholder}
                value={displayValue}
                onChange={(e) => field.onChange(e.target.value.split(',').map(s => s.trim()))}
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
        <CardDescription>Manage your health data, dietary preferences, and activity levels.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <Accordion type="multiple" defaultValue={["item-1"]} className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger className="text-xl font-semibold">Basic Info</AccordionTrigger>
                <AccordionContent className="grid md:grid-cols-2 gap-6 pt-4">
                  <FormField control={form.control} name="age" render={({ field }) => ( <FormItem> <FormLabel>Age</FormLabel> <FormControl><Input type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                  <FormField control={form.control} name="gender" render={({ field }) => ( <FormItem> <FormLabel>Gender</FormLabel> <Select onValueChange={field.onChange} defaultValue={field.value}> <FormControl><SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger></FormControl> <SelectContent>{genders.map(g => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}</SelectContent> </Select> <FormMessage /> </FormItem> )} />
                  <FormField control={form.control} name="height" render={({ field }) => ( <FormItem> <FormLabel>Height (cm)</FormLabel> <FormControl><Input type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                  <FormField control={form.control} name="currentWeight" render={({ field }) => ( <FormItem> <FormLabel>Current Weight (kg)</FormLabel> <FormControl><Input type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                  <FormField control={form.control} name="goalWeight" render={({ field }) => ( <FormItem> <FormLabel>Goal Weight (kg)</FormLabel> <FormControl><Input type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-2">
                <AccordionTrigger className="text-xl font-semibold">Body Composition (%)</AccordionTrigger>
                <AccordionContent className="grid md:grid-cols-2 gap-6 pt-4">
                  <FormField control={form.control} name="currentBodyFatPercentage" render={({ field }) => ( <FormItem> <FormLabel>Current Body Fat %</FormLabel> <FormControl><Input type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                  <FormField control={form.control} name="targetBodyFatPercentage" render={({ field }) => ( <FormItem> <FormLabel>Target Body Fat %</FormLabel> <FormControl><Input type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                  <FormField control={form.control} name="currentMuscleMassPercentage" render={({ field }) => ( <FormItem> <FormLabel>Current Muscle Mass %</FormLabel> <FormControl><Input type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                  <FormField control={form.control} name="targetMuscleMassPercentage" render={({ field }) => ( <FormItem> <FormLabel>Target Muscle Mass %</FormLabel> <FormControl><Input type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                  <FormField control={form.control} name="currentWaterPercentage" render={({ field }) => ( <FormItem> <FormLabel>Current Water %</FormLabel> <FormControl><Input type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                  <FormField control={form.control} name="targetWaterPercentage" render={({ field }) => ( <FormItem> <FormLabel>Target Water %</FormLabel> <FormControl><Input type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="item-3">
                <AccordionTrigger className="text-xl font-semibold">Measurements (cm)</AccordionTrigger>
                <AccordionContent className="grid md:grid-cols-3 gap-6 pt-4">
                  <FormField control={form.control} name="waistMeasurementCurrent" render={({ field }) => ( <FormItem> <FormLabel>Waist (Current)</FormLabel> <FormControl><Input type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                  <FormField control={form.control} name="waistMeasurementGoal1Month" render={({ field }) => ( <FormItem> <FormLabel>Waist (1-Month Goal)</FormLabel> <FormControl><Input type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                   <FormField control={form.control} name="waistMeasurementIdeal" render={({ field }) => ( <FormItem> <FormLabel>Waist (Ideal)</FormLabel> <FormControl><Input type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                   <FormField control={form.control} name="hipsMeasurementCurrent" render={({ field }) => ( <FormItem> <FormLabel>Hips (Current)</FormLabel> <FormControl><Input type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                  <FormField control={form.control} name="hipsMeasurementGoal1Month" render={({ field }) => ( <FormItem> <FormLabel>Hips (1-Month Goal)</FormLabel> <FormControl><Input type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                   <FormField control={form.control} name="hipsMeasurementIdeal" render={({ field }) => ( <FormItem> <FormLabel>Hips (Ideal)</FormLabel> <FormControl><Input type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                   <FormField control={form.control} name="limbsMeasurementCurrent" render={({ field }) => ( <FormItem> <FormLabel>Limbs (Current)</FormLabel> <FormControl><Input type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                  <FormField control={form.control} name="limbsMeasurementGoal1Month" render={({ field }) => ( <FormItem> <FormLabel>Limbs (1-Month Goal)</FormLabel> <FormControl><Input type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                   <FormField control={form.control} name="limbsMeasurementIdeal" render={({ field }) => ( <FormItem> <FormLabel>Limbs (Ideal)</FormLabel> <FormControl><Input type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-4">
                <AccordionTrigger className="text-xl font-semibold">Activity & Diet Preferences</AccordionTrigger>
                <AccordionContent className="space-y-6 pt-4">
                  <div className="grid md:grid-cols-2 gap-6">
                    <FormField control={form.control} name="activityLevel" render={({ field }) => ( <FormItem> <FormLabel>Activity Level</FormLabel> <Select onValueChange={field.onChange} defaultValue={field.value}> <FormControl><SelectTrigger><SelectValue placeholder="Select activity level" /></SelectTrigger></FormControl> <SelectContent>{activityLevels.map(al => <SelectItem key={al.value} value={al.value}>{al.label}</SelectItem>)}</SelectContent> </Select> <FormMessage /> </FormItem> )} />
                    <FormField control={form.control} name="dietGoal" render={({ field }) => ( <FormItem> <FormLabel>Diet Goal</FormLabel> <Select onValueChange={field.onChange} defaultValue={field.value}> <FormControl><SelectTrigger><SelectValue placeholder="Select diet goal" /></SelectTrigger></FormControl> <SelectContent>{dietGoals.map(dg => <SelectItem key={dg.value} value={dg.value}>{dg.label}</SelectItem>)}</SelectContent> </Select> <FormMessage /> </FormItem> )} />
                    <FormField control={form.control} name="preferredDiet" render={({ field }) => ( <FormItem> <FormLabel>Preferred Diet</FormLabel> <Select onValueChange={field.onChange} defaultValue={field.value}> <FormControl><SelectTrigger><SelectValue placeholder="Select preferred diet" /></SelectTrigger></FormControl> <SelectContent>{preferredDiets.map(pd => <SelectItem key={pd.value} value={pd.value}>{pd.label}</SelectItem>)}</SelectContent> </Select> <FormMessage /> </FormItem> )} />
                     <FormField control={form.control} name="mealsPerDay" render={({ field }) => ( <FormItem> <FormLabel>Meals Per Day</FormLabel> <Select onValueChange={(v) => field.onChange(Number(v))} defaultValue={String(field.value)}> <FormControl><SelectTrigger><SelectValue placeholder="Select meals per day" /></SelectTrigger></FormControl> <SelectContent>{mealsPerDayOptions.map(m => <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>)}</SelectContent> </Select> <FormMessage /> </FormItem> )} />
                  </div>
                  {renderCommaSeparatedInput("preferredCuisines", "Preferred Cuisines", "e.g., Italian, Mexican, Indian")}
                  {renderCommaSeparatedInput("dispreferredCuisines", "Dispreferred Cuisines", "e.g., Thai, French")}
                  {renderCommaSeparatedInput("preferredIngredients", "Preferred Ingredients", "e.g., Chicken, Broccoli, Avocado")}
                  {renderCommaSeparatedInput("dispreferredIngredients", "Dispreferred Ingredients", "e.g., Tofu, Mushrooms")}
                  {renderCommaSeparatedInput("allergies", "Allergies", "e.g., Peanuts, Shellfish, Gluten")}
                  {renderCommaSeparatedInput("preferredMicronutrients", "Preferred Micronutrients", "e.g., Vitamin D, Iron, Omega-3")}
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-5">
                <AccordionTrigger className="text-xl font-semibold">Medical Info</AccordionTrigger>
                <AccordionContent className="space-y-6 pt-4">
                  {renderCommaSeparatedInput("medicalConditions", "Medical Conditions", "e.g., Diabetes, Hypertension")}
                  {renderCommaSeparatedInput("medications", "Medications", "e.g., Metformin, Lisinopril")}
                  <FormField control={form.control} name="painMobilityIssues" render={({ field }) => ( <FormItem> <FormLabel>Pain/Mobility Issues</FormLabel> <FormControl><Textarea placeholder="Describe any pain or mobility issues" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                  {renderCommaSeparatedInput("injuries", "Injuries", "e.g., ACL tear, Rotator cuff injury")}
                  {renderCommaSeparatedInput("surgeries", "Surgeries", "e.g., Appendectomy, Knee replacement")}
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-6">
                <AccordionTrigger className="text-xl font-semibold">Exercise Preferences</AccordionTrigger>
                <AccordionContent className="space-y-6 pt-4">
                   <div className="grid md:grid-cols-2 gap-6">
                    <FormField control={form.control} name="exerciseFrequency" render={({ field }) => ( <FormItem> <FormLabel>Exercise Frequency</FormLabel> <Select onValueChange={field.onChange} defaultValue={field.value}> <FormControl><SelectTrigger><SelectValue placeholder="Select frequency" /></SelectTrigger></FormControl> <SelectContent>{exerciseFrequencies.map(ef => <SelectItem key={ef.value} value={ef.value}>{ef.label}</SelectItem>)}</SelectContent> </Select> <FormMessage /> </FormItem> )} />
                    <FormField control={form.control} name="exerciseIntensity" render={({ field }) => ( <FormItem> <FormLabel>Exercise Intensity</FormLabel> <Select onValueChange={field.onChange} defaultValue={field.value}> <FormControl><SelectTrigger><SelectValue placeholder="Select intensity" /></SelectTrigger></FormControl> <SelectContent>{exerciseIntensities.map(ei => <SelectItem key={ei.value} value={ei.value}>{ei.label}</SelectItem>)}</SelectContent> </Select> <FormMessage /> </FormItem> )} />
                  </div>
                  {renderCommaSeparatedInput("exerciseGoals", "Exercise Goals", "e.g., Weight loss, Muscle gain, Endurance")}
                  {renderCommaSeparatedInput("exercisePreferences", "Exercise Preferences", "e.g., Running, Weightlifting, Yoga")}
                  {renderCommaSeparatedInput("equipmentAccess", "Equipment Access", "e.g., Dumbbells, Treadmill, Home gym")}
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <Button type="submit" className="w-full text-lg py-6" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Saving..." : "Save Profile"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
