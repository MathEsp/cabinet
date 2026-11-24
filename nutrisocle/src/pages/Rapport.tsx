import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { IconBack } from '../components/Icons'
import { Modal, Segmented, useToast } from '../components/ui'
import { db, type Carer, type Profile } from '../db'
import { construireRapport, intensiteLabel, periodeLabel } from '../lib/rapport'
import { fmt, fmt1 } from '../lib/text'

const PERIODES = [
  { value: 14, label: '2 sem.' },
  { value: 28, label: '4 sem.' },
  { value: 56, label: '8 sem.' },
  { value: 84, label: '12 sem.' },
]

export default function Rapport({ profile }: { profile: Profile }) {
  const navigate = useNavigate()
  const toast = useToast()
  const [jours, setJours] = useState(28)
  const [destId, setDestId] = useState<number | null>(null)
  const [questions, setQuestions] = useState(profile.questionsRapport ?? '')
  const [confirmer, setConfirmer] = useState(false)
  const [enCours, setEnCours] = useState(false)
  const [lienSecours, setLienSecours] = useState<{ url: string; nom: string } | null>(null)

  const carers = useLiveQuery(() => db.carers.toArray(), []) ?? []
  const donnees = useLiveQuery(async () => ({
    weights: await db.weights.toArray(),
    injections: await db.injections.toArray(),
    foodLogs: await db.foodLogs.toArray(),
    water: await db.water.toArray(),
    symptoms: await db.symptoms.toArray(),
    activities: await db.activities.toArray(),
    steps: await db.steps.toArray(),
  }), [])

  const rapport = useMemo(() => (donnees ? construireRapport({ profile, ...donnees }, jours) : null), [donnees, profile, jours])
  const destinataire: Carer | null = carers.find((c) => c.id === destId) ?? (carers.length === 1 ? carers[0] : null)

  // Le brouillon des questions est gardé pour la prochaine fois.
  const premier = useRef(true)
  useEffect(() => {
    if (premier.current) { premier.current = false; return }
    const id = window.setTimeout(() => { db.profile.update('me', { questionsRapport: questions }) }, 500)
    return () => window.clearTimeout(id)
  }, [questions])

  useEffect(() => () => { if (lienSecours) URL.revokeObjectURL(lienSecours.url) }, [lienSecours])

  async function creerEtEnvoyer() {
    if (!rapport) return
    setConfirmer(false)
    setEnCours(true)
    try {
      const { genererPdf, nomFichier } = await import('../lib/rapportPdf')
      await db.profile.update('me', { questionsRapport: questions })
      const blob = genererPdf(rapport, { destinataire, questions })
      const nom = nomFichier(rapport)
      const fichier = new File([blob], nom, { type: 'application/pdf' })
      const texte = `Bonjour${destinataire ? ` ${[destinataire.prenom, destinataire.nom].filter(Boolean).join(' ')}` : ''},\n\nVoici mon rapport de suivi NutriSocle ${periodeLabel(rapport)}.\n\nBien cordialement,\n${profile.prenom}`
      if (navigator.canShare?.({ files: [fichier] })) {
        try {
          await navigator.share({ files: [fichier], title: 'Rapport de suivi NutriSocle', text: texte })
          toast('Rapport prêt à envoyer.')
          return
        } catch (e) {
          if (e instanceof DOMException && e.name === 'AbortError') return
        }
      }
      // Pas de partage de fichier possible : on propose le téléchargement, puis l'e-mail.
      const url = URL.createObjectURL(blob)
      setLienSecours({ url, nom })
      const a = document.createElement('a')
      a.href = url
      a.download = nom
      a.click()
      toast('PDF téléchargé : joins-le à ton e-mail.')
    } catch (e) {
      toast(`Création du rapport impossible : ${e instanceof Error ? e.message : 'erreur inconnue'}`)
    } finally {
      setEnCours(false)
    }
  }

  const mailto = destinataire?.email && rapport
    ? `mailto:${destinataire.email}?subject=${encodeURIComponent('Mon rapport de suivi NutriSocle')}&body=${encodeURIComponent(`Bonjour,\n\nVous trouverez en pièce jointe mon rapport de suivi ${periodeLabel(rapport)}.\n\nBien cordialement,\n${profile.prenom}`)}`
    : null

  return (
    <main className="page sans-nav">
      <div className="ligne">
        <button type="button" className="btn rond discret" aria-label="Retour" onClick={() => navigate(-1)}><IconBack /></button>
        <h1 style={{ fontSize: 24 }}>Rapport pour mes soignants</h1>
      </div>
      <p className="petit">Une page de synthèse, lisible en une minute, à envoyer avant ta consultation. Le PDF est créé sur ton téléphone : c’est toi qui choisis à qui l’envoyer.</p>

      <section className="carte">
        <h2>Période</h2>
        <Segmented label="Période du rapport" value={jours} onChange={setJours} options={PERIODES} />
        {rapport && <p className="petit">{periodeLabel(rapport)}</p>}
      </section>

      <section className="carte">
        <h2>Destinataire</h2>
        {carers.length === 0 ? (
          <p className="petit">Ajoute ton médecin ou ton diététicien dans <Link to="/profil">Profil → Mes soignants</Link> pour que son nom figure sur le rapport. Tu peux aussi l’envoyer sans.</p>
        ) : (
          <div className="puces">
            {carers.map((c) => (
              <button key={c.id} type="button" className="puce" aria-pressed={destinataire?.id === c.id} onClick={() => setDestId(c.id!)}>
                {[c.prenom, c.nom].filter(Boolean).join(' ')}{c.role ? ` · ${c.role}` : ''}
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="carte">
        <h2>Mes questions pour la consultation</h2>
        <label className="champ"><span className="sr-only">Questions pour le soignant</span>
          <textarea value={questions} onChange={(e) => setQuestions(e.target.value)} rows={5}
            placeholder={'ex. Est-ce que je peux passer au palier suivant ?\nLes nausées de J+1 sont-elles normales ?'} />
        </label>
        <p className="petit">Elles apparaîtront en bas du rapport. Ton brouillon est gardé pour la prochaine fois.</p>
      </section>

      {rapport && (
        <section className="carte sauge-clair" aria-label="Aperçu du rapport" style={{ gap: 8 }}>
          <strong>Aperçu</strong>
          <div className="grille-2" style={{ gap: 8 }}>
            <Apercu titre="Poids actuel" valeur={rapport.poids.actuel !== null ? `${fmt1(rapport.poids.actuel)} kg` : '—'}
              sous={rapport.poids.evolutionPeriode !== null ? `${rapport.poids.evolutionPeriode > 0 ? '+' : ''}${fmt1(rapport.poids.evolutionPeriode)} kg sur la période` : 'pas de pesée'} />
            <Apercu titre="Injections" valeur={`${rapport.traitement.injections} / ${rapport.traitement.attendues}`} sous="notées / attendues" />
            <Apercu titre="Protéines / jour" valeur={rapport.apports.joursRenseignes ? `${fmt(rapport.apports.proteinesMoy)} g` : '—'}
              sous={`${rapport.apports.joursRenseignes} jour${rapport.apports.joursRenseignes > 1 ? 's' : ''} renseigné${rapport.apports.joursRenseignes > 1 ? 's' : ''}`} />
            <Apercu titre="Jours avec symptômes" valeur={`${rapport.joursAvecSymptome}`}
              sous={rapport.tolerance[0] ? `${rapport.tolerance[0].label.toLowerCase()}, ${intensiteLabel(rapport.tolerance[0].intensite)}` : 'aucun noté'} />
          </div>
          <p style={{ fontSize: 14 }}>
            Repas : {fmt1(rapport.repasParJour)} par jour en moyenne · Activité : {rapport.activite.seances} séance{rapport.activite.seances > 1 ? 's' : ''}
          </p>
          {rapport.apports.joursRenseignes < Math.min(7, jours / 2) && (
            <p className="petit" style={{ color: 'var(--abricot-fonce)', fontWeight: 700 }}>
              Peu de jours renseignés : le rapport sera plus utile si tu notes tes repas plusieurs jours par semaine.
            </p>
          )}
        </section>
      )}

      <button type="button" className="btn large" disabled={!rapport || enCours} onClick={() => setConfirmer(true)}>
        {enCours ? 'Création du PDF…' : 'Créer et envoyer le PDF'}
      </button>

      {lienSecours && (
        <section className="carte">
          <p style={{ fontSize: 14 }}>Le PDF a été téléchargé. Ouvre ton e-mail et joins-le en pièce jointe.</p>
          <a className="btn clair" href={lienSecours.url} download={lienSecours.nom}>Télécharger à nouveau</a>
          {mailto && <a className="btn contour" href={mailto}>Écrire à {destinataire?.prenom || destinataire?.nom}</a>}
        </section>
      )}

      {confirmer && (
        <Modal title="Envoyer mes données de santé" onClose={() => setConfirmer(false)}>
          <p style={{ fontSize: 15, lineHeight: 1.45 }}>
            Ce rapport contient des données de santé (traitement, poids, symptômes). Tu vas choisir toi-même l’application
            pour l’envoyer : pour un soignant, privilégie son adresse e-mail professionnelle ou sa messagerie sécurisée.
          </p>
          <button type="button" className="btn large" onClick={creerEtEnvoyer}>Créer le PDF</button>
          <button type="button" className="btn discret" onClick={() => setConfirmer(false)}>Annuler</button>
        </Modal>
      )}
    </main>
  )
}

function Apercu({ titre, valeur, sous }: { titre: string; valeur: string; sous: string }) {
  return (
    <div style={{ background: '#fff', borderRadius: 14, padding: '10px 12px', display: 'flex', flexDirection: 'column' }}>
      <span className="petit" style={{ fontWeight: 700 }}>{titre}</span>
      <span style={{ fontSize: 20, fontWeight: 900, color: 'var(--encre)' }}>{valeur}</span>
      <span className="petit">{sous}</span>
    </div>
  )
}
