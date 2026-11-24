import { useLiveQuery } from 'dexie-react-hooks'
import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { IconMail, IconPhone, IconTrash } from '../components/Icons'
import { Modal, useToast } from '../components/ui'
import { findMolecule, MOLECULES } from '../data/molecules'
import { db, exportAll, importAll, type Carer, type Profile } from '../db'
import { dayKey, fromDayKey, JOURS, shortDate } from '../lib/dates'
import { defaultProteinTarget } from '../lib/nutrition'
import { fmt, fmt1, parseNumber } from '../lib/text'

const ROLES = ['Médecin généraliste', 'Endocrinologue', 'Diététicien·ne', 'Infirmier·e', 'Pharmacien·ne', 'Kinésithérapeute', 'Coach sportif', 'Autre']

export default function Profil({ profile }: { profile: Profile }) {
  const toast = useToast()
  const weights = useLiveQuery(() => db.weights.orderBy('dayKey').reverse().toArray(), []) ?? []
  const carers = useLiveQuery(() => db.carers.toArray(), []) ?? []
  const [poids, setPoids] = useState('')
  const [taille, setTaille] = useState('')
  const [soignant, setSoignant] = useState<Partial<Carer> | null>(null)
  const [objectifs, setObjectifs] = useState(false)
  const [traitement, setTraitement] = useState(false)
  const fichier = useRef<HTMLInputElement>(null)

  const actuel = weights[0]?.kg ?? profile.poidsDepartKg
  const ecart = actuel - profile.poidsDepartKg
  const tailles = weights.filter((w) => w.tourTailleCm)
  const ecartTaille = tailles.length >= 2 ? tailles[0].tourTailleCm! - tailles[tailles.length - 1].tourTailleCm! : null

  async function peser() {
    const kg = parseNumber(poids)
    if (!kg || kg < 30 || kg > 350) return toast('Indique un poids en kilos, par exemple 84,5.')
    const tour = parseNumber(taille)
    const key = dayKey()
    const existant = await db.weights.where('dayKey').equals(key).first()
    if (existant) await db.weights.update(existant.id!, { kg, tourTailleCm: tour })
    else await db.weights.add({ dayKey: key, kg, tourTailleCm: tour })
    setPoids('')
    setTaille('')
    toast('Pesée notée. Le chiffre ne dit pas tout : ta régularité compte autant !')
  }

  async function exporter() {
    const json = await exportAll()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `nutrisocle-sauvegarde-${dayKey()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function importer(file: File) {
    if (!window.confirm('Remplacer toutes les données actuelles par celles de cette sauvegarde ?')) return
    try {
      await importAll(await file.text())
      toast('Sauvegarde restaurée.')
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Fichier illisible.')
    }
  }

  async function toutEffacer() {
    if (!window.confirm('Effacer toutes tes données NutriSocle sur ce téléphone ? Pense à exporter une sauvegarde avant.')) return
    await db.delete()
    window.location.reload()
  }

  return (
    <main className="page">
      <div className="ligne">
        <span className="avatar" style={{ width: 60, height: 60, borderRadius: 30, fontSize: 24 }} aria-hidden="true">{profile.prenom.charAt(0).toUpperCase()}</span>
        <div className="pousse">
          <h1 style={{ fontSize: 26 }}>{profile.prenom}</h1>
          <p className="petit">{profile.moleculeNom} · suivi depuis le {shortDate(fromDayKey(profile.dateDebut))}</p>
        </div>
      </div>

      <div className="grille-3">
        <div className="stat"><span className="leg">Départ</span><span className="grand">{fmt1(profile.poidsDepartKg)} kg</span></div>
        <div className="stat"><span className="leg">Aujourd’hui</span><span className="grand">{fmt1(actuel)} kg</span></div>
        <div className="stat"><span className="leg">{ecartTaille !== null ? 'Tour de taille' : 'Évolution'}</span>
          <span className="grand">{ecartTaille !== null ? `${ecartTaille > 0 ? '+' : ''}${fmt1(ecartTaille)} cm` : `${ecart > 0 ? '+' : ''}${fmt1(ecart)} kg`}</span>
        </div>
      </div>

      <section className="carte">
        <h2>Noter ma pesée</h2>
        <div className="grille-2">
          <label className="champ">Poids (kg)<input inputMode="decimal" value={poids} onChange={(e) => setPoids(e.target.value)} placeholder={fmt1(actuel)} /></label>
          <label className="champ">Tour de taille (cm)<input inputMode="decimal" value={taille} onChange={(e) => setTaille(e.target.value)} placeholder="facultatif" /></label>
        </div>
        <button type="button" className="btn" onClick={peser}>Enregistrer</button>
        {weights.length > 0 && (
          <div>
            {weights.slice(0, 5).map((w) => (
              <div key={w.id} className="rangee" style={{ minHeight: 40 }}>
                <span className="petit">{shortDate(fromDayKey(w.dayKey))}</span>
                <span style={{ fontWeight: 800 }}>{fmt1(w.kg)} kg{w.tourTailleCm ? ` · ${fmt1(w.tourTailleCm)} cm` : ''}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="entete" style={{ gap: 8 }}>
        <div className="ligne-titre">
          <h2>Mes soignants</h2>
          <button type="button" className="btn clair" style={{ minHeight: 44 }} onClick={() => setSoignant({ role: ROLES[0] })}>+ Ajouter</button>
        </div>
        {carers.length === 0 && (
          <div className="carte"><p className="petit">Ajoute ton médecin, ton ou ta diététicien·ne… Tu pourras leur envoyer ton rapport de suivi.</p></div>
        )}
        {carers.map((c) => (
          <div key={c.id} className="carte" style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: '14px 14px 14px 16px' }}>
            <button type="button" onClick={() => setSoignant(c)} aria-label={`Modifier ${c.prenom} ${c.nom}`}
              style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 12, background: 'none', border: 'none', padding: 0, textAlign: 'left', cursor: 'pointer' }}>
              <span style={{ width: 44, height: 44, borderRadius: 22, background: 'var(--abricot-clair)', color: 'var(--abricot-fonce)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, flexShrink: 0 }}>
                {(c.prenom.charAt(0) + c.nom.charAt(0)).toUpperCase()}
              </span>
              <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <span style={{ fontSize: 15, fontWeight: 800 }}>{c.prenom} {c.nom}</span>
                <span className="petit">{c.role}</span>
              </span>
            </button>
            {c.email && <a className="btn rond discret" href={`mailto:${c.email}`} aria-label={`Écrire à ${c.prenom} ${c.nom}`}><IconMail /></a>}
            {c.telephone && <a className="btn rond discret" href={`tel:${c.telephone.replace(/\s/g, '')}`} aria-label={`Appeler ${c.prenom} ${c.nom}`}><IconPhone /></a>}
          </div>
        ))}
        <Link to="/rapport" className="carte sauge-clair" style={{ textDecoration: 'none' }}>
          <strong style={{ fontSize: 16 }}>Rapport pour mes soignants</strong>
          <p style={{ fontSize: 14 }}>Une page de synthèse (poids, tolérance, alimentation, activité) avec tes questions, à envoyer avant ta consultation.</p>
          <span className="btn auto" style={{ minHeight: 44 }}>Préparer mon rapport</span>
        </Link>
      </section>

      <section className="carte">
        <div className="ligne-titre"><h2>Mes objectifs du jour</h2>
          <button type="button" className="btn clair" style={{ minHeight: 40 }} onClick={() => setObjectifs(true)}>Modifier</button>
        </div>
        <div className="rangee"><span>Protéines</span><strong>{profile.objectifProteinesG} g</strong></div>
        <div className="rangee"><span>Fibres</span><strong>{profile.objectifFibresG} g</strong></div>
        <div className="rangee"><span>Eau</span><strong>{fmt(profile.objectifEauMl / 1000)} L</strong></div>
      </section>

      <section className="carte">
        <div className="ligne-titre"><h2>Mon traitement</h2>
          <button type="button" className="btn clair" style={{ minHeight: 40 }} onClick={() => setTraitement(true)}>Modifier</button>
        </div>
        <div className="rangee"><span>Produit</span><strong>{profile.moleculeNom}</strong></div>
        <div className="rangee"><span>Dose actuelle</span><strong>{profile.doseActuelleMg !== null ? `${fmt1(profile.doseActuelleMg)} mg` : '—'}</strong></div>
        <div className="rangee"><span>Rythme</span><strong>{profile.frequence === 'hebdo' ? `chaque ${JOURS[profile.jourInjection]}` : 'tous les jours'}</strong></div>
      </section>

      <section className="carte">
        <h2>Mes données</h2>
        <p className="petit">Tout est enregistré uniquement sur ce téléphone. Exporte régulièrement une sauvegarde pour ne rien perdre.</p>
        <div className="grille-2">
          <button type="button" className="btn clair" onClick={exporter}>Exporter</button>
          <button type="button" className="btn discret" onClick={() => fichier.current?.click()}>Importer</button>
        </div>
        <input ref={fichier} type="file" accept="application/json,.json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) importer(f); e.target.value = '' }} />
        <button type="button" className="btn danger" onClick={toutEffacer}>Tout effacer</button>
      </section>

      <p className="petit" style={{ textAlign: 'center' }}>
        NutriSocle version {__APP_VERSION__}. NutriSocle ne remplace pas un avis médical. Valeurs nutritionnelles : Anses, table Ciqual 2020 ; Open Food Facts.
      </p>

      {soignant && <SoignantForm initial={soignant} onClose={() => setSoignant(null)} />}
      {objectifs && <ObjectifsForm profile={profile} poidsActuel={actuel} onClose={() => setObjectifs(false)} />}
      {traitement && <TraitementForm profile={profile} onClose={() => setTraitement(false)} />}
    </main>
  )
}

function SoignantForm({ initial, onClose }: { initial: Partial<Carer>; onClose: () => void }) {
  const [c, setC] = useState<Partial<Carer>>(initial)
  const [erreur, setErreur] = useState<string | null>(null)
  const set = (k: keyof Carer) => (e: { target: { value: string } }) => setC({ ...c, [k]: e.target.value })

  async function enregistrer() {
    if (!c.nom?.trim() && !c.prenom?.trim()) return setErreur('Indique au moins un nom.')
    if (c.email && !/^\S+@\S+\.\S+$/.test(c.email.trim())) return setErreur('L’adresse e-mail ne semble pas valide.')
    const data: Carer = {
      prenom: c.prenom?.trim() ?? '', nom: c.nom?.trim() ?? '', role: c.role ?? '',
      email: c.email?.trim() ?? '', telephone: c.telephone?.trim() ?? '',
    }
    if (c.id) await db.carers.update(c.id, data)
    else await db.carers.add(data)
    onClose()
  }

  async function supprimer() {
    if (c.id && window.confirm('Retirer ce soignant de ta liste ?')) {
      await db.carers.delete(c.id)
      onClose()
    }
  }

  return (
    <Modal title={c.id ? 'Modifier le soignant' : 'Ajouter un soignant'} onClose={onClose}>
      <div className="grille-2">
        <label className="champ">Prénom<input value={c.prenom ?? ''} onChange={set('prenom')} /></label>
        <label className="champ">Nom<input value={c.nom ?? ''} onChange={set('nom')} /></label>
      </div>
      <label className="champ">Profession
        <select value={c.role ?? ''} onChange={set('role')}>{ROLES.map((r) => <option key={r}>{r}</option>)}</select>
      </label>
      <label className="champ">E-mail<input type="email" inputMode="email" value={c.email ?? ''} onChange={set('email')} /></label>
      <label className="champ">Téléphone<input type="tel" inputMode="tel" value={c.telephone ?? ''} onChange={set('telephone')} /></label>
      {erreur && <p role="alert" style={{ color: 'var(--danger)', fontWeight: 700 }}>{erreur}</p>}
      <button type="button" className="btn large" onClick={enregistrer}>Enregistrer</button>
      {c.id && <button type="button" className="btn danger" onClick={supprimer}><IconTrash /> Retirer ce soignant</button>}
    </Modal>
  )
}

function ObjectifsForm({ profile, poidsActuel, onClose }: { profile: Profile; poidsActuel: number; onClose: () => void }) {
  const [prot, setProt] = useState(String(profile.objectifProteinesG))
  const [fib, setFib] = useState(String(profile.objectifFibresG))
  const [eau, setEau] = useState(fmt(profile.objectifEauMl / 1000))
  const suggere = defaultProteinTarget(poidsActuel, profile.tailleCm)

  async function enregistrer() {
    const p = parseNumber(prot), f = parseNumber(fib), e = parseNumber(eau)
    await db.profile.update('me', {
      objectifProteinesG: p && p > 0 ? Math.round(p) : profile.objectifProteinesG,
      objectifFibresG: f && f > 0 ? Math.round(f) : profile.objectifFibresG,
      objectifEauMl: e && e > 0 ? Math.round(e * 1000) : profile.objectifEauMl,
    })
    onClose()
  }

  return (
    <Modal title="Mes objectifs" onClose={onClose}>
      <label className="champ">Protéines (g par jour)
        <input inputMode="numeric" value={prot} onChange={(e) => setProt(e.target.value)} />
        <span className="aide">Suggestion pour ton poids actuel : {suggere} g (environ 1,2 g par kg). À ajuster avec ton soignant.</span>
      </label>
      <label className="champ">Fibres (g par jour)
        <input inputMode="numeric" value={fib} onChange={(e) => setFib(e.target.value)} />
        <span className="aide">L’Anses recommande 30 g par jour pour un adulte.</span>
      </label>
      <label className="champ">Eau (litres par jour)<input inputMode="decimal" value={eau} onChange={(e) => setEau(e.target.value)} /></label>
      <button type="button" className="btn large" onClick={enregistrer}>Enregistrer</button>
    </Modal>
  )
}

function TraitementForm({ profile, onClose }: { profile: Profile; onClose: () => void }) {
  const [moleculeId, setMoleculeId] = useState(profile.moleculeId)
  const [nom, setNom] = useState(profile.moleculeNom)
  const [dose, setDose] = useState(profile.doseActuelleMg !== null ? fmt1(profile.doseActuelleMg) : '')
  const [frequence, setFrequence] = useState(profile.frequence)
  const [jour, setJour] = useState(profile.jourInjection)
  const molecule = findMolecule(moleculeId)
  const libre = moleculeId === 'autre' || moleculeId === 'retatrutide'
  const freq = moleculeId === 'autre' ? frequence : molecule.frequence

  async function enregistrer() {
    await db.profile.update('me', {
      moleculeId,
      moleculeNom: libre ? (nom.trim() || molecule.nom) : molecule.nom,
      doseActuelleMg: parseNumber(dose),
      frequence: freq,
      jourInjection: jour,
    })
    onClose()
  }

  return (
    <Modal title="Mon traitement" onClose={onClose}>
      <label className="champ">Produit
        <select value={moleculeId} onChange={(e) => { setMoleculeId(e.target.value); setNom(findMolecule(e.target.value).nom) }}>
          {MOLECULES.map((m) => <option key={m.id} value={m.id}>{m.nom}</option>)}
        </select>
      </label>
      {libre && <label className="champ">Nom du produit<input value={nom} onChange={(e) => setNom(e.target.value)} /></label>}
      {moleculeId === 'autre' && (
        <label className="champ">Fréquence
          <select value={frequence} onChange={(e) => setFrequence(e.target.value as 'hebdo' | 'quotidien')}>
            <option value="hebdo">1 fois par semaine</option>
            <option value="quotidien">Tous les jours</option>
          </select>
        </label>
      )}
      <label className="champ">Dose actuelle (mg)
        <input inputMode="decimal" value={dose} onChange={(e) => setDose(e.target.value)} />
        <span className="aide">Celle prescrite par ton médecin.</span>
      </label>
      {freq === 'hebdo' && (
        <label className="champ">Jour habituel d’injection
          <select value={jour} onChange={(e) => setJour(Number(e.target.value))}>
            {JOURS.map((j, i) => <option key={j} value={i}>{j.charAt(0).toUpperCase() + j.slice(1)}</option>)}
          </select>
        </label>
      )}
      <button type="button" className="btn large" onClick={enregistrer}>Enregistrer</button>
    </Modal>
  )
}
