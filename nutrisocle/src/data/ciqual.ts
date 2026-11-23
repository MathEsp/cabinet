import type { Nutrients } from '../lib/nutrition'
import { normalize } from '../lib/text'

export interface CiqualFood {
  code: number
  nom: string
  groupe: string
  /** Apports pour 100 g. Une valeur absente de la table vaut 0. */
  per100g: Nutrients
  sucres: number | null
  polyols: number | null
  sel: number | null
  /** Nom normalisé, pour la recherche. */
  cle: string
  mots: string[]
}

type Row = [number, string, number, number | null, number | null, number | null, number | null, number | null, number | null, number | null, number | null]

interface RawTable {
  source: string
  groupes: string[]
  aliments: Row[]
}

export const CIQUAL_SOURCE = 'Anses. Table de composition nutritionnelle des aliments Ciqual 2020'

export function parseTable(raw: RawTable): CiqualFood[] {
  return raw.aliments.map(([code, nom, g, kcal, prot, gluc, lip, sucres, fibres, polyols, sel]) => {
    const cle = normalize(nom)
    // Quelques aliments n'ont pas d'énergie renseignée : on l'estime à partir des macronutriments.
    const kcalEstime = 4 * (prot ?? 0) + 4 * (gluc ?? 0) + 9 * (lip ?? 0) + 2 * (fibres ?? 0)
    return {
      code,
      nom,
      groupe: raw.groupes[g] ?? '',
      per100g: {
        kcal: kcal ?? Math.round(kcalEstime),
        proteines: prot ?? 0,
        glucides: gluc ?? 0,
        lipides: lip ?? 0,
        fibres: fibres ?? 0,
      },
      sucres,
      polyols,
      sel,
      cle,
      mots: cle.split(' '),
    }
  })
}

let cache: Promise<CiqualFood[]> | null = null

/** Charge la table une seule fois (le fichier est mis en cache hors ligne par l'app). */
export function loadCiqual(): Promise<CiqualFood[]> {
  if (!cache) {
    cache = fetch(`${import.meta.env.BASE_URL}ciqual.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`Table Ciqual introuvable (${r.status})`)
        return r.json() as Promise<RawTable>
      })
      .then(parseTable)
      .catch((err) => {
        cache = null
        throw err
      })
  }
  return cache
}

/**
 * Recherche tolérante : chaque mot tapé doit commencer un mot du nom
 * (« hari vert » trouve « Haricot vert, cuit »). Les aliments cuits passent
 * devant les crus, sauf si la personne tape « cru ».
 */
export function searchFoods(foods: CiqualFood[], query: string, limit = 40): CiqualFood[] {
  const tokens = normalize(query).split(' ').filter(Boolean)
  if (tokens.length === 0) return []
  const wantsRaw = tokens.some((t) => t.startsWith('cru'))
  const scored: { food: CiqualFood; score: number }[] = []
  for (const food of foods) {
    let score = 0
    let ok = true
    for (const token of tokens) {
      const idx = food.mots.findIndex((m) => m.startsWith(token))
      if (idx === -1) {
        if (token.length >= 4 && food.cle.includes(token)) {
          score += 1
          continue
        }
        ok = false
        break
      }
      score += idx === 0 ? 6 : Math.max(1, 4 - idx)
      if (food.mots[idx] === token) score += 2
    }
    if (!ok) continue
    if (food.cle.startsWith(tokens.join(' '))) score += 5
    const cooked = /\b(cuit|cuite|cuits|cuites|poele|poelee|grille|grillee|vapeur|roti|rotie|bouilli|bouillie|saute|sautee)\b/.test(food.cle)
    if (!wantsRaw && cooked) score += 3
    if (!wantsRaw && /\bcru\b|\bcrue\b/.test(food.cle)) score -= 2
    if (food.cle.includes('aliment moyen')) score += 1
    score -= food.mots.length * 0.15
    scored.push({ food, score })
  }
  scored.sort((a, b) => b.score - a.score || a.food.nom.length - b.food.nom.length)
  return scored.slice(0, limit).map((s) => s.food)
}
