import { Link } from 'react-router-dom'
import { IconPlus, IconTrash } from '../components/Icons'
import { db, type Profile, type Repas } from '../db'
import { useDay, useToday } from '../hooks'
import { fmt } from '../lib/text'

export const REPAS: { id: Repas; label: string; au: string }[] = [
  { id: 'petit-dejeuner', label: 'Petit-déjeuner', au: 'au petit-déjeuner' },
  { id: 'dejeuner', label: 'Déjeuner', au: 'au déjeuner' },
  { id: 'collation', label: 'Collation', au: 'à la collation' },
  { id: 'diner', label: 'Dîner', au: 'au dîner' },
]

const VERRE_ML = 250

export default function Nutrition({ profile }: { profile: Profile }) {
  const today = useToday()
  const { logs, waterMl, totals } = useDay(today)
  const objectif = profile.objectifProteinesG
  const reste = Math.max(0, objectif - Math.round(totals.proteines))
  const pct = objectif > 0 ? Math.min(100, (totals.proteines / objectif) * 100) : 0
  const nbVerres = Math.max(4, Math.round(profile.objectifEauMl / VERRE_ML))
  const verresBus = Math.round(waterMl / VERRE_ML)

  async function setVerres(n: number) {
    await db.water.put({ dayKey: today, ml: n * VERRE_ML })
  }

  return (
    <main className="page">
      <div className="entete">
        <h1>Ma nutrition</h1>
        <p className="sous-titre">Peu d’appétit ? On mise sur les protéines.</p>
      </div>

      <section className="carte sauge" aria-label="Protéines du jour">
        <span className="etiquette" style={{ color: '#d7ede2' }}>Protéines du jour</span>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ fontSize: 44, fontWeight: 900, lineHeight: 1 }}>{fmt(totals.proteines)}</span>
          <span style={{ fontSize: 18, fontWeight: 700, color: '#d7ede2' }}>/ {objectif} g</span>
        </div>
        <div style={{ height: 12, borderRadius: 6, background: 'rgba(255,255,255,0.22)', overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', borderRadius: 6, background: '#fff', transition: 'width .3s' }} />
        </div>
        <span style={{ fontSize: 14, color: '#eaf6f0' }}>
          {reste > 0
            ? `Encore ${fmt(reste)} g. Un skyr, deux œufs ou un shaker, et tu t’en approches !`
            : 'Objectif atteint : une brique de plus pour ton socle !'}
        </span>
      </section>

      <Link to="/nutrition/ajouter" className="btn large contour"><IconPlus /> Ajouter un aliment</Link>

      {REPAS.map((r) => {
        const items = logs.filter((l) => l.repas === r.id)
        const prot = items.reduce((s, l) => s + l.apports.proteines, 0)
        return (
          <section key={r.id} className="carte" style={{ gap: 6 }}>
            <div className="ligne-titre">
              <h2>{r.label}</h2>
              {items.length > 0 && <span className="petit"><strong style={{ color: 'var(--sauge)' }}>{fmt(prot)} g</strong> de protéines</span>}
            </div>
            {items.map((l) => (
              <div key={l.id} className="rangee">
                <div className="pousse" style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: 15, fontWeight: 700 }}>{l.nom}</span>
                  <span className="petit">
                    {l.unite === 'g' ? `${fmt(l.quantite)} g` : `${fmt(l.quantite)} ${l.unite}${l.quantite > 1 ? 's' : ''}`}
                    {' · '}{fmt(l.apports.proteines)} g prot. · {fmt(l.apports.fibres)} g fibres
                  </span>
                </div>
                <button type="button" className="btn rond discret" aria-label={`Retirer ${l.nom}`} onClick={() => db.foodLogs.delete(l.id!)}>
                  <IconTrash />
                </button>
              </div>
            ))}
            <Link to={`/nutrition/ajouter?repas=${r.id}`} style={{ fontWeight: 800, fontSize: 14, minHeight: 36, display: 'flex', alignItems: 'center' }}>
              + Ajouter {r.au}
            </Link>
          </section>
        )
      })}

      <section className="carte">
        <div className="ligne-titre">
          <h2>Hydratation</h2>
          <span className="petit"><strong style={{ color: 'var(--encre)' }}>{fmt(waterMl / 1000)}</strong> / {fmt(profile.objectifEauMl / 1000)} L</span>
        </div>
        <div className="verres" style={{ gridTemplateColumns: `repeat(${Math.min(nbVerres, 8)}, minmax(0, 1fr))` }}>
          {Array.from({ length: nbVerres }, (_, i) => {
            const plein = i < verresBus
            return (
              <button key={i} type="button" className={`verre${plein ? ' plein' : ''}`}
                aria-label={plein ? `Verre ${i + 1} bu, toucher pour annuler` : `Verre ${i + 1} à boire`}
                onClick={() => setVerres(plein && verresBus === i + 1 ? i : i + 1)} />
            )
          })}
        </div>
        <span className="petit">1 verre = 25 cl. Touche un verre pour le remplir.</span>
      </section>

      <section className="carte abricot">
        <div className="ligne-titre">
          <h2>Fibres & transit</h2>
          <span style={{ fontSize: 14, color: 'var(--abricot-fonce)' }}><strong>{fmt(totals.fibres)}</strong> / {profile.objectifFibresG} g</span>
        </div>
        <p style={{ fontSize: 14, lineHeight: 1.45 }}>
          Le transit ralentit souvent sous GLP-1. Pense aux kiwis, aux pruneaux, aux légumes cuits, aux légumineuses,
          et à boire régulièrement. Une petite marche après le repas aide aussi.
        </p>
      </section>

      <p className="petit">Valeurs nutritionnelles : Anses, table Ciqual 2020, et Open Food Facts pour les produits scannés.</p>
    </main>
  )
}
