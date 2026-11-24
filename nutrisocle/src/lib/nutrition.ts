export interface Nutrients {
  kcal: number
  proteines: number
  glucides: number
  lipides: number
  fibres: number
}

export const ZERO: Nutrients = { kcal: 0, proteines: 0, glucides: 0, lipides: 0, fibres: 0 }

/** Apports pour une quantité donnée, à partir de valeurs pour 100 g. */
export function forGrams(per100g: Nutrients, grams: number): Nutrients {
  return scale(per100g, grams / 100)
}

export function scale(n: Nutrients, factor: number): Nutrients {
  return {
    kcal: n.kcal * factor,
    proteines: n.proteines * factor,
    glucides: n.glucides * factor,
    lipides: n.lipides * factor,
    fibres: n.fibres * factor,
  }
}

export function sum(list: Nutrients[]): Nutrients {
  return list.reduce(
    (acc, n) => ({
      kcal: acc.kcal + n.kcal,
      proteines: acc.proteines + n.proteines,
      glucides: acc.glucides + n.glucides,
      lipides: acc.lipides + n.lipides,
      fibres: acc.fibres + n.fibres,
    }),
    { ...ZERO },
  )
}

/**
 * Objectif protéines par défaut : 1,2 g par kg.
 * En cas d'IMC > 30, on utilise le poids « ajusté » (poids idéal à IMC 25
 * + 40 % de l'excédent), pour ne pas surestimer l'objectif.
 * L'utilisateur ou son soignant peut toujours le modifier.
 */
export function defaultProteinTarget(weightKg: number, heightCm: number): number {
  if (!weightKg || weightKg <= 0) return 80
  let reference = weightKg
  if (heightCm > 0) {
    const h = heightCm / 100
    const bmi = weightKg / (h * h)
    if (bmi > 30) {
      const ideal = 25 * h * h
      reference = ideal + 0.4 * (weightKg - ideal)
    }
  }
  return Math.round((reference * 1.2) / 5) * 5
}

export const DEFAULT_FIBRES_G = 30
export const DEFAULT_EAU_ML = 2000
