
"use client";

import React, { useState } from "react";
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
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from "@/components/ui/table";
import { Calculator, RefreshCw } from "lucide-react";

const macroCalculatorSchema = z.object({
  weight_kg: z.coerce.number().positive({ message: "Weight must be greater than 0." }),
  protein_per_kg: z.coerce.number().positive({ message: "Protein per kg must be greater than 0." }),
  target_calories: z.coerce.number().positive({ message: "Target calories must be greater than 0." }),
  percent_carb: z.coerce.number().min(0, "Carb percentage must be at least 0.").max(100, "Carb percentage cannot exceed 100."),
});

type MacroCalculatorFormValues = z.infer<typeof macroCalculatorSchema>;

interface MacroResults {
  Protein_g: number;
  Carbs_g: number;
  Fat_g: number;
  Protein_cals: number;
  Carb_cals: number;
  Fat_cals: number;
  Total_cals: number;
  Protein_pct: number;
  Carb_pct: number;
  Fat_pct: number;
}

function calculateMacros(
  weight_kg: number,
  protein_per_kg: number,
  target_calories: number,
  percent_carb_slider_value: number // e.g., 60 for 60%
): MacroResults {
  const CAL_PER_GRAM_PROTEIN = 4;
  const CAL_PER_GRAM_CARB = 4;
  const CAL_PER_GRAM_FAT = 9;

  const percent_carb_decimal = percent_carb_slider_value / 100;

  let protein_grams = weight_kg * protein_per_kg;
  let protein_cals = protein_grams * CAL_PER_GRAM_PROTEIN;

  let remaining_cals_for_carbs_fat = target_calories - protein_cals;
  
  // If protein calories alone exceed target, cap protein and set others to 0
  if (remaining_cals_for_carbs_fat < 0) {
    protein_cals = target_calories;
    protein_grams = protein_cals / CAL_PER_GRAM_PROTEIN;
    remaining_cals_for_carbs_fat = 0;
  }

  const carb_cals = remaining_cals_for_carbs_fat * percent_carb_decimal;
  const percent_fat_decimal = 1 - percent_carb_decimal;
  const fat_cals = remaining_cals_for_carbs_fat * percent_fat_decimal;

  const carb_grams = carb_cals / CAL_PER_GRAM_CARB;
  const fat_grams = fat_cals / CAL_PER_GRAM_FAT;
  
  // Ensure individual macros are not negative after all calculations
  const final_protein_grams = Math.max(0, protein_grams);
  const final_carb_grams = Math.max(0, carb_grams);
  const final_fat_grams = Math.max(0, fat_grams);

  const final_protein_cals = final_protein_grams * CAL_PER_GRAM_PROTEIN;
  const final_carb_cals = final_carb_grams * CAL_PER_GRAM_CARB;
  const final_fat_cals = final_fat_grams * CAL_PER_GRAM_FAT;

  const total_cals_calculated = final_protein_cals + final_carb_cals + final_fat_cals;
  
  const protein_pct = target_calories > 0 ? Math.round((final_protein_cals / target_calories) * 100) : 0;
  const carb_pct = target_calories > 0 ? Math.round((final_carb_cals / target_calories) * 100) : 0;
  // Adjust fat_pct to make sum 100% with the already rounded protein and carb percentages
  let fat_pct_calculated = target_calories > 0 ? Math.round((final_fat_cals / target_calories) * 100) : 0;
  
  if (target_calories > 0) {
    const current_sum_pct = protein_pct + carb_pct + fat_pct_calculated;
    if (current_sum_pct !== 100 && current_sum_pct > 0) { // avoid adjusting if all are zero
        fat_pct_calculated = 100 - protein_pct - carb_pct;
    }
  }


  return {
    Protein_g: Math.round(final_protein_grams),
    Carbs_g: Math.round(final_carb_grams),
    Fat_g: Math.round(final_fat_grams),
    Protein_cals: Math.round(final_protein_cals),
    Carb_cals: Math.round(final_carb_cals),
    Fat_cals: Math.round(final_fat_cals),
    Total_cals: Math.round(total_cals_calculated),
    Protein_pct: protein_pct,
    Carb_pct: carb_pct,
    Fat_pct: Math.max(0, fat_pct_calculated), // Ensure fat_pct is not negative after adjustment
  };
}

export default function MacroCalculatorPage() {
  const [results, setResults] = useState<MacroResults | null>(null);

  const form = useForm<MacroCalculatorFormValues>({
    resolver: zodResolver(macroCalculatorSchema),
    defaultValues: {
      weight_kg: undefined, // Or some sensible default like 70
      protein_per_kg: 1.5,
      target_calories: 2000,
      percent_carb: 60,
    },
  });

  const watchedPercentCarb = form.watch("percent_carb");

  function onSubmit(data: MacroCalculatorFormValues) {
    const calculated = calculateMacros(
      data.weight_kg,
      data.protein_per_kg,
      data.target_calories,
      data.percent_carb
    );
    setResults(calculated);
  }

  const handleReset = () => {
    form.reset({
        weight_kg: undefined,
        protein_per_kg: 1.5,
        target_calories: 2000,
        percent_carb: 60,
    });
    setResults(null);
  }

  return (
    <div className="container mx-auto py-8">
      <Card className="max-w-2xl mx-auto shadow-xl">
        <CardHeader>
          <CardTitle className="text-3xl font-bold flex items-center"><Calculator className="mr-2 h-7 w-7 text-primary"/>Macro Calculator</CardTitle>
          <CardDescription>
            Enter your details to calculate your estimated daily macronutrient breakdown.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="weight_kg"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Your Weight (kg)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="e.g., 70" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || undefined)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="protein_per_kg"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Protein per kg of body weight</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.1" placeholder="e.g., 1.5" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || undefined)} />
                      </FormControl>
                      <FormDescription>E.g., 1.2–2.2 g/kg</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="target_calories"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target Daily Calorie Intake</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="e.g., 2000" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || undefined)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="percent_carb"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>% of Remaining Calories from Carbs</FormLabel>
                      <FormControl>
                        <Slider
                          defaultValue={[field.value || 60]}
                          value={[field.value || 0]}
                          max={100}
                          step={1}
                          onValueChange={(value) => field.onChange(value[0])}
                          className="my-2"
                        />
                      </FormControl>
                      <div className="flex justify-between text-sm text-muted-foreground mt-1">
                         <span>Carbs: {watchedPercentCarb !== undefined ? watchedPercentCarb.toFixed(0) : 0}%</span>
                         <span>Fat: {watchedPercentCarb !== undefined ? (100 - watchedPercentCarb).toFixed(0) : 100}%</span>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="flex space-x-4">
                <Button type="submit" className="w-full">
                  <Calculator className="mr-2 h-4 w-4" /> Calculate Macros
                </Button>
                 <Button type="button" variant="outline" onClick={handleReset} className="w-full">
                    <RefreshCw className="mr-2 h-4 w-4" /> Reset
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {results && (
        <Card className="max-w-2xl mx-auto mt-8 shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Your Macronutrient Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Macronutrient</TableHead>
                  <TableHead className="text-right">Intake (g)</TableHead>
                  <TableHead className="text-right">Calories (kcal)</TableHead>
                  <TableHead className="text-right">% of Total Calories</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">Protein</TableCell>
                  <TableCell className="text-right">{results.Protein_g}</TableCell>
                  <TableCell className="text-right">{results.Protein_cals}</TableCell>
                  <TableCell className="text-right">{results.Protein_pct}%</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Carbohydrates</TableCell>
                  <TableCell className="text-right">{results.Carbs_g}</TableCell>
                  <TableCell className="text-right">{results.Carb_cals}</TableCell>
                  <TableCell className="text-right">{results.Carb_pct}%</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Fat</TableCell>
                  <TableCell className="text-right">{results.Fat_g}</TableCell>
                  <TableCell className="text-right">{results.Fat_cals}</TableCell>
                  <TableCell className="text-right">{results.Fat_pct}%</TableCell>
                </TableRow>
              </TableBody>
              <TableCaption className="text-lg font-semibold">
                Total Estimated Calories: {results.Total_cals} kcal 
                (Target: {form.getValues("target_calories")} kcal, 
                Sum of %: {(results.Protein_pct + results.Carb_pct + results.Fat_pct).toFixed(0)}%)
              </TableCaption>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

    