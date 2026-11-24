export interface ExerciceProgramme {
  nom: string
  consigne: string
  /** Ex. « 3 × 10 », « 3 × 20 s ». */
  dosage: string
}

export interface Programme {
  id: 'douce' | 'debutant' | 'intermediaire'
  titre: string
  sousTitre: string
  dureeMin: number
  exercices: ExerciceProgramme[]
}

/**
 * Programmes à faire à la maison, sans matériel (ou avec un élastique / des bouteilles d'eau).
 * But : garder le muscle pendant la perte de poids. Contenu à valider par un professionnel.
 */
export const PROGRAMMES: Programme[] = [
  {
    id: 'douce',
    titre: 'Séance douce',
    sousTitre: 'Mobilité et respiration · pour les jours difficiles',
    dureeMin: 15,
    exercices: [
      { nom: 'Respiration abdominale', consigne: 'Assis, une main sur le ventre : inspire par le nez, souffle lentement.', dosage: '2 min' },
      { nom: 'Cercles d’épaules', consigne: 'Debout, grands cercles lents vers l’arrière puis vers l’avant.', dosage: '2 × 10' },
      { nom: 'Cercles de hanches', consigne: 'Mains sur les hanches, petits cercles dans chaque sens.', dosage: '2 × 10' },
      { nom: 'Chat-vache', consigne: 'À quatre pattes, arrondis puis creuse doucement le dos.', dosage: '2 × 8' },
      { nom: 'Assis-debout lent', consigne: 'Lève-toi d’une chaise sans les mains, si possible, puis rassieds-toi doucement.', dosage: '2 × 8' },
      { nom: 'Étirement des mollets', consigne: 'Mains au mur, une jambe tendue derrière, talon au sol.', dosage: '2 × 30 s' },
    ],
  },
  {
    id: 'debutant',
    titre: 'Renfo débutant',
    sousTitre: 'Tout le corps · sans matériel',
    dureeMin: 20,
    exercices: [
      { nom: 'Squat sur chaise', consigne: 'Assis-debout en gardant le dos droit, les genoux dans l’axe des pieds.', dosage: '3 × 10' },
      { nom: 'Pompes contre le mur', consigne: 'Bras tendus, corps gainé, descends la poitrine vers le mur.', dosage: '3 × 8' },
      { nom: 'Pont fessier', consigne: 'Allongé, genoux pliés : monte le bassin en serrant les fessiers.', dosage: '3 × 12' },
      { nom: 'Rowing aux bouteilles', consigne: 'Penché en avant dos droit, tire deux bouteilles d’eau vers les hanches.', dosage: '3 × 12' },
      { nom: 'Gainage sur les genoux', consigne: 'Sur les avant-bras et les genoux, ventre rentré, on respire.', dosage: '3 × 20 s' },
    ],
  },
  {
    id: 'intermediaire',
    titre: 'Renfo intermédiaire',
    sousTitre: 'Tout le corps · élastique ou bouteilles',
    dureeMin: 30,
    exercices: [
      { nom: 'Squat', consigne: 'Pieds largeur d’épaules, descends comme pour t’asseoir, poids sur les talons.', dosage: '4 × 12' },
      { nom: 'Fentes alternées', consigne: 'Un grand pas en avant, le genou arrière descend vers le sol.', dosage: '3 × 10 par jambe' },
      { nom: 'Pompes sur les genoux', consigne: 'Mains sous les épaules, corps aligné des genoux à la tête.', dosage: '3 × 10' },
      { nom: 'Rowing à l’élastique', consigne: 'Élastique accroché devant toi, tire les coudes vers l’arrière.', dosage: '4 × 12' },
      { nom: 'Soulevé de terre jambes semi-tendues', consigne: 'Avec bouteilles ou haltères, penche-toi dos plat, pousse les hanches en arrière.', dosage: '3 × 12' },
      { nom: 'Gainage', consigne: 'Sur les avant-bras et les pieds, corps bien droit.', dosage: '3 × 30 s' },
    ],
  },
]

/** Exercices de salle proposés à la saisie (on peut en taper d'autres). */
export const EXERCICES_SALLE = [
  'Presse à cuisses', 'Squat', 'Fentes', 'Leg extension', 'Leg curl', 'Soulevé de terre roumain', 'Hip thrust',
  'Développé couché', 'Développé incliné', 'Développé militaire', 'Élévations latérales', 'Pec deck',
  'Tirage vertical', 'Tirage horizontal (rowing assis)', 'Rowing haltère', 'Curl biceps', 'Extension triceps',
  'Mollets debout', 'Gainage', 'Abdos à la machine',
]

export const CARDIO = ['Marche', 'Marche rapide', 'Vélo', 'Natation', 'Aquagym', 'Elliptique', 'Danse', 'Autre'] as const
