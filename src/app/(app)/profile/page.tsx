
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
  FormDescription, // Added FormDescription
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
import { ProfileFormSchema, type ProfileFormValues } from "@/lib/schemas";
import { useAuth } from "@/contexts/AuthContext"; 
import { useToast } from "@/hooks/use-toast";
import React, { useEffect, useState } from "react";
import { subscriptionStatuses } from "@/lib/constants";

// This type represents the full profile data structure potentially stored in localStorage
// It's kept broader here to represent what *might* be in localStorage from other tools
interface FullProfileData {
  name?: string;
  subscriptionStatus?: string;
  // Fields previously managed by profile page, now managed elsewhere (e.g., Smart Planner or Onboarding)
  // but might still exist in the full localStorage object.
  age?: number;
  gender?: string;
  height?: number;
  currentWeight?: number;
  goalWeight1Month?: number;
  goalWeightIdeal?: number;
  activityLevel?: string;
  dietGoal?: string;
  mealsPerDay?: number;
  preferredDiet?: string;
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
  bf_current?: number;
  bf_target?: number;
  bf_ideal?: number;
  mm_current?: number;
  mm_target?: number;
  mm_ideal?: number;
  bw_current?: number;
  bw_target?: number;
  bw_ideal?: number;
  waist_current?: number;
  waist_goal_1m?: number;
  waist_ideal?: number;
  hips_current?: number;
  hips_goal_1m?: number;
  hips_ideal?: number;
  right_leg_current?: number;
  right_leg_goal_1m?: number;
  right_leg_ideal?: number;
  left_leg_current?: number;
  left_leg_goal_1m?: number;
  left_leg_ideal?: number;
  right_arm_current?: number;
  right_arm_goal_1m?: number;
  right_arm_ideal?: number;
  left_arm_current?: number;
  left_arm_goal_1m?: number;
  left_arm_ideal?: number;
}


async function getProfileData(userId: string): Promise<Partial<ProfileFormValues>> {
  console.log("Fetching profile for user:", userId);
  await new Promise(resolve => setTimeout(resolve, 500));
  const storedProfile = localStorage.getItem(`nutriplan_profile_${userId}`);
  if (storedProfile) {
    try {
      const parsedProfile = JSON.parse(storedProfile) as FullProfileData; 
      
      // Only extract data relevant to this simplified profile form
      return {
        name: parsedProfile.name,
        subscriptionStatus: parsedProfile.subscriptionStatus,
      };
    } catch (error) {
      console.error("Error parsing stored profile data:", error);
    }
  }
  return {
    name: "",
    subscriptionStatus: undefined,
  };
}

async function saveProfileData(userId: string, data: ProfileFormValues) {
  console.log("Saving simplified profile for user:", userId, data);
  
  const storedProfile = localStorage.getItem(`nutriplan_profile_${userId}`);
  let fullProfile: FullProfileData = {};
  if (storedProfile) {
    try {
      fullProfile = JSON.parse(storedProfile);
    } catch (error) {
      console.error("Error parsing existing profile data for saving:", error);
      // Decide if you want to proceed with a blank fullProfile or throw error
    }
  }

  // Merge only the fields managed by this form into the full profile
  const updatedFullProfile: FullProfileData = {
    ...fullProfile, 
    name: data.name,
    subscriptionStatus: data.subscriptionStatus,
  };
  
  // Since array fields are removed from this form, no need to convert them here.
  // If other parts of the app save array fields as comma-separated strings,
  // they should handle that conversion themselves.
  
  localStorage.setItem(`nutriplan_profile_${userId}`, JSON.stringify(updatedFullProfile));
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
      name: "",
      subscriptionStatus: undefined,
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
    } else {
        setIsLoading(false); // No user, no data to load
    }
  }, [user, form, toast]);

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
  
  if (isLoading && user) { // Only show loading if user exists and we expect to load data
    return <div className="flex justify-center items-center h-full"><p>Loading profile...</p></div>;
  }

  return (
    <Card className="max-w-xl mx-auto shadow-lg">
      <CardHeader>
        <CardTitle className="text-3xl font-bold">Your Account</CardTitle>
        <CardDescription>Manage your basic account information. Other details like physical metrics and dietary preferences are managed in specialized tools.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            
            <div className="space-y-6">
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
            </div>

            <Button type="submit" className="w-full text-lg py-6" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Saving..." : "Save Account Information"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
