import { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { BADGES, badgesObtenus, calculerStats } from '../data/badges'
import { db } from '../db'
import { useDonnees } from '../hooks'
import Medaille from './Medaille'
import { Modal } from './ui'

/**
 * Surveille les données : quand une bonne habitude débloque un badge, il est enregistré
 * et une petite célébration s'affiche (désactivable dans la page des badges).
 */
export default function BadgeWatcher() {
  const d = useDonnees()
  const navigate = useNavigate()

  const nouveaux = useMemo(() => {
    if (!d) return []
    const deja = new Set(d.badges.map((b) => b.id))
    return badgesObtenus(calculerStats(d)).filter((b) => !deja.has(b.id))
  }, [d])

  useEffect(() => {
    if (!d || nouveaux.length === 0) return
    const celebrer = d.profile.celebrations !== false
    const now = new Date().toISOString()
    db.badges.bulkPut(nouveaux.map((b) => ({ id: b.id, obtenuLe: now, vu: !celebrer }))).catch(() => {})
  }, [d, nouveaux])

  if (!d) return null
  const aCelebrer = d.badges
    .filter((b) => !b.vu)
    .map((b) => BADGES.find((x) => x.id === b.id))
    .filter((b): b is (typeof BADGES)[number] => Boolean(b))
  if (aCelebrer.length === 0) return null

  const marquerVus = () => db.badges.bulkPut(d.badges.filter((b) => !b.vu).map((b) => ({ ...b, vu: true })))
  const voir = async () => { await marquerVus(); navigate('/badges') }

  // Plusieurs badges d'un coup (par exemple après une mise à jour) : un seul message récapitulatif.
  if (aCelebrer.length > 2) {
    return (
      <Modal title="Bravo !" onClose={marquerVus}>
        <p style={{ fontSize: 16, lineHeight: 1.45 }}>
          Tu as débloqué <strong>{aCelebrer.length} badges</strong> grâce à tes bonnes habitudes, et autant de phrases dans ton carnet.
        </p>
        <div className="puces" style={{ justifyContent: 'center' }}>
          {aCelebrer.slice(0, 8).map((b) => <Medaille key={b.id} marque={b.marque} obtenu taille={48} />)}
        </div>
        <button type="button" className="btn large" onClick={voir}>Voir mes badges</button>
        <button type="button" className="btn discret" onClick={marquerVus}>Plus tard</button>
      </Modal>
    )
  }

  const b = aCelebrer[0]
  const fermer = () => db.badges.update(b.id, { vu: true })
  return (
    <Modal title="Badge débloqué" onClose={fermer}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, textAlign: 'center' }}>
        <Medaille marque={b.marque} obtenu taille={120} />
        <span className="etiquette" style={{ color: 'var(--sauge-fonce)' }}>Badge débloqué</span>
        <strong style={{ fontSize: 24, lineHeight: 1.2 }}>{b.nom}</strong>
      </div>
      <div className="carte" style={{ gap: 8 }}>
        <span className="etiquette" style={{ color: 'var(--abricot-fonce)' }}>Phrase ajoutée à ton carnet</span>
        <p style={{ fontSize: 18, fontWeight: 800, lineHeight: 1.35 }}>« {b.phrase} »</p>
      </div>
      <button type="button" className="btn large" onClick={fermer}>Merci !</button>
      <button type="button" className="btn discret" onClick={async () => { await fermer(); navigate('/badges') }}>Voir mes badges</button>
    </Modal>
  )
}
