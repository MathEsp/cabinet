import { useEffect, useRef, useState } from 'react'
import { Modal } from './ui'

type EtatCamera = 'attente' | 'active' | 'refusee' | 'indisponible'

/**
 * Lecture du code-barres avec la caméra arrière.
 * Si la caméra n'est pas disponible ou refusée, on peut taper le code à la main.
 */
export default function Scanner({ onCode, onClose, busy, message }: {
  onCode: (code: string) => void
  onClose: () => void
  busy: boolean
  message: string | null
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [manuel, setManuel] = useState('')
  const [etat, setEtat] = useState<EtatCamera>(() =>
    typeof navigator !== 'undefined' && 'mediaDevices' in navigator && typeof navigator.mediaDevices.getUserMedia === 'function'
      ? 'attente' : 'indisponible',
  )
  const [lu, setLu] = useState<string | null>(null)
  const onCodeRef = useRef(onCode)
  useEffect(() => { onCodeRef.current = onCode }, [onCode])

  useEffect(() => {
    if (!('mediaDevices' in navigator) || typeof navigator.mediaDevices.getUserMedia !== 'function') return
    let stream: MediaStream | null = null
    let timer: number | undefined
    let fini = false
    const arreter = () => {
      fini = true
      window.clearTimeout(timer)
      stream?.getTracks().forEach((t) => t.stop())
    }

    ;(async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        })
      } catch (e) {
        if (!fini) setEtat(e instanceof DOMException && e.name === 'NotAllowedError' ? 'refusee' : 'indisponible')
        return
      }
      if (fini) { stream.getTracks().forEach((t) => t.stop()); return }
      const video = videoRef.current
      if (!video) return
      video.srcObject = stream
      try { await video.play() } catch { /* lecture auto parfois différée */ }
      setEtat('active')
      const { creerLecteur } = await import('../lib/barcode')
      const lecteur = await creerLecteur()
      const tick = async () => {
        if (fini) return
        if (video.readyState >= 2 && video.videoWidth > 0) {
          try {
            const codes = await lecteur.detect(video)
            const code = codes.find((c) => /^\d{8,14}$/.test(c.rawValue))
            if (code) {
              setLu(code.rawValue)
              if (navigator.vibrate) navigator.vibrate(80)
              arreter()
              onCodeRef.current(code.rawValue)
              return
            }
          } catch { /* image pas encore prête : on réessaie */ }
        }
        timer = window.setTimeout(tick, 200)
      }
      tick()
    })()

    return arreter
  }, [])

  return (
    <Modal title="Scanner un produit" onClose={onClose}>
      {(etat === 'attente' || etat === 'active') && (
        <div style={{ position: 'relative' }}>
          <video ref={videoRef} className="video-scan" muted playsInline aria-label="Image de la caméra" />
          <div aria-hidden="true" style={{
            position: 'absolute', left: '12%', right: '12%', top: '35%', bottom: '35%',
            border: '3px solid rgba(255,255,255,0.9)', borderRadius: 12, boxShadow: '0 0 0 999px rgba(0,0,0,0.25)',
          }} />
        </div>
      )}
      {etat === 'attente' && <p className="petit">Autorise l’accès à la caméra quand ton téléphone le demande.</p>}
      {etat === 'active' && !lu && <p className="petit">Place le code-barres dans le cadre, à 10–15 cm, bien éclairé.</p>}
      {lu && <p style={{ fontWeight: 800 }}>Code lu : {lu}</p>}
      {etat === 'refusee' && (
        <p className="carte abricot" style={{ padding: 12, fontSize: 14 }}>
          L’accès à la caméra a été refusé. Pour l’autoriser : touche le cadenas à gauche de l’adresse (ou les réglages de
          l’app), puis « Autorisations » → « Caméra ». Tu peux aussi taper le code ci-dessous.
        </p>
      )}
      {etat === 'indisponible' && (
        <p className="petit">La caméra n’est pas disponible ici. Tape le code-barres (les chiffres sous les barres).</p>
      )}
      <form className="ligne" onSubmit={(e) => { e.preventDefault(); if (manuel.trim()) onCode(manuel.trim()) }}>
        <label className="champ pousse"><span className="sr-only">Code-barres</span>
          <input inputMode="numeric" value={manuel} onChange={(e) => setManuel(e.target.value)} placeholder="ou tape le code, ex. 3017620422003" />
        </label>
        <button type="submit" className="btn" disabled={busy}>Chercher</button>
      </form>
      {busy && <p className="petit" role="status">Recherche du produit dans Open Food Facts…</p>}
      {message && <p role="alert" style={{ fontWeight: 700, color: 'var(--abricot-fonce)' }}>{message}</p>}
      <p className="petit">Seul le code-barres est envoyé à Open Food Facts, une base publique et gratuite.</p>
    </Modal>
  )
}
