
"use client";

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
  FormDescription,
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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ProfileFormSchema, type FullProfileType, type ProfileFormValues } from "@/lib/schemas"; 
import { useAuth } from "@/contexts/AuthContext"; 
import { useToast } from "@/hooks/use-toast";
import React, { useEffect, useState } from "react";
import { subscriptionStatuses, exerciseFrequencies, exerciseIntensities } from "@/lib/constants";
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/clientApp';
import { AlertTriangle, RefreshCcw } from "lucide-react";


async function getProfileData(userId: string): Promise<Partial<ProfileFormValues>> {
  if (!userId) return {};
  try {
    const userProfileRef = doc(db, "users", userId);
    const docSnap = await getDoc(userProfileRef);
    if (docSnap.exists()) {
      const fullProfile = docSnap.data() as FullProfileType;
      // Extract only the fields relevant to this simplified profile form
      return {
        name: fullProfile.name ?? undefined,
        subscriptionStatus: fullProfile.subscriptionStatus ?? undefined,
        // Fields removed in previous steps are not loaded into this specific form
        painMobilityIssues: fullProfile.painMobilityIssues ?? undefined,
        injuries: fullProfile.injuries || [], 
        surgeries: fullProfile.surgeries || [], 
        exerciseGoals: fullProfile.exerciseGoals || [],
        exercisePreferences: fullProfile.exercisePreferences || [],
        exerciseFrequency: fullProfile.exerciseFrequency ?? undefined,
        exerciseIntensity: fullProfile.exerciseIntensity ?? undefined,
        equipmentAccess: fullProfile.equipmentAccess || [],
      };
    }
  } catch (error) {
    console.error("Error fetching profile from Firestore:", error);
  }
  return { 
    name: undefined, subscriptionStatus: undefined, 
    painMobilityIssues: undefined, injuries: [], surgeries: [],
    exerciseGoals: [], exercisePreferences: [], exerciseFrequency: undefined, 
    exerciseIntensity: undefined, equipmentAccess: []
  };
}

async function saveProfileData(userId: string, data: ProfileFormValues) {
  if (!userId) throw new Error("User ID is required to save profile data.");
  
  try {
    const userProfileRef = doc(db, "users", userId);
    const docSnap = await getDoc(userProfileRef);
    let existingProfile: Partial<FullProfileType> = {};
    if (docSnap.exists()) {
      existingProfile = docSnap.data() as FullProfileType;
    }

    const dataToSave: Record<string, any> = { ...existingProfile };
    
    // Merge only the fields present in ProfileFormValues
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        const formKey = key as keyof ProfileFormValues;
        if (data[formKey] === undefined) {
          dataToSave[formKey] = null; // Convert undefined from form to null for Firestore
        } else {
          dataToSave[formKey] = data[formKey];
        }
      }
    }
    
    await setDoc(userProfileRef, dataToSave, { merge: true }); 
  } catch (error) {
     console.error("Error saving profile to Firestore:", error);
     throw error; 
  }
}


export default function ProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(ProfileFormSchema),
    defaultValues: {
      name: undefined,
      subscriptionStatus: undefined,
      painMobilityIssues: undefined,
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
    if (user?.uid) { 
      setIsLoading(true);
      getProfileData(user.uid).then((profileDataSubset) => {
        form.reset(profileDataSubset); 
        setIsLoading(false);
      }).catch(error => {
        console.error("Error loading profile data:", error);
        toast({ title: "Error", description: "Could not load profile data.", variant: "destructive"});
        setIsLoading(false);
      });
    } else {
        setIsLoading(false); 
    }
  }, [user, form, toast]);

  async function onSubmit(data: ProfileFormValues) {
    if (!user?.uid) { 
      toast({ title: "Error", description: "User not found.", variant: "destructive" });
      return;
    }
    try {
      await saveProfileData(user.uid, data);
      toast({ title: "Profile Updated", description: "Your profile has been successfully updated." });
    } catch (error) {
      toast({ title: "Update Failed", description: "Could not update profile. Please try again.", variant: "destructive" });
    }
  }

   const renderCommaSeparatedInput = (
    fieldName: keyof ProfileFormValues, 
    label: string, 
    placeholder: string
  ) => (
    <FormField
      control={form.control}
      name={fieldName}
      render={({ field }) => {
        // Ensure value is always a string for the textarea
        const displayValue = Array.isArray(field.value) ? field.value.join(', ') : (field.value || '');
        return (
          <FormItem>
            <FormLabel>{label}</FormLabel>
            <FormControl><div>
              <Textarea
                placeholder={placeholder}
                value={displayValue}
                onChange={(e) => field.onChange(e.target.value.split(',').map(s => s.trim()).filter(s => s))}
                className="h-10 resize-none" 
              /></div>
            </FormControl>
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );

  const handleResetOnboarding = async () => {
    if (!user?.uid) {
      toast({ title: "Error", description: "User not found.", variant: "destructive" });
      return;
    }
    try {
      const userProfileRef = doc(db, "users", user.uid);
      await setDoc(userProfileRef, { onboardingComplete: false }, { merge: true });
      toast({
        title: "Onboarding Reset",
        description: "Your onboarding status has been reset. The app will now reload.",
      });
      // Force a reload to trigger AuthContext to re-evaluate onboarding status
      window.location.reload();
    } catch (error) {
      console.error("Error resetting onboarding status:", error);
      toast({ title: "Reset Failed", description: "Could not reset onboarding status.", variant: "destructive" });
    }
  };
  
  if (isLoading && user) { 
    return <div className="flex justify-center items-center h-full"><p>Loading profile...</p></div>;
  }

  return (
    <Card className="max-w-xl mx-auto shadow-lg">
      <CardHeader>
        <CardTitle className="text-3xl font-bold">Your Account</CardTitle>
        <CardDescription>Manage your account and related preferences.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            
            <Accordion type="multiple" defaultValue={['account-info']} className="w-full">
              <AccordionItem value="account-info">
                <AccordionTrigger className="text-xl font-semibold">Account Information</AccordionTrigger>
                <AccordionContent className="space-y-6 pt-4 px-1">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl><div>
                          <Input placeholder="Your full name" {...field} value={field.value ?? ''} />
                        </div></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <Input value={user?.email ?? 'N/A'} readOnly disabled className="bg-muted/50" />
                    <FormDescription>Your email address cannot be changed here.</FormDescription>
                  </FormItem>

                  <FormField
                    control={form.control}
                    name="subscriptionStatus"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Subscription Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value ?? undefined}>
                          <FormControl><div>
                            <SelectTrigger>
                              <SelectValue placeholder="Select your subscription status" />
                            </SelectTrigger>
                          </div></FormControl>
                          <SelectContent>
                            {subscriptionStatuses.map(status => (
                              <SelectItem key={status.value} value={status.value}>
                                {status.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </AccordionContent>
              </AccordionItem>
             
               {/* Medical Info & Physical Limitations and Exercise Preferences accordions were removed */}
               {/* Adding them back for completeness as per user's current file state */}
               <AccordionItem value="medical-physical">
                <AccordionTrigger className="text-xl font-semibold">Medical Info & Physical Limitations</AccordionTrigger>
                <AccordionContent className="space-y-6 pt-4 px-1">
                  <FormField
                    control={form.control}
                    name="painMobilityIssues"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pain/Mobility Issues (Optional)</FormLabel>
                        <FormControl><div>
                          <Textarea 
                            placeholder="Describe any pain or mobility issues, e.g., knee pain, limited shoulder range" 
                            {...field} 
                            value={field.value ?? ''} 
                            className="h-20"
                          /></div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {renderCommaSeparatedInput("injuries", "Injuries (comma-separated, Optional)", "e.g., ACL tear, Rotator cuff")}
                  {renderCommaSeparatedInput("surgeries", "Surgeries (comma-separated, Optional)", "e.g., Knee replacement, Appendix removal")}
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="exercise-preferences">
                <AccordionTrigger className="text-xl font-semibold">Exercise Preferences</AccordionTrigger>
                <AccordionContent className="space-y-6 pt-4 px-1">
                  {renderCommaSeparatedInput("exerciseGoals", "Exercise Goals (comma-separated, Optional)", "e.g., Weight loss, Muscle gain, Improve endurance")}
                  {renderCommaSeparatedInput("exercisePreferences", "Preferred Types of Exercise (comma-separated, Optional)", "e.g., Running, Weightlifting, Yoga")}
                  <FormField
                    control={form.control}
                    name="exerciseFrequency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Exercise Frequency (Optional)</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value ?? undefined}>
                          <FormControl><div><SelectTrigger><SelectValue placeholder="Select how often you exercise" /></SelectTrigger></div></FormControl>
                          <SelectContent>
                            {exerciseFrequencies.map(ef => (
                                <SelectItem key={ef.value} value={ef.value}>{ef.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                   <FormField
                    control={form.control}
                    name="exerciseIntensity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Typical Exercise Intensity (Optional)</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value ?? undefined}>
                          <FormControl><div><SelectTrigger><SelectValue placeholder="Select intensity" /></SelectTrigger></div></FormControl>
                          <SelectContent>
                            {exerciseIntensities.map(ei => (
                                <SelectItem key={ei.value} value={ei.value}>{ei.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {renderCommaSeparatedInput("equipmentAccess", "Equipment Access (comma-separated, Optional)", "e.g., Dumbbells, Resistance bands, Full gym")}
                </AccordionContent>
              </AccordionItem>
            </Accordion>


            <Button type="submit" className="w-full text-lg py-6" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Saving..." : "Save Profile"}
            </Button>
          </form>
        </Form>

        {/* Developer Section for Resetting Onboarding */}
        <Card className="mt-12 border-destructive/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center text-destructive">
              <AlertTriangle className="mr-2 h-5 w-5" /> Developer Tools
            </CardTitle>
            <CardDescription>
              Use these tools for testing purposes only.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="destructive"
              onClick={handleResetOnboarding}
              className="w-full"
            >
              <RefreshCcw className="mr-2 h-4 w-4" /> Reset Onboarding Status
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              This will set your onboarding status to incomplete, allowing you to go through the onboarding flow again. The page will reload.
            </p>
          </CardContent>
        </Card>

      </CardContent>
    </Card>
  );
}
