
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
import { ProfileFormSchema, type ProfileFormValues as FullProfileType, type ProfileFormValues } from "@/lib/schemas"; // Use FullProfileType for localStorage
import { useAuth } from "@/contexts/AuthContext"; 
import { useToast } from "@/hooks/use-toast";
import React, { useEffect, useState } from "react";
import { subscriptionStatuses } from "@/lib/constants";
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/clientApp';


async function getProfileData(userId: string): Promise<Partial<ProfileFormValues>> {
  console.log("Fetching profile for user:", userId);
  if (!userId) return {};
  try {
    const userProfileRef = doc(db, "users", userId);
    const docSnap = await getDoc(userProfileRef);
    if (docSnap.exists()) {
      const fullProfile = docSnap.data() as FullProfileType;
      // Extract only the fields relevant to this simplified profile form
      return {
        name: fullProfile.name,
        subscriptionStatus: fullProfile.subscriptionStatus,
        // Fields for 'Pain/Mobility & Physical Limitations'
        painMobilityIssues: fullProfile.painMobilityIssues,
        injuries: fullProfile.injuries || [], // ensure array if undefined
        surgeries: fullProfile.surgeries || [], // ensure array if undefined
        // Fields for 'Exercise Preferences'
        exerciseGoals: fullProfile.exerciseGoals || [],
        exercisePreferences: fullProfile.exercisePreferences || [],
        exerciseFrequency: fullProfile.exerciseFrequency,
        exerciseIntensity: fullProfile.exerciseIntensity,
        equipmentAccess: fullProfile.equipmentAccess || [],
      };
    }
  } catch (error) {
    console.error("Error fetching profile from Firestore:", error);
  }
  return {}; // Return minimal defaults if not found or error
}

async function saveProfileData(userId: string, data: ProfileFormValues) {
  console.log("Saving profile for user:", userId, data);
  if (!userId) throw new Error("User ID is required to save profile data.");
  
  try {
    const userProfileRef = doc(db, "users", userId);
    // Fetch existing full profile to merge with
    const docSnap = await getDoc(userProfileRef);
    let existingProfile: FullProfileType = docSnap.exists() ? (docSnap.data() as FullProfileType) : {};

    // Merge new data into existing profile
    const updatedFullProfile: FullProfileType = {
      ...existingProfile,
      ...data, // data contains only fields from this form
    };
    
    await setDoc(userProfileRef, updatedFullProfile, { merge: true }); // Use merge: true to only update specified fields
    return { success: true };
  } catch (error) {
     console.error("Error saving profile to Firestore:", error);
     throw error; // Propagate error
  }
}


export default function ProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(ProfileFormSchema),
    defaultValues: {
      name: "",
      subscriptionStatus: undefined,
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
    if (user?.uid) { // Changed from user.id to user.uid
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
    if (!user?.uid) { // Changed from user.id to user.uid
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
        // Ensure field.value is always an array for .join, then handle input as string
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
                        <FormControl>
                          <Input placeholder="Your full name" {...field} value={field.value ?? ''} />
                        </FormControl>
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
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select your subscription status" />
                            </SelectTrigger>
                          </FormControl>
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

              <AccordionItem value="medical-physical">
                <AccordionTrigger className="text-xl font-semibold">Medical Info & Physical Limitations</AccordionTrigger>
                <AccordionContent className="space-y-6 pt-4 px-1">
                  <FormField
                    control={form.control}
                    name="painMobilityIssues"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pain/Mobility Issues (Optional)</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Describe any pain or mobility issues, e.g., knee pain, limited shoulder range" 
                            {...field} 
                            value={field.value ?? ''} 
                            className="h-20"
                          />
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
                          <FormControl>
                            <SelectTrigger><SelectValue placeholder="Select how often you exercise" /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="1-2_days">1-2 days/week</SelectItem>
                            <SelectItem value="3-4_days">3-4 days/week</SelectItem>
                            <SelectItem value="5-6_days">5-6 days/week</SelectItem>
                            <SelectItem value="daily">Daily</SelectItem>
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
                          <FormControl>
                            <SelectTrigger><SelectValue placeholder="Select intensity" /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="light">Light</SelectItem>
                            <SelectItem value="moderate">Moderate</SelectItem>
                            <SelectItem value="vigorous">Vigorous</SelectItem>
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
      </CardContent>
    </Card>
  );
}
