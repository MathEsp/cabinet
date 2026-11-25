import { describe, expect, it } from 'vitest'
import { BADGES, badgesObtenus, calculerStats } from '../data/badges'
import type { Profile } from '../db'
import { addDays, dayKey } from './dates'
import type { Donnees } from './donnees'
import { bilanHabitudes, conseilDeLaSemaine, etatZone, scoreHabitudes, semaineDepuis } from './maintien'

const AUJ = new Date(2026, 10, 24)
const k = (o: number) => dayKey(addDays(AUJ, o))
const profile: Profile = {
  id: 'me', prenom: 'Test', tailleCm: 170, poidsDepartKg: 98, dateDebut: k(-60), moleculeId: 'mounjaro', moleculeNom: 'Mounjaro',
  frequence: 'hebdo', doseActuelleMg: 5, jourInjection: 0, objectifProteinesG: 90, objectifFibresG: 30, objectifEauMl: 2000,
  avertissementAccepte: true,
}
const vide = (): Donnees => ({
  profile, weights: [], injections: [], foodLogs: [], water: [], symptoms: [], activities: [], steps: [], mealTemplates: [], faim: [], badges: [],
})
const repas = (o: number, proteines: number, r: 'petit-dejeuner' | 'dejeuner' | 'diner' = 'dejeuner') => ({
  dayKey: k(o), repas: r, ref: 'x', nom: 'x', quantite: 1, unite: 'portion', apports: { kcal: 0, proteines, glucides: 0, lipides: 0, fibres: 0 }, createdAt: '',
})

describe('badges', () => {
  it('aucun badge au départ', () => {
    expect(badgesObtenus(calculerStats(vide(), AUJ))).toEqual([])
  })

  it('chaque badge a une phrase et un moyen de l’obtenir', () => {
    for (const b of BADGES) {
      expect(b.phrase.length).toBeGreaterThan(20)
      expect(b.comment.length).toBeGreaterThan(5)
    }
    expect(new Set(BADGES.map((b) => b.id)).size).toBe(BADGES.length)
  })

  it('récompense les habitudes : protéines, injections, séances', () => {
    const d = vide()
    d.injections = [{ date: AUJ.toISOString(), dayKey: k(0), moleculeNom: 'M', doseMg: 5, site: 'ventre-g', note: '' }]
    d.foodLogs = Array.from({ length: 7 }, (_, i) => repas(-i, 95))
    d.activities = [{ dayKey: k(0), date: AUJ.toISOString(), type: 'maison', titre: 'x', dureeMin: 20, ressenti: 2, exercices: [] }]
    const ids = badgesObtenus(calculerStats(d, AUJ)).map((b) => b.id)
    expect(ids).toEqual(expect.arrayContaining(['premiere-injection', 'proteines-1', 'proteines-7', 'seance-1', 'suivi-7']))
    expect(ids).not.toContain('proteines-30')
  })

  it('« jour difficile, mais présent » : symptôme modéré et eau ou repas notés', () => {
    const d = vide()
    d.symptoms = [{ dayKey: k(0), type: 'nausees', intensite: 2, jourCycle: 1 }]
    expect(calculerStats(d, AUJ).joursDifficilesPresents).toBe(0)
    d.water = [{ dayKey: k(0), ml: 1250 }]
    expect(calculerStats(d, AUJ).joursDifficilesPresents).toBe(1)
  })

  it('ne récompense jamais la perte de poids elle-même', () => {
    const d = vide()
    d.weights = [{ dayKey: k(-30), kg: 98 }, { dayKey: k(0), kg: 80 }]
    const ids = badgesObtenus(calculerStats(d, AUJ)).map((b) => b.id)
    expect(ids).toEqual([]) // 2 pesées seulement : pas même le badge de pesée régulière
  })

  it('maintien : jours dans la zone depuis l’arrêt', () => {
    const d = vide()
    d.profile = { ...profile, phase: 'arret', datePhase: k(-35), poidsReferenceKg: 80, zoneStabiliteKg: 2 }
    d.weights = [{ dayKey: k(0), kg: 81.5 }]
    const s = calculerStats(d, AUJ)
    expect(s.joursMaintienDansZone).toBe(35)
    expect(badgesObtenus(s).map((b) => b.id)).toContain('maintien-30')
    d.weights = [{ dayKey: k(0), kg: 82.5 }]
    expect(calculerStats(d, AUJ).joursMaintienDansZone).toBe(0)
  })
})

describe('après le traitement', () => {
  it('situe le poids par rapport à la zone', () => {
    const base = { profile: { ...profile, poidsReferenceKg: 80, zoneStabiliteKg: 2 } }
    expect(etatZone({ ...base, weights: [{ dayKey: k(0), kg: 81.9 }] }).statut).toBe('dans')
    expect(etatZone({ ...base, weights: [{ dayKey: k(0), kg: 82.4 }] }).statut).toBe('au-dessus')
    expect(etatZone({ ...base, weights: [{ dayKey: k(0), kg: 77.5 }] }).statut).toBe('en-dessous')
    expect(etatZone({ ...base, weights: [] }).statut).toBeNull()
  })

  it('compte les semaines et donne un conseil par semaine', () => {
    expect(semaineDepuis(k(0), AUJ)).toBe(1)
    expect(semaineDepuis(k(-7), AUJ)).toBe(2)
    expect(conseilDeLaSemaine(1).numero).toBe(1)
    expect(conseilDeLaSemaine(40).numero).toBe(12)
  })

  it('bilan des habitudes : solide, à renforcer, ou pas assez de données', () => {
    const d = vide()
    expect(bilanHabitudes(d, AUJ).find((h) => h.id === 'proteines')!.niveau).toBe('inconnu')
    for (let o = 0; o > -20; o--) {
      d.foodLogs.push(repas(o, 50, 'petit-dejeuner'), repas(o, 30, 'dejeuner'), repas(o, 30, 'diner'))
    }
    d.activities = Array.from({ length: 8 }, (_, i) => ({ dayKey: k(-i * 3), date: '', type: 'maison' as const, titre: 'x', dureeMin: 20, ressenti: 2 as const, exercices: [] }))
    d.weights = [0, -7, -14, -21].map((o) => ({ dayKey: k(o), kg: 85 }))
    const bilan = bilanHabitudes(d, AUJ)
    const niv = Object.fromEntries(bilan.map((h) => [h.id, h.niveau]))
    expect(niv).toMatchObject({ proteines: 'solide', repas: 'solide', activite: 'solide', pesee: 'solide', hydratation: 'inconnu' })
    expect(scoreHabitudes(bilan)).toBe(4)
  })
})
