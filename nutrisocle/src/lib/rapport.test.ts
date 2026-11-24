import { writeFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { Activity, FoodLog, Injection, Profile, Repas, Symptom, WeightEntry } from '../db'
import { addDays, dayKey } from './dates'
import { construireRapport, type RapportSource } from './rapport'
import { genererPdf } from './rapportPdf'

const AUJ = new Date(2026, 10, 24) // 24 novembre 2026, un mardi
const k = (offset: number) => dayKey(addDays(AUJ, offset))

const profile: Profile = {
  id: 'me', prenom: 'Camille', tailleCm: 170, poidsDepartKg: 98, dateDebut: k(-60), moleculeId: 'mounjaro', moleculeNom: 'Mounjaro',
  frequence: 'hebdo', doseActuelleMg: 7.5, jourInjection: 0, objectifProteinesG: 95, objectifFibresG: 30, objectifEauMl: 2000,
  avertissementAccepte: true,
}

function source(): RapportSource {
  const injections: Injection[] = []
  // Une injection chaque dimanche pendant 8 semaines ; passage de 5 à 7,5 mg il y a 9 jours.
  for (let w = 8; w >= 0; w--) {
    const d = addDays(AUJ, -2 - 7 * w)
    injections.push({ date: d.toISOString(), dayKey: dayKey(d), moleculeNom: 'Mounjaro', doseMg: w <= 1 ? 7.5 : 5, site: 'ventre-g', note: '' })
  }
  const weights: WeightEntry[] = [
    { dayKey: k(-35), kg: 92.4 }, { dayKey: k(-27), kg: 91.6, tourTailleCm: 104 }, { dayKey: k(-20), kg: 90.9 },
    { dayKey: k(-13), kg: 90.1 }, { dayKey: k(-6), kg: 89.6 }, { dayKey: k(0), kg: 89.2, tourTailleCm: 100 },
  ]
  const symptoms: Symptom[] = []
  // Nausées à J+1 chaque semaine (4 jours, dont un noté deux fois), constipation 3 fois.
  for (let w = 0; w < 4; w++) symptoms.push({ dayKey: k(-1 - 7 * w), type: 'nausees', intensite: w === 0 ? 3 : 2, jourCycle: 1 })
  symptoms.push({ dayKey: k(-8), type: 'nausees', intensite: 1, jourCycle: 2 })
  for (const o of [-4, -11, -18]) symptoms.push({ dayKey: k(o), type: 'constipation', intensite: 2, jourCycle: 3 })
  const foodLogs: FoodLog[] = []
  const log = (o: number, repas: Repas, proteines: number, fibres: number, kcal: number) =>
    foodLogs.push({ dayKey: k(o), repas, ref: 'x', nom: 'x', quantite: 1, unite: 'portion', apports: { kcal, proteines, glucides: 0, lipides: 0, fibres }, createdAt: '' })
  for (let o = -20; o <= 0; o++) {
    if (o % 3 !== 0) log(o, 'petit-dejeuner', 20, 3, 300) // petit-déjeuner sauté un jour sur trois
    log(o, 'dejeuner', 35, 8, 550)
    log(o, 'diner', 28, 7, 450)
    if (o % 2 === 0) log(o, 'collation', 15, 1, 150)
  }
  const activities: Activity[] = [-2, -5, -9, -12, -16, -19, -23].map((o) => ({
    dayKey: k(o), date: addDays(AUJ, o).toISOString(), type: 'maison', titre: 'Renfo débutant', dureeMin: 20, ressenti: 2, exercices: [],
  }))
  return {
    profile, weights, injections, foodLogs, symptoms, activities,
    water: Array.from({ length: 14 }, (_, i) => ({ dayKey: k(-i), ml: 1500 })),
    steps: Array.from({ length: 10 }, (_, i) => ({ dayKey: k(-i), pas: 6000 + i * 100 })),
  }
}

describe('rapport de suivi', () => {
  const r = construireRapport(source(), 28, AUJ)

  it('ne compte pas d’injections « manquées » avant le début du suivi', () => {
    const src = source()
    const nouveau = construireRapport({ ...src, profile: { ...profile, dateDebut: k(-2) }, injections: src.injections.slice(-1), weights: [{ dayKey: k(-2), kg: 92 }] }, 28, AUJ)
    expect(nouveau.joursSuivis).toBe(3)
    expect(nouveau.traitement.injections).toBe(1)
    expect(nouveau.traitement.attendues).toBe(1)
  })

  it('résume le traitement', () => {
    expect(r.traitement.injections).toBe(4)
    expect(r.traitement.attendues).toBe(4)
    expect(r.traitement.changements).toHaveLength(1)
    expect(r.traitement.changements[0]).toMatchObject({ de: 5, a: 7.5 })
  })

  it('suit le poids sur la période et depuis le début', () => {
    expect(r.poids.debutPeriode).toBe(92.4)
    expect(r.poids.actuel).toBe(89.2)
    expect(r.poids.evolutionPeriode).toBeCloseTo(-3.2, 5)
    expect(r.poids.evolutionTotale).toBeCloseTo(-8.8, 5)
    expect(r.poids.tourTaille).toEqual({ debut: 104, fin: 100 })
  })

  it('repère le moment du cycle où reviennent les symptômes', () => {
    expect(r.tolerance[0]).toMatchObject({ type: 'nausees', jours: 4, moment: 'J+1' })
    expect(r.tolerance[1]).toMatchObject({ type: 'constipation', jours: 3 })
    expect(r.joursAvecSymptome).toBe(7)
  })

  it('calcule les apports sur les seuls jours renseignés', () => {
    expect(r.apports.joursRenseignes).toBe(21)
    expect(r.apports.proteinesMoy).toBeGreaterThan(75)
    expect(r.apports.proteinesMoy).toBeLessThan(85)
  })

  it('mesure la fréquence des repas', () => {
    const pdj = r.repas.find((l) => l.repas === 'petit-dejeuner')!
    expect(pdj.jours).toBe(14)
    expect(r.repasParJour).toBeGreaterThan(3)
    expect(r.repasParJour).toBeLessThan(3.3)
  })

  it('résume l’activité', () => {
    expect(r.activite.seances).toBe(7)
    expect(r.activite.minutesParSemaine).toBeCloseTo(35, 5)
    expect(r.activite.pasMoy).toBe(6450)
  })

  it('produit un PDF d’une page', () => {
    const blob = genererPdf(r, {
      destinataire: { prenom: 'Claire', nom: 'Martin', role: 'Médecin généraliste', email: '', telephone: '' },
      questions: 'Est-ce que je peux rester à 7,5 mg encore un mois ?\nLes nausées de J+1 sont-elles normales, et que faire si elles durent ?',
      genereLe: AUJ,
    })
    expect(blob.size).toBeGreaterThan(3000)
    if (process.env.RAPPORT_PDF) blob.arrayBuffer().then((b) => writeFileSync(process.env.RAPPORT_PDF!, Buffer.from(b)))
  })
})
