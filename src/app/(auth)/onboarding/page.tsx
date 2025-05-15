
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
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
import { useAuth } from "@/contexts/AuthContext";
import { Leaf } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { activityLevels, dietGoals, preferredDiets, mealsPerDayOptions } from "@/lib/constants";

const onboardingFormSchema = z.object({
  age: z.coerce.number().min(1, "Age is required").max(120),
  gender: z.enum(["male", "female", "other"], { required_error: "Gender is required." }),
  height: z.coerce.number().min(50, "Height must be at least 50cm").max(300),
  currentWeight: z.coerce.number().min(20, "Weight must be at least 20kg").max(500),
  goalWeight: z.coerce.number().min(20, "Weight must be at least 20kg").max(500),
  activityLevel: z.string({ required_error: "Activity level is required." }),
  dietGoal: z.string({ required_error: "Diet goal is required." }),
  preferredDiet: z.string().optional(),
  allergies: z.string().optional(),
  mealsPerDay: z.coerce.number().min(2).max(7),
});

type OnboardingFormValues = z.infer<typeof onboardingFormSchema>;

export default function OnboardingPage() {
  const { completeOnboarding, user } = useAuth();
  const { toast } = useToast();

  const form = useForm<OnboardingFormValues>({
    resolver: zodResolver(onboardingFormSchema),
    defaultValues: {
      age: undefined,
      gender: undefined,
      height: undefined,
      currentWeight: undefined,
      goalWeight: undefined,
      mealsPerDay: 3,
    },
  });

  function onSubmit(data: OnboardingFormValues) {
    // Here you would typically save the data to Firestore
    console.log("Onboarding data:", data);
    completeOnboarding();
    toast({
      title: "Profile Setup Complete!",
      description: "Welcome to NutriPlan, your personalized nutrition journey starts now.",
    });
  }

  if (!user) {
    // Or a loading state
    return <p>Loading user information...</p>;
  }

  return (
    <Card className="w-full max-w-2xl shadow-xl">
      <CardHeader className="text-center">
        <div className="flex justify-center items-center mb-4">
          <Leaf className="h-10 w-10 text-primary" />
        </div>
        <CardTitle className="text-2xl font-bold">Welcome to NutriPlan!</CardTitle>
        <CardDescription>Let&apos;s set up your initial profile. You can update this later.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="age"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Age</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="Your age" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gender</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select your gender" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="height"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Height (cm)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="Your height in cm" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="currentWeight"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Weight (kg)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="Your current weight in kg" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="goalWeight"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Goal Weight (kg)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="Your goal weight in kg" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="activityLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Activity Level</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select your activity level" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {activityLevels.map(level => <SelectItem key={level.value} value={level.value}>{level.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dietGoal"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Diet Goal</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select your diet goal" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {dietGoals.map(goal => <SelectItem key={goal.value} value={goal.value}>{goal.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="preferredDiet"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preferred Diet (Optional)</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="e.g., Vegetarian, Keto" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {preferredDiets.map(diet => <SelectItem key={diet.value} value={diet.value}>{diet.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="mealsPerDay"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Meals Per Day</FormLabel>
                     <Select onValueChange={(value) => field.onChange(Number(value))} defaultValue={String(field.value)}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select number of meals" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {mealsPerDayOptions.map(option => <SelectItem key={option.value} value={String(option.value)}>{option.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="allergies"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Allergies (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="List any allergies, comma-separated (e.g., peanuts, shellfish)"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    If you have any food allergies, please list them here.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full">Complete Setup</Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
