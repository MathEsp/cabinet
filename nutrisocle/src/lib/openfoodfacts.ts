import type { CustomFood } from '../db'

interface OffResponse {
  status: number
  product?: {
    product_name?: string
    product_name_fr?: string
    brands?: string
    serving_size?: string
    serving_quantity?: number | string
    nutriments?: Record<string, number | string | undefined>
  }
}

function n(value: number | string | undefined): number {
  const v = typeof value === 'string' ? Number(value.replace(',', '.')) : value
  return typeof v === 'number' && Number.isFinite(v) ? v : 0
}

/**
 * Cherche un produit par code-barres dans Open Food Facts (base publique et gratuite).
 * Seul le code-barres est envoyé, aucune donnée personnelle.
 */
export async function fetchProduct(barcode: string): Promise<CustomFood | null> {
  const code = barcode.replace(/\D/g, '')
  if (code.length < 8) throw new Error('Code-barres trop court.')
  const url = `https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=product_name,product_name_fr,brands,serving_size,serving_quantity,nutriments`
  const res = await fetch(url)
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`Open Food Facts ne répond pas (${res.status}).`)
  const data = (await res.json()) as OffResponse
  if (data.status !== 1 || !data.product) return null
  const p = data.product
  const nut = p.nutriments ?? {}
  const portionG = n(p.serving_quantity) || null
  return {
    nom: p.product_name_fr || p.product_name || `Produit ${code}`,
    marque: (p.brands ?? '').split(',')[0].trim(),
    codeBarres: code,
    base: '100g',
    portionLibelle: p.serving_size ?? '',
    portionG,
    apports: {
      kcal: n(nut['energy-kcal_100g']) || n(nut['energy_100g']) / 4.184,
      proteines: n(nut['proteins_100g']),
      glucides: n(nut['carbohydrates_100g']),
      lipides: n(nut['fat_100g']),
      fibres: n(nut['fiber_100g']),
    },
    source: 'openfoodfacts',
  }
}
