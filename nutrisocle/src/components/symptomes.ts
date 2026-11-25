import type { SymptomType } from '../db'

export const SYMPTOMES: { type: SymptomType; label: string; conseil: string }[] = [
  { type: 'nausees', label: 'Nausées', conseil: 'Fractionne en petites portions, évite le gras et bois par petites gorgées, frais.' },
  { type: 'constipation', label: 'Constipation', conseil: 'Pense à l’eau, aux fibres (kiwis, pruneaux, légumes cuits) et à une petite marche.' },
  { type: 'appetit', label: 'Pas faim', conseil: 'Commence par la part protéinée de ton assiette, ou un shaker si rien ne passe.' },
  { type: 'reflux', label: 'Reflux', conseil: 'Mange lentement, évite de t’allonger juste après le repas.' },
  { type: 'diarrhee', label: 'Diarrhée', conseil: 'Hydrate-toi bien. Si ça dure ou s’accompagne de fièvre, parles-en à ton médecin.' },
  { type: 'fatigue', label: 'Fatigue', conseil: 'Écoute ton corps : une séance douce ou du repos, c’est très bien aussi.' },
]

export function symptomLabel(type: SymptomType): string {
  return SYMPTOMES.find((s) => s.type === type)?.label ?? type
}
