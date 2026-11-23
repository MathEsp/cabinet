import { SITES } from '../data/molecules'
import type { Injection } from '../db'
import { daysBetween, fromDayKey } from './dates'

/** Jour du cycle depuis la dernière injection : 0 = jour J, 1 = J+1… */
export function cycleDay(injections: Injection[], today: Date = new Date()): number | null {
  const last = latest(injections)
  if (!last) return null
  return Math.max(0, daysBetween(fromDayKey(last.dayKey), today))
}

export function latest(injections: Injection[]): Injection | undefined {
  return [...injections].sort((a, b) => b.date.localeCompare(a.date))[0]
}

/** Pour chaque zone : nombre de jours depuis la dernière utilisation (null = jamais). */
export function siteHistory(injections: Injection[], today: Date = new Date()): Record<string, number | null> {
  const result: Record<string, number | null> = {}
  for (const site of SITES) {
    const uses = injections.filter((i) => i.site === site.id).sort((a, b) => b.date.localeCompare(a.date))
    result[site.id] = uses.length ? daysBetween(fromDayKey(uses[0].dayKey), today) : null
  }
  return result
}

/** Zone suggérée : jamais utilisée, sinon la moins récemment utilisée. */
export function suggestSite(injections: Injection[], today: Date = new Date()): string {
  const history = siteHistory(injections, today)
  let best = SITES[0].id
  let bestDays = -1
  for (const site of SITES) {
    const days = history[site.id]
    if (days === null) return site.id
    if (days > bestDays) {
      best = site.id
      bestDays = days
    }
  }
  return best
}

/** Message bienveillant selon le jour du cycle (traitement hebdomadaire). */
export function cycleMessage(day: number | null): string {
  if (day === null) return 'Note ta première injection pour suivre ton cycle semaine après semaine.'
  if (day === 0) return "Jour d'injection : bois bien et privilégie un repas léger. Tu fais ça très bien."
  if (day <= 2) return 'Les nausées sont fréquentes à J+1 et J+2. Petites portions, petites gorgées… on y va doucement.'
  if (day <= 4) return "L'appétit revient parfois un peu : c'est le bon moment pour un repas riche en protéines."
  return "Fin de cycle : pense à préparer ta prochaine injection et à noter comment s'est passée ta semaine."
}
