import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { loadCiqual, type CiqualFood } from './data/ciqual'
import { db } from './db'
import { dayKey } from './lib/dates'
import { sum } from './lib/nutrition'

export function useProfile() {
  return useLiveQuery(() => db.profile.get('me'), [], null)
}

export function useToday() {
  const [key, setKey] = useState(dayKey())
  useEffect(() => {
    // Passe automatiquement au jour suivant si l'app reste ouverte après minuit.
    const id = window.setInterval(() => setKey(dayKey()), 60_000)
    return () => window.clearInterval(id)
  }, [])
  return key
}

export function useDay(key: string) {
  const logs = useLiveQuery(() => db.foodLogs.where('dayKey').equals(key).toArray(), [key]) ?? []
  const water = useLiveQuery(() => db.water.get(key), [key])
  const symptoms = useLiveQuery(() => db.symptoms.where('dayKey').equals(key).toArray(), [key]) ?? []
  const totals = sum(logs.map((l) => l.apports))
  return { logs, waterMl: water?.ml ?? 0, symptoms, totals }
}

export function useInjections() {
  return useLiveQuery(() => db.injections.orderBy('date').reverse().toArray(), []) ?? []
}

export function useLatestWeight() {
  return useLiveQuery(() => db.weights.orderBy('dayKey').last(), [])
}

export function useCiqual() {
  const [foods, setFoods] = useState<CiqualFood[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    let alive = true
    loadCiqual()
      .then((f) => { if (alive) setFoods(f) })
      .catch((e: Error) => { if (alive) setError(e.message) })
    return () => { alive = false }
  }, [])
  return { foods, error }
}
