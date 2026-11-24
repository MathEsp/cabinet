import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { IconChevron, IconSyringe, LogoMark } from '../components/Icons'
import SymptomForm, { symptomLabel } from '../components/SymptomForm'
import { Gauge } from '../components/ui'
import { db, type Profile } from '../db'
import { useDay, useInjections, useToday } from '../hooks'
import { addDays, fromDayKey, JOURS_COURTS, longDate, shortDate } from '../lib/dates'
import { cycleDay, cycleMessage, latest } from '../lib/injection'
import { computeSocle } from '../lib/socle'
import { fmt1 } from '../lib/text'

const PAR_ETAGE = 32

export default function Accueil({ profile }: { profile: Profile }) {
  const today = useToday()
  const { totals, waterMl, symptoms } = useDay(today)
  const injections = useInjections()
  const [symptomesOuverts, setSymptomesOuverts] = useState(false)
  const allLogs = useLiveQuery(() => db.foodLogs.toArray(), []) ?? []
  const allWater = useLiveQuery(() => db.water.toArray(), []) ?? []
  const allActivities = useLiveQuery(() => db.activities.toArray(), []) ?? []

  const hebdo = profile.frequence === 'hebdo'
  const jour = hebdo ? cycleDay(injections) : null
  const derniere = latest(injections)
  const socle = computeSocle({
    foodLogs: allLogs,
    water: allWater,
    injections,
    activities: allActivities,
    objectifProteinesG: profile.objectifProteinesG,
    objectifEauMl: profile.objectifEauMl,
  })

  let prochaine: string
  if (hebdo) {
    if (derniere) prochaine = shortDate(addDays(fromDayKey(derniere.dayKey), 7))
    else {
      const now = new Date()
      const delta = (profile.jourInjection - now.getDay() + 7) % 7
      prochaine = delta === 0 ? "aujourd'hui" : shortDate(addDays(now, delta))
    }
  } else {
    prochaine = injections.some((i) => i.dayKey === today) ? 'demain' : "aujourd'hui"
  }

  const etage = Math.floor(socle.briques / PAR_ETAGE) + 1
  const dansEtage = socle.briques % PAR_ETAGE
  const rangs = [3, 2, 1, 0].map((r) =>
    Array.from({ length: 8 }, (_, c) => {
      const idx = r * 8 + c
      if (dansEtage > 0 && idx === dansEtage - 1) return 'nouvelle'
      return idx < dansEtage ? 'pleine' : ''
    }),
  )

  return (
    <main className="page">
      <div className="ligne">
        <div className="logo pousse"><LogoMark /><span><span className="nutri-mot">Nutri</span>Socle</span></div>
        <Link to="/profil" className="avatar" aria-label="Mon profil">{profile.prenom.charAt(0).toUpperCase()}</Link>
      </div>

      <div className="entete">
        <h1>Bonjour {profile.prenom}</h1>
        <p className="sous-titre">
          {longDate(new Date())}
          {jour !== null && ` · ${jour === 0 ? "jour d'injection" : `J+${jour} après ton injection`}`}
        </p>
      </div>

      <section className="carte abricot" aria-label="Mon cycle">
        <span className="etiquette">{hebdo ? 'Ton cycle cette semaine' : 'Ton traitement'}</span>
        {hebdo && derniere && (
          <div className="cycle">
            {Array.from({ length: 7 }, (_, i) => {
              const d = addDays(fromDayKey(derniere.dayKey), i)
              return (
                <div key={i} className={`jour${i === jour ? ' aujourdhui' : ''}`}>
                  <span className="rond">{i === 0 ? 'J0' : `J+${i}`}</span>
                  <span>{JOURS_COURTS[d.getDay()]}</span>
                </div>
              )
            })}
          </div>
        )}
        <p style={{ fontSize: 15, lineHeight: 1.45 }}>
          {hebdo ? cycleMessage(jour) : 'Une injection par jour : note-la pour garder le fil et alterner les zones.'}
        </p>
        {symptoms.length > 0 && (
          <p style={{ fontSize: 14 }}>Noté aujourd’hui : {symptoms.map((s) => symptomLabel(s.type).toLowerCase()).join(', ')}.</p>
        )}
        <button type="button" className="btn blanc auto" onClick={() => setSymptomesOuverts(true)}>Noter comment je me sens</button>
      </section>

      <section className="carte" aria-label="Mon socle">
        <div className="ligne-titre">
          <h2>Ton socle</h2>
          <span className="petit" style={{ fontWeight: 700 }}>Étage {etage}</span>
        </div>
        <div className="briques" aria-hidden="true">
          {rangs.map((rang, r) => (
            <div key={r} className={`rang${r % 2 === 0 ? ' decale' : ''}`}>
              {rang.map((etat, c) => <span key={c} className={`brique ${etat}`} />)}
            </div>
          ))}
        </div>
        <p className="petit">
          <strong style={{ color: 'var(--encre)' }}>{socle.briques} brique{socle.briques > 1 ? 's' : ''}</strong> posée{socle.briques > 1 ? 's' : ''} :
          {' '}{socle.joursProteines} jour{socle.joursProteines > 1 ? 's' : ''} protéines, {socle.joursEau} jour{socle.joursEau > 1 ? 's' : ''} bien hydraté{socle.joursEau > 1 ? 's' : ''}, {socle.injections} injection{socle.injections > 1 ? 's' : ''} notée{socle.injections > 1 ? 's' : ''}, {socle.seances} séance{socle.seances > 1 ? 's' : ''} d’activité.
        </p>
      </section>

      <Link to="/nutrition" className="carte" style={{ textDecoration: 'none', color: 'inherit' }} aria-label="Aujourd'hui, voir ma nutrition">
        <div className="ligne-titre"><h2>Aujourd’hui</h2><span style={{ color: 'var(--sauge)', fontWeight: 800, fontSize: 14 }}>Détails</span></div>
        <Gauge label="Protéines" value={totals.proteines} target={profile.objectifProteinesG} unit="g" color="var(--sauge)" track="var(--sauge-clair)" />
        <Gauge label="Eau" value={waterMl / 1000} target={profile.objectifEauMl / 1000} unit="L" color="var(--eau)" track="var(--eau-clair)" />
        <Gauge label="Fibres" value={totals.fibres} target={profile.objectifFibresG} unit="g" color="#e0742f" track="var(--abricot-clair)" />
      </Link>

      <Link to="/injection" className="carte" style={{ textDecoration: 'none', color: 'inherit', flexDirection: 'row', alignItems: 'center', gap: 14, padding: '16px 18px' }}>
        <span style={{ width: 44, height: 44, borderRadius: 14, background: 'var(--sauge-clair)', color: 'var(--sauge)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <IconSyringe />
        </span>
        <span className="pousse" style={{ display: 'flex', flexDirection: 'column' }}>
          <span className="petit">Prochaine injection</span>
          <span style={{ fontSize: 16, fontWeight: 800 }}>
            {profile.moleculeNom}{profile.doseActuelleMg ? ` ${fmt1(profile.doseActuelleMg)} mg` : ''} · {prochaine}
          </span>
        </span>
        <span style={{ color: 'var(--doux)' }}><IconChevron /></span>
      </Link>

      {symptomesOuverts && <SymptomForm jourCycle={jour} onClose={() => setSymptomesOuverts(false)} />}
    </main>
  )
}
