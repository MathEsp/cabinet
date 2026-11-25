import type { FoodLog } from '../db'
import { addDays, dayKey, daysBetween, fromDayKey } from './dates'
import type { Donnees } from './donnees'
import { sum } from './nutrition'

export const ZONE_DEFAUT_KG = 2

// ---------- Zone de stabilité ----------

export type StatutZone = 'dans' | 'au-dessus' | 'en-dessous'

export interface EtatZone {
  reference: number
  zone: number
  actuel: number | null
  ecart: number | null
  statut: StatutZone | null
}

/** Où se situe le dernier poids par rapport à la zone de stabilité (référence ± zone). */
export function etatZone(d: Pick<Donnees, 'profile' | 'weights'>): EtatZone {
  const reference = d.profile.poidsReferenceKg ?? d.profile.poidsDepartKg
  const zone = d.profile.zoneStabiliteKg ?? ZONE_DEFAUT_KG
  const dernier = [...d.weights].sort((a, b) => a.dayKey.localeCompare(b.dayKey)).pop()
  if (!dernier) return { reference, zone, actuel: null, ecart: null, statut: null }
  const ecart = dernier.kg - reference
  const statut: StatutZone = ecart > zone ? 'au-dessus' : ecart < -zone ? 'en-dessous' : 'dans'
  return { reference, zone, actuel: dernier.kg, ecart, statut }
}

/** Semaine depuis la diminution ou l'arrêt (1 = première semaine). */
export function semaineDepuis(datePhase: string | undefined, aujourdHui: Date = new Date()): number {
  if (!datePhase) return 1
  return Math.max(1, Math.floor(daysBetween(fromDayKey(datePhase), aujourdHui) / 7) + 1)
}

// ---------- Bilan des habitudes ----------

export type Niveau = 'solide' | 'a-renforcer' | 'fragile' | 'inconnu'

export interface Habitude {
  id: 'proteines' | 'activite' | 'hydratation' | 'repas' | 'pesee'
  titre: string
  niveau: Niveau
  detail: string
  conseil: string
}

/**
 * Bilan des 4 dernières semaines : les habitudes qui « tiennent » quand le traitement s'arrête.
 * Seuils volontairement simples et bienveillants (à valider avec un soignant).
 */
export function bilanHabitudes(d: Donnees, aujourdHui: Date = new Date()): Habitude[] {
  const debut = dayKey(addDays(aujourdHui, -27))
  const fin = dayKey(aujourdHui)
  const dans = (k: string) => k >= debut && k <= fin
  const p = d.profile

  const parJour = new Map<string, FoodLog[]>()
  for (const l of d.foodLogs) if (dans(l.dayKey)) parJour.set(l.dayKey, [...(parJour.get(l.dayKey) ?? []), l])
  const jours = [...parJour.values()]
  const joursProt = jours.filter((ls) => sum(ls.map((l) => l.apports)).proteines >= p.objectifProteinesG).length
  const repasParJour = jours.length ? jours.reduce((s, ls) => s + new Set(ls.filter((l) => l.repas !== 'collation').map((l) => l.repas)).size, 0) / jours.length : 0
  const seances = d.activities.filter((a) => dans(a.dayKey)).length
  const joursEau = d.water.filter((w) => dans(w.dayKey) && w.ml >= p.objectifEauMl).length
  const joursEauNotes = d.water.filter((w) => dans(w.dayKey) && w.ml > 0).length
  const pesees = new Set(d.weights.filter((w) => dans(w.dayKey)).map((w) => Math.floor(daysBetween(fromDayKey(debut), fromDayKey(w.dayKey)) / 7))).size

  const niveau = (ok: boolean, moyen: boolean): Niveau => (ok ? 'solide' : moyen ? 'a-renforcer' : 'fragile')
  const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0)

  return [
    {
      id: 'proteines', titre: 'Protéines à chaque repas',
      niveau: jours.length < 5 ? 'inconnu' : niveau(joursProt / jours.length >= 0.6, joursProt / jours.length >= 0.3),
      detail: jours.length < 5 ? 'Pas assez de repas notés sur 4 semaines.' : `Objectif atteint ${pct(joursProt, jours.length)} % des jours renseignés.`,
      conseil: 'Une source de protéines à chaque repas protège le muscle et aide à la satiété.',
    },
    {
      id: 'repas', titre: 'Repas réguliers',
      niveau: jours.length < 5 ? 'inconnu' : niveau(repasParJour >= 2.8, repasParJour >= 2.3),
      detail: jours.length < 5 ? 'Pas assez de repas notés sur 4 semaines.' : `${String(Math.round(repasParJour * 10) / 10).replace('.', ',')} repas principaux par jour en moyenne.`,
      conseil: 'Trois repas structurés évitent les grosses fringales quand l’appétit revient.',
    },
    {
      id: 'activite', titre: 'Activité physique',
      niveau: niveau(seances >= 8, seances >= 4),
      detail: `${seances} séance${seances > 1 ? 's' : ''} en 4 semaines.`,
      conseil: 'Deux à trois séances par semaine, surtout du renforcement, aident à stabiliser le poids.',
    },
    {
      id: 'hydratation', titre: 'Hydratation',
      niveau: joursEauNotes < 5 ? 'inconnu' : niveau(joursEau / joursEauNotes >= 0.5, joursEau / joursEauNotes >= 0.25),
      detail: joursEauNotes < 5 ? 'Pas assez de jours notés.' : `Objectif d’eau atteint ${pct(joursEau, joursEauNotes)} % des jours notés.`,
      conseil: 'Boire régulièrement aide la digestion et à distinguer la soif de la faim.',
    },
    {
      id: 'pesee', titre: 'Pesée régulière',
      niveau: niveau(pesees >= 3, pesees >= 2),
      detail: `Pesée ${pesees} semaine${pesees > 1 ? 's' : ''} sur 4.`,
      conseil: 'Une pesée par semaine, même jour, même heure : pour réagir tôt, sans se juger.',
    },
  ]
}

export function scoreHabitudes(h: Habitude[]): number {
  return h.filter((x) => x.niveau === 'solide').length
}

// ---------- Conseils de l'après-traitement ----------

/** Un conseil par semaine pour les 12 premières semaines après l'arrêt (contenu à valider par un soignant). */
export const CONSEILS_APRES: { titre: string; texte: string }[] = [
  { titre: 'La faim revient : c’est normal', texte: 'L’appétit revient souvent progressivement. Garde tes trois repas, avec des protéines à chaque fois, et note ta faim chaque jour pour la suivre.' },
  { titre: 'Une pesée par semaine', texte: 'Même jour, même heure, sans te juger. Le but est de repérer tôt une tendance, pas de surveiller chaque gramme.' },
  { titre: 'Les légumes et les fibres en premier', texte: 'Commencer le repas par des légumes et boire de l’eau aide à se sentir rassasié plus vite.' },
  { titre: 'Prévoir ses collations', texte: 'Garde à portée de main une collation protéinée (skyr, œuf dur, fromage blanc) pour les fringales de fin de journée.' },
  { titre: 'Garder le muscle', texte: 'Continue tes deux à trois séances de renforcement par semaine : le muscle aide à stabiliser le poids.' },
  { titre: 'Faim ou envie ?', texte: 'Avant de manger en dehors des repas, demande-toi : est-ce de la faim, de la fatigue, du stress ou de l’ennui ?' },
  { titre: 'Manger lentement', texte: 'Pose ta fourchette entre deux bouchées : les signaux de satiété mettent une vingtaine de minutes à arriver.' },
  { titre: 'Si le poids sort de ta zone', texte: 'Pas de panique : reviens aux bases pendant deux semaines (protéines, légumes, eau, activité) et parles-en à ton soignant.' },
  { titre: 'Le sommeil compte', texte: 'Le manque de sommeil augmente la faim. Essaie de garder des horaires réguliers.' },
  { titre: 'Les repas à l’extérieur', texte: 'Au restaurant, choisis d’abord la source de protéines et des légumes ; partager un dessert, c’est très bien aussi.' },
  { titre: 'Faire le point', texte: 'Prends le temps de revoir tes habitudes avec ton soignant : envoie-lui ton rapport NutriSocle.' },
  { titre: 'Ton socle est là', texte: 'Trois mois après l’arrêt, les habitudes que tu as construites sont ton meilleur appui. Continue à prendre soin de toi.' },
]

export function conseilDeLaSemaine(semaine: number): { titre: string; texte: string; numero: number } {
  const i = Math.min(CONSEILS_APRES.length, Math.max(1, semaine)) - 1
  return { ...CONSEILS_APRES[i], numero: i + 1 }
}
