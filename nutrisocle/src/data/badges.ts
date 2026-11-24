import { daysBetween, fromDayKey } from '../lib/dates'
import type { Donnees } from '../lib/donnees'
import { etatZone } from '../lib/maintien'
import { sum } from '../lib/nutrition'

export interface Stats {
  injections: number
  joursProteines: number
  joursEau: number
  joursFibres: number
  seances: number
  joursPasObjectif: number
  joursDifficilesPresents: number
  joursSuivis: number
  pesees: number
  rapports: number
  repasHabituels: number
  joursFaimNotee: number
  joursMaintienDansZone: number
}

/** Chiffres utilisés pour débloquer les badges. Uniquement des habitudes, jamais la vitesse de perte de poids. */
export function calculerStats(d: Donnees, aujourdHui: Date = new Date()): Stats {
  const p = d.profile
  const parJour = new Map<string, ReturnType<typeof sum>>()
  const logsParJour = new Map<string, typeof d.foodLogs>()
  for (const l of d.foodLogs) logsParJour.set(l.dayKey, [...(logsParJour.get(l.dayKey) ?? []), l])
  for (const [k, ls] of logsParJour) parJour.set(k, sum(ls.map((l) => l.apports)))
  const totaux = [...parJour.values()]
  const eauParJour = new Map(d.water.map((w) => [w.dayKey, w.ml]))

  // « Jour difficile, mais présent » : symptôme modéré ou fort, et la personne a quand même pris soin d'elle (eau ou repas notés).
  const joursDifficiles = new Set(d.symptoms.filter((s) => s.intensite >= 2).map((s) => s.dayKey))
  const joursDifficilesPresents = [...joursDifficiles].filter((k) => (eauParJour.get(k) ?? 0) >= 1000 || logsParJour.has(k)).length

  const joursAvecDonnee = new Set([
    ...d.foodLogs.map((l) => l.dayKey), ...d.injections.map((i) => i.dayKey), ...d.water.map((w) => w.dayKey),
    ...d.activities.map((a) => a.dayKey), ...d.weights.map((w) => w.dayKey), ...d.symptoms.map((s) => s.dayKey),
  ])

  let joursMaintienDansZone = 0
  if (p.phase === 'arret' && p.datePhase) {
    const z = etatZone(d)
    if (z.statut === 'dans') joursMaintienDansZone = Math.max(0, daysBetween(fromDayKey(p.datePhase), aujourdHui))
  }

  return {
    injections: d.injections.length,
    joursProteines: totaux.filter((t) => t.proteines >= p.objectifProteinesG).length,
    joursEau: d.water.filter((w) => w.ml >= p.objectifEauMl).length,
    joursFibres: totaux.filter((t) => t.fibres >= p.objectifFibresG).length,
    seances: d.activities.length,
    joursPasObjectif: d.steps.filter((s) => s.pas >= (p.objectifPas ?? 7000)).length,
    joursDifficilesPresents,
    joursSuivis: joursAvecDonnee.size,
    pesees: d.weights.length,
    rapports: p.rapportsCrees ?? 0,
    repasHabituels: d.mealTemplates.length,
    joursFaimNotee: d.faim.length,
    joursMaintienDansZone,
  }
}

export interface Badge {
  id: string
  nom: string
  /** Court texte affiché dans la médaille. */
  marque: string
  /** Comment l'obtenir (affiché tant qu'il est verrouillé). */
  comment: string
  /** Phrase de motivation débloquée, rangée dans le carnet. */
  phrase: string
  famille: 'traitement' | 'nutrition' | 'activite' | 'bienveillance' | 'apres'
  obtenu: (s: Stats) => boolean
  /** Progression vers le badge, de 0 à 1. */
  progression: (s: Stats) => number
}

const seuil = (cle: keyof Stats, n: number) => ({
  obtenu: (s: Stats) => s[cle] >= n,
  progression: (s: Stats) => Math.min(1, s[cle] / n),
})

export const BADGES: Badge[] = [
  { id: 'premiere-injection', nom: 'Première injection notée', marque: '1', famille: 'traitement', comment: 'Note ta première injection.',
    phrase: 'Le premier pas est fait. Chaque semaine notée est une brique de plus.', ...seuil('injections', 1) },
  { id: 'injections-4', nom: 'Un mois de régularité', marque: '4', famille: 'traitement', comment: 'Note 4 injections.',
    phrase: 'La régularité, c’est ce qui fait la différence. Tu es sur la bonne voie.', ...seuil('injections', 4) },
  { id: 'injections-12', nom: 'Trois mois de suivi', marque: '12', famille: 'traitement', comment: 'Note 12 injections.',
    phrase: 'Trois mois de constance : ton socle prend forme, semaine après semaine.', ...seuil('injections', 12) },
  { id: 'proteines-1', nom: 'Objectif protéines atteint', marque: 'P', famille: 'nutrition', comment: 'Atteins ton objectif de protéines une journée.',
    phrase: 'Chaque repas protéiné est une brique de plus. Tu construis quelque chose de solide.', ...seuil('joursProteines', 1) },
  { id: 'proteines-7', nom: '7 jours de protéines', marque: '7 J', famille: 'nutrition', comment: 'Atteins ton objectif de protéines 7 jours (pas besoin qu’ils se suivent).',
    phrase: 'Ton muscle te remercie. Garder sa force, c’est aussi ça, prendre soin de soi.', ...seuil('joursProteines', 7) },
  { id: 'proteines-30', nom: '30 jours de protéines', marque: '30', famille: 'nutrition', comment: 'Atteins ton objectif de protéines 30 jours.',
    phrase: 'Ce n’est plus un effort, c’est devenu une habitude. C’est exactement ça, un socle.', ...seuil('joursProteines', 30) },
  { id: 'eau-7', nom: 'Semaine bien hydratée', marque: '2 L', famille: 'nutrition', comment: 'Atteins ton objectif d’eau 7 jours.',
    phrase: 'Bien boire, c’est aider ton corps dans chaque étape. Continue comme ça.', ...seuil('joursEau', 7) },
  { id: 'fibres-7', nom: 'Ami des fibres', marque: 'F', famille: 'nutrition', comment: 'Atteins ton objectif de fibres 7 jours.',
    phrase: 'Les fibres prennent soin de ton ventre. Ton confort compte autant que la balance.', ...seuil('joursFibres', 7) },
  { id: 'repas-habituel', nom: 'Bien organisé', marque: 'R', famille: 'nutrition', comment: 'Enregistre un repas habituel.',
    phrase: 'S’organiser, c’est se faciliter la vie. Moins d’effort, plus de régularité.', ...seuil('repasHabituels', 1) },
  { id: 'seance-1', nom: 'Première séance', marque: '1', famille: 'activite', comment: 'Fais ta première séance d’activité.',
    phrase: 'Bouger, même un peu, c’est déjà garder sa force. Bravo pour ce premier pas.', ...seuil('seances', 1) },
  { id: 'seances-10', nom: '10 séances', marque: '10', famille: 'activite', comment: 'Fais 10 séances d’activité.',
    phrase: 'Dix séances : ton corps se renforce, et ta confiance aussi.', ...seuil('seances', 10) },
  { id: 'seances-30', nom: '30 séances', marque: '30', famille: 'activite', comment: 'Fais 30 séances d’activité.',
    phrase: 'Trente séances. Ce que tu construis là restera bien après le traitement.', ...seuil('seances', 30) },
  { id: 'pas-objectif', nom: 'Objectif de pas', marque: 'PAS', famille: 'activite', comment: 'Atteins ton objectif de pas une journée.',
    phrase: 'Un pas après l’autre, c’est comme ça qu’on va loin.', ...seuil('joursPasObjectif', 1) },
  { id: 'jour-difficile', nom: 'Jour difficile, mais présent', marque: 'J+1', famille: 'bienveillance', comment: 'Un jour avec des symptômes, continue à prendre soin de toi (eau ou repas notés).',
    phrase: 'Les jours difficiles comptent aussi. Prendre soin de soi quand ça ne va pas, c’est une vraie force.', ...seuil('joursDifficilesPresents', 1) },
  { id: 'suivi-7', nom: 'Une semaine de suivi', marque: '7', famille: 'bienveillance', comment: 'Utilise l’app 7 jours.',
    phrase: 'Une semaine à prendre soin de toi. C’est le début d’une belle habitude.', ...seuil('joursSuivis', 7) },
  { id: 'suivi-30', nom: 'Un mois de suivi', marque: '30', famille: 'bienveillance', comment: 'Utilise l’app 30 jours.',
    phrase: 'Un mois. Regarde le chemin parcouru : c’est une vraie réussite.', ...seuil('joursSuivis', 30) },
  { id: 'pesee-4', nom: 'Pesée régulière', marque: 'KG', famille: 'bienveillance', comment: 'Note 4 pesées.',
    phrase: 'Se peser régulièrement, sans se juger : c’est observer pour mieux avancer.', ...seuil('pesees', 4) },
  { id: 'rapport-1', nom: 'En équipe avec mon soignant', marque: 'PDF', famille: 'bienveillance', comment: 'Crée ton premier rapport pour ton soignant.',
    phrase: 'Partager son suivi, c’est avancer en équipe. On va plus loin à plusieurs.', ...seuil('rapports', 1) },
  { id: 'faim-7', nom: 'À l’écoute de ma faim', marque: 'F', famille: 'apres', comment: 'Note ta faim 7 jours (module Après le traitement).',
    phrase: 'Écouter sa faim, c’est apprendre à se faire confiance.', ...seuil('joursFaimNotee', 7) },
  { id: 'maintien-30', nom: 'Un mois stable', marque: '30', famille: 'apres', comment: 'Reste dans ta zone de stabilité 30 jours après l’arrêt.',
    phrase: 'Un mois sans traitement, et ton socle tient. C’est toi qui l’as construit.', ...seuil('joursMaintienDansZone', 30) },
  { id: 'maintien-90', nom: 'Trois mois stable', marque: '90', famille: 'apres', comment: 'Reste dans ta zone de stabilité 90 jours après l’arrêt.',
    phrase: 'Trois mois. Les habitudes sont là, solides. Ton socle, c’est toi.', ...seuil('joursMaintienDansZone', 90) },
]

export function badgesObtenus(s: Stats): Badge[] {
  return BADGES.filter((b) => b.obtenu(s))
}

export const FAMILLES: { id: Badge['famille']; label: string }[] = [
  { id: 'traitement', label: 'Traitement' },
  { id: 'nutrition', label: 'Nutrition' },
  { id: 'activite', label: 'Activité' },
  { id: 'bienveillance', label: 'Prendre soin de soi' },
  { id: 'apres', label: 'Après le traitement' },
]

/** Pour l'affichage « obtenu il y a… ». */
export function joursDepuis(iso: string, aujourdHui: Date = new Date()): number {
  return daysBetween(new Date(iso), aujourdHui)
}

