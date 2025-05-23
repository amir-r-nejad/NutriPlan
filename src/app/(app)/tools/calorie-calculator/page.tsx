
"use client";

import React, { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Calculator, AlertTriangle, Info } from "lucide-react";
import { activityLevels, genders } from "@/lib/constants";

const calorieCalculatorSchema = z.object({
  weight: z.coerce.number().positive({ message: "Weight must be greater than 0." }),
  height: z.coerce.number().positive({ message: "Height must be greater than 0." }),
  age: z.coerce.number().positive({ message: "Age must be greater than 0." }).int({ message: "Age must be a whole number." }),
  gender: z.enum(genders.map(g => g.value) as [string, ...string[]], { required_error: "Please select a gender." }),
  activityLevel: z.enum(activityLevels.map(al => al.value) as [string, ...string[]], { required_error: "Please select an activity level." }),
});

type CalorieCalculatorFormValues = z.infer<typeof calorieCalculatorSchema>;

interface CalculationResults {
  bmr: number;
  tdee: number;
}

export default function CalorieCalculatorPage() {
  const [results, setResults] = useState<CalculationResults | null>(null);

  const form = useForm<CalorieCalculatorFormValues>({
    resolver: zodResolver(calorieCalculatorSchema),
    defaultValues: {
      weight: undefined,
      height: undefined,
      age: undefined,
      gender: undefined,
      activityLevel: undefined,
    },
  });

  function onSubmit(data: CalorieCalculatorFormValues) {
    let bmr;
    if (data.gender === "male" || data.gender === "other") {
      bmr = 10 * data.weight + 6.25 * data.height - 5 * data.age + 5;
    } else { // female
      bmr = 10 * data.weight + 6.25 * data.height - 5 * data.age - 161;
    }

    const selectedActivityLevel = activityLevels.find(al => al.value === data.activityLevel);
    const activityFactor = selectedActivityLevel ? selectedActivityLevel.activityFactor : 1.2; // Default to sedentary

    const tdee = bmr * activityFactor;

    setResults({
      bmr: Math.round(bmr),
      tdee: Math.round(tdee),
    });
  }

  const handleReset = () => {
    form.reset({
        weight: undefined,
        height: undefined,
        age: undefined,
        gender: undefined,
        activityLevel: undefined,
    });
    setResults(null);
  }

  return (
    <div className="container mx-auto py-8">
      <Card className="max-w-2xl mx-auto shadow-xl">
        <CardHeader>
          <CardTitle className="text-3xl font-bold flex items-center">
            <Calculator className="mr-3 h-8 w-8 text-primary" />
            Daily Calorie Needs Calculator
          </CardTitle>
          <CardDescription>
            Estimate your daily calories burned using the Mifflin-St Jeor formula.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="weight"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Weight (kg)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="e.g., 70" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseFloat(e.target.value) || undefined)} />
                      </FormControl>
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
                        <Input type="number" placeholder="e.g., 175" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseFloat(e.target.value) || undefined)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="age"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Age (years)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="e.g., 30" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseFloat(e.target.value) || undefined)} />
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
                      <Select onValueChange={field.onChange} value={field.value ?? undefined}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select gender" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {genders.map((g) => (
                            <SelectItem key={g.value} value={g.value}>
                              {g.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="activityLevel"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Activity Level</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value ?? undefined}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select activity level" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {activityLevels.map((level) => (
                            <SelectItem key={level.value} value={level.value}>
                              {level.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="flex space-x-4">
                <Button type="submit" className="flex-1">
                  <Calculator className="mr-2 h-4 w-4" /> Calculate My Calories
                </Button>
                <Button type="button" variant="outline" onClick={handleReset} className="flex-1">
                  Reset Fields
                </Button>
              </div>
            </form>
          </Form>

          {results && (
            <Card className="mt-8 bg-muted/50">
              <CardHeader>
                <CardTitle className="text-2xl">Estimated Results</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-lg">
                <p><strong>Basal Metabolic Rate (BMR):</strong> {results.bmr} kcal/day</p>
                <p><strong>Total Daily Energy Expenditure (TDEE):</strong> {results.tdee} kcal/day</p>
              </CardContent>
            </Card>
          )}

          <Accordion type="single" collapsible className="w-full mt-8">
            <AccordionItem value="item-1">
              <AccordionTrigger className="text-base">
                <div className="flex items-center">
                  <Info className="mr-2 h-5 w-5 text-primary" /> How are these numbers calculated?
                </div>
              </AccordionTrigger>
              <AccordionContent className="text-sm space-y-3 pt-3">
                <p>We use the Mifflin-St Jeor Equation, a widely accepted method to estimate your <strong>Basal Metabolic Rate (BMR)</strong> — the number of calories your body needs at rest.</p>
                <div>
                  <h4 className="font-semibold">BMR formulas:</h4>
                  <ul className="list-disc pl-5 space-y-1 mt-1">
                    <li><strong>Male or Other:</strong> BMR = 10 × weight (kg) + 6.25 × height (cm) – 5 × age (years) + 5</li>
                    <li><strong>Female:</strong> BMR = 10 × weight (kg) + 6.25 × height (cm) – 5 × age (years) – 161</li>
                  </ul>
                </div>
                <div>
                  <p>We then calculate your <strong>Total Daily Energy Expenditure (TDEE)</strong> by multiplying BMR with your <strong>activity level factor</strong>:</p>
                  <ul className="list-disc pl-5 space-y-1 mt-1">
                    {activityLevels.map(level => (
                         <li key={level.value}><strong>{level.label.split('(')[0].trim()}:</strong> {level.activityFactor}</li>
                    ))}
                  </ul>
                </div>
                <p className="mt-2">This helps you understand how many calories you burn each day based on your body and lifestyle.</p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}

