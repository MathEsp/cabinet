import { db, type MealItem, type Repas } from '../db'

/** Ajoute plusieurs aliments d'un coup à un repas (repas habituel, recopie d'hier…). */
export async function ajouterItems(items: MealItem[], dayKey: string, repas: Repas): Promise<number> {
  const now = Date.now()
  await db.foodLogs.bulkAdd(items.map((it, i) => ({
    dayKey, repas, ref: it.ref, nom: it.nom, quantite: it.quantite, unite: it.unite, apports: it.apports,
    createdAt: new Date(now + i).toISOString(),
  })))
  return items.length
}

/** Aliments d'un repas donné, un jour donné, sous forme réutilisable. */
export async function itemsDuRepas(dayKey: string, repas: Repas): Promise<MealItem[]> {
  const logs = await db.foodLogs.where('dayKey').equals(dayKey).filter((l) => l.repas === repas).toArray()
  return logs.map(({ ref, nom, quantite, unite, apports }) => ({ ref, nom, quantite, unite, apports }))
}
