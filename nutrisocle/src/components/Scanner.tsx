import { useEffect, useRef, useState } from 'react'
import { Modal } from './ui'

interface DetectedBarcode { rawValue: string }
interface BarcodeDetectorLike { detect(source: HTMLVideoElement): Promise<DetectedBarcode[]> }
type BarcodeDetectorCtor = new (opts?: { formats?: string[] }) => BarcodeDetectorLike

/**
 * Lecteur de code-barres avec la caméra (API BarcodeDetector, disponible dans Chrome sur Android).
 * Si la caméra n'est pas disponible, on peut taper le code à la main.
 */
export default function Scanner({ onCode, onClose, busy, message }: {
  onCode: (code: string) => void
  onClose: () => void
  busy: boolean
  message: string | null
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [manuel, setManuel] = useState('')
  const [etatCamera, setEtatCamera] = useState<'attente' | 'active' | 'indisponible'>('attente')
  const onCodeRef = useRef(onCode)
  useEffect(() => { onCodeRef.current = onCode }, [onCode])

  useEffect(() => {
    const Detector = (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector
    if (!Detector || !navigator.mediaDevices?.getUserMedia) {
      setEtatCamera('indisponible')
      return
    }
    let stream: MediaStream | null = null
    let timer: number | undefined
    let fini = false
    const detector = new Detector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'] })
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' } })
      .then(async (s) => {
        if (fini) { s.getTracks().forEach((t) => t.stop()); return }
        stream = s
        const video = videoRef.current
        if (!video) return
        video.srcObject = s
        await video.play()
        setEtatCamera('active')
        const tick = async () => {
          if (fini) return
          try {
            const codes = await detector.detect(video)
            if (codes.length > 0) {
              fini = true
              stream?.getTracks().forEach((t) => t.stop())
              onCodeRef.current(codes[0].rawValue)
              return
            }
          } catch { /* image pas encore prête */ }
          timer = window.setTimeout(tick, 250)
        }
        tick()
      })
      .catch(() => setEtatCamera('indisponible'))
    return () => {
      fini = true
      window.clearTimeout(timer)
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  return (
    <Modal title="Scanner un produit" onClose={onClose}>
      {etatCamera !== 'indisponible' && (
        <video ref={videoRef} className="video-scan" muted playsInline aria-label="Image de la caméra" />
      )}
      {etatCamera === 'attente' && <p className="petit">Autorise l’accès à la caméra, puis vise le code-barres.</p>}
      {etatCamera === 'active' && <p className="petit">Vise le code-barres de ta barre, de ta whey ou de ton produit.</p>}
      {etatCamera === 'indisponible' && (
        <p className="petit">La caméra n’est pas disponible ici. Tape le code-barres (les chiffres sous les barres).</p>
      )}
      <form className="ligne" onSubmit={(e) => { e.preventDefault(); if (manuel.trim()) onCode(manuel.trim()) }}>
        <label className="champ pousse"><span className="sr-only">Code-barres</span>
          <input inputMode="numeric" value={manuel} onChange={(e) => setManuel(e.target.value)} placeholder="Code-barres, ex. 3017620422003" />
        </label>
        <button type="submit" className="btn" disabled={busy}>Chercher</button>
      </form>
      {busy && <p className="petit" role="status">Recherche dans Open Food Facts…</p>}
      {message && <p role="alert" style={{ fontWeight: 700, color: 'var(--abricot-fonce)' }}>{message}</p>}
      <p className="petit">Seul le code-barres est envoyé à Open Food Facts, une base publique et gratuite.</p>
    </Modal>
  )
}
