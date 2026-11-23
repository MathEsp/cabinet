import { useState } from 'react'
import { IconTrash } from '../components/Icons'
import { useToast } from '../components/ui'
import { findMolecule, SITES, siteName } from '../data/molecules'
import { db, type Profile } from '../db'
import { useInjections } from '../hooks'
import { dayKey, relativeDays, shortDate } from '../lib/dates'
import { siteHistory, suggestSite } from '../lib/injection'
import { fmt1, parseNumber } from '../lib/text'

function localDateTimeValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function InjectionPage({ profile }: { profile: Profile }) {
  const injections = useInjections()
  const toast = useToast()
  const molecule = findMolecule(profile.moleculeId)
  const suggestion = suggestSite(injections)
  const history = siteHistory(injections)
  const [site, setSite] = useState<string | null>(null)
  const [quand, setQuand] = useState(localDateTimeValue(new Date()))
  const [dose, setDose] = useState(profile.doseActuelleMg ? String(profile.doseActuelleMg).replace('.', ',') : '')
  const [note, setNote] = useState('')
  const choisi = site ?? suggestion
  const doseActuelle = profile.doseActuelleMg

  async function enregistrer() {
    const date = new Date(quand)
    if (Number.isNaN(date.getTime())) return toast('Date invalide.')
    const doseMg = parseNumber(dose)
    await db.transaction('rw', db.injections, db.profile, async () => {
      await db.injections.add({
        date: date.toISOString(),
        dayKey: dayKey(date),
        moleculeNom: profile.moleculeNom,
        doseMg,
        site: choisi,
        note: note.trim(),
      })
      if (doseMg !== null && doseMg !== profile.doseActuelleMg) await db.profile.update('me', { doseActuelleMg: doseMg })
    })
    setNote('')
    setSite(null)
    setQuand(localDateTimeValue(new Date()))
    toast('Injection notée : une brique de plus pour ton socle !')
  }

  async function supprimer(id: number) {
    if (window.confirm('Supprimer cette injection de l’historique ?')) await db.injections.delete(id)
  }

  return (
    <main className="page">
      <div className="entete">
        <h1>Mon injection</h1>
        <p className="sous-titre">
          {profile.moleculeNom}{molecule.id !== 'autre' && molecule.id !== 'retatrutide' ? ` (${molecule.principe})` : ''} · {profile.frequence === 'hebdo' ? '1 fois par semaine' : 'tous les jours'}
        </p>
      </div>

      {molecule.paliers.length > 0 && (
        <section className="carte">
          <div className="ligne-titre"><h2>Mon palier</h2>{doseActuelle ? <span className="petit">{fmt1(doseActuelle)} mg</span> : null}</div>
          <div style={{ display: 'flex', gap: 4 }}>
            {molecule.paliers.map((p) => {
              const courant = doseActuelle === p
              const fait = doseActuelle !== null && p < doseActuelle
              return (
                <div key={p} style={{
                  flex: 1, height: 40, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13,
                  fontWeight: courant ? 900 : 700,
                  background: courant ? 'var(--sauge)' : fait ? 'var(--sauge-clair)' : 'transparent',
                  color: courant ? '#fff' : fait ? 'var(--sauge)' : 'var(--doux)',
                  border: courant || fait ? 'none' : '2px dashed #d9cfc4',
                }}>{fmt1(p)}</div>
              )
            })}
          </div>
          <p className="petit">Doses en mg. C’est ton médecin qui décide du passage au palier suivant.</p>
        </section>
      )}

      <section className="carte">
        <h2>Noter une injection</h2>
        <div className="grille-2">
          <label className="champ">Date et heure
            <input type="datetime-local" value={quand} onChange={(e) => setQuand(e.target.value)} />
          </label>
          <label className="champ">Dose (mg)
            <input inputMode="decimal" value={dose} onChange={(e) => setDose(e.target.value)} placeholder="ex. 5" />
          </label>
        </div>
        <div className="entete">
          <strong>Où vas-tu piquer ?</strong>
          <span className="petit">On alterne les zones pour ménager la peau.</span>
        </div>
        <div className="grille-2" style={{ gap: 8 }}>
          {SITES.map((s) => {
            const jours = history[s.id]
            const actif = s.id === choisi
            return (
              <button key={s.id} type="button" aria-pressed={actif} onClick={() => setSite(s.id)} style={{
                minHeight: 64, textAlign: 'left', padding: '10px 12px', borderRadius: 16, cursor: 'pointer',
                border: `2px solid ${actif ? 'var(--sauge)' : 'var(--ligne)'}`, background: actif ? 'var(--sauge-clair)' : '#fff',
                display: 'flex', flexDirection: 'column', gap: 2,
              }}>
                <span style={{ fontSize: 15, fontWeight: 800, color: actif ? 'var(--sauge-fonce)' : 'var(--encre)' }}>{s.nom}</span>
                <span style={{ fontSize: 12, color: actif ? '#2f5e4d' : 'var(--doux)' }}>
                  {jours === null ? 'jamais utilisée' : relativeDays(jours)}{s.id === suggestion ? ' · suggérée' : ''}
                </span>
              </button>
            )
          })}
        </div>
        <label className="champ">Note (facultatif)
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="ex. un peu de rougeur, stylo neuf…" />
        </label>
        <button type="button" className="btn large" onClick={enregistrer}>Enregistrer l’injection</button>
      </section>

      <section className="entete" style={{ gap: 8 }}>
        <h2>Historique</h2>
        <div className="carte liste">
          {injections.length === 0 && <p className="vide">Aucune injection notée pour l’instant.</p>}
          {injections.slice(0, 20).map((inj) => (
            <div key={inj.id} className="rangee">
              <div className="pousse" style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 15, fontWeight: 800 }}>{shortDate(new Date(inj.date))}</span>
                <span className="petit">{siteName(inj.site)}{inj.note ? ` · ${inj.note}` : ''}</span>
              </div>
              <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--sauge)' }}>{inj.doseMg !== null ? `${fmt1(inj.doseMg)} mg` : ''}</span>
              <button type="button" className="btn rond discret" aria-label={`Supprimer l’injection du ${shortDate(new Date(inj.date))}`} onClick={() => supprimer(inj.id!)}>
                <IconTrash />
              </button>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
