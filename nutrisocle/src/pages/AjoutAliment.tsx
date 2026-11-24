import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { IconBack, IconBarcode, IconMinus, IconPlus, IconSearch } from '../components/Icons'
import Scanner from '../components/Scanner'
import { Modal, Segmented, useToast } from '../components/ui'
import { searchFoods, type CiqualFood } from '../data/ciqual'
import { SUPPLEMENTS } from '../data/supplements'
import { db, type CustomFood, type Repas } from '../db'
import { useCiqual, useToday } from '../hooks'
import { forGrams, scale, type Nutrients } from '../lib/nutrition'
import { fetchProduct } from '../lib/openfoodfacts'
import { fmt, parseNumber } from '../lib/text'
import { REPAS } from './Nutrition'

/** Un élément que l'on peut ajouter : aliment Ciqual, complément ou produit perso. */
export interface Choix {
  ref: string
  nom: string
  detail: string
  mode: 'g' | 'portion'
  /** Valeurs pour 100 g (mode g) ou pour 1 portion (mode portion). */
  base: Nutrients
  unite: string
  defaut: number
  portionG?: number | null
  conseil?: string
}

const SUGGESTIONS = [6251, 36018, 22010, 28900, 26039, 19644, 20030, 20587, 9104, 13021]

function repasParDefaut(): Repas {
  const h = new Date().getHours() + new Date().getMinutes() / 60
  if (h < 10.5) return 'petit-dejeuner'
  if (h < 15) return 'dejeuner'
  if (h < 18.5) return 'collation'
  return 'diner'
}

function depuisCiqual(f: CiqualFood): Choix {
  const polyols = f.polyols ?? 0
  return {
    ref: `ciqual:${f.code}`,
    nom: f.nom,
    detail: `pour 100 g · ${fmt(f.per100g.proteines)} g prot. · ${fmt(f.per100g.fibres)} g fibres`,
    mode: 'g',
    base: f.per100g,
    unite: 'g',
    defaut: 100,
    conseil: polyols >= 5 ? 'Riche en polyols : peut ballonner si l’estomac est sensible.' : undefined,
  }
}

function depuisPerso(p: CustomFood): Choix {
  const marque = p.marque ? `${p.marque} · ` : ''
  if (p.base === 'portion') {
    return {
      ref: `perso:${p.id}`, nom: p.nom, mode: 'portion', base: p.apports, unite: 'portion', defaut: 1,
      detail: `${marque}${p.portionLibelle || '1 portion'} · ${fmt(p.apports.proteines)} g prot.`,
    }
  }
  return {
    ref: `perso:${p.id}`, nom: p.nom, mode: 'g', base: p.apports, unite: 'g', defaut: p.portionG ?? 100, portionG: p.portionG,
    detail: `${marque}pour 100 g · ${fmt(p.apports.proteines)} g prot.`,
  }
}

export default function AjoutAliment() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const toast = useToast()
  const today = useToday()
  const { foods, error } = useCiqual()
  const repasParam = params.get('repas') as Repas | null
  const [repas, setRepas] = useState<Repas>(REPAS.some((r) => r.id === repasParam) ? repasParam! : repasParDefaut())
  const [onglet, setOnglet] = useState<'aliments' | 'complements' | 'perso'>('aliments')
  const [query, setQuery] = useState('')
  const [choix, setChoix] = useState<Choix | null>(null)
  const [scanner, setScanner] = useState(false)
  const [scanBusy, setScanBusy] = useState(false)
  const [scanMessage, setScanMessage] = useState<string | null>(null)
  const [creation, setCreation] = useState<Partial<CustomFood> | null>(null)
  const persos = useLiveQuery(() => db.customFoods.toArray(), []) ?? []
  const recents = useLiveQuery(() => db.foodLogs.orderBy('createdAt').reverse().limit(60).toArray(), [])

  const resultats = useMemo(() => (foods && query.trim() ? searchFoods(foods, query) : []), [foods, query])

  const ciqualRecents = useMemo(() => {
    if (!foods) return []
    const byCode = new Map(foods.map((f) => [f.code, f]))
    const vus = new Set<number>()
    const liste: CiqualFood[] = []
    for (const log of recents ?? []) {
      if (!log.ref.startsWith('ciqual:')) continue
      const code = Number(log.ref.slice(7))
      if (vus.has(code) || !byCode.has(code)) continue
      vus.add(code)
      liste.push(byCode.get(code)!)
      if (liste.length >= 6) break
    }
    return liste
  }, [foods, recents])

  const suggestions = useMemo(() => {
    if (!foods) return []
    const byCode = new Map(foods.map((f) => [f.code, f]))
    return SUGGESTIONS.map((c) => byCode.get(c)).filter((f): f is CiqualFood => Boolean(f))
  }, [foods])

  const repasLabel = REPAS.find((r) => r.id === repas)!.au

  async function ajouter(c: Choix, quantite: number) {
    const apports = c.mode === 'g' ? forGrams(c.base, quantite) : scale(c.base, quantite)
    await db.foodLogs.add({
      dayKey: today, repas, ref: c.ref, nom: c.nom, quantite, unite: c.unite, apports, createdAt: new Date().toISOString(),
    })
    setChoix(null)
    toast(`Ajouté ${repasLabel} : +${fmt(apports.proteines)} g de protéines`)
  }

  async function chercherCode(code: string) {
    setScanBusy(true)
    setScanMessage(null)
    try {
      const propre = code.replace(/\D/g, '')
      const existant = await db.customFoods.where('codeBarres').equals(propre).first()
      if (existant) {
        setScanner(false)
        setChoix(depuisPerso(existant))
        return
      }
      const produit = await fetchProduct(propre)
      if (!produit) {
        setScanMessage('Produit inconnu d’Open Food Facts. Tu peux le créer avec les valeurs de l’étiquette.')
        setCreation({ codeBarres: propre, base: '100g' })
        setScanner(false)
        return
      }
      const id = await db.customFoods.add(produit)
      setScanner(false)
      setChoix(depuisPerso({ ...produit, id }))
    } catch (e) {
      setScanMessage(e instanceof Error ? e.message : 'Recherche impossible. Vérifie ta connexion.')
    } finally {
      setScanBusy(false)
    }
  }

  return (
    <main className="page sans-nav">
      <div className="ligne">
        <button type="button" className="btn rond discret" aria-label="Retour" onClick={() => navigate(-1)}><IconBack /></button>
        <h1 style={{ fontSize: 24 }}>Ajouter un aliment</h1>
      </div>

      <div className="puces" role="group" aria-label="Repas">
        {REPAS.map((r) => (
          <button key={r.id} type="button" className="puce" aria-pressed={r.id === repas} onClick={() => setRepas(r.id)}>{r.label}</button>
        ))}
      </div>

      <div className="ligne" style={{ gap: 8 }}>
        <label className="recherche">
          <IconSearch />
          <span className="sr-only">Rechercher un aliment</span>
          <input type="search" value={query} placeholder="Steak haché, riz, haricots verts…"
            onChange={(e) => { setQuery(e.target.value); setOnglet('aliments') }} />
        </label>
        <button type="button" className="btn rond" style={{ width: 48, height: 48 }} aria-label="Scanner un code-barres"
          onClick={() => { setScanMessage(null); setScanner(true) }}>
          <IconBarcode />
        </button>
      </div>

      <Segmented label="Catégorie" value={onglet} onChange={setOnglet} options={[
        { value: 'aliments', label: 'Aliments' },
        { value: 'complements', label: 'Compléments' },
        { value: 'perso', label: 'Mes produits' },
      ]} />

      {onglet === 'aliments' && (
        <>
          {error && <p role="alert" className="carte abricot">Impossible de charger la table des aliments : {error}</p>}
          {!foods && !error && <p className="vide">Chargement de la table Ciqual…</p>}
          {foods && query.trim() !== '' && (
            resultats.length > 0
              ? <ListeCiqual liste={resultats} onPick={setChoix} />
              : (
                <div className="carte" style={{ alignItems: 'center', textAlign: 'center' }}>
                  <p className="petit">Aucun aliment trouvé pour « {query} ». Essaie un mot plus simple, ou crée ton produit.</p>
                  <button type="button" className="btn clair" onClick={() => setCreation({ nom: query, base: '100g' })}>Créer « {query} »</button>
                </div>
              )
          )}
          {foods && query.trim() === '' && (
            <>
              {ciqualRecents.length > 0 && <ListeCiqual titre="Récemment ajoutés" liste={ciqualRecents} onPick={setChoix} />}
              <ListeCiqual titre="Idées riches en protéines ou en fibres" liste={suggestions} onPick={setChoix} />
            </>
          )}
        </>
      )}

      {onglet === 'complements' && (
        <div className="carte" style={{ padding: '4px 6px', gap: 0 }}>
          {SUPPLEMENTS.map((s) => (
            <button key={s.id} type="button" className="element" onClick={() => setChoix({
              ref: `supp:${s.id}`, nom: s.nom, detail: s.portion, mode: 'portion', base: s.parPortion, unite: s.unite, defaut: 1, conseil: s.conseil,
            })}>
              <span className="pousse" style={{ display: 'flex', flexDirection: 'column' }}>
                <span className="nom">{s.nom}</span>
                <span className="detail">{s.portion}</span>
              </span>
              <span className="valeur">{fmt(s.parPortion.proteines)} g prot.</span>
            </button>
          ))}
          <p className="petit" style={{ padding: '8px 10px 12px' }}>
            Valeurs moyennes. Pour ta marque exacte, scanne le code-barres de ta barre ou de ta whey.
          </p>
        </div>
      )}

      {onglet === 'perso' && (
        <>
          <div className="carte" style={{ padding: '4px 6px', gap: 0 }}>
            {persos.length === 0 && <p className="vide">Les produits scannés ou créés apparaîtront ici.</p>}
            {persos.map((p) => {
              const c = depuisPerso(p)
              return (
                <button key={p.id} type="button" className="element" onClick={() => setChoix(c)}>
                  <span className="pousse" style={{ display: 'flex', flexDirection: 'column' }}>
                    <span className="nom">{p.nom}</span>
                    <span className="detail">{c.detail}</span>
                  </span>
                </button>
              )
            })}
          </div>
          <button type="button" className="btn clair" onClick={() => setCreation({ base: '100g' })}>Créer un produit à partir de l’étiquette</button>
        </>
      )}

      <Link to="/nutrition" className="btn large contour">Terminé</Link>

      {choix && <FeuilleQuantite choix={choix} repasLabel={repasLabel} onClose={() => setChoix(null)} onAdd={ajouter} />}
      {scanner && <Scanner onCode={chercherCode} busy={scanBusy} message={scanMessage} onClose={() => setScanner(false)} />}
      {creation && (
        <CreationProduit
          initial={creation}
          message={scanMessage}
          onClose={() => { setCreation(null); setScanMessage(null) }}
          onCreated={(p) => { setCreation(null); setScanMessage(null); setChoix(depuisPerso(p)) }}
        />
      )}
    </main>
  )
}

function ListeCiqual({ titre, liste, onPick }: { titre?: string; liste: CiqualFood[]; onPick: (c: Choix) => void }) {
  return (
    <div className="carte" style={{ padding: '4px 6px', gap: 0 }}>
      {titre && <p className="petit" style={{ padding: '10px 10px 2px', fontWeight: 800 }}>{titre}</p>}
      {liste.map((f) => (
        <button key={f.code} type="button" className="element" onClick={() => onPick(depuisCiqual(f))}>
          <span className="pousse" style={{ display: 'flex', flexDirection: 'column' }}>
            <span className="nom">{f.nom}</span>
            <span className="detail">pour 100 g · {fmt(f.per100g.fibres)} g fibres · {fmt(f.per100g.kcal)} kcal</span>
          </span>
          <span className="valeur">{fmt(f.per100g.proteines)} g prot.</span>
        </button>
      ))}
    </div>
  )
}

function FeuilleQuantite({ choix, repasLabel, onClose, onAdd }: {
  choix: Choix; repasLabel: string; onClose: () => void; onAdd: (c: Choix, q: number) => void
}) {
  const [quantite, setQuantite] = useState(choix.defaut)
  const pas = choix.mode === 'g' ? 10 : 0.5
  const presets = choix.mode === 'g' ? [50, 100, 150, 200, 250] : [0.5, 1, 2]
  const n = choix.mode === 'g' ? forGrams(choix.base, quantite) : scale(choix.base, quantite)
  const libelle = (q: number) => (choix.mode === 'g' ? `${fmt(q)} g` : `${fmt(q)} ${choix.unite}${q > 1 ? 's' : ''}`)

  return (
    <Modal title={choix.nom} onClose={onClose}>
      <p className="petit">{choix.detail}</p>
      <div className="ligne">
        <button type="button" className="btn rond discret" aria-label="Diminuer la quantité" onClick={() => setQuantite((q) => Math.max(pas, Math.round((q - pas) * 10) / 10))}><IconMinus /></button>
        <label className="pousse" style={{ textAlign: 'center' }}>
          <span className="sr-only">Quantité {choix.mode === 'g' ? 'en grammes' : 'en portions'}</span>
          <input inputMode="decimal" value={fmt(quantite)} style={{ width: '100%', textAlign: 'center', fontSize: 28, fontWeight: 900, border: 'none', background: 'transparent' }}
            onChange={(e) => { const v = parseNumber(e.target.value); if (v !== null && v >= 0) setQuantite(v) }} />
          <span className="petit">{choix.mode === 'g' ? 'grammes' : `${choix.unite}${quantite > 1 ? 's' : ''}`}</span>
        </label>
        <button type="button" className="btn rond discret" aria-label="Augmenter la quantité" onClick={() => setQuantite((q) => Math.round((q + pas) * 10) / 10)}><IconPlus /></button>
      </div>
      <div className="puces" style={{ justifyContent: 'center' }}>
        {choix.portionG ? (
          <button type="button" className="puce" aria-pressed={quantite === choix.portionG} onClick={() => setQuantite(choix.portionG!)}>1 portion ({fmt(choix.portionG)} g)</button>
        ) : null}
        {presets.map((p) => (
          <button key={p} type="button" className="puce" aria-pressed={quantite === p} onClick={() => setQuantite(p)}>{libelle(p)}</button>
        ))}
      </div>
      <div className="grille-4">
        <div className="nutri prot"><span className="grand">{fmt(n.proteines)} g</span><span className="leg">Protéines</span></div>
        <div className="nutri fib"><span className="grand">{fmt(n.fibres)} g</span><span className="leg">Fibres</span></div>
        <div className="nutri"><span className="grand">{fmt(n.glucides)} g</span><span className="leg">Glucides</span></div>
        <div className="nutri"><span className="grand">{Math.round(n.kcal)}</span><span className="leg">kcal</span></div>
      </div>
      {choix.conseil && <p className="carte abricot" style={{ padding: 12, fontSize: 14 }}>{choix.conseil}</p>}
      <button type="button" className="btn large" disabled={quantite <= 0} onClick={() => onAdd(choix, quantite)}>
        Ajouter {repasLabel} · +{fmt(n.proteines)} g prot.
      </button>
    </Modal>
  )
}

function CreationProduit({ initial, message, onClose, onCreated }: {
  initial: Partial<CustomFood>; message: string | null; onClose: () => void; onCreated: (p: CustomFood) => void
}) {
  const [nom, setNom] = useState(initial.nom ?? '')
  const [marque, setMarque] = useState(initial.marque ?? '')
  const [base, setBase] = useState<'100g' | 'portion'>(initial.base ?? '100g')
  const [portion, setPortion] = useState('')
  const [v, setV] = useState({ proteines: '', fibres: '', glucides: '', lipides: '', kcal: '' })
  const [erreur, setErreur] = useState<string | null>(null)

  async function creer() {
    const proteines = parseNumber(v.proteines)
    if (!nom.trim()) return setErreur('Donne un nom au produit.')
    if (proteines === null) return setErreur('Indique au moins les protéines.')
    const fibres = parseNumber(v.fibres) ?? 0
    const glucides = parseNumber(v.glucides) ?? 0
    const lipides = parseNumber(v.lipides) ?? 0
    const kcal = parseNumber(v.kcal) ?? Math.round(4 * proteines + 4 * glucides + 9 * lipides + 2 * fibres)
    const produit: CustomFood = {
      nom: nom.trim(), marque: marque.trim(), codeBarres: initial.codeBarres ?? '', base,
      portionLibelle: base === 'portion' ? portion.trim() : '', portionG: null,
      apports: { kcal, proteines, glucides, lipides, fibres }, source: 'saisie',
    }
    const id = await db.customFoods.add(produit)
    onCreated({ ...produit, id })
  }

  const champ = (cle: keyof typeof v, label: string) => (
    <label className="champ">{label}
      <input inputMode="decimal" value={v[cle]} onChange={(e) => setV({ ...v, [cle]: e.target.value })} />
    </label>
  )

  return (
    <Modal title="Créer un produit" onClose={onClose}>
      {message && <p className="petit" style={{ color: 'var(--abricot-fonce)', fontWeight: 700 }}>{message}</p>}
      <label className="champ">Nom<input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="ex. Barre protéinée chocolat" /></label>
      <label className="champ">Marque (facultatif)<input value={marque} onChange={(e) => setMarque(e.target.value)} /></label>
      <Segmented label="Valeurs indiquées" value={base} onChange={setBase} options={[
        { value: '100g', label: 'Pour 100 g' },
        { value: 'portion', label: 'Pour 1 portion' },
      ]} />
      {base === 'portion' && (
        <label className="champ">Portion<input value={portion} onChange={(e) => setPortion(e.target.value)} placeholder="ex. 1 barre de 55 g" /></label>
      )}
      <div className="grille-2">
        {champ('proteines', 'Protéines (g)')}
        {champ('fibres', 'Fibres (g)')}
        {champ('glucides', 'Glucides (g)')}
        {champ('lipides', 'Lipides (g)')}
      </div>
      {champ('kcal', 'Énergie (kcal), facultatif')}
      {erreur && <p role="alert" style={{ color: 'var(--danger)', fontWeight: 700 }}>{erreur}</p>}
      <button type="button" className="btn large" onClick={creer}>Enregistrer le produit</button>
    </Modal>
  )
}
