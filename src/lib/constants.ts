
export const activityLevels = [
  { value: "sedentary", label: "Sedentary (little or no exercise)", activityFactor: 1.2, proteinFactorPerKg: 0.8 },
  { value: "light", label: "Lightly active (light exercise/sports 1-3 days/week)", activityFactor: 1.375, proteinFactorPerKg: 1.2 },
  { value: "moderate", label: "Moderately active (moderate exercise/sports 3-5 days/week)", activityFactor: 1.55, proteinFactorPerKg: 1.6 },
  { value: "active", label: "Very active (hard exercise/sports 6-7 days a week)", activityFactor: 1.725, proteinFactorPerKg: 2.0 },
  { value: "extra_active", label: "Super active (physical job or intense training)", activityFactor: 1.9, proteinFactorPerKg: 2.2 },
];

export const dietGoals = [
  { value: "lose_weight", label: "Lose Weight" },
  { value: "maintain_weight", label: "Maintain Weight" },
  { value: "gain_weight", label: "Gain Weight (Muscle)" },
];

export const smartPlannerDietGoals = [
  { value: "fat_loss", label: "Fat loss" },
  { value: "muscle_gain", label: "Muscle gain" },
  { value: "recomp", label: "Muscle gain and fat loss (Recomposition)" },
];

export const preferredDiets = [
  { value: "none", label: "None (Balanced)" },
  { value: "vegetarian", label: "Vegetarian" },
  { value: "vegan", label: "Vegan" },
  { value: "keto", label: "Ketogenic" },
  { value: "paleo", label: "Paleo" },
  { value: "mediterranean", label: "Mediterranean" },
  { value: "low_carb", label: "Low Carb" },
  { value: "low_fat", label: "Low Fat" },
  { value: "high_protein", label: "High Protein" },
];

export const mealsPerDayOptions = [
  { value: 2, label: "2 meals per day" },
  { value: 3, label: "3 meals per day" },
  { value: 4, label: "4 meals per day" },
  { value: 5, label: "5 meals per day" },
  { value: 6, label: "6 meals per day" },
  { value: 7, label: "7 meals per day" },
];

export const genders = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
];

export const exerciseFrequencies = [
  { value: "1-2_days", label: "1-2 days/week" },
  { value: "3-4_days", label: "3-4 days/week" },
  { value: "5-6_days", label: "5-6 days/week" },
  { value: "daily", label: "Daily" },
];

export const exerciseIntensities = [
  { value: "light", label: "Light" },
  { value: "moderate", label: "Moderate" },
  { value: "vigorous", label: "Vigorous" },
];

export const firebaseConfig = {
  apiKey: "AIzaSyBn52hl8ARjilr2TBAOKGHbAw6G3-CvGgw",
  authDomain: "nutriplan-7wkxu.firebaseapp.com",
  projectId: "nutriplan-7wkxu",
  storageBucket: "nutriplan-7wkxu.firebasestorage.app",
  messagingSenderId: "631126099554",
  appId: "1:631126099554:web:45488015d6fda0f149f33b"
};

export const subscriptionStatuses = [
  { value: "free", label: "Free Tier" },
  { value: "premium", label: "Premium Monthly" },
  { value: "premium_annual", label: "Premium Annual" },
  { value: "trial", label: "Trial Period" },
  { value: "trial_ended", label: "Trial Ended" },
];

export const mealNames = [
  "Breakfast",
  "Morning Snack",
  "Lunch",
  "Afternoon Snack",
  "Dinner",
  "Evening Snack",
];

export const daysOfWeek = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export const defaultMacroPercentages: { [key: string]: { calories_pct: number; protein_pct: number; carbs_pct: number; fat_pct: number } } = {
  "Breakfast": { calories_pct: 22.5, protein_pct: 21.4, carbs_pct: 25, fat_pct: 21.7 },
  "Morning Snack": { calories_pct: 10, protein_pct: 10.7, carbs_pct: 10, fat_pct: 10.6 },
  "Lunch": { calories_pct: 22.5, protein_pct: 21.4, carbs_pct: 25, fat_pct: 21.7 },
  "Afternoon Snack": { calories_pct: 10, protein_pct: 10.7, carbs_pct: 10, fat_pct: 10.6 },
  "Dinner": { calories_pct: 20, protein_pct: 21.4, carbs_pct: 20, fat_pct: 18.7 },
  "Evening Snack": { calories_pct: 15, protein_pct: 14.4, carbs_pct: 10, fat_pct: 16.7 },
};
