import { jsPDF } from 'jspdf'
import type { Carer } from '../db'
import { fromDayKey } from './dates'
import { intensiteLabel, periodeLabel, type RapportData } from './rapport'
import { fmt, fmt1 } from './text'

const SAUGE: [number, number, number] = [47, 122, 95]
const SAUGE_CLAIR: [number, number, number] = [227, 241, 234]
const ENCRE: [number, number, number] = [43, 42, 51]
const DOUX: [number, number, number] = [95, 92, 102]
const LIGNE: [number, number, number] = [230, 220, 208]
const ABRICOT_CLAIR: [number, number, number] = [253, 232, 218]

/** Les polices standard des PDF ne couvrent pas tous les caractères : on remplace les plus courants. */
function t(s: string): string {
  return s
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/œ/g, 'oe').replace(/Œ/g, 'OE')
    .replace(/…/g, '...')
    .replace(/×/g, 'x')
    .replace(/½/g, '1/2').replace(/¼/g, '1/4')
    .replace(/[  ]/g, ' ')
    .replace(/−/g, '-')
}

const signe = (x: number) => `${x > 0 ? '+' : x < 0 ? '-' : ''}${fmt1(Math.abs(x))}`
const dateCourte = (k: string) => fromDayKey(k).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })

export interface OptionsPdf {
  destinataire: Carer | null
  questions: string
  genereLe?: Date
}

/** Rapport de suivi sur une page A4, pensé pour être lu en une minute. */
export function genererPdf(r: RapportData, opts: OptionsPdf): Blob {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const M = 14
  const W = 210 - 2 * M
  let y = M

  const texte = (s: string, x: number, yy: number, taille = 9.5, style: 'normal' | 'bold' = 'normal', couleur = ENCRE, opts2?: { align?: 'left' | 'right' | 'center'; maxWidth?: number }) => {
    doc.setFont('helvetica', style)
    doc.setFontSize(taille)
    doc.setTextColor(...couleur)
    doc.text(t(s), x, yy, opts2)
  }
  const titreSection = (s: string) => {
    texte(s.toUpperCase(), M, y, 9, 'bold', SAUGE)
    doc.setDrawColor(...SAUGE)
    doc.setLineWidth(0.4)
    doc.line(M, y + 1.5, M + W, y + 1.5)
    y += 6
  }

  // En-tête
  doc.setFillColor(...SAUGE)
  doc.roundedRect(M, y, W, 20, 3, 3, 'F')
  texte('Rapport de suivi - traitement GLP-1', M + 5, y + 8, 15, 'bold', [255, 255, 255])
  texte(`${r.prenom} · ${periodeLabel(r)} (${r.nbJours} jours)`, M + 5, y + 15, 9.5, 'normal', [234, 246, 240])
  texte('NutriSocle', M + W - 5, y + 8, 10, 'bold', [255, 255, 255], { align: 'right' })
  y += 25
  const genere = (opts.genereLe ?? new Date()).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
  const dest = opts.destinataire ? `Destinataire : ${[opts.destinataire.prenom, opts.destinataire.nom].filter(Boolean).join(' ')}${opts.destinataire.role ? `, ${opts.destinataire.role}` : ''} · ` : ''
  texte(`${dest}Document généré le ${genere} à partir des données saisies par le patient.`, M, y, 8, 'normal', DOUX)
  y += 5
  if (r.debutSuivi > r.debut) {
    texte(`Suivi dans l'application commencé le ${dateCourte(r.debutSuivi)} : les chiffres portent sur ${r.joursSuivis} jour${r.joursSuivis > 1 ? 's' : ''}.`, M, y - 0.5, 8, 'bold', DOUX)
    y += 5
  }

  // Chiffres clés
  const kpis: [string, string, string][] = [
    ['Poids actuel', r.poids.actuel !== null ? `${fmt1(r.poids.actuel)} kg` : '-',
      r.poids.evolutionPeriode !== null ? `${signe(r.poids.evolutionPeriode)} kg sur la période` : 'pas de pesée'],
    ['Injections', `${r.traitement.injections} / ${r.traitement.attendues}`,
      `${r.traitement.molecule}${r.traitement.doseActuelle !== null ? ` ${fmt1(r.traitement.doseActuelle)} mg` : ''}`],
    ['Protéines / jour', r.apports.joursRenseignes ? `${fmt(r.apports.proteinesMoy)} g` : '-',
      `objectif ${r.apports.objectifProteines} g · atteint ${r.apports.joursObjectifAtteint} j`],
    ['Jours avec symptômes', `${r.joursAvecSymptome} / ${r.joursSuivis}`,
      r.tolerance[0] ? `surtout : ${r.tolerance[0].label.toLowerCase()}` : 'aucun symptôme noté'],
  ]
  const kw = (W - 3 * 3) / 4
  kpis.forEach(([label, valeur, sous], i) => {
    const x = M + i * (kw + 3)
    doc.setFillColor(...SAUGE_CLAIR)
    doc.roundedRect(x, y, kw, 21, 2.5, 2.5, 'F')
    texte(label, x + 3, y + 5.5, 7.5, 'bold', DOUX)
    texte(valeur, x + 3, y + 12.5, 14, 'bold', ENCRE)
    texte(sous, x + 3, y + 17.5, 7, 'normal', DOUX, { maxWidth: kw - 5 })
  })
  y += 27

  // Deux colonnes : traitement / poids
  const cw = (W - 6) / 2
  const yCol = y
  texte('TRAITEMENT', M, y, 9, 'bold', SAUGE)
  texte('POIDS', M + cw + 6, y, 9, 'bold', SAUGE)
  doc.setDrawColor(...SAUGE); doc.setLineWidth(0.4)
  doc.line(M, y + 1.5, M + cw, y + 1.5)
  doc.line(M + cw + 6, y + 1.5, M + W, y + 1.5)
  let yg = y + 6.5
  const ligneG = (a: string, b: string) => { texte(a, M, yg, 8.5, 'normal', DOUX); texte(b, M + cw, yg, 8.5, 'bold', ENCRE, { align: 'right' }); yg += 5 }
  ligneG('Produit', r.traitement.molecule)
  ligneG('Rythme', r.traitement.frequence === 'hebdo' ? '1 injection par semaine' : '1 injection par jour')
  ligneG('Dose actuelle', r.traitement.doseActuelle !== null ? `${fmt1(r.traitement.doseActuelle)} mg` : 'non renseignée')
  ligneG('Injections notées', `${r.traitement.injections} sur ${r.traitement.attendues} attendues`)
  if (r.apres) {
    ligneG(r.apres.phase === 'arret' ? 'Traitement arrêté le' : 'Diminution depuis le', r.apres.datePhase ? dateCourte(r.apres.datePhase) : '-')
    ligneG('Zone de stabilité', `${fmt1(r.apres.reference - r.apres.zone)} - ${fmt1(r.apres.reference + r.apres.zone)} kg`)
    ligneG('Poids / zone', r.apres.statut === 'dans' ? 'dans la zone' : r.apres.statut === 'au-dessus' ? 'au-dessus' : r.apres.statut === 'en-dessous' ? 'en dessous' : 'pas de pesée')
    if (r.apres.faimMoy !== null) ligneG(`Faim moyenne (1 à 5, ${r.apres.joursFaim} j)`, fmt1(r.apres.faimMoy))
    if (r.apres.enviesMoy !== null) ligneG('Pensées à la nourriture (1 à 5)', fmt1(r.apres.enviesMoy))
  }
  if (r.traitement.changements.length === 0) ligneG('Changement de dose', 'aucun sur la période')
  r.traitement.changements.slice(-3).forEach((c) => ligneG(`Dose modifiée le ${dateCourte(c.dayKey)}`, `${c.de !== null ? fmt1(c.de) : '?'} -> ${c.a !== null ? fmt1(c.a) : '?'} mg`))

  let yd = y + 6.5
  const xd = M + cw + 6
  const ligneD = (a: string, b: string) => { texte(a, xd, yd, 8.5, 'normal', DOUX); texte(b, M + W, yd, 8.5, 'bold', ENCRE, { align: 'right' }); yd += 5 }
  ligneD('Au début du suivi', `${fmt1(r.poids.depart)} kg`)
  if (r.poids.debutPeriode !== null) ligneD('Début de la période', `${fmt1(r.poids.debutPeriode)} kg`)
  if (r.poids.evolutionTotale !== null) ligneD('Évolution depuis le début', `${signe(r.poids.evolutionTotale)} kg`)
  if (r.poids.tourTaille) ligneD('Tour de taille (période)', `${fmt1(r.poids.tourTaille.debut)} -> ${fmt1(r.poids.tourTaille.fin)} cm`)
  // Courbe de poids
  const pts = r.poids.points
  if (pts.length >= 2) {
    const gh = 16, gy = yd - 2, gx = xd, gw = cw
    doc.setFillColor(250, 247, 243); doc.roundedRect(gx, gy, gw, gh, 1.5, 1.5, 'F')
    const t0 = fromDayKey(r.debut).getTime(), t1 = fromDayKey(r.fin).getTime() || t0 + 1
    const kgs = pts.map((p) => p.kg)
    const min = Math.min(...kgs) - 0.5, max = Math.max(...kgs) + 0.5
    const px = (k: string) => gx + 3 + ((fromDayKey(k).getTime() - t0) / Math.max(1, t1 - t0)) * (gw - 6)
    const py = (kg: number) => gy + gh - 3 - ((kg - min) / (max - min)) * (gh - 6)
    doc.setDrawColor(...SAUGE); doc.setLineWidth(0.6)
    for (let i = 1; i < pts.length; i++) doc.line(px(pts[i - 1].dayKey), py(pts[i - 1].kg), px(pts[i].dayKey), py(pts[i].kg))
    doc.setFillColor(...SAUGE)
    pts.forEach((p) => doc.circle(px(p.dayKey), py(p.kg), 0.7, 'F'))
    texte(`Pesées de la période : ${dateCourte(pts[0].dayKey)} ${fmt1(kgs[0])} kg -> ${dateCourte(pts[pts.length - 1].dayKey)} ${fmt1(kgs[kgs.length - 1])} kg`,
      gx, gy + gh + 3.5, 7, 'normal', DOUX)
    yd = gy + gh + 7
  } else {
    texte('Pas assez de pesées pour tracer une courbe.', xd, yd, 7.5, 'normal', DOUX); yd += 5
  }
  y = Math.max(yg, yd, yCol + 20) + 3

  // Tolérance
  titreSection('Tolérance digestive et générale')
  if (r.tolerance.length === 0) {
    texte('Aucun symptôme noté sur la période.', M, y, 8.5, 'normal', DOUX)
    y += 6
  } else {
    const cols = [M, M + 52, M + 92, M + 132]
    texte('Symptôme', cols[0], y, 7.5, 'bold', DOUX)
    texte(`Jours (sur ${r.joursSuivis})`, cols[1], y, 7.5, 'bold', DOUX)
    texte('Intensité moyenne', cols[2], y, 7.5, 'bold', DOUX)
    texte(r.traitement.frequence === 'hebdo' ? 'Moment du cycle' : '', cols[3], y, 7.5, 'bold', DOUX)
    y += 4.5
    r.tolerance.slice(0, 6).forEach((l, i) => {
      if (i % 2 === 0) { doc.setFillColor(250, 247, 243); doc.rect(M, y - 3.4, W, 4.8, 'F') }
      texte(l.label, cols[0], y, 8.5, 'bold')
      texte(String(l.jours), cols[1], y, 8.5)
      texte(intensiteLabel(l.intensite), cols[2], y, 8.5)
      texte(l.moment ? `surtout ${l.moment} après l'injection` : '', cols[3], y, 8.5)
      y += 4.8
    })
    y += 2
  }

  // Alimentation
  const a = r.apports
  titreSection(`Alimentation (moyenne sur ${a.joursRenseignes} jour${a.joursRenseignes > 1 ? 's' : ''} renseigné${a.joursRenseignes > 1 ? 's' : ''} sur ${r.joursSuivis})`)
  if (a.joursRenseignes === 0) {
    texte('Aucun repas saisi sur la période.', M, y, 8.5, 'normal', DOUX)
    y += 6
  } else {
    const items: [string, string][] = [
      ['Protéines', `${fmt(a.proteinesMoy)} g/j (objectif ${a.objectifProteines} g)`],
      ['Fibres', `${fmt(a.fibresMoy)} g/j (objectif ${a.objectifFibres} g)`],
      ['Énergie', `${fmt(a.kcalMoy)} kcal/j`],
      ['Eau', a.eauMoyL !== null ? `${fmt1(a.eauMoyL)} L/j (${a.joursEauNotee} j notés)` : 'non notée'],
    ]
    const iw = W / 4
    items.forEach(([k, v], i) => {
      texte(k, M + i * iw, y, 7.5, 'bold', DOUX)
      texte(v, M + i * iw, y + 4.2, 8.5, 'bold', ENCRE, { maxWidth: iw - 2 })
    })
    y += 10
    const cols = [M, M + 52, M + 92]
    texte('Repas', cols[0], y, 7.5, 'bold', DOUX)
    texte('Pris (jours renseignés)', cols[1], y, 7.5, 'bold', DOUX)
    texte('Protéines moyennes', cols[2], y, 7.5, 'bold', DOUX)
    y += 4.5
    r.repas.forEach((l, i) => {
      if (i % 2 === 0) { doc.setFillColor(250, 247, 243); doc.rect(M, y - 3.4, W, 4.8, 'F') }
      texte(l.label, cols[0], y, 8.5, 'bold')
      texte(`${l.jours} / ${a.joursRenseignes}`, cols[1], y, 8.5)
      texte(l.jours ? `${fmt(l.proteinesMoy)} g` : '-', cols[2], y, 8.5)
      y += 4.8
    })
    const sautes = r.repas.filter((l) => l.repas !== 'collation' && l.jours < a.joursRenseignes)
      .map((l) => `${l.label.toLowerCase()} absent ${a.joursRenseignes - l.jours} jour${a.joursRenseignes - l.jours > 1 ? 's' : ''}`)
    texte(`Fréquence : ${fmt1(r.repasParJour)} repas par jour en moyenne${sautes.length ? ` ; ${sautes.join(', ')}` : ''}.`, M, y + 0.5, 8.5, 'normal', ENCRE, { maxWidth: W })
    y += 7
  }

  // Activité
  titreSection('Activité physique')
  const act = r.activite
  const phrase = [
    `${act.seances} séance${act.seances > 1 ? 's' : ''} sur la période (${fmt(act.minutesParSemaine)} min par semaine en moyenne)`,
    act.pasMoy !== null ? `${Math.round(act.pasMoy).toLocaleString('fr-FR')} pas par jour en moyenne (${act.joursPas} j notés)` : null,
  ].filter(Boolean).join(' ; ')
  texte(`${phrase}.`, M, y, 8.5, 'normal', ENCRE, { maxWidth: W })
  y += 8

  // Questions du patient
  const basPage = 297 - 18
  titreSection('Questions du patient')
  const q = opts.questions.trim()
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9)
  const lignes = q ? (doc.splitTextToSize(t(q), W - 8) as string[]) : ['Pas de question pour cette consultation.']
  // Le cadre s'adapte au texte (avec de la place pour des notes), sans dépasser le bas de la page.
  const hauteurDispo = Math.max(14, Math.min(basPage - y, lignes.length * 4.3 + 22))
  doc.setFillColor(...ABRICOT_CLAIR)
  doc.roundedRect(M, y - 3, W, hauteurDispo, 2.5, 2.5, 'F')
  const maxLignes = Math.floor((hauteurDispo - 4) / 4.3)
  const visibles = lignes.length > maxLignes ? [...lignes.slice(0, maxLignes - 1), '(suite tronquée)'] : lignes
  visibles.forEach((l, i) => texte(l, M + 4, y + 2 + i * 4.3, 9, 'normal', q ? ENCRE : DOUX))

  // Pied de page
  doc.setDrawColor(...LIGNE); doc.setLineWidth(0.3)
  doc.line(M, 297 - 12, M + W, 297 - 12)
  texte("Données déclarées par le patient dans l'application NutriSocle. Ce document est une aide au suivi et ne constitue pas un avis médical.",
    M, 297 - 8, 7, 'normal', DOUX)

  return doc.output('blob')
}

export function nomFichier(r: RapportData): string {
  const prenom = r.prenom.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '-')
  return `NutriSocle_rapport_${prenom}_${r.fin}.pdf`
}
