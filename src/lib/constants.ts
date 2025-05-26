
export const activityLevels = [
  { value: "sedentary", label: "Sedentary (little or no exercise)", activityFactor: 1.2, proteinFactorPerKg: 0.8 },
  { value: "light", label: "Lightly active (light exercise/sports 1-3 days/week)", activityFactor: 1.375, proteinFactorPerKg: 1.2 },
  { value: "moderate", label: "Moderately active (moderate exercise/sports 3-5 days/week)", activityFactor: 1.55, proteinFactorPerKg: 1.6 },
  { value: "active", label: "Very active (hard exercise/sports 6-7 days a week)", activityFactor: 1.725, proteinFactorPerKg: 2.0 },
  { value: "extra_active", label: "Super active (physical job or intense training)", activityFactor: 1.9, proteinFactorPerKg: 2.2 },
];

export const dietGoals = [ // Used in old onboarding, kept for reference if needed elsewhere, but new onboarding uses smartPlannerDietGoals contextually
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


export const onboardingStepsData = [
  {
    stepNumber: 1,
    title: "Welcome to NutriPlan!",
    explanation: "Let’s personalize your nutrition journey. We’ll ask a few questions about your health and preferences to generate your ideal meal plan. It only takes 3–5 minutes.",
    tooltipText: "We’ll ask a few questions to personalize your nutrition plan. It only takes 3–5 minutes.",
    fieldsToValidate: [],
  },
  {
    stepNumber: 2,
    title: "Basic Profile Setup",
    explanation: "This helps us calculate your calorie needs and goals. We use your age, sex, height, weight, and activity level to estimate your Basal Metabolic Rate (BMR) and Total Daily Energy Expenditure (TDEE) — the foundation of your meal plan.",
    tooltipText: "These details help us calculate your calorie needs based on your body and activity level.",
    fieldsToValidate: ["age", "gender", "height_cm", "current_weight", "goal_weight_1m", "activityLevel", "dietGoalOnboarding"],
  },
  {
    stepNumber: 3,
    title: "Body Composition (Optional)",
    explanation: "These numbers help us tailor the plan beyond just weight. Your body fat, muscle mass, and water levels help refine calorie and macro goals, especially if you're focused on body recomposition.",
    tooltipText: "Used to fine-tune your plan based on your muscle, fat, and water levels — not just weight.",
    fieldsToValidate: ["bf_current", "bf_target", "bf_ideal", "mm_current", "mm_target", "mm_ideal", "bw_current", "bw_target", "bw_ideal"],
    isOptional: true,
  },
  {
    stepNumber: 4,
    title: "Measurements (Optional)",
    explanation: "Track physical changes, not just weight. Waist, hips, and limb measurements give you visible ways to monitor progress beyond the scale — especially for fitness goals.",
    tooltipText: "Gives a more complete picture of your body changes and supports better progress tracking.",
    fieldsToValidate: ["waist_current", "waist_goal_1m", "waist_ideal", "hips_current", "hips_goal_1m", "hips_ideal", "right_leg_current", "right_leg_goal_1m", "right_leg_ideal", "left_leg_current", "left_leg_goal_1m", "left_leg_ideal", "right_arm_current", "right_arm_goal_1m", "right_arm_ideal", "left_arm_current", "left_arm_goal_1m", "left_arm_ideal"],
    isOptional: true,
  },
  {
    stepNumber: 5,
    title: "Dietary Preferences & Restrictions",
    explanation: "We personalize your meals to match your taste and lifestyle. By knowing your dietary style, allergies, and food preferences, the AI avoids what you dislike and suggests what you’ll enjoy and can eat safely.",
    tooltipText: "Let us know your diet style, allergies, and food likes/dislikes so we can build a plan you’ll enjoy.",
    fieldsToValidate: ["preferredDiet", "allergies", "preferredCuisines", "dispreferredCuisines", "preferredIngredients", "dispreferredIngredients", "mealsPerDay"],
  },
  {
    stepNumber: 6,
    title: "Medical Information (Optional)",
    explanation: "Used only to improve meal recommendations. If you have health conditions or take medications, this helps our AI avoid foods that may conflict and recommend supportive ingredients. Not for diagnosis or treatment.",
    tooltipText: "Used only to improve suggestions and avoid conflicts — we don’t diagnose or treat any conditions.",
    fieldsToValidate: ["medicalConditions", "medications"],
    isOptional: true,
  },
  {
    stepNumber: 7,
    title: "Smart Calculation & Macros",
    explanation: "We’ll generate your personal targets using your data. We estimate your daily calories and macronutrients to support your weight or health goals — whether it’s fat loss, muscle gain, or maintenance.",
    tooltipText: "Based on your inputs, we estimate ideal calories and macronutrients to support your goals.",
    fieldsToValidate: [],
  },
  {
    stepNumber: 8,
    title: "Current Meal Plan Input",
    explanation: "Help us learn what you usually eat. By sharing your current meals, snacks, and eating habits, our AI can better understand your real-world preferences — including foods you enjoy, timing, and portion sizes. This helps us fine-tune your future meal plan to feel natural and sustainable.",
    tooltipText: "Show us what you typically eat. This helps our AI learn your habits and build a realistic, personalized plan.",
    fieldsToValidate: ["typicalMealsDescription"],
  },
  {
    stepNumber: 9,
    title: "AI Meal Plan Generation",
    explanation: "One click to get your full weekly plan. Based on everything you’ve told us, we’ll generate a personalized weekly meal plan with balanced macros and your food preferences. You can regenerate or tweak anytime.",
    tooltipText: "Get your first weekly plan — customized to your needs, goals, and preferences. You can always tweak it.",
    fieldsToValidate: [],
  }
];
