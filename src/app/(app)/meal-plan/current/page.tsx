
"use client";

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import { Pencil, PlusCircle, Trash2 } from 'lucide-react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { daysOfWeek, mealNames } from '@/lib/constants';
import type { Meal, DailyMealPlan, WeeklyMealPlan } from '@/lib/schemas';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';


// Mock data for current meal plan
const initialWeeklyPlan: WeeklyMealPlan = {
  days: daysOfWeek.map(day => ({
    dayOfWeek: day,
    meals: mealNames.map(mealName => ({
      name: mealName,
      customName: mealName === "Lunch" && day === "Monday" ? "Chicken Salad" : "",
      ingredients: mealName === "Lunch" && day === "Monday" ? [
        { name: "Chicken Breast", quantity: 100, unit: "g", calories: 165, protein: 31, carbs: 0, fat: 3.6 },
        { name: "Lettuce", quantity: 50, unit: "g", calories: 7, protein: 0.5, carbs: 1.5, fat: 0.1 },
        { name: "Tomato", quantity: 30, unit: "g", calories: 5, protein: 0.2, carbs: 1.2, fat: 0.1 },
      ] : [],
      totalCalories: mealName === "Lunch" && day === "Monday" ? 177 : 0,
      totalProtein: mealName === "Lunch" && day === "Monday" ? 31.7 : 0,
      totalCarbs: mealName === "Lunch" && day === "Monday" ? 2.7 : 0,
      totalFat: mealName === "Lunch" && day === "Monday" ? 3.8 : 0,
    })),
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
        if (ing.calories && ing.quantity) totalCalories += (ing.calories / 100) * ing.quantity;
        if (ing.protein && ing.quantity) totalProtein += (ing.protein / 100) * ing.quantity;
        if (ing.carbs && ing.quantity) totalCarbs += (ing.carbs / 100) * ing.quantity;
        if (ing.fat && ing.quantity) totalFat += (ing.fat / 100) * ing.quantity;
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

