import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parseTable, searchFoods } from '../data/ciqual'
import type { Injection } from '../db'
import { cycleDay, suggestSite } from './injection'
import { defaultProteinTarget, forGrams, scale } from './nutrition'
import { computeSocle } from './socle'
import { fmt, normalize, parseNumber } from './text'

const table = parseTable(JSON.parse(readFileSync(new URL('../../public/ciqual.json', import.meta.url), 'utf8')))

function inj(dayKey: string, site: string): Injection {
  return { date: `${dayKey}T09:00:00.000Z`, dayKey, moleculeNom: 'Mounjaro', doseMg: 5, site, note: '' }
}

describe('texte', () => {
  it('normalise accents et ligatures', () => {
    expect(normalize('Œuf dur, Pâtes')).toBe('oeuf dur pates')
  })
  it('formate à la française', () => {
    expect(fmt(6.64)).toBe('6,6')
    expect(fmt(25.5)).toBe('26')
    expect(parseNumber('84,5')).toBe(84.5)
    expect(parseNumber('')).toBeNull()
  })
})

describe('table Ciqual', () => {
  it('contient toute la table', () => {
    expect(table.length).toBe(3186)
  })
  it('trouve le steak haché cuit en premier', () => {
    const r = searchFoods(table, 'steak haché 5%')
    expect(r[0].nom).toBe('Boeuf, steak haché 5% MG, cuit')
  })
  it('trouve les haricots verts cuits avec une saisie partielle', () => {
    const r = searchFoods(table, 'hari vert')
    expect(r[0].nom).toBe('Haricot vert, cuit')
  })
  it('respecte la demande « cru »', () => {
    const r = searchFoods(table, 'steak haché 5% cru')
    expect(r[0].nom).toBe('Boeuf, steak haché 5% MG, cru')
  })
  it('estime l’énergie quand elle manque', () => {
    const lentille = table.find((f) => f.code === 20505)!
    expect(lentille.per100g.kcal).toBeGreaterThan(80)
  })
})

describe('calculs nutritionnels', () => {
  it('200 g de haricots verts apportent 8 g de fibres', () => {
    const hv = table.find((f) => f.nom === 'Haricot vert, cuit')!
    expect(forGrams(hv.per100g, 200).fibres).toBeCloseTo(8, 5)
  })
  it('100 g de steak haché 5 % cuit apportent 25,5 g de protéines', () => {
    const steak = table.find((f) => f.code === 6251)!
    expect(forGrams(steak.per100g, 100).proteines).toBeCloseTo(25.5, 5)
  })
  it('multiplie les portions de compléments', () => {
    expect(scale({ kcal: 220, proteines: 20, glucides: 18, lipides: 7, fibres: 3 }, 2).proteines).toBe(40)
  })
  it('objectif protéines : 1,2 g/kg, poids ajusté si IMC > 30', () => {
    expect(defaultProteinTarget(70, 175)).toBe(85)
    const obese = defaultProteinTarget(120, 170)
    expect(obese).toBeLessThan(120 * 1.2)
    expect(obese).toBeGreaterThan(90)
  })
})

describe('injections', () => {
  it('calcule le jour du cycle', () => {
    expect(cycleDay([inj('2026-11-22', 'ventre-g')], new Date(2026, 10, 24))).toBe(2)
    expect(cycleDay([], new Date())).toBeNull()
  })
  it('suggère une zone jamais utilisée, sinon la plus ancienne', () => {
    const today = new Date(2026, 10, 24)
    expect(suggestSite([inj('2026-11-22', 'ventre-g')], today)).toBe('ventre-d')
    const all = [
      inj('2026-11-22', 'ventre-g'), inj('2026-11-15', 'ventre-d'), inj('2026-10-01', 'cuisse-g'),
      inj('2026-11-08', 'cuisse-d'), inj('2026-11-01', 'bras-g'), inj('2026-10-25', 'bras-d'),
    ]
    expect(suggestSite(all, today)).toBe('cuisse-g')
  })
})

describe('socle', () => {
  it('compte une brique par bonne habitude', () => {
    const apports = { kcal: 0, proteines: 50, glucides: 0, lipides: 0, fibres: 0 }
    const log = (dayKey: string) => ({ dayKey, repas: 'dejeuner' as const, ref: 'x', nom: 'x', quantite: 1, unite: 'g', apports, createdAt: '' })
    const r = computeSocle({
      foodLogs: [log('2026-11-01'), log('2026-11-01'), log('2026-11-02')],
      water: [{ dayKey: '2026-11-01', ml: 2000 }, { dayKey: '2026-11-02', ml: 1000 }],
      injections: [inj('2026-11-01', 'ventre-g')],
      objectifProteinesG: 90,
      objectifEauMl: 2000,
    })
    expect(r).toEqual({ briques: 3, joursProteines: 1, joursEau: 1, injections: 1, seances: 0 })
  })
})

describe('portions habituelles', async () => {
  const { portionsFor } = await import('../data/portions')
  it('propose des portions parlantes', () => {
    expect(portionsFor('Oeuf, dur')[0]).toEqual({ label: '1 œuf', g: 50 })
    expect(portionsFor('Boeuf, steak haché 5% MG, cuit')[0].label).toBe('1 steak haché')
    expect(portionsFor('Poulet, filet, sans peau, sauté/poêlé')[0].label).toBe('1 filet')
    expect(portionsFor('Haricot vert, cuit')[0]).toEqual({ label: '1 portion', g: 200 })
    expect(portionsFor("Riz blanc, cuit, non salé")[0].label).toBe('1 petite assiette')
    expect(portionsFor('Jambon cuit, supérieur')[0].label).toBe('1 tranche')
  })
  it('ne confond pas pomme et pomme de terre', () => {
    expect(portionsFor('Pomme de terre, cuite à la vapeur')[0].label).toBe('1 pomme de terre')
    expect(portionsFor('Pomme, crue, pulpe et peau')[0].label).toBe('1 pomme')
  })
  it('ne propose rien quand il ne sait pas', () => {
    expect(portionsFor('Huile d’olive vierge extra')).toEqual([])
  })
})
