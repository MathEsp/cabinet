import type { Nutrients } from '../lib/nutrition'

export interface Supplement {
  id: string
  nom: string
  /** Description de la portion, affichée sous le nom. */
  portion: string
  /** Mot pour compter les portions : « dose », « barre »… */
  unite: string
  /** Apports pour UNE portion. */
  parPortion: Nutrients
  conseil?: string
}

/**
 * Valeurs moyennes indicatives (étiquettes courantes du commerce).
 * Pour une marque précise, l'utilisateur scanne le code-barres ou saisit l'étiquette.
 */
export const SUPPLEMENTS: Supplement[] = [
  {
    id: 'whey-eau',
    nom: 'Shaker whey, dans l’eau',
    portion: '1 dose = 30 g de poudre',
    unite: 'dose',
    parPortion: { kcal: 116, proteines: 23, glucides: 2, lipides: 1.5, fibres: 0 },
    conseil: 'Si le lait te ballonne, préfère une whey « isolate », pauvre en lactose.',
  },
  {
    id: 'whey-lait',
    nom: 'Shaker whey, au lait demi-écrémé',
    portion: '30 g de poudre + 25 cl de lait',
    unite: 'shaker',
    parPortion: { kcal: 231, proteines: 31, glucides: 14, lipides: 5.5, fibres: 0 },
  },
  {
    id: 'barre',
    nom: 'Barre protéinée (moyenne)',
    portion: '1 barre = 60 g',
    unite: 'barre',
    parPortion: { kcal: 220, proteines: 20, glucides: 18, lipides: 7, fibres: 3 },
    conseil: 'Certaines barres contiennent des polyols (maltitol…) qui peuvent ballonner : vas-y doucement.',
  },
  {
    id: 'boisson',
    nom: 'Boisson protéinée prête à boire',
    portion: '1 bouteille = 25 cl',
    unite: 'bouteille',
    parPortion: { kcal: 140, proteines: 25, glucides: 6, lipides: 1.5, fibres: 0 },
  },
  {
    id: 'creme',
    nom: 'Crème dessert hyperprotéinée',
    portion: '1 pot = 200 g',
    unite: 'pot',
    parPortion: { kcal: 150, proteines: 20, glucides: 12, lipides: 2, fibres: 0 },
  },
]
