import { useNavigate } from 'react-router-dom'
import { IconBack } from '../components/Icons'
import Medaille from '../components/Medaille'
import { Segmented } from '../components/ui'
import { BADGES, calculerStats, FAMILLES } from '../data/badges'
import { db } from '../db'
import { useDonnees } from '../hooks'
import { shortDate } from '../lib/dates'

export default function Badges() {
  const navigate = useNavigate()
  const d = useDonnees()
  if (!d) return null
  const stats = calculerStats(d)
  const obtenus = new Map(d.badges.map((b) => [b.id, b]))
  const carnet = BADGES.filter((b) => obtenus.has(b.id))
    .map((b) => ({ badge: b, le: obtenus.get(b.id)!.obtenuLe }))
    .sort((a, b) => b.le.localeCompare(a.le))
  const celebrations = d.profile.celebrations !== false

  return (
    <main className="page sans-nav">
      <div className="ligne">
        <button type="button" className="btn rond discret" aria-label="Retour" onClick={() => navigate(-1)}><IconBack /></button>
        <h1 style={{ fontSize: 24 }}>Mes badges</h1>
      </div>

      <section className="carte sauge-clair" style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <Medaille marque={String(obtenus.size)} obtenu taille={64} />
        <div className="pousse">
          <strong style={{ fontSize: 18 }}>{obtenus.size} badge{obtenus.size > 1 ? 's' : ''} sur {BADGES.length}</strong>
          <p style={{ fontSize: 14 }}>Ils récompensent tes habitudes, jamais la vitesse sur la balance.</p>
        </div>
      </section>

      <section className="entete" style={{ gap: 8 }}>
        <h2>Mon carnet de phrases</h2>
        {carnet.length === 0 && <div className="carte"><p className="petit">Chaque badge débloque une phrase de motivation. Elles s’affichent ici, pour les relire les jours de coup de mou.</p></div>}
        {carnet.map(({ badge, le }) => (
          <figure key={badge.id} className="carte" style={{ margin: 0, gap: 6 }}>
            <blockquote style={{ margin: 0, fontSize: 17, fontWeight: 800, lineHeight: 1.35 }}>« {badge.phrase} »</blockquote>
            <figcaption className="petit">{badge.nom} · {shortDate(new Date(le))}</figcaption>
          </figure>
        ))}
      </section>

      {FAMILLES.map((f) => {
        const liste = BADGES.filter((b) => b.famille === f.id)
        return (
          <section key={f.id} className="entete" style={{ gap: 8 }}>
            <h2>{f.label}</h2>
            <div className="grille-3">
              {liste.map((b) => {
                const ok = obtenus.has(b.id)
                const prog = b.progression(stats)
                return (
                  <div key={b.id} className="stat" style={{ gap: 6, padding: '12px 6px', opacity: ok ? 1 : 0.9 }}>
                    <Medaille marque={b.marque} obtenu={ok} taille={52} />
                    <span style={{ fontSize: 12, fontWeight: 800, lineHeight: 1.25 }}>{b.nom}</span>
                    {!ok && (
                      <>
                        <span className="leg" style={{ lineHeight: 1.3 }}>{b.comment}</span>
                        <div style={{ width: '80%', height: 6, borderRadius: 3, background: 'var(--beige)', overflow: 'hidden' }}
                          role="progressbar" aria-label={`Progression : ${b.nom}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(prog * 100)}>
                          <div style={{ width: `${prog * 100}%`, height: '100%', background: 'var(--abricot)' }} />
                        </div>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        )
      })}

      <section className="carte">
        <strong>Célébrations</strong>
        <p className="petit">Afficher une petite fête quand un badge est débloqué.</p>
        <Segmented label="Célébrations" value={celebrations ? 'oui' : 'non'}
          onChange={(v) => db.profile.update('me', { celebrations: v === 'oui' })}
          options={[{ value: 'oui', label: 'Activées' }, { value: 'non', label: 'Discrètes' }]} />
      </section>
    </main>
  )
}
