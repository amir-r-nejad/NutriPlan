'use server'
import { getDb } from "@/lib/firebase/firebase"
import {User} from  "firebase/auth"
import { CustomCalculatedTargets, FullProfileType, GlobalCalculatedTargets, OnboardingFormValues, ProfileFormValues, SmartCaloriePlannerFormValues } from "../../../lib/schemas";

const db = await getDb();
export async function  addUser(u:string){
    'use server'
    let user = JSON.parse(u) as User;
    return await db.runTransaction(async (transaction)=>{
      try{
          const userQuery = db.collection("users").where("userid", "==", user.uid);
          const userQuerySnapshot = await transaction.get(userQuery);
          if (userQuerySnapshot.empty) {
            await db.collection("user").add(user)
          }
          return user;
      }catch(e){
        console.log(e)
    }
    })
}

export async function onboardingUserCompleted(userId: string) {
  'use server'
    try {
        const userSnapshot = await db.collection("users").where("uid", "==", ""+userId).limit(1).get();
        if (userSnapshot.empty) {
          console.error(`User with thid uid ${userId} not found`)
          return 
        }

        // Assuming uid is unique, so only one doc
        const userDoc = userSnapshot.docs[0];
        return userDoc.data()["age"] != undefined;
    } catch (e) {
        throw e;
    }
}
export async function onboardingUpdateUser(userId: string, onboardingValues: OnboardingFormValues) {
    try {
        const userSnapshot = await  db.collection("users").where("uid", "==", ""+userId).limit(1).get();
        console.log(userSnapshot,userId,onboardingValues)
        if (userSnapshot.empty) {
            throw new Error("User not found");
        }

        // Assuming uid is unique, so only one doc
        const userDoc = userSnapshot.docs[0];
        await userDoc.ref.update(onboardingValues);
        return true;
    } catch (e) {
        throw e;
    }
}
export async function getSmartPlannerData(userId: string): Promise<{formValues: Partial<SmartCaloriePlannerFormValues>, results?: GlobalCalculatedTargets | null, manualMacroResults?: CustomCalculatedTargets | null}> {
    'use server'
  if (!userId) return { formValues: {} };
  try {
    const docSnap = await db.collection("users").where("uid", "==", userId).limit(1).get();
    if (!docSnap.empty) {
      const profile = docSnap.docs[0].data() as FullProfileType;
      
      // Map FullProfileType fields to SmartCaloriePlannerFormValues
      const formValues: Partial<SmartCaloriePlannerFormValues> = {
        age: profile.age ?? undefined,
        gender: profile.gender ?? undefined,
        height_cm: profile.height_cm ?? undefined,
        current_weight: profile.current_weight ?? undefined,
        goal_weight_1m: profile.goal_weight_1m ?? undefined,
        ideal_goal_weight: profile.ideal_goal_weight ?? undefined,
        activity_factor_key: profile.activityLevel ?? "moderate", 
        dietGoal: profile.dietGoalOnboarding ?? "fat_loss",
        bf_current: profile.bf_current ?? undefined,
        bf_target: profile.bf_target ?? undefined,
        bf_ideal: profile.bf_ideal ?? undefined,
        mm_current: profile.mm_current ?? undefined,
        mm_target: profile.mm_target ?? undefined,
        mm_ideal: profile.mm_ideal ?? undefined,
        bw_current: profile.bw_current ?? undefined,
        bw_target: profile.bw_target ?? undefined,
        bw_ideal: profile.bw_ideal ?? undefined,
        waist_current: profile.waist_current ?? undefined,
        waist_goal_1m: profile.waist_goal_1m ?? undefined,
        waist_ideal: profile.waist_ideal ?? undefined,
        hips_current: profile.hips_current ?? undefined,
        hips_goal_1m: profile.hips_goal_1m ?? undefined,
        hips_ideal: profile.hips_ideal ?? undefined,
        right_leg_current: profile.right_leg_current ?? undefined,
        right_leg_goal_1m: profile.right_leg_goal_1m ?? undefined,
        right_leg_ideal: profile.right_leg_ideal ?? undefined,
        left_leg_current: profile.left_leg_current ?? undefined,
        left_leg_goal_1m: profile.left_leg_goal_1m ?? undefined,
        left_leg_ideal: profile.left_leg_ideal ?? undefined,
        right_arm_current: profile.right_arm_current ?? undefined,
        right_arm_goal_1m: profile.right_arm_goal_1m ?? undefined,
        right_arm_ideal: profile.right_arm_ideal ?? undefined,
        left_arm_current: profile.left_arm_current ?? undefined,
        left_arm_goal_1m: profile.left_arm_goal_1m ?? undefined,
        left_arm_ideal: profile.left_arm_ideal ?? undefined,
        // Load custom inputs from saved smartPlannerData
        custom_total_calories: profile.smartPlannerData?.formValues?.custom_total_calories ?? undefined,
        custom_protein_per_kg: profile.smartPlannerData?.formValues?.custom_protein_per_kg ?? undefined,
        remaining_calories_carb_pct: profile.smartPlannerData?.formValues?.remaining_calories_carb_pct ?? 50,
      };
       return { 
         formValues, // Merged form values from profile and specific smart planner inputs
         results: profile.smartPlannerData?.results ?? null,
        //  manualMacroResults: profile.manualMacroResults ?? null, TODO
       };
    }
  } catch (error) {
    console.error("Error fetching smart planner data from Firestore:", error);
  }
  return { formValues: {} };
}

export async function getProfileData(userId: string): Promise<Partial<ProfileFormValues>> {
'use server'
  if (!userId) return {};
  try {
    const docSnap = await  db.collection("users").where("uid", "==", userId).limit(1).get();
    if (docSnap.empty || docSnap.docs.length === 0) {
      // redirect("/login",RedirectType.push)
      return {};
    }
    const profile = docSnap.docs[0].data() as FullProfileType;
    return {
      name: profile.displayName ?? profile.email ?? "",
      email: profile.email ?? "",
      subscriptionStatus: profile.subscriptionStatus ?? "free",
      painMobilityIssues: profile.painMobilityIssues ?? '',
      injuries: profile.injuries ?? [],
      surgeries: profile.surgeries ?? [],
      age: profile.age ?? undefined,
      gender: profile.gender ?? undefined,
      height_cm: profile.height_cm ?? undefined,
      current_weight: profile.current_weight ?? undefined,
      goal_weight_1m: profile.goal_weight_1m ?? undefined,
      ideal_goal_weight: profile.ideal_goal_weight ?? undefined,
      dietGoal: profile.dietGoalOnboarding ?? undefined,
      // Smart planner custom fields
      custom_total_calories: profile.smartPlannerData?.formValues?.custom_total_calories ?? undefined,
      custom_protein_per_kg: profile.smartPlannerData?.formValues?.custom_protein_per_kg ?? undefined,
      remaining_calories_carb_pct: profile.smartPlannerData?.formValues?.remaining_calories_carb_pct ?? 50,
      // Additional FullProfileType fields
      smartPlannerData: profile.smartPlannerData ?? undefined,
      dietGoalOnboarding: profile.dietGoalOnboarding ?? undefined,
      preferredDiet: profile.preferredDiet ?? undefined,
      allergies: profile.allergies ?? [],
      activityLevel: profile.activityLevel,
      preferredCuisines: profile.preferredCuisines,
      dispreferredCuisines: profile.dispreferredCuisines,
      preferredIngredients: profile.preferredIngredients,
      dispreferredIngredients: profile.dispreferredIngredients,
    } as Partial<ProfileFormValues>;
  } catch (error) {
    console.error("Error fetching profile from Firestore:", error);
    throw error
  }
}