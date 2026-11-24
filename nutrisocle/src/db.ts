import Dexie, { type EntityTable } from 'dexie'
import type { Frequence } from './data/molecules'
import type { Nutrients } from './lib/nutrition'

export interface Profile {
  id: 'me'
  prenom: string
  tailleCm: number
  poidsDepartKg: number
  dateDebut: string
  moleculeId: string
  /** Nom saisi pour « Autre molécule » ou rétatrutide. */
  moleculeNom: string
  frequence: Frequence
  doseActuelleMg: number | null
  /** Jour habituel d'injection (0 = dimanche), pour un traitement hebdomadaire. */
  jourInjection: number
  objectifProteinesG: number
  objectifFibresG: number
  objectifEauMl: number
  avertissementAccepte: boolean
  /** Objectif de pas par jour (absent sur les profils créés avant la v0.2). */
  objectifPas?: number
  /** Brouillon des questions du patient pour son prochain rapport. */
  questionsRapport?: string
}

export interface WeightEntry {
  id?: number
  dayKey: string
  kg: number
  tourTailleCm?: number | null
}

export interface Injection {
  id?: number
  date: string
  dayKey: string
  moleculeNom: string
  doseMg: number | null
  site: string
  note: string
}

export type Repas = 'petit-dejeuner' | 'dejeuner' | 'collation' | 'diner'

export interface FoodLog {
  id?: number
  dayKey: string
  repas: Repas
  /** « ciqual:6251 », « supp:whey-eau » ou « perso:3 ». */
  ref: string
  nom: string
  quantite: number
  /** « g » ou le nom de la portion (« barre », « dose »…). */
  unite: string
  apports: Nutrients
  createdAt: string
}

export interface WaterLog {
  dayKey: string
  ml: number
}

export type SymptomType = 'nausees' | 'constipation' | 'diarrhee' | 'reflux' | 'fatigue' | 'appetit'

export interface Symptom {
  id?: number
  dayKey: string
  type: SymptomType
  /** 1 léger, 2 modéré, 3 fort. */
  intensite: 1 | 2 | 3
  /** Jour du cycle d'injection (J0, J+1…), si connu. */
  jourCycle: number | null
}

export type ActivityType = 'maison' | 'salle' | 'cardio'

export interface SetLine {
  nom: string
  series: number
  reps: number
  chargeKg: number | null
}

export interface Activity {
  id?: number
  dayKey: string
  date: string
  type: ActivityType
  titre: string
  dureeMin: number
  /** 1 facile, 2 bien, 3 difficile. */
  ressenti: 1 | 2 | 3 | null
  /** Détail des exercices (salle) ou exercices cochés (maison). */
  exercices: SetLine[]
}

export interface StepsLog {
  dayKey: string
  pas: number
}

/** Un aliment enregistré dans le repas (utilisé par les favoris et les repas habituels). */
export interface MealItem {
  ref: string
  nom: string
  quantite: number
  unite: string
  apports: Nutrients
}

export interface Favorite {
  id?: number
  ref: string
  nom: string
  /** 'g' : base pour 100 g ; 'portion' : base pour 1 portion. */
  mode: 'g' | 'portion'
  base: Nutrients
  unite: string
  quantite: number
}

export interface MealTemplate {
  id?: number
  nom: string
  items: MealItem[]
}

export interface Carer {
  id?: number
  prenom: string
  nom: string
  role: string
  email: string
  telephone: string
}

export interface CustomFood {
  id?: number
  nom: string
  marque: string
  codeBarres: string
  /** Si renseigné, les apports sont pour 100 g ; sinon pour une portion. */
  base: '100g' | 'portion'
  portionLibelle: string
  portionG: number | null
  apports: Nutrients
  source: 'saisie' | 'openfoodfacts'
}

export class NutriSocleDB extends Dexie {
  profile!: EntityTable<Profile, 'id'>
  weights!: EntityTable<WeightEntry, 'id'>
  injections!: EntityTable<Injection, 'id'>
  foodLogs!: EntityTable<FoodLog, 'id'>
  water!: EntityTable<WaterLog, 'dayKey'>
  symptoms!: EntityTable<Symptom, 'id'>
  carers!: EntityTable<Carer, 'id'>
  customFoods!: EntityTable<CustomFood, 'id'>
  activities!: EntityTable<Activity, 'id'>
  steps!: EntityTable<StepsLog, 'dayKey'>
  favorites!: EntityTable<Favorite, 'id'>
  mealTemplates!: EntityTable<MealTemplate, 'id'>

  constructor(name = 'nutrisocle') {
    super(name)
    this.version(1).stores({
      profile: 'id',
      weights: '++id, dayKey',
      injections: '++id, dayKey, date',
      foodLogs: '++id, dayKey, ref, createdAt',
      water: 'dayKey',
      symptoms: '++id, dayKey',
      carers: '++id',
      customFoods: '++id, codeBarres, nom',
    })
    this.version(2).stores({
      activities: '++id, dayKey, type, date',
      steps: 'dayKey',
    })
    this.version(3).stores({
      favorites: '++id, ref',
      mealTemplates: '++id',
    })
  }
}

export const db = new NutriSocleDB()

const TABLES = ['profile', 'weights', 'injections', 'foodLogs', 'water', 'symptoms', 'carers', 'customFoods', 'activities', 'steps', 'favorites', 'mealTemplates'] as const

/** Sauvegarde complète en JSON (les données ne quittent jamais le téléphone autrement). */
export async function exportAll(database: NutriSocleDB = db): Promise<string> {
  const data: Record<string, unknown[]> = {}
  for (const name of TABLES) data[name] = await database.table(name).toArray()
  return JSON.stringify({ app: 'NutriSocle', version: 1, exportedAt: new Date().toISOString(), data }, null, 2)
}

export async function importAll(json: string, database: NutriSocleDB = db): Promise<void> {
  const parsed = JSON.parse(json) as { app?: string; data?: Record<string, unknown[]> }
  if (parsed.app !== 'NutriSocle' || !parsed.data) throw new Error("Ce fichier n'est pas une sauvegarde NutriSocle.")
  await database.transaction('rw', TABLES.map((t) => database.table(t)), async () => {
    for (const name of TABLES) {
      const rows = parsed.data?.[name]
      if (!Array.isArray(rows)) continue
      await database.table(name).clear()
      await database.table(name).bulkAdd(rows)
    }
  })
}
