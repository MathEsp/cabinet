/** Clé de jour locale au format AAAA-MM-JJ. */
export function dayKey(date: Date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function fromDayKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** Nombre de jours calendaires entre deux dates (b - a). */
export function daysBetween(a: Date, b: Date): number {
  const start = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime()
  const end = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime()
  return Math.round((end - start) / 86_400_000)
}

export function addDays(date: Date, days: number): Date {
  const copy = new Date(date)
  copy.setDate(copy.getDate() + days)
  return copy
}

export const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']
export const JOURS_COURTS = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.']
const MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']
const MOIS_LONGS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']

/** « jeu. 26 nov. » */
export function shortDate(date: Date): string {
  return `${JOURS_COURTS[date.getDay()]} ${date.getDate()} ${MOIS[date.getMonth()]}`
}

/** « Jeudi 26 novembre » */
export function longDate(date: Date): string {
  const jour = JOURS[date.getDay()]
  return `${jour.charAt(0).toUpperCase()}${jour.slice(1)} ${date.getDate()} ${MOIS_LONGS[date.getMonth()]}`
}

/** « il y a 4 jours », « aujourd'hui »… */
export function relativeDays(days: number): string {
  if (days <= 0) return "aujourd'hui"
  if (days === 1) return 'hier'
  if (days < 14) return `il y a ${days} jours`
  const weeks = Math.round(days / 7)
  return `il y a ${weeks} semaines`
}
