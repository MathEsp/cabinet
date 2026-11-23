export type Frequence = 'hebdo' | 'quotidien'

export interface Molecule {
  id: string
  nom: string
  principe: string
  frequence: Frequence
  /** Paliers usuels (mg) proposés comme raccourcis. Ce ne sont pas des conseils de dose. */
  paliers: number[]
}

/**
 * Molécules proposées à la saisie. L'app enregistre ce que la personne fait,
 * elle ne conseille jamais de dose : c'est le médecin qui prescrit.
 */
export const MOLECULES: Molecule[] = [
  { id: 'mounjaro', nom: 'Mounjaro', principe: 'tirzépatide', frequence: 'hebdo', paliers: [2.5, 5, 7.5, 10, 12.5, 15] },
  { id: 'wegovy', nom: 'Wegovy', principe: 'sémaglutide', frequence: 'hebdo', paliers: [0.25, 0.5, 1, 1.7, 2.4] },
  { id: 'ozempic', nom: 'Ozempic', principe: 'sémaglutide', frequence: 'hebdo', paliers: [0.25, 0.5, 1, 2] },
  { id: 'saxenda', nom: 'Saxenda', principe: 'liraglutide', frequence: 'quotidien', paliers: [0.6, 1.2, 1.8, 2.4, 3] },
  { id: 'retatrutide', nom: 'Rétatrutide', principe: 'rétatrutide (expérimental)', frequence: 'hebdo', paliers: [] },
  { id: 'autre', nom: 'Autre molécule', principe: 'à préciser', frequence: 'hebdo', paliers: [] },
]

export function findMolecule(id: string): Molecule {
  return MOLECULES.find((m) => m.id === id) ?? MOLECULES[MOLECULES.length - 1]
}

export interface Site {
  id: string
  nom: string
}

export const SITES: Site[] = [
  { id: 'ventre-g', nom: 'Ventre gauche' },
  { id: 'ventre-d', nom: 'Ventre droit' },
  { id: 'cuisse-g', nom: 'Cuisse gauche' },
  { id: 'cuisse-d', nom: 'Cuisse droite' },
  { id: 'bras-g', nom: 'Bras gauche' },
  { id: 'bras-d', nom: 'Bras droit' },
]

export function siteName(id: string): string {
  return SITES.find((s) => s.id === id)?.nom ?? id
}
