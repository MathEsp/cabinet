/** Met un texte en minuscules, sans accents, pour comparer et rechercher. */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9%]+/g, ' ')
    .trim()
}

/** Affiche un nombre « à la française » : 1 décimale sous 10, entier au-dessus. */
export function fmt(value: number): string {
  if (!Number.isFinite(value)) return '0'
  const rounded = Math.abs(value) >= 10 ? Math.round(value) : Math.round(value * 10) / 10
  return String(rounded).replace('.', ',')
}

/** Affiche toujours au dixième près (poids, doses) : 104,5 kg, 12,5 mg. */
export function fmt1(value: number): string {
  if (!Number.isFinite(value)) return '0'
  return String(Math.round(value * 10) / 10).replace('.', ',')
}

/** Lit un nombre saisi avec une virgule ou un point. */
export function parseNumber(input: string): number | null {
  const cleaned = input.trim().replace(',', '.')
  if (cleaned === '') return null
  const value = Number(cleaned)
  return Number.isFinite(value) ? value : null
}
