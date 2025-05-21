
"use client";

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import { Pencil, PlusCircle, Trash2 } from 'lucide-react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { daysOfWeek, mealNames } from '@/lib/constants';
import type { Meal, DailyMealPlan, WeeklyMealPlan, Ingredient } from '@/lib/schemas';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';


// Mock data for current meal plan
const initialWeeklyPlan: WeeklyMealPlan = {
  days: daysOfWeek.map(day => ({
    dayOfWeek: day,
    meals: mealNames.map(mealName => {
      let customName = "";
      let ingredients: Ingredient[] = [];
      let totalCalories = 0;
      let totalProtein = 0;
      let totalCarbs = 0;
      let totalFat = 0;

      if (day === "Monday") {
        if (mealName === "Lunch") {
          customName = "Chicken Salad";
          ingredients = [
            { name: "Chicken Breast", quantity: 100, unit: "g", calories: 165, protein: 31, carbs: 0, fat: 3.6 },
            { name: "Lettuce", quantity: 50, unit: "g", calories: 7, protein: 0.5, carbs: 1.5, fat: 0.1 },
            { name: "Tomato", quantity: 30, unit: "g", calories: 5, protein: 0.2, carbs: 1.2, fat: 0.1 },
          ];
          totalCalories = 177;
          totalProtein = 31.7;
          totalCarbs = 2.7;
          totalFat = 3.8;
        } else if (mealName === "Afternoon Snack") {
            customName = "Apple Slices with Peanut Butter";
            ingredients = [ 
                { name: "Apple", quantity: 1, unit: "medium", calories: 95, protein: 0.5, carbs: 25, fat: 0.3 },
                { name: "Peanut Butter", quantity: 32, unit: "g", calories: 190, protein: 8, carbs: 7, fat: 16 }
            ];
            totalCalories = 285; totalProtein = 8.5; totalCarbs = 32; totalFat = 16.3;
        } else if (mealName === "Dinner") {
            customName = "Salmon & Asparagus";
            ingredients = [
                { name: "Salmon Fillet", quantity: 150, unit: "g", calories: 312, protein: 30, carbs: 0, fat: 20.4 },
                { name: "Asparagus", quantity: 100, unit: "g", calories: 20, protein: 2.2, carbs: 3.9, fat: 0.1 },
                { name: "Olive Oil", quantity: 5, unit: "ml", calories: 40, protein: 0, carbs: 0, fat: 4.5 },
            ];
            totalCalories = 372; totalProtein = 32.2; totalCarbs = 3.9; totalFat = 24.9;
        } else if (mealName === "Evening Snack") {
            customName = "Greek Yogurt with Berries";
            ingredients = [ 
                { name: "Greek Yogurt", quantity: 150, unit: "g", calories: 150, protein: 15, carbs: 6, fat: 8 },
                { name: "Mixed Berries", quantity: 50, unit: "g", calories: 25, protein: 0.5, carbs: 6, fat: 0.2 },
            ];
            totalCalories = 175; totalProtein = 15.5; totalCarbs = 12; totalFat = 8.2;
        }
      }

      return {
        name: mealName,
        customName,
        ingredients,
        totalCalories,
        totalProtein,
        totalCarbs,
        totalFat,
      };
    }),
  })),
};


export default function CurrentMealPlanPage() {
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyMealPlan>(initialWeeklyPlan);
  const [editingMeal, setEditingMeal] = useState<{dayIndex: number, mealIndex: number, meal: Meal} | null>(null);

  const handleEditMeal = (dayIndex: number, mealIndex: number) => {
    setEditingMeal({dayIndex, mealIndex, meal: {...weeklyPlan.days[dayIndex].meals[mealIndex]}});
  };

  const handleSaveMeal = (updatedMeal: Meal) => {
    if (!editingMeal) return;
    const newWeeklyPlan = {...weeklyPlan};
    newWeeklyPlan.days[editingMeal.dayIndex].meals[editingMeal.mealIndex] = updatedMeal;
    setWeeklyPlan(newWeeklyPlan);
    setEditingMeal(null);
  };

  // TODO: Implement add/remove ingredient, calculate totals in EditMealDialog

  return (
    <div className="container mx-auto py-8">
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-3xl font-bold">Your Current Weekly Meal Plan</CardTitle>
          <CardDescription>View and manage your meals for the week. Click on a meal to edit.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue={daysOfWeek[0]} className="w-full">
            <ScrollArea className="w-full whitespace-nowrap rounded-md">
              <TabsList className="inline-flex h-auto">
                {daysOfWeek.map(day => (
                  <TabsTrigger key={day} value={day} className="px-4 py-2 text-base">{day}</TabsTrigger>
                ))}
              </TabsList>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
            
            {weeklyPlan.days.map((dayPlan, dayIndex) => (
              <TabsContent key={dayPlan.dayOfWeek} value={dayPlan.dayOfWeek} className="mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {dayPlan.meals.map((meal, mealIndex) => (
                    <Card key={`${dayPlan.dayOfWeek}-${meal.name}-${mealIndex}`} className="flex flex-col">
                      <CardHeader>
                        <CardTitle className="text-xl">{meal.name}</CardTitle>
                        {meal.customName && <CardDescription>{meal.customName}</CardDescription>}
                      </CardHeader>
                      <CardContent className="flex-grow">
                        {meal.ingredients.length > 0 ? (
                          <ul className="space-y-1 text-sm text-muted-foreground">
                            {meal.ingredients.map((ing, ingIndex) => (
                              <li key={ingIndex}>{ing.name} - {ing.quantity}{ing.unit}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm text-muted-foreground italic">No ingredients added yet.</p>
                        )}
                        <div className="mt-2 text-xs space-y-0.5">
                            <p>Calories: {meal.totalCalories?.toFixed(0) ?? 'N/A'}</p>
                            <p>Protein: {meal.totalProtein?.toFixed(1) ?? 'N/A'}g</p>
                        </div>
                      </CardContent>
                      <div className="p-4 border-t">
                        <Button variant="outline" size="sm" onClick={() => handleEditMeal(dayIndex, mealIndex)}>
                          <Pencil className="mr-2 h-4 w-4" /> Edit Meal
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {editingMeal && (
        <EditMealDialog
          meal={editingMeal.meal}
          onSave={handleSaveMeal}
          onClose={() => setEditingMeal(null)}
        />
      )}
    </div>
  );
}


interface EditMealDialogProps {
  meal: Meal;
  onSave: (updatedMeal: Meal) => void;
  onClose: () => void;
}

function EditMealDialog({ meal: initialMeal, onSave, onClose }: EditMealDialogProps) {
  const [meal, setMeal] = useState<Meal>({...initialMeal});

  const handleIngredientChange = (index: number, field: keyof Meal['ingredients'][0], value: string | number) => {
    const newIngredients = [...meal.ingredients];
    (newIngredients[index] as any)[field] = field === 'quantity' || field === 'calories' || field === 'protein' || field === 'carbs' || field === 'fat' ? Number(value) : value;
    setMeal(prev => ({ ...prev, ingredients: newIngredients }));
  };

  const addIngredient = () => {
    setMeal(prev => ({
      ...prev,
      ingredients: [...prev.ingredients, { name: '', quantity: 0, unit: 'g' }]
    }));
  };
  
  const removeIngredient = (index: number) => {
    setMeal(prev => ({
      ...prev,
      ingredients: prev.ingredients.filter((_, i) => i !== index)
    }));
  };

  const calculateTotals = () => {
    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;

    meal.ingredients.forEach(ing => {
        // Assuming macros are per 100g and quantity is in g
        // This part needs robust logic based on how macros are defined (per 100g, per unit, etc.)
        // For now, a simplified placeholder if ingredient has direct macros
        if (ing.calories && ing.quantity && ing.unit?.toLowerCase() === 'g') { // Basic check for 'g'
            totalCalories += (ing.calories / 100) * ing.quantity;
            if(ing.protein) totalProtein += (ing.protein / 100) * ing.quantity;
            if(ing.carbs) totalCarbs += (ing.carbs / 100) * ing.quantity;
            if(ing.fat) totalFat += (ing.fat / 100) * ing.quantity;
        } else if (ing.calories && ing.quantity) { // Fallback for non-gram units, assumes calories are per unit
            totalCalories += ing.calories * ing.quantity;
            if(ing.protein) totalProtein += ing.protein * ing.quantity;
            if(ing.carbs) totalCarbs += ing.carbs * ing.quantity;
            if(ing.fat) totalFat += ing.fat * ing.quantity;
        }
    });
    setMeal(prev => ({...prev, totalCalories, totalProtein, totalCarbs, totalFat}));
  }

  // Recalculate on ingredient change
  // useEffect(calculateTotals, [meal.ingredients]);


  const handleSubmit = () => {
    calculateTotals(); // Ensure totals are up-to-date before saving
    onSave(meal);
  };


  return (
    <Dialog open={true} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit {initialMeal.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
          <div>
            <Label htmlFor="customMealName">Meal Name (e.g., Chicken Salad)</Label>
            <Input 
              id="customMealName" 
              value={meal.customName || ''} 
              onChange={(e) => setMeal({...meal, customName: e.target.value})}
              placeholder="Optional: e.g., Greek Yogurt with Berries"
            />
          </div>
          <Label>Ingredients</Label>
          {meal.ingredients.map((ing, index) => (
            <Card key={index} className="p-3 space-y-2">
              <div className="flex justify-between items-center">
                <Input 
                  placeholder="Ingredient Name" 
                  value={ing.name} 
                  onChange={(e) => handleIngredientChange(index, 'name', e.target.value)}
                  className="w-full"
                />
                <Button variant="ghost" size="sm" onClick={() => removeIngredient(index)} className="ml-2">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input 
                  type="number" 
                  placeholder="Qty" 
                  value={ing.quantity} 
                  onChange={(e) => handleIngredientChange(index, 'quantity', parseFloat(e.target.value))}
                />
                <Input 
                  placeholder="Unit (g, ml)" 
                  value={ing.unit} 
                  onChange={(e) => handleIngredientChange(index, 'unit', e.target.value)}
                />
              </div>
              {/* Optional: Add inputs for macros per ingredient if needed for manual entry */}
            </Card>
          ))}
          <Button variant="outline" onClick={addIngredient} className="w-full">
            <PlusCircle className="mr-2 h-4 w-4" /> Add Ingredient
          </Button>

          <div className="mt-4 p-3 border rounded-md bg-muted/50">
            <h4 className="font-semibold mb-1">Estimated Totals:</h4>
            <p className="text-sm">Calories: {meal.totalCalories?.toFixed(0) ?? 'N/A'}</p>
            <p className="text-sm">Protein: {meal.totalProtein?.toFixed(1) ?? 'N/A'}g</p>
            <p className="text-sm">Carbs: {meal.totalCarbs?.toFixed(1) ?? 'N/A'}g</p>
            <p className="text-sm">Fat: {meal.totalFat?.toFixed(1) ?? 'N/A'}g</p>
             <Button onClick={calculateTotals} size="sm" variant="ghost" className="mt-1 text-xs">Recalculate</Button>
          </div>

        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          </DialogClose>
          <Button type="button" onClick={handleSubmit}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

