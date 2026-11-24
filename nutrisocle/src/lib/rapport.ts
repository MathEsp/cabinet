import { SYMPTOMES } from '../components/symptomes'
import type { Activity, FoodLog, Injection, Profile, Repas, StepsLog, Symptom, SymptomType, WaterLog, WeightEntry } from '../db'
import { addDays, dayKey, daysBetween, fromDayKey } from './dates'
import { sum } from './nutrition'

export interface RapportSource {
  profile: Profile
  weights: WeightEntry[]
  injections: Injection[]
  foodLogs: FoodLog[]
  water: WaterLog[]
  symptoms: Symptom[]
  activities: Activity[]
  steps: StepsLog[]
}

export interface LigneTolerance {
  type: SymptomType
  label: string
  /** Nombre de jours où le symptôme a été noté. */
  jours: number
  /** Intensité moyenne : 1 léger, 2 modéré, 3 fort. */
  intensite: number
  /** Jours du cycle où il revient le plus (« J+1, J+2 »), si connus. */
  moment: string | null
}

export interface LigneRepas {
  repas: Repas
  label: string
  /** Nombre de jours renseignés où ce repas a été pris. */
  jours: number
  proteinesMoy: number
}

export interface RapportData {
  debut: string
  fin: string
  nbJours: number
  /** Jours réellement suivis dans la période (le suivi a pu commencer en cours de période). */
  joursSuivis: number
  debutSuivi: string
  prenom: string
  traitement: {
    molecule: string
    frequence: 'hebdo' | 'quotidien'
    doseActuelle: number | null
    injections: number
    attendues: number
    changements: { dayKey: string; de: number | null; a: number | null }[]
  }
  poids: {
    depart: number
    debutPeriode: number | null
    actuel: number | null
    evolutionPeriode: number | null
    evolutionTotale: number | null
    points: { dayKey: string; kg: number }[]
    tourTaille: { debut: number; fin: number } | null
  }
  tolerance: LigneTolerance[]
  joursAvecSymptome: number
  apports: {
    joursRenseignes: number
    proteinesMoy: number
    objectifProteines: number
    joursObjectifAtteint: number
    fibresMoy: number
    objectifFibres: number
    kcalMoy: number
    eauMoyL: number | null
    joursEauNotee: number
  }
  repas: LigneRepas[]
  repasParJour: number
  activite: { seances: number; minutesParSemaine: number; pasMoy: number | null; joursPas: number }
}

const LIBELLES_REPAS: { id: Repas; label: string }[] = [
  { id: 'petit-dejeuner', label: 'Petit-déjeuner' },
  { id: 'dejeuner', label: 'Déjeuner' },
  { id: 'collation', label: 'Collation' },
  { id: 'diner', label: 'Dîner' },
]

const moyenne = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0)

/** Résumé chiffré de la période, à partir des données saisies par le patient. */
export function construireRapport(src: RapportSource, nbJours: number, aujourdHui: Date = new Date()): RapportData {
  const fin = dayKey(aujourdHui)
  const debut = dayKey(addDays(aujourdHui, -(nbJours - 1)))
  const dansPeriode = (k: string) => k >= debut && k <= fin
  const p = src.profile
  // Le suivi a pu commencer en cours de période (ou avant la première injection notée).
  const premiereDonnee = [p.dateDebut, ...src.injections.map((i) => i.dayKey), ...src.weights.map((w) => w.dayKey)].sort()[0] ?? debut
  const debutSuivi = premiereDonnee > debut ? premiereDonnee : debut
  const joursSuivis = Math.max(1, daysBetween(fromDayKey(debutSuivi), fromDayKey(fin)) + 1)

  // Traitement
  const injections = src.injections.filter((i) => dansPeriode(i.dayKey)).sort((a, b) => a.date.localeCompare(b.date))
  const attendues = p.frequence === 'hebdo' ? Math.max(1, Math.ceil(joursSuivis / 7)) : joursSuivis
  const changements: RapportData['traitement']['changements'] = []
  const toutes = [...src.injections].sort((a, b) => a.date.localeCompare(b.date))
  for (let i = 1; i < toutes.length; i++) {
    const avant = toutes[i - 1].doseMg
    const apres = toutes[i].doseMg
    if (avant !== apres && apres !== null && dansPeriode(toutes[i].dayKey)) changements.push({ dayKey: toutes[i].dayKey, de: avant, a: apres })
  }

  // Poids
  const pesees = [...src.weights].sort((a, b) => a.dayKey.localeCompare(b.dayKey))
  const points = pesees.filter((w) => dansPeriode(w.dayKey)).map((w) => ({ dayKey: w.dayKey, kg: w.kg }))
  const avantPeriode = pesees.filter((w) => w.dayKey < debut).pop()
  const debutPeriode = avantPeriode?.kg ?? points[0]?.kg ?? null
  const actuel = pesees.length ? pesees[pesees.length - 1].kg : null
  const tailles = pesees.filter((w) => dansPeriode(w.dayKey) && w.tourTailleCm)
  const tourTaille = tailles.length >= 2 ? { debut: tailles[0].tourTailleCm!, fin: tailles[tailles.length - 1].tourTailleCm! } : null

  // Tolérance
  const symptomes = src.symptoms.filter((s) => dansPeriode(s.dayKey))
  const tolerance: LigneTolerance[] = []
  for (const def of SYMPTOMES) {
    const liste = symptomes.filter((s) => s.type === def.type)
    if (liste.length === 0) continue
    const jours = new Set(liste.map((s) => s.dayKey)).size
    const parJour = new Map<number, number>()
    for (const s of liste) if (s.jourCycle !== null) parJour.set(s.jourCycle, (parJour.get(s.jourCycle) ?? 0) + 1)
    const tri = [...parJour.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])
    const max = tri[0]?.[1] ?? 0
    const pics = tri.filter(([, n]) => n === max && max > 0).map(([j]) => j).sort((a, b) => a - b).slice(0, 3)
    tolerance.push({
      type: def.type,
      label: def.type === 'appetit' ? 'Manque d’appétit' : def.label,
      jours,
      intensite: moyenne(liste.map((s) => s.intensite)),
      moment: pics.length && p.frequence === 'hebdo' ? pics.map((j) => (j === 0 ? 'J0' : `J+${j}`)).join(', ') : null,
    })
  }
  tolerance.sort((a, b) => b.jours - a.jours)

  // Apports : moyennes sur les seuls jours renseignés, pour ne pas sous-estimer
  const logs = src.foodLogs.filter((l) => dansPeriode(l.dayKey))
  const parJour = new Map<string, FoodLog[]>()
  for (const l of logs) parJour.set(l.dayKey, [...(parJour.get(l.dayKey) ?? []), l])
  const totauxJour = [...parJour.values()].map((ls) => sum(ls.map((l) => l.apports)))
  const eau = src.water.filter((w) => dansPeriode(w.dayKey) && w.ml > 0)
  const repas: LigneRepas[] = LIBELLES_REPAS.map(({ id, label }) => {
    const parJourRepas = [...parJour.values()].map((ls) => ls.filter((l) => l.repas === id)).filter((ls) => ls.length > 0)
    return { repas: id, label, jours: parJourRepas.length, proteinesMoy: moyenne(parJourRepas.map((ls) => sum(ls.map((l) => l.apports)).proteines)) }
  })
  const repasParJour = moyenne([...parJour.values()].map((ls) => new Set(ls.map((l) => l.repas)).size))

  // Activité
  const seances = src.activities.filter((a) => dansPeriode(a.dayKey))
  const pas = src.steps.filter((s) => dansPeriode(s.dayKey) && s.pas > 0)

  return {
    debut, fin, nbJours, joursSuivis, debutSuivi, prenom: p.prenom,
    traitement: { molecule: p.moleculeNom, frequence: p.frequence, doseActuelle: p.doseActuelleMg, injections: injections.length, attendues, changements },
    poids: {
      depart: p.poidsDepartKg,
      debutPeriode,
      actuel,
      evolutionPeriode: debutPeriode !== null && actuel !== null ? actuel - debutPeriode : null,
      evolutionTotale: actuel !== null ? actuel - p.poidsDepartKg : null,
      points,
      tourTaille,
    },
    tolerance,
    joursAvecSymptome: new Set(symptomes.map((s) => s.dayKey)).size,
    apports: {
      joursRenseignes: parJour.size,
      proteinesMoy: moyenne(totauxJour.map((t) => t.proteines)),
      objectifProteines: p.objectifProteinesG,
      joursObjectifAtteint: totauxJour.filter((t) => t.proteines >= p.objectifProteinesG).length,
      fibresMoy: moyenne(totauxJour.map((t) => t.fibres)),
      objectifFibres: p.objectifFibresG,
      kcalMoy: moyenne(totauxJour.map((t) => t.kcal)),
      eauMoyL: eau.length ? moyenne(eau.map((w) => w.ml)) / 1000 : null,
      joursEauNotee: eau.length,
    },
    repas,
    repasParJour,
    activite: {
      seances: seances.length,
      minutesParSemaine: (seances.reduce((s, a) => s + a.dureeMin, 0) / Math.max(7, joursSuivis)) * 7,
      pasMoy: pas.length ? moyenne(pas.map((s) => s.pas)) : null,
      joursPas: pas.length,
    },
  }
}

export function intensiteLabel(x: number): string {
  if (x < 1.5) return 'légère'
  if (x < 2.5) return 'modérée'
  return 'forte'
}

export function periodeLabel(r: RapportData): string {
  const f = (k: string) => fromDayKey(k).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
  return `du ${f(r.debut)} au ${f(r.fin)}`
}
