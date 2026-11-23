import { useState, type FormEvent } from 'react'
import { LogoMark } from '../components/Icons'
import { findMolecule, MOLECULES } from '../data/molecules'
import { db, type Profile } from '../db'
import { dayKey, JOURS } from '../lib/dates'
import { DEFAULT_EAU_ML, DEFAULT_FIBRES_G, defaultProteinTarget } from '../lib/nutrition'
import { parseNumber } from '../lib/text'

export default function Bienvenue() {
  const [etape, setEtape] = useState<1 | 2>(1)
  const [accepte, setAccepte] = useState(false)
  const [prenom, setPrenom] = useState('')
  const [taille, setTaille] = useState('')
  const [poids, setPoids] = useState('')
  const [moleculeId, setMoleculeId] = useState('mounjaro')
  const [moleculeNom, setMoleculeNom] = useState('')
  const [frequence, setFrequence] = useState<'hebdo' | 'quotidien'>('hebdo')
  const [dose, setDose] = useState('')
  const [jour, setJour] = useState(new Date().getDay())
  const [erreur, setErreur] = useState<string | null>(null)

  const molecule = findMolecule(moleculeId)
  const nomLibre = moleculeId === 'autre' || moleculeId === 'retatrutide'
  const freq = moleculeId === 'autre' ? frequence : molecule.frequence

  async function enregistrer(e: FormEvent) {
    e.preventDefault()
    const tailleCm = parseNumber(taille)
    const poidsKg = parseNumber(poids)
    if (!prenom.trim()) return setErreur('Indique ton prénom (ou un surnom).')
    if (!tailleCm || tailleCm < 100 || tailleCm > 250) return setErreur('Indique ta taille en centimètres (par exemple 170).')
    if (!poidsKg || poidsKg < 30 || poidsKg > 350) return setErreur('Indique ton poids en kilos (par exemple 92,5).')
    const nom = nomLibre ? (moleculeNom.trim() || molecule.nom) : molecule.nom
    const profile: Profile = {
      id: 'me',
      prenom: prenom.trim(),
      tailleCm,
      poidsDepartKg: poidsKg,
      dateDebut: dayKey(),
      moleculeId,
      moleculeNom: nom,
      frequence: freq,
      doseActuelleMg: parseNumber(dose),
      jourInjection: jour,
      objectifProteinesG: defaultProteinTarget(poidsKg, tailleCm),
      objectifFibresG: DEFAULT_FIBRES_G,
      objectifEauMl: DEFAULT_EAU_ML,
      avertissementAccepte: true,
    }
    await db.transaction('rw', db.profile, db.weights, async () => {
      await db.profile.put(profile)
      await db.weights.add({ dayKey: dayKey(), kg: poidsKg })
    })
  }

  if (etape === 1) {
    return (
      <main className="page sans-nav" style={{ justifyContent: 'center' }}>
        <div className="logo" style={{ fontSize: 30 }}>
          <LogoMark size={40} />
          <span><span className="nutri-mot">Nutri</span>Socle</span>
        </div>
        <h1 style={{ fontSize: 30 }}>Perdre du poids,<br />pas sa force.</h1>
        <p className="sous-titre">
          Ton compagnon de route sous traitement GLP-1 : injections, protéines, hydratation et confort digestif,
          pour construire un socle solide semaine après semaine.
        </p>
        <div className="carte abricot">
          <span className="etiquette">À savoir</span>
          <p style={{ fontSize: 15, lineHeight: 1.45 }}>
            NutriSocle t’aide à suivre ton traitement, mais <strong>ne remplace pas l’avis de ton médecin</strong>.
            L’app ne conseille jamais de dose : c’est ton médecin qui décide. En cas de douleur abdominale intense,
            de vomissements répétés ou de malaise, contacte un professionnel de santé.
          </p>
          <p style={{ fontSize: 14 }}>Tes données restent sur ton téléphone. Rien n’est envoyé sur un serveur.</p>
          <label className="ligne" style={{ fontWeight: 800, minHeight: 44 }}>
            <input type="checkbox" checked={accepte} onChange={(e) => setAccepte(e.target.checked)} style={{ width: 24, height: 24, accentColor: 'var(--sauge)' }} />
            J’ai compris
          </label>
        </div>
        <button type="button" className="btn large" disabled={!accepte} onClick={() => setEtape(2)}>C’est parti</button>
      </main>
    )
  }

  return (
    <main className="page sans-nav">
      <div className="entete">
        <h1>Faisons connaissance</h1>
        <p className="sous-titre">Quelques infos pour personnaliser tes objectifs. Tout reste modifiable.</p>
      </div>
      <form className="carte" onSubmit={enregistrer} noValidate>
        <label className="champ">Prénom
          <input value={prenom} onChange={(e) => setPrenom(e.target.value)} autoComplete="given-name" />
        </label>
        <div className="grille-2">
          <label className="champ">Taille (cm)
            <input inputMode="numeric" value={taille} onChange={(e) => setTaille(e.target.value)} placeholder="170" />
          </label>
          <label className="champ">Poids actuel (kg)
            <input inputMode="decimal" value={poids} onChange={(e) => setPoids(e.target.value)} placeholder="92,5" />
          </label>
        </div>
        <label className="champ">Mon traitement
          <select value={moleculeId} onChange={(e) => setMoleculeId(e.target.value)}>
            {MOLECULES.map((m) => (
              <option key={m.id} value={m.id}>{m.nom}{m.id !== 'autre' ? ` (${m.principe})` : ''}</option>
            ))}
          </select>
        </label>
        {nomLibre && (
          <label className="champ">Nom du produit
            <input value={moleculeNom} onChange={(e) => setMoleculeNom(e.target.value)} placeholder={molecule.nom} />
          </label>
        )}
        {moleculeId === 'retatrutide' && (
          <p className="petit">La rétatrutide est encore expérimentale. L’app te permet de noter tes prises, sans aucun conseil de dose.</p>
        )}
        {moleculeId === 'autre' && (
          <label className="champ">Fréquence
            <select value={frequence} onChange={(e) => setFrequence(e.target.value as 'hebdo' | 'quotidien')}>
              <option value="hebdo">1 fois par semaine</option>
              <option value="quotidien">Tous les jours</option>
            </select>
          </label>
        )}
        <label className="champ">Dose actuelle (mg)
          <input inputMode="decimal" value={dose} onChange={(e) => setDose(e.target.value)} placeholder="Selon ta prescription" />
          <span className="aide">Facultatif. Indique la dose prescrite par ton médecin.</span>
        </label>
        {molecule.paliers.length > 0 && (
          <div className="puces" aria-label="Doses courantes">
            {molecule.paliers.map((p) => (
              <button key={p} type="button" className="puce" aria-pressed={parseNumber(dose) === p} onClick={() => setDose(String(p).replace('.', ','))}>
                {String(p).replace('.', ',')} mg
              </button>
            ))}
          </div>
        )}
        {freq === 'hebdo' && (
          <label className="champ">Jour habituel d’injection
            <select value={jour} onChange={(e) => setJour(Number(e.target.value))}>
              {JOURS.map((j, i) => <option key={j} value={i}>{j.charAt(0).toUpperCase() + j.slice(1)}</option>)}
            </select>
          </label>
        )}
        {erreur && <p role="alert" style={{ color: 'var(--danger)', fontWeight: 700 }}>{erreur}</p>}
        <button type="submit" className="btn large">Créer mon espace</button>
      </form>
    </main>
  )
}
