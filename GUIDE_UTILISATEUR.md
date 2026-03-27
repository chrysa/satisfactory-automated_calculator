# Guide Utilisateur — S.A.T. (Satisfactory Automated Tracker)

> Calculateur de production automatisé pour Satisfactory 1.1, basé sur Google Sheets.

---

## Sommaire

1. [Premier démarrage](#1-premier-démarrage)
2. [Structure du classeur](#2-structure-du-classeur)
3. [Saisir une ligne de production](#3-saisir-une-ligne-de-production)
4. [Automatisations en temps réel](#4-automatisations-en-temps-réel)
5. [Comprendre le Dashboard](#5-comprendre-le-dashboard)
6. [Gérer les référentiels](#6-gérer-les-référentiels)
7. [Configurer les étages](#7-configurer-les-étages)
8. [Mécaniques Satisfactory 1.1](#8-mécaniques-satisfactory-11)
9. [Le menu SAT](#9-le-menu-sat)
10. [Comprendre les erreurs](#10-comprendre-les-erreurs)
11. [Questions fréquentes](#11-questions-fréquentes)
12. [L'assistant intelligent](#12-lassistant-intelligent)
13. [Importer depuis un fichier de sauvegarde](#13-importer-depuis-un-fichier-de-sauvegarde)

---

## 1. Premier démarrage

1. Ouvrez le Google Sheet partagé.
2. À l'ouverture, le script se lance automatiquement et :
   - Vérifie si c'est la première installation.
   - Crée les 5 feuilles principales si elles sont absentes.
   - Charge les données de référence (ressources, machines).
   - Construit le menu **SAT** dans la barre de menus.
3. Si un message d'erreur d'initialisation s'affiche, faites **Ctrl+Shift+R** pour recharger la page, puis rafraîchissez le menu.

> **Note :** L'installation initiale peut prendre quelques secondes. Ne fermez pas l'onglet pendant ce temps.

---

## 2. Structure du classeur

Le classeur est composé de 5 feuilles principales :

| Feuille | Rôle |
|---|---|
| 📊 **Tableau de bord** | Vue d'ensemble — statistiques et résumé de votre usine |
| 📈 **Production** | Saisie de toutes vos lignes de production |
| 📋 **Ressources** | Référentiel des matières premières et produits |
| 🏗️ **Machines** | Référentiel des machines disponibles |
| 🏢 **Étages** | Configuration de la structure de votre usine (niveaux) |

---

## 3. Saisir une ligne de production

La feuille **📈 Production** est le cœur du calculateur. Chaque ligne représente une machine (ou un groupe de machines identiques) active dans votre usine.

### Structure d'une ligne

| Colonne | Nom | Description | Saisie |
|---|---|---|---|
| A | **Étage** | Nom du niveau de l'usine (ex: `Étage 1 - Fer`) | Manuelle |
| B | **Machine** | Nom de la machine | Liste déroulante |
| C | **Recette** | Nom officiel de la recette | Liste déroulante |
| D | **Qt/min OUT** | Débit de sortie (calculé automatiquement) | **Automatique** |
| E | **Qt/min IN** | Débit d'entrée (calculé automatiquement) | **Automatique** |
| F | **Nb** | Nombre de machines identiques sur cette ligne | Manuelle |
| G | **Overclock %** | Pourcentage d'overclock (1–250, défaut 100) | Manuelle |
| H | **Pureté** | Pureté du nœud pour les extracteurs (Impur/Normal/Pur) | Liste déroulante |
| I | **⚠️ Flags** | Alertes auto : déchets nucléaires, limite convoyeur, overclock élevé | **Automatique** |
| J | **Cause** | Diagnostic d'erreur écrit par le moteur | **Automatique** |

> **Important** : les colonnes D et E ne doivent jamais être saisies manuellement. Elles sont recalculées automatiquement à chaque modification.

### Exemple de saisie

```
Étage 1 | Constructeur | Plaque de fer | (auto) | (auto) | 4 | 100 | Normal | | 
```

Cela représente : **4 Constructeurs** à **100 % d'overclock** avec la recette **Plaque de fer** — les colonnes D et E sont remplies automatiquement (20/min OUT, 30/min IN).

### Exemple avec extracteur overclocké

```
Étage 0 | Foreuse Mk.3 | Minerai de fer (Foreuse Mk.3) | (auto) | (auto) | 1 | 200 | Pur | ⚡ 200% OC → 233% d'énergie | 
```

Le flag overclock est généré automatiquement dès que vous modifiez la ligne.

### Conseils de saisie

- Utilisez les **listes déroulantes** sur les colonnes Machine et Recette pour éviter les fautes de frappe.
- Pour les extracteurs (Foreuse, Pompe à eau) : choisir la recette correspondante dans la liste, et renseigner la pureté en colonne H.
- Les colonnes D et E (**Qt/min OUT/IN**) et I/J (**Flags/Cause**) sont calculées automatiquement — ne les modifiez pas.

---

## 4. Automatisations en temps réel

Dès que vous modifiez une cellule dans la feuille Production, le moteur se déclenche automatiquement.

### Calcul des taux effectifs (Overclock × Pureté)

Satisfactory applique deux multiplicateurs sur les taux de production :

**Overclock** (colonne I) :
$$\text{taux effectif} = \text{taux recette} \times \frac{\text{overclock}}{100}$$

Ex : Constructeur à 150 % qui produit 20/min nominalement → **30/min effectifs**.

**Pureté du nœud** (colonne H, extracteurs uniquement) :

| Pureté | Multiplicateur | Foreuse Mk.3 sortie |
|---|---|---|
| Impur | ×0,5 | 120/min |
| Normal | ×1,0 | 240/min |
| Pur | ×2,0 | 480/min |

Ces deux facteurs se combinent : Foreuse Mk.3 à 200 % sur nœud pur = **240 × 2 × 2 = 960/min**.

### Flags automatiques (colonne I)

La colonne **I — ⚠️ Flags** est écrite automatiquement lors de chaque modification :

| Flag | Déclencheur |
|---|---|
| `☢️ X déchets/min` | Machine = Centrale Nucléaire (12 déchets par centrale par minute) |
| `🟥 Débit OUT > Mk.5 (780/min)` | Taux de sortie dépasse la limite du convoyeur Mk.5 |
| `🟥 Débit IN > Mk.5 (780/min)` | Taux d'entrée dépasse la limite du convoyeur Mk.5 |
| `⚡ X% OC → Y% d'énergie` | Overclock > 150 % (consommation électrique calculée) |
| `🔮 Somersloop (×2 OUT)` | Le mot `somersloop` est détecté dans la colonne Note |

> **Formule de consommation par overclock :** $P = P_0 \times \left(\frac{\text{OC}}{100}\right)^{1.321}$
> Ex. : à 200 % → **×2{,}49** de consommation électrique.

### Détection des erreurs (colonne J)

La colonne **J — Cause** est remplie automatiquement si une ligne est incomplète ou incohérente :

| Cause | Solution |
|---|---|
| `Machine manquante` | Renseignez la colonne B |
| `Recette manquante` | Renseignez la colonne C |
| `Nb machines = 0` | Mettez au minimum 1 en colonne F |

---

La feuille **📊 Dashboard** affiche automatiquement :

- **Lignes de production** — nombre total de lignes saisies
- **Ressources disponibles** — taille du référentiel ressources
- **Machines disponibles** — taille du référentiel machines
- **Étages configurés** — nombre d'étages définis
- **Total ressources IN** — somme de toutes les quantités consommées
- **Total ressources OUT** — somme de toutes les quantités produites

Ces valeurs se mettent à jour automatiquement dès que vous modifiez la feuille Production.

---

## 6. Gérer les référentiels

### Ressources (📋 Ressources)

Liste toutes les matières premières, fluides et produits du jeu.

| Colonne | Description |
|---|---|
| **Ressource** | Nom exact de la ressource |
| **Type** | Catégorie : `Pur`, `Raffiné`, `Avancé`, `Fluide`, `Organique`, `Carburant` |
| **Note** | Description optionnelle |

Pour **ajouter une ressource** : ajoutez une nouvelle ligne à la suite des données existantes.

> Les ressources déjà présentes par défaut couvrent les matériaux principaux du jeu, jusqu'aux produits avancés (Turbocompresseur, Moteur Modulaire, etc.).

### Machines (🏗️ Machines)

Liste toutes les machines disponibles avec leurs dimensions.

| Colonne | Description |
|---|---|
| **Machine** | Nom exact de la machine |
| **Hauteur / Largeur / Longueur** | Dimensions en mètres (pour le planning spatial) |
| **Note** | Description optionnelle |

Pour **ajouter une machine** : ajoutez une ligne à la suite.

> Les machines pré-installées vont du Mineur Mk.1 au Réacteur à Singularité.

---

## 7. Configurer les étages

La feuille **🏢 Étages** définit la structure verticale de votre usine.

| Colonne | Description |
|---|---|
| **Étage** | Nom de l'étage (doit correspondre exactement à ce que vous saisissez dans la colonne A de Production) |
| **Ordre** | Numéro d'ordre pour le tri (1 = premier) |
| **Type** | `NORMAL`, `NUCLEAR`, ou autre type spécial |
| **ImportAny** | `TRUE/FALSE` — cet étage peut-il importer n'importe quelle ressource ? |
| **Dépendances** | Nom des étages dont celui-ci dépend (séparés par des virgules) |
| **Note** | Commentaire libre |

### Exemple de configuration

```
Étage 1 - Extraction  | 1 | NORMAL  | FALSE | —                    | Mines de fer et cuivre
Étage 2 - Fonderie    | 2 | NORMAL  | FALSE | Étage 1 - Extraction | Transformation en lingots
Étage 3 - Assemblage  | 3 | NORMAL  | TRUE  | Étage 2 - Fonderie   | Produits finis
```

> Les étages sont détectés automatiquement à l'ouverture du classeur si vous avez déjà du contenu dans la feuille Production.

---

## 8. Mécaniques Satisfactory 1.1

### Nœuds de ressources et pureté

Chaque nœud de ressource naturelle a une pureté qui détermine le débit maximum :

| Pureté | Foreuse Mk.1 | Foreuse Mk.2 | Foreuse Mk.3 |
|---|---|---|---|
| Impur | 30/min | 60/min | 120/min |
| Normal | 60/min | 120/min | 240/min |
| Pur | 120/min | 240/min | 480/min |

Avec overclock à 250 % sur un nœud pur, la Foreuse Mk.3 atteint **1 200/min**.

### Limites des convoyeurs

Le taux de sortie d'une ligne ne peut pas excéder la capacité du convoyeur utilisé :

| Niveau | Débit max |
|---|---|
| Convoyeur Mk.1 | 60/min |
| Convoyeur Mk.2 | 120/min |
| Convoyeur Mk.3 | 270/min |
| Convoyeur Mk.4 | 480/min |
| Convoyeur Mk.5 | 780/min |

Le flag `🟥 Débit > Mk.5` s'affiche automatiquement si vous dépassez 780/min — vous devrez séparer le flux ou utiliser des pipelines.

### Gestion des déchets nucléaires

Chaque **Centrale Nucléaire** consomme :
- 240/min de barres d'uranium (ou plutonium)
- Produit **12 barres de déchets nucléaires par minute**

Le flag `☢️ X déchets/min` est généré automatiquement. Ces déchets s'accumulent dans des stockages et ne peuvent pas être éliminés — prévoyez de l'espace.

### Somersloops

Les Somersloops sont des artefacts rares trouvés sur la carte. Insérés dans une machine :
- **×2 la production OUT** sans changer la consommation IN
- Augmentent la consommation électrique

Indiquez `somersloop` dans la colonne **Note** d'une ligne pour que le flag `🔮 Somersloop (×2 OUT)` soit généré automatiquement.

> La colonne **M — Somersloops** (0–4) est pré-remplie automatiquement lors d'un import depuis un fichier de sauvegarde (voir section 13).

### Phases de l'Ascenseur Spatial

L'objectif du jeu est de compléter les 5 phases de l'Ascenseur Spatial. Utilisez le calculateur pour planifier la production de ces pièces :

| Phase | Pièces clés |
|---|---|
| Phase 1 | Plaques de fer renforcées, Rotors, Tiges modulaires |
| Phase 2 | Moteurs, Boitiers ordinateur, Bots intelligents |
| Phase 3 | Circuits imprimés, Turbocompresseurs, Systèmes d'assemblage |
| Phase 4 | Piles Alclad, Blocs de réfrigérant, Accélérateurs d'assemblage |
| Phase 5 | Cristaux d'énergie, Catalyseurs nucléaires, Réacteurs magnétiques |

---

## 9. Le menu SAT

Le menu **SAT** apparaît dans la barre de menus Google Sheets après chaque ouverture. Il contient :

| Option | Action |
|---|---|
| **🤖 Ouvrir l'assistant** | Ouvre la sidebar d'analyse — détecte goulots, OC élevé, phase, nucléaire |
| **Recalcul complet** | Relance le moteur de calcul sur toutes les lignes de production |
| **Résumé de production** | Popup : nb lignes, machines actives, étages, erreurs |
| **➕ Ajouter une ligne de production** | Ouvre un formulaire modal (dropdowns recette/machine/étage, OC%, pureté) |
| **Ajouter un étage** | Prompt → ajoute une ligne dans 🏗️ Étages |
| **Lister les étages** | Popup listant tous les étages définis |
| **Taille des étages** | Calcule surface (m²), fondations (8×8) et marge par étage |
| **Marge des machines…** | Configure la marge de déplacement entre machines (défaut : 2 m) |
| **Afficher / Masquer les référentiels** | Bascule la visibilité des onglets Recettes / Ressources / Machines |
| **Créer graphiques Dashboard** | (Re)génère les 2 graphiques permanents |
| **Archiver usine & changer version jeu** | Renomme les feuilles de production en snapshot, puis recrée des feuilles vierges pour une nouvelle version |
| **Nettoyer les doublons d'onglets** | Supprime les onglets en double issus d'un rechargement forcé |
| **Diagnostic** | Affiche un rapport de santé (version, feuilles, nb lignes) |
| **Mettre à jour (reinstall)** | Reconstruit toutes les feuilles — ✅ les données Production et Étages sont conservées |
| **RESET complet** | Réinitialisation intégrale (efface tout) |

> Pour accéder aux logs : **Extensions → Apps Script → Exécutions** dans la barre de menus Google Sheets.

---

## 10. Comprendre les erreurs

Le moteur de calcul (colonne **J** de Production) peut afficher des causes d'erreur sur certaines lignes :

| Erreur | Cause | Solution |
|---|---|---|
| `Machine manquante` | La colonne B est vide | Renseignez le nom de la machine |
| `Recette manquante` | La colonne C est vide | Choisissez une recette dans la liste |
| `Nb machines = 0` | La colonne F contient 0 | Mettez au minimum 1 |

Les lignes en erreur sont mises en évidence en rouge automatiquement.

---

## 11. Questions fréquentes

**Q : Les listes déroulantes ne s'affichent pas dans la colonne Machine.**  
R : Vérifiez que la feuille 🏗️ Machines contient des données à partir de la ligne 2. Si elle est vide, allez dans le menu SAT → Réinstaller pour recharger les données de base.

**Q : J'ai ajouté des ressources mais elles n'apparaissent pas dans les listes.**  
R : Les validations se reconstruisent à l'installation. Allez dans le menu SAT → Recalculer ou rouvrez le classeur.

**Q : Le Dashboard affiche `#ERROR` dans certaines cellules.**  
R : Fermez et rouvrez le classeur. Si le problème persiste, allez dans le menu SAT → Réinstaller.

**Q : Puis-je ajouter mes propres types de ressources ?**  
R : Oui. Ajoutez simplement une ligne dans 📋 Ressources avec le type de votre choix. Il n'y a pas de liste fermée.

**Q : Comment exporter mes données ?**  
R : Utilisez **Fichier → Télécharger → Microsoft Excel (.xlsx)** ou **.csv** depuis Google Sheets pour exporter n'importe quelle feuille.

---

## 12. L'assistant intelligent

L'assistant S.A.T. est accessible via **SAT → 🤖 Ouvrir l'assistant**. Il analyse l'état complet de votre usine et affiche des cartes de recommandation dans une sidebar.

### Types de cartes

| Icône | Type | Déclencheur |
|---|---|---|
| ❌ | Erreur de configuration | Lignes avec Machine, Recette ou Nb manquants |
| ⚠️ | Avertissement | Lignes incomplètes ou OC > 150 % |
| 🔴 | Goulot | Ressource consommée > produite (déficit) |
| ℹ️ | Information | Progression de phase, surplus détecté |
| ☢️ | Nucléaire | Centrale nucléaire présente (rappel déchets) |
| ⚡ | Énergie | Résumé MW total de l'usine |

### Boutons d'action

Chaque carte peut proposer des boutons qui exécutent directement des actions sans quitter la sidebar :

| Bouton | Action |
|---|---|
| **Fix goulot** | Lance le solveur et crée les lignes de production manquantes |
| **Normaliser OC** | Règle Nb + OC=100 % équivalent pour un étage donné |
| **Voir Production** | Navigation directe vers la feuille Production |
| **Voir Objectifs** | Navigation directe vers la feuille Objectifs |

> Après chaque action, un toast de confirmation s'affiche et la sidebar se rafraîchit automatiquement.

---

## 13. Importer depuis un fichier de sauvegarde

S.A.T. peut pré-remplir la feuille Production à partir d'un fichier de sauvegarde Satisfactory (`.sav`), **directement depuis le menu**, sans aucun outil en local.

### Comment ça fonctionne

1. Menu **SAT → 📂 Importer depuis une sauvegarde** — une sidebar s'ouvre
2. Clique sur le sélecteur de fichier et choisis ton `.sav`
3. La lib `@etothepii/satisfactory-file-parser` est chargée depuis le CDN `esm.sh` **dans ton navigateur** — aucune donnée n'est envoyée à Google
4. L'analyse s'effectue localement, une prévisualisation s'affiche
5. Clique **➕ Ajouter à Production** ou **🔄 Remplacer Production**
6. Les lignes sont écrites dans la feuille et le recalcul se déclenche automatiquement

> ⚠️ **Prototype** — Le parsing browser-side dépend du sandbox GAS HtmlService et du CDN esm.sh. Si la lib ne charge pas, utilise l'alternative ligne de commande ci-dessous.

### Alternative — ligne de commande

```bash
npm install
make parse-save SAV="/chemin/vers/ma-partie.sav"
```

Puis importe le CSV généré manuellement dans la feuille Production.

### Données extraites automatiquement

| Donnée | Source dans la save |
|---|---|
| Machine, Recette | Chemin de classe Unreal du bâtiment |
| Overclock % | `mCurrentPotentialConversion` (× 100) |
| Pureté | `EResourcePurity` du nœud |
| Somersloops | `mNumSomersloopsSlotted` / `mNumSlotsUsedForced` |
| Étage | Altitude Z arrondie à 400 cm → nom "Étage N" automatique |

### Rapport de collectibles

En plus de la prévisualisation, la sidebar affiche un résumé :

| Indicateur | Contenu |
|---|---|
| **Disques durs** | Collectés / total + % + sites restants |
| **Somersloops** | Slottés dans machines + en inventaire + dans le monde |
| **Sphères de Mercer** | En inventaire + encore dans le monde |
| **Limaces d'énergie** | Vertes/Jaunes/Bleues + shards disponibles |
| **Durée de jeu** | Extraite de l'en-tête de la save |

---

*S.A.T. v3.5.1 — Google Apps Script*
