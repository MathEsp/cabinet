# NutriSocle

**Perdre du poids, pas sa force.**

Application de suivi pour les personnes sous traitement GLP-1 (Mounjaro, Wegovy, Ozempic, Saxenda, rétatrutide ou autre) :
injections, protéines, fibres, hydratation, confort digestif et soignants.

C'est une application web installable (PWA) : on l'ouvre dans Chrome sur Android, puis « Ajouter à l'écran d'accueil ».
Elle fonctionne ensuite hors connexion.

## Fonctionnalités (version 0.2)

- **Première ouverture** : avertissement médical, profil (taille, poids, traitement, dose prescrite, jour d'injection).
- **Accueil** : cycle d'injection de la semaine (J0 à J+6) avec un message adapté au jour, « Ton socle » qui se construit
  brique par brique (objectif protéines atteint, journée bien hydratée, injection notée), jauges du jour, prochaine injection,
  et saisie rapide des symptômes (nausées, constipation, pas faim, reflux, diarrhée, fatigue).
- **Injection** : paliers de dose (affichage seulement, jamais de conseil), rotation des zones avec suggestion,
  historique.
- **Nutrition** : repas de la journée, ajout d'aliments depuis la **table Ciqual de l'Anses** (3 186 aliments, recherche
  tolérante), quantité en grammes avec calcul immédiat des protéines, fibres, glucides et calories ; **compléments
  protéinés** (shakers, barres, boissons) ; **scan de code-barres** (lecteur Android natif ou lecteur intégré ZXing) via Open Food Facts ; création de produits à partir de
  l'étiquette ; suivi de l'eau verre par verre.
- **Activité** : séances à la maison (douce, débutant, intermédiaire) à cocher exercice par exercice, séance douce
  proposée les jours difficiles (J+1/J+2 ou nausées/fatigue notées), carnet de salle avec rappel des charges de la dernière
  fois, marche/vélo/natation en minutes, pas du jour. Chaque séance ajoute une brique au socle.
- **Profil** : pesées et tour de taille, objectifs modifiables, traitement, **soignants** (nom, profession, e-mail,
  téléphone), sauvegarde/restauration des données en JSON.

## Données et confidentialité

Toutes les données restent **sur le téléphone** (IndexedDB). Rien n'est envoyé à un serveur. Seule exception : lors d'un scan,
le **code-barres** (et rien d'autre) est envoyé à Open Food Facts pour récupérer la composition du produit.

## Sources

- Anses. 2020. Table de composition nutritionnelle des aliments Ciqual (licence ouverte Etalab).
  Le fichier `public/ciqual.json` est produit par `scripts/extract_ciqual.py` à partir du fichier Excel officiel.
- Open Food Facts (licence ODbL) pour les produits scannés.
- Les valeurs des compléments protéinés génériques sont des moyennes indicatives d'étiquettes du commerce.

## Développement

```bash
npm install
npm run dev      # serveur de développement
npm test         # tests des calculs (Ciqual, nutrition, injections, socle)
npm run build    # version de production dans dist/
```

Pour régénérer la table Ciqual depuis le fichier officiel :

```bash
pip install xlrd
python3 scripts/extract_ciqual.py "Table Ciqual 2020_FR_2020 07 07.xls" public/ciqual.json
```

## Avertissement

NutriSocle ne remplace pas l'avis d'un professionnel de santé et ne donne aucun conseil de dose.
