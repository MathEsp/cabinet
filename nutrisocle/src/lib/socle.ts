import type { Activity, FoodLog, Injection, WaterLog } from '../db'
import { sum } from './nutrition'

export interface SocleInput {
  foodLogs: FoodLog[]
  water: WaterLog[]
  injections: Injection[]
  activities?: Activity[]
  objectifProteinesG: number
  objectifEauMl: number
}

export interface SocleResult {
  briques: number
  /** Détail, pour expliquer d'où viennent les briques. */
  joursProteines: number
  joursEau: number
  injections: number
  seances: number
}

/**
 * Le socle se construit brique par brique, uniquement avec de bonnes habitudes :
 * une brique par jour où l'objectif protéines est atteint, une par jour bien hydraté,
 * une par injection notée, une par séance d'activité. Jamais pour « manger moins » ou « perdre vite ».
 */
export function computeSocle(input: SocleInput): SocleResult {
  const byDay = new Map<string, FoodLog[]>()
  for (const log of input.foodLogs) {
    const list = byDay.get(log.dayKey) ?? []
    list.push(log)
    byDay.set(log.dayKey, list)
  }
  let joursProteines = 0
  for (const logs of byDay.values()) {
    if (sum(logs.map((l) => l.apports)).proteines >= input.objectifProteinesG) joursProteines++
  }
  const joursEau = input.water.filter((w) => w.ml >= input.objectifEauMl).length
  const injections = input.injections.length
  const seances = input.activities?.length ?? 0
  return { briques: joursProteines + joursEau + injections + seances, joursProteines, joursEau, injections, seances }
}
