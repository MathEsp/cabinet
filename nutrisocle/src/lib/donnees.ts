import type { Activity, BadgeObtenu, FaimLog, FoodLog, Injection, MealTemplate, Profile, StepsLog, Symptom, WaterLog, WeightEntry } from '../db'

/** Toutes les données du patient, pour les calculs de synthèse (badges, bilan des habitudes). */
export interface Donnees {
  profile: Profile
  weights: WeightEntry[]
  injections: Injection[]
  foodLogs: FoodLog[]
  water: WaterLog[]
  symptoms: Symptom[]
  activities: Activity[]
  steps: StepsLog[]
  mealTemplates: MealTemplate[]
  faim: FaimLog[]
  badges: BadgeObtenu[]
}
