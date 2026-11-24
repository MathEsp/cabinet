import { BarcodeDetector as LecteurZxing, prepareZXingModule } from 'barcode-detector/ponyfill'
import wasmUrl from 'zxing-wasm/reader/zxing_reader.wasm?url'

export interface Lecteur {
  detect(source: HTMLVideoElement): Promise<{ rawValue: string }[]>
}

const FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e'] as const

// Le moteur de lecture est fourni avec l'app (pas de téléchargement depuis un site tiers).
prepareZXingModule({
  overrides: {
    locateFile: (path: string, prefix: string) => (path.endsWith('.wasm') ? wasmUrl : prefix + path),
  },
})

type NativeCtor = {
  new (opts: { formats: string[] }): Lecteur
  getSupportedFormats(): Promise<string[]>
}

/**
 * Lecteur de code-barres : celui d'Android (Chrome) quand il gère les codes produits,
 * sinon un lecteur intégré qui fonctionne sur tous les téléphones.
 */
export async function creerLecteur(): Promise<Lecteur> {
  const Native = (window as unknown as { BarcodeDetector?: NativeCtor }).BarcodeDetector
  if (Native) {
    try {
      const formats = await Native.getSupportedFormats()
      if (FORMATS.some((f) => formats.includes(f))) return new Native({ formats: [...FORMATS] })
    } catch {
      /* on passe au lecteur intégré */
    }
  }
  return new LecteurZxing({ formats: [...FORMATS] })
}
