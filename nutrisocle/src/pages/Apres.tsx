import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconBack } from '../components/Icons'
import { Modal, Segmented, useToast } from '../components/ui'
import { db, type Phase, type Profile } from '../db'
import { useDonnees, useToday } from '../hooks'
import { addDays, dayKey, fromDayKey, JOURS_COURTS, shortDate } from '../lib/dates'
import type { Donnees } from '../lib/donnees'
import { bilanHabitudes, conseilDeLaSemaine, etatZone, scoreHabitudes, semaineDepuis, ZONE_DEFAUT_KG, type Habitude } from '../lib/maintien'
import { fmt1, parseNumber } from '../lib/text'

const COULEURS: Record<Habitude['niveau'], { fond: string; texte: string; label: string }> = {
  solide: { fond: 'var(--sauge-clair)', texte: 'var(--sauge-fonce)', label: 'Solide' },
  'a-renforcer': { fond: 'var(--abricot-clair)', texte: 'var(--abricot-fonce)', label: 'À renforcer' },
  fragile: { fond: '#f9dedb', texte: '#8c1d18', label: 'À construire' },
  inconnu: { fond: 'var(--beige)', texte: 'var(--doux)', label: 'À noter' },
}

export default function Apres() {
  const navigate = useNavigate()
  const d = useDonnees()
  const [changer, setChanger] = useState<Phase | null>(null)
  if (!d) return null
  const phase = d.profile.phase ?? 'traitement'

  return (
    <main className="page sans-nav">
      <div className="ligne">
        <button type="button" className="btn rond discret" aria-label="Retour" onClick={() => navigate(-1)}><IconBack /></button>
        <h1 style={{ fontSize: 24 }}>Après le traitement</h1>
      </div>

      {phase === 'traitement' ? <Preparation d={d} onPhase={setChanger} /> : <Maintien d={d} onPhase={setChanger} />}

      <p className="petit">
        Les seuils et conseils de cette page sont des repères généraux, à adapter avec ton médecin ou ton diététicien.
      </p>
      {changer && <ChangerPhase profile={d.profile} d={d} cible={changer} onClose={() => setChanger(null)} />}
    </main>
  )
}

function Preparation({ d, onPhase }: { d: Donnees; onPhase: (p: Phase) => void }) {
  const bilan = bilanHabitudes(d)
  const score = scoreHabitudes(bilan)
  return (
    <>
      <section className="carte sauge">
        <span className="etiquette" style={{ color: '#d7ede2' }}>Le traitement aide, le socle reste</span>
        <p style={{ fontSize: 16, lineHeight: 1.45 }}>
          Le traitement est comme un échafaudage : un jour, on le retire. Ce qui tient ensuite, ce sont les habitudes construites
          pendant ce temps. Ici, tu vois lesquelles sont déjà solides.
        </p>
      </section>
      <BilanHabitudes bilan={bilan} score={score} />
      <section className="carte">
        <h2>Quand le moment viendra</h2>
        <p className="petit">La diminution ou l’arrêt se décident avec ton médecin. L’app t’accompagne ensuite : zone de stabilité, suivi de la faim, conseils semaine par semaine.</p>
        <button type="button" className="btn clair" onClick={() => onPhase('diminution')}>Je commence à diminuer</button>
        <button type="button" className="btn contour" onClick={() => onPhase('arret')}>J’ai arrêté mon traitement</button>
      </section>
    </>
  )
}

function Maintien({ d, onPhase }: { d: Donnees; onPhase: (p: Phase) => void }) {
  const p = d.profile
  const semaine = semaineDepuis(p.datePhase)
  const conseil = conseilDeLaSemaine(semaine)
  const bilan = bilanHabitudes(d)
  return (
    <>
      <section className="carte sauge">
        <span className="etiquette" style={{ color: '#d7ede2' }}>
          {p.phase === 'arret' ? `Semaine ${semaine} sans traitement` : `Diminution · semaine ${semaine}`}
        </span>
        <p style={{ fontSize: 15, lineHeight: 1.45 }}>
          {p.phase === 'arret'
            ? `Traitement arrêté le ${p.datePhase ? shortDate(fromDayKey(p.datePhase)) : '—'} : les trois premiers mois comptent le plus : on garde les bases, en douceur.`
            : `Diminution commencée le ${p.datePhase ? shortDate(fromDayKey(p.datePhase)) : '—'} : l’appétit peut revenir peu à peu : on l’écoute.`}
        </p>
      </section>
      <Zone d={d} />
      <Faim d={d} />
      <section className="carte abricot">
        <span className="etiquette">Conseil de la semaine {conseil.numero}</span>
        <strong style={{ fontSize: 17 }}>{conseil.titre}</strong>
        <p style={{ fontSize: 15, lineHeight: 1.45 }}>{conseil.texte}</p>
      </section>
      <BilanHabitudes bilan={bilan} score={scoreHabitudes(bilan)} />
      <section className="carte">
        <h2>Mon parcours</h2>
        {p.phase === 'diminution' && <button type="button" className="btn contour" onClick={() => onPhase('arret')}>J’ai arrêté mon traitement</button>}
        <button type="button" className="btn discret" onClick={() => onPhase(p.phase ?? 'arret')}>Modifier ma zone ou la date</button>
        <button type="button" className="btn discret" onClick={() => onPhase('traitement')}>Je reprends le traitement</button>
      </section>
    </>
  )
}

function BilanHabitudes({ bilan, score }: { bilan: Habitude[]; score: number }) {
  return (
    <section className="carte">
      <div className="ligne-titre">
        <h2>Mon socle est-il prêt ?</h2>
        <span style={{ fontWeight: 900, color: 'var(--sauge)' }}>{score} / {bilan.length}</span>
      </div>
      <p className="petit">Bilan de tes 4 dernières semaines.</p>
      {bilan.map((h) => {
        const c = COULEURS[h.niveau]
        return (
          <div key={h.id} style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingTop: 10, borderTop: '1px solid #f3ece3' }}>
            <div className="ligne" style={{ gap: 8 }}>
              <strong className="pousse">{h.titre}</strong>
              <span style={{ background: c.fond, color: c.texte, borderRadius: 10, padding: '3px 10px', fontSize: 12, fontWeight: 800 }}>{c.label}</span>
            </div>
            <span className="petit">{h.detail}</span>
            {h.niveau !== 'solide' && <span style={{ fontSize: 13, lineHeight: 1.4 }}>{h.conseil}</span>}
          </div>
        )
      })}
    </section>
  )
}

function Zone({ d }: { d: Donnees }) {
  const toast = useToast()
  const today = useToday()
  const [poids, setPoids] = useState('')
  const z = etatZone(d)
  const min = z.reference - z.zone
  const max = z.reference + z.zone
  // Échelle de la jauge : zone au centre, avec une marge de chaque côté.
  const echelleMin = min - z.zone, echelleMax = max + z.zone
  const pos = (kg: number) => Math.min(100, Math.max(0, ((kg - echelleMin) / (echelleMax - echelleMin)) * 100))

  async function peser() {
    const kg = parseNumber(poids)
    if (!kg || kg < 30 || kg > 350) return toast('Indique un poids en kilos, par exemple 84,5.')
    const existant = await db.weights.where('dayKey').equals(today).first()
    if (existant) await db.weights.update(existant.id!, { kg })
    else await db.weights.add({ dayKey: today, kg })
    setPoids('')
    toast('Pesée notée.')
  }

  const messages = {
    dans: { fond: 'var(--sauge-clair)', texte: 'var(--sauge-fonce)', msg: 'Tu es dans ta zone de stabilité. Ton socle tient : bravo !' },
    'au-dessus': { fond: 'var(--abricot-clair)', texte: 'var(--abricot-texte)', msg: `Tu es ${fmt1((z.ecart ?? 0) - z.zone)} kg au-dessus de ta zone. Pas de panique : on revient aux bases deux semaines (protéines, légumes, eau, activité), et tu peux en parler à ton soignant.` },
    'en-dessous': { fond: 'var(--eau-clair)', texte: '#1d4f7a', msg: 'Tu es en dessous de ta zone. Vérifie que tu manges assez, surtout des protéines, et parles-en à ton soignant si ça continue.' },
  }
  const m = z.statut ? messages[z.statut] : null

  return (
    <section className="carte">
      <div className="ligne-titre">
        <h2>Ma zone de stabilité</h2>
        <span className="petit" style={{ fontWeight: 700 }}>{fmt1(min)} – {fmt1(max)} kg</span>
      </div>
      <div style={{ position: 'relative', height: 34, marginTop: 6 }} role="img"
        aria-label={z.actuel !== null ? `Poids actuel ${fmt1(z.actuel)} kg, zone de ${fmt1(min)} à ${fmt1(max)} kg` : 'Pas encore de pesée'}>
        <div style={{ position: 'absolute', top: 12, left: 0, right: 0, height: 10, borderRadius: 5, background: 'var(--beige)' }} />
        <div style={{ position: 'absolute', top: 12, left: `${pos(min)}%`, width: `${pos(max) - pos(min)}%`, height: 10, borderRadius: 5, background: 'var(--sauge)' }} />
        {z.actuel !== null && (
          <div style={{ position: 'absolute', top: 3, left: `calc(${pos(z.actuel)}% - 14px)`, width: 28, height: 28, borderRadius: 14, background: '#fff', border: '3px solid var(--abricot)', boxShadow: '0 1px 4px rgba(0,0,0,.15)' }} />
        )}
      </div>
      <p className="petit">Référence : {fmt1(z.reference)} kg (± {fmt1(z.zone)} kg){z.actuel !== null ? ` · dernière pesée : ${fmt1(z.actuel)} kg` : ''}</p>
      {m && <p style={{ background: m.fond, color: m.texte, borderRadius: 14, padding: 12, fontSize: 14, lineHeight: 1.45, fontWeight: 700 }}>{m.msg}</p>}
      <form className="ligne" onSubmit={(e) => { e.preventDefault(); peser() }}>
        <label className="champ pousse"><span className="sr-only">Poids du jour en kilos</span>
          <input inputMode="decimal" value={poids} onChange={(e) => setPoids(e.target.value)} placeholder="Poids du jour (kg)" />
        </label>
        <button type="submit" className="btn">Noter</button>
      </form>
    </section>
  )
}

const ECHELLE_FAIM = ['Aucune', 'Légère', 'Moyenne', 'Forte', 'Très forte']
const ECHELLE_ENVIES = ['Jamais', 'Parfois', 'Souvent', 'Très souvent', 'Tout le temps']

function Faim({ d }: { d: Donnees }) {
  const today = useToday()
  const toast = useToast()
  const duJour = d.faim.find((f) => f.dayKey === today)
  const derniers = Array.from({ length: 14 }, (_, i) => dayKey(addDays(fromDayKey(today), i - 13)))
  const parJour = new Map(d.faim.map((f) => [f.dayKey, f]))

  async function noter(champ: 'faim' | 'envies', valeur: number) {
    await db.faim.put({ dayKey: today, faim: duJour?.faim ?? 0, envies: duJour?.envies ?? 0, [champ]: valeur })
    if (champ === 'envies' || duJour?.envies) toast('Merci, c’est noté.')
  }

  const echelle = (titre: string, champ: 'faim' | 'envies', labels: string[]) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <strong style={{ fontSize: 14 }}>{titre}</strong>
      <div className="grille-5" role="group" aria-label={titre} style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 4 }}>
        {labels.map((l, i) => {
          const actif = duJour?.[champ] === i + 1
          return (
            <button key={l} type="button" aria-pressed={actif} onClick={() => noter(champ, i + 1)} style={{
              minHeight: 52, borderRadius: 12, border: `2px solid ${actif ? 'var(--sauge)' : 'var(--ligne)'}`, cursor: 'pointer',
              background: actif ? 'var(--sauge-clair)' : '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 2,
            }}>
              <span style={{ fontSize: 16, fontWeight: 900, color: actif ? 'var(--sauge-fonce)' : 'var(--encre)' }}>{i + 1}</span>
              <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--doux)', lineHeight: 1.1, textAlign: 'center' }}>{l}</span>
            </button>
          )
        })}
      </div>
    </div>
  )

  return (
    <section className="carte">
      <h2>Ma faim aujourd’hui</h2>
      <p className="petit">À l’arrêt, la faim et les pensées tournées vers la nourriture reviennent souvent. Les noter aide à les apprivoiser, et à en parler avec ton soignant.</p>
      {echelle('Faim ressentie', 'faim', ECHELLE_FAIM)}
      {echelle('Pensées à la nourriture', 'envies', ECHELLE_ENVIES)}
      <div>
        <p className="petit" style={{ fontWeight: 800, marginBottom: 6 }}>14 derniers jours (faim)</p>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 60 }} role="img" aria-label="Faim des 14 derniers jours">
          {derniers.map((k) => {
            const f = parJour.get(k)?.faim ?? 0
            return (
              <div key={k} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <div style={{ width: '100%', height: f ? 8 + f * 8 : 3, borderRadius: 4, background: f >= 4 ? 'var(--abricot)' : f ? 'var(--sauge)' : 'var(--beige)' }} />
                <span style={{ fontSize: 9, color: 'var(--doux)' }}>{JOURS_COURTS[fromDayKey(k).getDay()].charAt(0).toUpperCase()}</span>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function ChangerPhase({ profile, d, cible, onClose }: { profile: Profile; d: Donnees; cible: Phase; onClose: () => void }) {
  const toast = useToast()
  const dernier = [...d.weights].sort((a, b) => a.dayKey.localeCompare(b.dayKey)).pop()
  const [phase, setPhase] = useState<Phase>(cible)
  const [date, setDate] = useState(profile.datePhase && cible === profile.phase ? profile.datePhase : dayKey())
  const [ref, setRef] = useState(fmt1(profile.poidsReferenceKg ?? dernier?.kg ?? profile.poidsDepartKg))
  const [zone, setZone] = useState(profile.zoneStabiliteKg ?? ZONE_DEFAUT_KG)

  async function enregistrer() {
    if (phase === 'traitement') {
      await db.profile.update('me', { phase: 'traitement' })
      toast('Retour au suivi du traitement.')
      return onClose()
    }
    const r = parseNumber(ref)
    if (!r || r < 30 || r > 350) return toast('Indique un poids de référence en kilos.')
    await db.profile.update('me', { phase, datePhase: date, poidsReferenceKg: r, zoneStabiliteKg: zone })
    toast(phase === 'arret' ? 'C’est parti pour l’après-traitement. On t’accompagne.' : 'Diminution notée. On t’accompagne.')
    onClose()
  }

  return (
    <Modal title={phase === 'traitement' ? 'Reprendre le traitement' : 'Mon après-traitement'} onClose={onClose}>
      <Segmented label="Étape" value={phase} onChange={setPhase} options={[
        { value: 'diminution', label: 'Je diminue' },
        { value: 'arret', label: 'J’ai arrêté' },
        { value: 'traitement', label: 'Je reprends' },
      ]} />
      {phase !== 'traitement' ? (
        <>
          <p className="petit">À décider avec ton médecin. Ces réglages servent seulement à t’accompagner.</p>
          <label className="champ">{phase === 'arret' ? 'Date de l’arrêt' : 'Début de la diminution'}
            <input type="date" value={date} max={dayKey()} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label className="champ">Poids de référence (kg)
            <input inputMode="decimal" value={ref} onChange={(e) => setRef(e.target.value)} />
            <span className="aide">En général, ton poids au moment de l’arrêt.</span>
          </label>
          <div className="champ">Largeur de ma zone de stabilité
            <Segmented label="Zone de stabilité" value={zone} onChange={setZone} options={[
              { value: 1.5, label: '± 1,5 kg' }, { value: 2, label: '± 2 kg' }, { value: 3, label: '± 3 kg' },
            ]} />
          </div>
        </>
      ) : (
        <p style={{ fontSize: 15 }}>L’accueil affichera de nouveau ton cycle d’injection. Tes données d’après-traitement sont conservées.</p>
      )}
      <button type="button" className="btn large" onClick={enregistrer}>Enregistrer</button>
    </Modal>
  )
}
