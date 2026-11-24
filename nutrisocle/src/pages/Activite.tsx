import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useState } from 'react'
import { IconCheck, IconPlus, IconTrash } from '../components/Icons'
import { Gauge, Modal, Segmented, useToast } from '../components/ui'
import { CARDIO, EXERCICES_SALLE, PROGRAMMES, type Programme } from '../data/programmes'
import { db, type Activity, type Profile, type SetLine } from '../db'
import { useDay, useInjections, useToday } from '../hooks'
import { addDays, dayKey, fromDayKey, shortDate } from '../lib/dates'
import { cycleDay } from '../lib/injection'
import { fmt, fmt1, parseNumber } from '../lib/text'

export const OBJECTIF_PAS_DEFAUT = 7000
const RESSENTIS = [{ value: 1 as const, label: 'Facile' }, { value: 2 as const, label: 'Bien' }, { value: 3 as const, label: 'Difficile' }]

export default function Activite({ profile }: { profile: Profile }) {
  const today = useToday()
  const toast = useToast()
  const { symptoms } = useDay(today)
  const injections = useInjections()
  const activities = useLiveQuery(() => db.activities.orderBy('date').reverse().toArray(), []) ?? []
  const steps = useLiveQuery(() => db.steps.get(today), [today])
  const [lieu, setLieu] = useState<'maison' | 'salle'>('maison')
  const [enCours, setEnCours] = useState<Programme | null>(null)
  const [salle, setSalle] = useState(false)
  const [cardio, setCardio] = useState(false)
  const [pasSaisis, setPasSaisis] = useState('')

  const objectifPas = profile.objectifPas ?? OBJECTIF_PAS_DEFAUT
  const jour = profile.frequence === 'hebdo' ? cycleDay(injections) : null
  const jourDifficile = symptoms.some((s) => (s.type === 'nausees' || s.type === 'fatigue') && s.intensite >= 2)
  const doux = jourDifficile || (jour !== null && jour >= 1 && jour <= 2)
  const debutSemaine = dayKey(addDays(fromDayKey(today), -6))
  const cetteSemaine = activities.filter((a) => a.dayKey >= debutSemaine)
  const minutesSemaine = cetteSemaine.reduce((s, a) => s + a.dureeMin, 0)

  async function enregistrer(a: Omit<Activity, 'id' | 'dayKey' | 'date'>) {
    const now = new Date()
    try {
      await db.activities.add({ ...a, dayKey: dayKey(now), date: now.toISOString() })
      toast('Séance enregistrée : une brique de plus pour ton socle !')
    } catch (e) {
      toast(`Enregistrement impossible : ${e instanceof Error ? e.message : 'erreur inconnue'}`)
    }
  }

  async function enregistrerPas() {
    const pas = parseNumber(pasSaisis)
    if (pas === null || pas < 0 || pas > 100000) return toast('Indique un nombre de pas, par exemple 6500.')
    await db.steps.put({ dayKey: today, pas: Math.round(pas) })
    setPasSaisis('')
    toast(pas >= objectifPas ? 'Objectif de pas atteint, bravo !' : 'Pas enregistrés.')
  }

  async function supprimer(a: Activity) {
    if (window.confirm(`Supprimer « ${a.titre} » du ${shortDate(new Date(a.date))} ?`)) await db.activities.delete(a.id!)
  }

  if (enCours) {
    return <SeanceMaison programme={enCours} onCancel={() => setEnCours(null)} onDone={async (a) => { await enregistrer(a); setEnCours(null) }} />
  }

  return (
    <main className="page">
      <div className="entete">
        <h1>Mon activité</h1>
        <p className="sous-titre">Bouger pour garder ta force.</p>
      </div>

      {doux && (
        <section className="carte abricot">
          <strong style={{ fontSize: 16 }}>
            {jourDifficile ? 'Journée difficile : on y va en douceur' : `J+${jour} : on y va en douceur`}
          </strong>
          <p style={{ fontSize: 14, lineHeight: 1.45 }}>
            {jourDifficile
              ? 'Tu as noté des nausées ou de la fatigue. Une séance douce ou une petite marche, c’est déjà très bien.'
              : 'Les jours qui suivent l’injection sont souvent plus durs. Mobilité, respiration ou petite marche suffisent.'}
          </p>
          <button type="button" className="btn blanc auto" onClick={() => setEnCours(PROGRAMMES[0])}>Faire la séance douce (15 min)</button>
        </section>
      )}

      <Segmented label="Lieu" value={lieu} onChange={setLieu} options={[
        { value: 'maison', label: 'À la maison' },
        { value: 'salle', label: 'À la salle' },
      ]} />

      {lieu === 'maison' && PROGRAMMES.map((p) => (
        <section key={p.id} className="carte">
          <div className="ligne-titre"><h2>{p.titre}</h2><span className="petit" style={{ fontWeight: 700 }}>{p.dureeMin} min</span></div>
          <p className="petit">{p.sousTitre} · {p.exercices.length} exercices</p>
          <button type="button" className={`btn ${p.id === 'douce' ? 'clair' : ''}`} onClick={() => setEnCours(p)}>Commencer la séance</button>
        </section>
      ))}

      {lieu === 'salle' && (
        <section className="carte">
          <h2>Carnet de salle</h2>
          <p className="petit">Note tes exercices, séries et charges : l’app te rappelle ce que tu as fait la dernière fois pour progresser.</p>
          <button type="button" className="btn" onClick={() => setSalle(true)}><IconPlus /> Noter une séance de salle</button>
        </section>
      )}

      <section className="carte">
        <div className="ligne-titre"><h2>Marche, vélo, natation…</h2></div>
        <p className="petit">Une marche de 15 min après le repas aide aussi la digestion et le transit.</p>
        <button type="button" className="btn clair" onClick={() => setCardio(true)}>Noter une activité</button>
      </section>

      <section className="carte">
        <Gauge label="Pas du jour" value={steps?.pas ?? 0} target={objectifPas} unit="" color="var(--sauge)" track="var(--sauge-clair)" />
        <form className="ligne" onSubmit={(e) => { e.preventDefault(); enregistrerPas() }}>
          <label className="champ pousse"><span className="sr-only">Nombre de pas aujourd’hui</span>
            <input inputMode="numeric" value={pasSaisis} onChange={(e) => setPasSaisis(e.target.value)} placeholder="Pas lus sur ton téléphone ou ta montre" />
          </label>
          <button type="submit" className="btn">OK</button>
        </form>
      </section>

      <div className="grille-3">
        <div className="stat"><span className="grand" style={{ color: 'var(--sauge)' }}>{cetteSemaine.length}</span><span className="leg">séances sur 7 jours</span></div>
        <div className="stat"><span className="grand" style={{ color: 'var(--sauge)' }}>{minutesSemaine}</span><span className="leg">minutes sur 7 jours</span></div>
        <div className="stat"><span className="grand" style={{ color: 'var(--sauge)' }}>{activities.length}</span><span className="leg">séances au total</span></div>
      </div>

      <section className="entete" style={{ gap: 8 }}>
        <h2>Mes dernières séances</h2>
        <div className="carte liste">
          {activities.length === 0 && <p className="vide">Ta première séance t’attend. Même 10 minutes comptent !</p>}
          {activities.slice(0, 10).map((a) => (
            <div key={a.id} className="rangee">
              <div className="pousse" style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 15, fontWeight: 800 }}>{a.titre}</span>
                <span className="petit">
                  {shortDate(new Date(a.date))} · {a.dureeMin} min
                  {a.type === 'salle' && a.exercices.length > 0 ? ` · ${a.exercices.length} exercice${a.exercices.length > 1 ? 's' : ''}` : ''}
                  {a.ressenti ? ` · ${RESSENTIS[a.ressenti - 1].label.toLowerCase()}` : ''}
                </span>
              </div>
              <button type="button" className="btn rond discret" aria-label={`Supprimer ${a.titre}`} onClick={() => supprimer(a)}><IconTrash /></button>
            </div>
          ))}
        </div>
      </section>

      {salle && <SeanceSalle activities={activities} onClose={() => setSalle(false)} onSave={async (a) => { await enregistrer(a); setSalle(false) }} />}
      {cardio && <CardioForm onClose={() => setCardio(false)} onSave={async (a) => { await enregistrer(a); setCardio(false) }} />}
    </main>
  )
}

type NouvelleActivite = Omit<Activity, 'id' | 'dayKey' | 'date'>

function SeanceMaison({ programme, onCancel, onDone }: {
  programme: Programme; onCancel: () => void; onDone: (a: NouvelleActivite) => void
}) {
  const [faits, setFaits] = useState<Set<number>>(new Set())
  const [ressenti, setRessenti] = useState<1 | 2 | 3>(2)
  const basculer = (i: number) => setFaits((f) => {
    const n = new Set(f)
    if (n.has(i)) n.delete(i)
    else n.add(i)
    return n
  })

  return (
    <main className="page sans-nav">
      <div className="entete">
        <h1>{programme.titre}</h1>
        <p className="sous-titre">{programme.sousTitre} · environ {programme.dureeMin} min</p>
      </div>
      <p className="petit">Fais chaque exercice à ton rythme, puis touche-le pour le cocher. Repos de 30 à 60 secondes entre les séries.</p>
      {programme.exercices.map((e, i) => {
        const fait = faits.has(i)
        return (
          <button key={e.nom} type="button" aria-pressed={fait} onClick={() => basculer(i)} className="carte" style={{
            flexDirection: 'row', alignItems: 'center', gap: 12, textAlign: 'left', cursor: 'pointer',
            border: `2px solid ${fait ? 'var(--sauge)' : 'transparent'}`, background: fait ? 'var(--sauge-clair)' : '#fff',
          }}>
            <span style={{
              width: 40, height: 40, borderRadius: 13, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: fait ? 'var(--sauge)' : 'var(--sauge-clair)', color: fait ? '#fff' : 'var(--sauge)', fontWeight: 900,
            }}>{fait ? <IconCheck /> : i + 1}</span>
            <span className="pousse" style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 16, fontWeight: 800 }}>{e.nom}</span>
              <span className="petit">{e.consigne}</span>
            </span>
            <span style={{ fontWeight: 900, color: 'var(--sauge-fonce)', whiteSpace: 'nowrap' }}>{e.dosage}</span>
          </button>
        )
      })}
      <section className="carte">
        <strong>Comment c’était ?</strong>
        <Segmented label="Ressenti" value={ressenti} onChange={setRessenti} options={RESSENTIS} />
        <button type="button" className="btn large" disabled={faits.size === 0} onClick={() => onDone({
          type: 'maison', titre: programme.titre, dureeMin: programme.dureeMin, ressenti,
          exercices: programme.exercices.filter((_, i) => faits.has(i)).map((e) => ({ nom: e.nom, series: 0, reps: 0, chargeKg: null })),
        })}>
          {faits.size === 0 ? 'Coche au moins un exercice' : `Terminer la séance (${faits.size}/${programme.exercices.length})`}
        </button>
        <button type="button" className="btn discret" onClick={onCancel}>Annuler</button>
      </section>
    </main>
  )
}

interface LigneSaisie { nom: string; series: string; reps: string; charge: string }
const LIGNE_VIDE: LigneSaisie = { nom: '', series: '3', reps: '10', charge: '' }

function SeanceSalle({ activities, onClose, onSave }: {
  activities: Activity[]; onClose: () => void; onSave: (a: NouvelleActivite) => void
}) {
  const [lignes, setLignes] = useState<LigneSaisie[]>([{ ...LIGNE_VIDE }])
  const [duree, setDuree] = useState('45')
  const [ressenti, setRessenti] = useState<1 | 2 | 3>(2)
  const [erreur, setErreur] = useState<string | null>(null)

  // Dernière performance connue pour chaque exercice (les activités sont triées de la plus récente à la plus ancienne).
  const derniere = useMemo(() => {
    const map = new Map<string, SetLine>()
    for (const a of activities) {
      if (a.type !== 'salle') continue
      for (const l of a.exercices) {
        const cle = l.nom.trim().toLowerCase()
        if (!map.has(cle)) map.set(cle, l)
      }
    }
    return map
  }, [activities])

  const maj = (i: number, champ: keyof LigneSaisie, valeur: string) =>
    setLignes((ls) => ls.map((l, j) => (j === i ? { ...l, [champ]: valeur } : l)))

  function enregistrer() {
    const exercices: SetLine[] = lignes
      .filter((l) => l.nom.trim())
      .map((l) => ({
        nom: l.nom.trim(),
        series: Math.round(parseNumber(l.series) ?? 0),
        reps: Math.round(parseNumber(l.reps) ?? 0),
        chargeKg: parseNumber(l.charge),
      }))
    if (exercices.length === 0) return setErreur('Ajoute au moins un exercice.')
    onSave({ type: 'salle', titre: 'Séance de salle', dureeMin: Math.round(parseNumber(duree) ?? 0), ressenti, exercices })
  }

  return (
    <Modal title="Séance de salle" onClose={onClose}>
      <datalist id="exercices-salle">{EXERCICES_SALLE.map((e) => <option key={e} value={e} />)}</datalist>
      {lignes.map((l, i) => {
        const avant = derniere.get(l.nom.trim().toLowerCase())
        return (
          <div key={i} className="carte" style={{ gap: 8, padding: 14 }}>
            <div className="ligne" style={{ gap: 8 }}>
              <label className="champ pousse">Exercice {i + 1}
                <input list="exercices-salle" value={l.nom} onChange={(e) => maj(i, 'nom', e.target.value)} placeholder="ex. Presse à cuisses" />
              </label>
              {lignes.length > 1 && (
                <button type="button" className="btn rond discret" style={{ alignSelf: 'flex-end' }} aria-label={`Retirer l’exercice ${i + 1}`}
                  onClick={() => setLignes((ls) => ls.filter((_, j) => j !== i))}><IconTrash /></button>
              )}
            </div>
            <div className="grille-3">
              <label className="champ">Séries<input inputMode="numeric" value={l.series} onChange={(e) => maj(i, 'series', e.target.value)} /></label>
              <label className="champ">Répét.<input inputMode="numeric" value={l.reps} onChange={(e) => maj(i, 'reps', e.target.value)} /></label>
              <label className="champ">Charge (kg)<input inputMode="decimal" value={l.charge} onChange={(e) => maj(i, 'charge', e.target.value)} /></label>
            </div>
            {avant && (
              <p className="petit">
                Dernière fois : {avant.series} × {avant.reps}{avant.chargeKg !== null ? ` à ${fmt1(avant.chargeKg)} kg` : ''}
              </p>
            )}
          </div>
        )
      })}
      <button type="button" className="btn clair" onClick={() => setLignes((ls) => [...ls, { ...LIGNE_VIDE }])}><IconPlus /> Ajouter un exercice</button>
      <label className="champ">Durée (minutes)<input inputMode="numeric" value={duree} onChange={(e) => setDuree(e.target.value)} /></label>
      <Segmented label="Ressenti" value={ressenti} onChange={setRessenti} options={RESSENTIS} />
      {erreur && <p role="alert" style={{ color: 'var(--danger)', fontWeight: 700 }}>{erreur}</p>}
      <button type="button" className="btn large" onClick={enregistrer}>Enregistrer la séance</button>
    </Modal>
  )
}

function CardioForm({ onClose, onSave }: { onClose: () => void; onSave: (a: NouvelleActivite) => void }) {
  const [type, setType] = useState<string>(CARDIO[0])
  const [minutes, setMinutes] = useState('30')
  const [erreur, setErreur] = useState<string | null>(null)

  function enregistrer() {
    const m = parseNumber(minutes)
    if (!m || m <= 0 || m > 600) return setErreur('Indique une durée en minutes.')
    onSave({ type: 'cardio', titre: type, dureeMin: Math.round(m), ressenti: null, exercices: [] })
  }

  return (
    <Modal title="Noter une activité" onClose={onClose}>
      <div className="puces" role="group" aria-label="Type d’activité">
        {CARDIO.map((c) => <button key={c} type="button" className="puce" aria-pressed={c === type} onClick={() => setType(c)}>{c}</button>)}
      </div>
      <label className="champ">Durée (minutes)<input inputMode="numeric" value={minutes} onChange={(e) => setMinutes(e.target.value)} /></label>
      <div className="puces">
        {[10, 20, 30, 45, 60].map((m) => (
          <button key={m} type="button" className="puce" aria-pressed={parseNumber(minutes) === m} onClick={() => setMinutes(String(m))}>{fmt(m)} min</button>
        ))}
      </div>
      {erreur && <p role="alert" style={{ color: 'var(--danger)', fontWeight: 700 }}>{erreur}</p>}
      <button type="button" className="btn large" onClick={enregistrer}>Enregistrer</button>
    </Modal>
  )
}
