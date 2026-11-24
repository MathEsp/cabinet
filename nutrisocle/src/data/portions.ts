import { normalize } from '../lib/text'

export interface Portion {
  label: string
  g: number
}

type Regle = { si: RegExp; sauf?: RegExp; portions: Portion[] }

/**
 * Portions habituelles, pour ne pas avoir à peser : « 1 œuf », « 1 steak haché »…
 * Les poids sont des moyennes courantes ; la quantité reste modifiable.
 * La première règle qui correspond au nom de l'aliment l'emporte.
 */
const REGLES: Regle[] = [
  { si: /\boeufs?\b/, sauf: /blanc|jaune|poudre|pates|brioche|gateau|flan|omelette/, portions: [{ label: '1 œuf', g: 50 }, { label: '2 œufs', g: 100 }, { label: '3 œufs', g: 150 }] },
  { si: /\bomelette\b/, portions: [{ label: 'Omelette de 2 œufs', g: 120 }, { label: 'Omelette de 3 œufs', g: 180 }] },
  { si: /steak hache/, portions: [{ label: '1 steak haché', g: 100 }, { label: '1 petit steak haché', g: 80 }] },
  { si: /filet|escalope|blanc de (poulet|dinde)/, sauf: /poisson|cabillaud|colin|merlu|saumon|lieu|sole|maquereau|hareng|sardine/, portions: [{ label: '1 filet', g: 120 }, { label: '½ filet', g: 60 }] },
  { si: /\bskyr\b/, portions: [{ label: '1 pot', g: 150 }, { label: '1 grand pot', g: 450 }] },
  { si: /yaourt|yogourt|lait fermente/, portions: [{ label: '1 pot', g: 125 }] },
  { si: /fromage blanc|faisselle|petit suisse/, portions: [{ label: '1 pot individuel', g: 100 }, { label: '1 bol', g: 200 }] },
  { si: /jambon|blanc de dinde|filet de poulet tranche/, portions: [{ label: '1 tranche', g: 40 }, { label: '2 tranches', g: 80 }] },
  { si: /thon|sardine|maquereau/, sauf: /frais|cru|cuit|grill/, portions: [{ label: '1 petite boîte', g: 80 }, { label: '1 grande boîte', g: 140 }] },
  { si: /saumon|cabillaud|colin|merlu|lieu|poisson|truite|dorade|bar\b/, portions: [{ label: '1 pavé', g: 120 }, { label: '1 petit pavé', g: 90 }] },
  { si: /\b(riz|pates|semoule|quinoa|boulgour|ble|lentilles?|pois chiches?|haricots? (blanc|rouge|sec))/, sauf: /cru|sec\b|non cuit/, portions: [{ label: '1 petite assiette', g: 150 }, { label: '1 assiette', g: 250 }, { label: '1 cuillère à soupe', g: 20 }] },
  { si: /pomme de terre|pommes de terre/, sauf: /chips|frite|puree/, portions: [{ label: '1 pomme de terre', g: 100 }, { label: '2 pommes de terre', g: 200 }] },
  { si: /puree/, portions: [{ label: '1 portion', g: 200 }] },
  { si: /haricots? verts?|courgette|brocoli|epinard|carotte|chou|poireau|ratatouille|haricot beurre|petits pois|legumes|aubergine|poivron|champignon|endive|fenouil/, portions: [{ label: '1 portion', g: 200 }, { label: '½ portion', g: 100 }] },
  { si: /tomate/, sauf: /sauce|concentre|ketchup/, portions: [{ label: '1 tomate', g: 120 }] },
  { si: /\bpain\b|baguette/, sauf: /mie grille|chapelure/, portions: [{ label: '1 tranche', g: 30 }, { label: '¼ de baguette', g: 60 }] },
  { si: /\blait\b/, sauf: /poudre|concentre|chocolat au lait|riz au lait|fromage/, portions: [{ label: '1 verre', g: 200 }, { label: '1 bol', g: 300 }] },
  { si: /emmental|comte|camembert|fromage|mozzarella|feta|chevre/, portions: [{ label: '1 portion', g: 30 }] },
  { si: /\bkiwi/, portions: [{ label: '1 kiwi', g: 75 }, { label: '2 kiwis', g: 150 }] },
  { si: /\bpommes?\b/, sauf: /terre|compote/, portions: [{ label: '1 pomme', g: 150 }] },
  { si: /\bbanane/, portions: [{ label: '1 banane', g: 120 }] },
  { si: /\borange|\bpoire|\bpeche|nectarine/, portions: [{ label: '1 fruit', g: 150 }] },
  { si: /pruneau/, portions: [{ label: '3 pruneaux', g: 30 }, { label: '5 pruneaux', g: 50 }] },
  { si: /amande|noix|noisette|cajou|pistache|cacahuete/, portions: [{ label: '1 poignée', g: 30 }] },
  { si: /soupe|veloute|potage|gaspacho/, portions: [{ label: '1 bol', g: 250 }] },
  { si: /compote/, portions: [{ label: '1 pot', g: 100 }] },
  { si: /tofu/, portions: [{ label: '1 portion', g: 100 }] },
]

export function portionsFor(nom: string): Portion[] {
  const cle = normalize(nom)
  for (const r of REGLES) {
    if (r.si.test(cle) && !(r.sauf && r.sauf.test(cle))) return r.portions
  }
  return []
}
