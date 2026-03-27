/* ============================================================
 * 01_data_v1_1.gs — Données officielles Satisfactory v1.1
 * Source : satisfactory.wiki.gg/fr  (mise à jour : mars 2026)
 *
 * Structure : SAT.DATA['1.1'] = { MACHINES, RESOURCES, RECIPES }
 * Pour une nouvelle version du jeu, créer 01_data_v2_0.gs avec
 * SAT.DATA['2.0'] = { ... } et changer GAME_VERSION dans 00_config.gs.
 * ============================================================ */

var SAT = this.SAT || (this.SAT = {});
SAT.DATA = SAT.DATA || {};

SAT.DATA['1.1'] = {

  // ── Machines (noms officiels FR in-game) ──────────────────
  // [Nom, MW, Entrées conv., Sorties conv., Catégorie, Larg.(m), Long.(m), Haut.(m), Somersloops]
  // Dimensions : valeurs exactes des Infobox wiki (action=raw) → size_width × size_length × size_height
  // Somersloops : nb d'emplacements par machine (source : wiki.gg v1.1)
  // Source : satisfactory.wiki.gg — consult. mai 2026, version 1.1.
  MACHINES: [
    // Extraction — pas de somersloops sur les extracteurs
    ['Foreuse Mk.1',               4,  0, 1, 'Extraction',     6, 14, 18, 0],
    ['Foreuse Mk.2',              12,  0, 1, 'Extraction',     6, 14, 18, 0],
    ['Foreuse Mk.3',              30,  0, 1, 'Extraction',     6, 14, 18, 0],
    ['Pompe à eau',               20,  0, 1, 'Extraction',    20, 20, 26, 0],
    ['Puit de pétrole',           40,  0, 1, 'Extraction',     8, 14, 20, 0],
    ['Pressuriseur de puits de ressources', 150, 0, 0, 'Extraction', 20, 20, 23, 0],
    // Fusion
    ['Fonderie',                   4,  1, 1, 'Fusion',         5, 10,  9, 1],
    ['Fonderie avancée',          16,  2, 1, 'Fusion',        10,  9,  9, 2],
    // Production
    ['Constructeur',               4,  1, 1, 'Production',     8, 10,  8, 1],
    ['Assembleuse',               15,  2, 1, 'Production',     9, 16, 11, 2],
    ['Façonneuse',                55,  4, 1, 'Production',    18, 20, 12, 4],
    // Raffinage
    ['Raffinerie',                30,  1, 2, 'Raffinage',     10, 22, 30, 1],
    ['Mélangeur',                 75,  2, 2, 'Raffinage',     18, 16, 15, 2],
    ['Conditionneur',             10,  2, 2, 'Conditionnement', 8,  8, 12, 1],
    // Avancé
    ['Accélérateur de particules',500, 2, 1, 'Avancé',        24, 38, 32, 2],
    ['Encodeur quantique',       1000, 4, 2, 'Avancé',        22, 50, 18, 4],
    ['Convertisseur',            100,  2, 1, 'Avancé',        16, 16, 18, 2],
    // Énergie — centrale nucléaire ne reçoit pas de somersloops
    ['Centrale nucléaire',         0,  2, 1, 'Énergie',       36, 43, 39, 0]
  ],

  // ── Ressources (noms officiels FR in-game) ────────────────
  // [Nom, Catégorie]
  RESOURCES: [
    // Minerais bruts
    ['Minerai de fer',              'Minerai'],
    ['Minerai de cuivre',           'Minerai'],
    ['Calcaire',                    'Minerai'],
    ['Charbon',                     'Minerai'],
    ['Minerai de caterium',         'Minerai'],
    ['Quartz brut',                 'Minerai'],
    ['Soufre',                      'Minerai'],
    ['Bauxite',                     'Minerai'],
    ['Uranium',                     'Minerai'],
    ['É.M.E.',                      'Minerai'],
    // Fluides bruts
    ['Pétrole brut',                'Fluide'],
    ['Eau',                         'Fluide'],
    ['Gaz azote',                   'Fluide'],
    // Lingots & fondus
    ['Lingot de fer',               'Lingot'],
    ['Lingot de cuivre',            'Lingot'],
    ['Lingot d\'acier',             'Lingot'],
    ['Lingot de caterium',          'Lingot'],
    ['Lingot d\'aluminium',         'Lingot'],
    ['Lingot de ficsite',           'Lingot'],
    ['Copeaux d\'aluminium',        'Lingot'],
    // Composants de base
    ['Plaque de fer',               'Basique'],
    ['Barre de fer',                'Basique'],
    ['Vis',                         'Basique'],
    ['Fil électrique',              'Basique'],
    ['Câble',                       'Basique'],
    ['Tôle de cuivre',              'Basique'],
    ['Béton',                       'Basique'],
    ['Poutre en acier',             'Basique'],
    ['Tuyau en acier',              'Basique'],
    ['Filactif',                    'Basique'],
    ['Cristal de quartz',           'Basique'],
    ['Silice',                      'Basique'],
    // Composants industriels
    ['Plaque de fer renforcée',     'Industriel'],
    ['Cadre modulaire',             'Industriel'],
    ['Rotor',                       'Industriel'],
    ['Stator',                      'Industriel'],
    ['Moteur',                      'Industriel'],
    ['Poutre en béton armé',        'Industriel'],
    ['Circuit imprimé',             'Industriel'],
    ['Contrôleur d\'I.A.',          'Industriel'],
    ['Connecteur haute vitesse',    'Industriel'],
    ['Oscillateur à cristal',       'Industriel'],
    ['Ordinateur',                  'Industriel'],
    // Composants avancés
    ['Turbomoteur',                 'Avancé'],
    ['Superordinateur',             'Avancé'],
    ['Placage intelligent',         'Avancé'],
    ['Structure polyvalente',       'Avancé'],
    ['Cadre modulaire lourd',       'Avancé'],
    ['Câblage automatisé',          'Avancé'],
    ['Moteur modulaire',            'Avancé'],
    ['Unité de contrôle adaptative','Avancé'],
    ['Système de directeur d\'assemblage', 'Avancé'],
    ['Générateur de champ magnétique', 'Avancé'],
    ['Dissipateur de chaleur',      'Avancé'],
    ['Système de refroidissement',  'Avancé'],
    ['Cadre modulaire fusionné',    'Avancé'],
    ['Tôle d\'aluminium en alliage Alclad', 'Avancé'],
    ['Boîtiers en aluminium',       'Avancé'],
    ['Unité de contrôle radio',     'Avancé'],
    ['Batterie',                    'Avancé'],
    ['Fusée à propulsion thermique','Avancé'],
    // Pétrole & fluides industriels
    ['Plastique',                   'Pétrole'],
    ['Caoutchouc',                  'Pétrole'],
    ['Résine polymère',             'Pétrole'],
    ['Coke de pétrole',             'Pétrole'],
    ['Carburant',                   'Pétrole'],
    ['Résidu d\'huile lourde',      'Pétrole'],
    ['Turbocarburant',              'Pétrole'],
    ['Carburant de fusée',          'Pétrole'],
    ['Carburant ionisé',            'Pétrole'],
    ['Biocarburant liquide',        'Pétrole'],
    ['Solution d\'alumine',         'Pétrole'],
    ['Acide sulfurique',            'Pétrole'],
    ['Acide nitrique',              'Pétrole'],
    // Nucléaire
    ['Barre d\'uranium',            'Nucléaire'],
    ['Déchet d\'uranium',           'Nucléaire'],
    ['Cellule d\'uranium',          'Nucléaire'],
    ['Tige de contrôle électromagnétique', 'Nucléaire'],
    ['Barre de plutonium',          'Nucléaire'],
    ['Déchet de plutonium',         'Nucléaire'],
    ['Uranium non fissile',         'Nucléaire'],
    ['Pastille de plutonium',       'Nucléaire'],
    ['Cellule de plutonium encastré','Nucléaire'],
    ['Cube de conversion de pression','Nucléaire'],
    ['Pâte nucléaire',              'Nucléaire'],
    // Fin-game / É.M.E.
    ['É.M.E. réanimée',             'É.M.E.'],
    ['Fluctuateur d\'É.M.E.',       'É.M.E.'],
    ['Trigon en ficsite',           'É.M.E.'],
    ['Diamants',                    'É.M.E.'],
    ['Cristal temporel',            'É.M.E.'],
    ['Cristal de matière noire',    'É.M.E.'],
    ['Résidu de matière noire',     'É.M.E.'],
    ['Cellule de singularité',      'É.M.E.'],
    ['Oscillateur de superposition','É.M.E.'],
    ['Processeur neuro-quantique',  'É.M.E.'],
    ['Serveur d\'expansion IA',     'É.M.E.'],
    ['Moteur à distorsion balistique','É.M.E.'],
    ['Ficsonium',                   'É.M.E.'],
    ['Barre de ficsonium',          'É.M.E.'],
    ['Sculpteur biochimique',       'É.M.E.'],
    ['Matière photonique excitée',  'É.M.E.'],
    // Spéciaux
    ['Sphère de Mercer',            'Spécial'],
    ['Somersloop',                  'Spécial'],
    ['Éclat de charge',             'Spécial'],
    ['Tissu',                       'Spécial'],
    ['Poudre de cuivre',            'Spécial'],
    ['Bon FICSIT',                  'Spécial'],
    ['Charbon compacté',            'Spécial']
  ],

  // ── Recettes (noms officiels FR in-game, wiki.gg v1.1) ────
  // Format : [NomRecette, Machine, InRes1, InRate1, InRes2, InRate2,
  //           OutRes1, OutRate1, OutRes2, OutRate2, Tier]
  RECIPES: [
    // ── Fonderie (Smelter) ───────────────────────────────────
    ['Lingot de fer',        'Fonderie',     'Minerai de fer',30,          '',0,  'Lingot de fer',30,                         '',0,  'T0'],
    ['Lingot de cuivre',     'Fonderie',     'Minerai de cuivre',30,       '',0,  'Lingot de cuivre',30,                      '',0,  'T0'],
    ['Lingot de caterium',   'Fonderie',     'Minerai de caterium',45,     '',0,  'Lingot de caterium',15,                    '',0,  'T5'],

    // ── Fonderie avancée (Foundry) ───────────────────────────
    ['Lingot d\'acier',      'Fonderie avancée','Minerai de fer',45,       'Charbon',45,  'Lingot d\'acier',45,               '',0,  'T3'],
    ['Lingot d\'aluminium',  'Fonderie avancée','Copeaux d\'aluminium',90, 'Silice',75,   'Lingot d\'aluminium',60,           '',0,  'T7'],

    // ── Constructeur ─────────────────────────────────────────
    ['Plaque de fer',        'Constructeur', 'Lingot de fer',30,           '',0,  'Plaque de fer',20,                         '',0,  'T0'],
    ['Barre de fer',         'Constructeur', 'Lingot de fer',15,           '',0,  'Barre de fer',15,                          '',0,  'T0'],
    ['Vis',                  'Constructeur', 'Barre de fer',10,            '',0,  'Vis',40,                                   '',0,  'T0'],
    ['Fil électrique',       'Constructeur', 'Lingot de cuivre',15,        '',0,  'Fil électrique',30,                        '',0,  'T0'],
    ['Câble',                'Constructeur', 'Fil électrique',60,          '',0,  'Câble',30,                                 '',0,  'T0'],
    ['Béton',                'Constructeur', 'Calcaire',45,                '',0,  'Béton',15,                                 '',0,  'T0'],
    ['Tôle de cuivre',       'Constructeur', 'Lingot de cuivre',20,        '',0,  'Tôle de cuivre',10,                        '',0,  'T2'],
    ['Poutre en acier',      'Constructeur', 'Lingot d\'acier',60,         '',0,  'Poutre en acier',15,                       '',0,  'T3'],
    ['Tuyau en acier',       'Constructeur', 'Lingot d\'acier',30,         '',0,  'Tuyau en acier',20,                        '',0,  'T3'],
    ['Filactif',             'Constructeur', 'Lingot de caterium',12,      '',0,  'Filactif',60,                              '',0,  'T5'],
    ['Cristal de quartz',    'Constructeur', 'Quartz brut',37.5,           '',0,  'Cristal de quartz',22.5,                   '',0,  'MAM'],
    ['Silice',               'Constructeur', 'Quartz brut',22.5,           '',0,  'Silice',37.5,                              '',0,  'MAM'],
    ['Boîtiers en aluminium','Constructeur', 'Lingot d\'aluminium',90,     '',0,  'Boîtiers en aluminium',60,                 '',0,  'T7'],
    ['Trigon en ficsite',    'Constructeur', 'Lingot de ficsite',10,       '',0,  'Trigon en ficsite',30,                     '',0,  'T9'],

    // ── Assembleuse ──────────────────────────────────────────
    ['Plaque de fer renforcée','Assembleuse','Plaque de fer',30,           'Vis',60,           'Plaque de fer renforcée',5,   '',0, 'T0'],
    ['Rotor',                'Assembleuse',  'Barre de fer',20,            'Vis',100,          'Rotor',4,                     '',0, 'T2'],
    ['Cadre modulaire',      'Assembleuse',  'Plaque de fer renforcée',3,  'Barre de fer',12,  'Cadre modulaire',2,           '',0, 'T2'],
    ['Placage intelligent',  'Assembleuse',  'Plaque de fer renforcée',2,  'Rotor',2,          'Placage intelligent',2,       '',0, 'T2'],
    ['Structure polyvalente','Assembleuse',  'Cadre modulaire',2.5,        'Poutre en acier',30,'Structure polyvalente',5,    '',0, 'T3'],
    ['Poutre en béton armé', 'Assembleuse',  'Poutre en acier',18,         'Béton',36,         'Poutre en béton armé',6,      '',0, 'T4'],
    ['Stator',               'Assembleuse',  'Tuyau en acier',15,          'Fil électrique',40,'Stator',5,                   '',0, 'T4'],
    ['Moteur',               'Assembleuse',  'Rotor',10,                   'Stator',10,        'Moteur',5,                   '',0, 'T4'],
    ['Câblage automatisé',   'Assembleuse',  'Stator',2.5,                 'Câble',50,         'Câblage automatisé',2.5,     '',0, 'T4'],
    ['Circuit imprimé',      'Assembleuse',  'Tôle de cuivre',15,          'Plastique',30,     'Circuit imprimé',7.5,        '',0, 'T5'],
    ['Contrôleur d\'I.A.',   'Assembleuse',  'Tôle de cuivre',25,          'Filactif',100,     'Contrôleur d\'I.A.',5,       '',0, 'T7'],
    ['Dissipateur de chaleur','Assembleuse', 'Tôle d\'aluminium en alliage Alclad',37.5,'Tôle de cuivre',22.5,'Dissipateur de chaleur',7.5,'',0,'T8'],
    ['Tôle d\'aluminium en alliage Alclad','Assembleuse','Lingot d\'aluminium',30,'Lingot de cuivre',10,'Tôle d\'aluminium en alliage Alclad',30,'',0,'T7'],
    ['Tige de contrôle électromagnétique','Assembleuse','Stator',6,        'Contrôleur d\'I.A.',4,'Tige de contrôle électromagnétique',4,'',0,'T8'],
    ['Cellule de plutonium encastré','Assembleuse','Pastille de plutonium',10,'Béton',20,      'Cellule de plutonium encastré',5,'',0,'T8'],
    ['Générateur de champ magnétique','Assembleuse','Structure polyvalente',2.5,'Tige de contrôle électromagnétique',1,'Générateur de champ magnétique',1,'',0,'T8'],
    ['Cube de conversion de pression','Assembleuse','Cadre modulaire fusionné',1,'Unité de contrôle radio',2,'Cube de conversion de pression',1,'',0,'T8'],

    // ── Façonneuse (Manufacturer) ────────────────────────────
    ['Ordinateur',           'Façonneuse',   'Circuit imprimé',25,         'Câble',22.5,       'Ordinateur',2.5,             '',0, 'T6'],
    ['Cadre modulaire lourd','Façonneuse',   'Cadre modulaire',10,         'Tuyau en acier',30,'Cadre modulaire lourd',2,    '',0, 'T6'],
    ['Moteur modulaire',     'Façonneuse',   'Moteur',2,                   'Caoutchouc',15,    'Moteur modulaire',1,         '',0, 'T6'],
    ['Unité de contrôle adaptative','Façonneuse','Câblage automatisé',7.5, 'Circuit imprimé',5,'Unité de contrôle adaptative',1,'',0,'T6'],
    ['Connecteur haute vitesse','Façonneuse','Filactif',210,               'Câble',37.5,       'Connecteur haute vitesse',3.75,'',0,'T7'],
    ['Superordinateur',      'Façonneuse',   'Ordinateur',3.75,            'Contrôleur d\'I.A.',3.75,'Superordinateur',1.875,'',0,'T7'],
    ['Turbomoteur',          'Façonneuse',   'Système de refroidissement',7.5,'Caoutchouc',45,'Turbomoteur',1.875,           '',0,'T8'],
    ['Barre d\'uranium',     'Façonneuse',   'Cellule d\'uranium',20,      'Poutre en béton armé',1.2,'Barre d\'uranium',0.4,'',0,'T8'],
    ['Fusée à propulsion thermique','Façonneuse','Moteur modulaire',2.5,   'Turbomoteur',1,    'Fusée à propulsion thermique',1,'',0,'T8'],
    ['Système de directeur d\'assemblage','Façonneuse','Unité de contrôle adaptative',1.5,'Superordinateur',0.75,'Système de directeur d\'assemblage',0.75,'',0,'T7'],
    ['Unité de contrôle radio','Façonneuse', 'Boîtiers en aluminium',40,   'Oscillateur à cristal',1.25,'Unité de contrôle radio',2.5,'',0,'T7'],
    ['Batterie',             'Façonneuse',   'Acide sulfurique',50,        'Tôle d\'aluminium en alliage Alclad',40,'Batterie',20,'Eau',30,'T7'],

    // ── Raffinerie ───────────────────────────────────────────
    ['Plastique',            'Raffinerie',   'Pétrole brut',30,            '',0,  'Plastique',20,             'Résidu d\'huile lourde',10,'T5'],
    ['Caoutchouc',           'Raffinerie',   'Pétrole brut',30,            '',0,  'Caoutchouc',20,            'Résidu d\'huile lourde',20,'T5'],
    ['Carburant',            'Raffinerie',   'Pétrole brut',60,            '',0,  'Carburant',40,             'Résine polymère',30,       'T5'],
    ['Coke de pétrole',      'Raffinerie',   'Résidu d\'huile lourde',40,  '',0,  'Coke de pétrole',120,      '',0,                       'T5'],
    ['Solution d\'alumine',  'Raffinerie',   'Bauxite',120,                'Eau',90,'Solution d\'alumine',120,'Silice',50,                'T7'],
    ['Copeaux d\'aluminium', 'Raffinerie',   'Solution d\'alumine',240,    'Charbon',120,'Copeaux d\'aluminium',360,'Eau',120,            'T7'],
    ['Acide sulfurique',     'Raffinerie',   'Soufre',50,                  'Eau',50,'Acide sulfurique',50,    '',0,                       'T7'],
    ['Carburant ionisé',     'Raffinerie',   'Carburant de fusée',40,      'Éclat de charge',2.5,'Carburant ionisé',40,'Charbon compacté',5,'T9'],

    // ── Mélangeur ────────────────────────────────────────────
    ['Système de refroidissement','Mélangeur','Tôle d\'aluminium en alliage Alclad',15,'Caoutchouc',10,'Système de refroidissement',5,'Gaz azote',25,'T8'],
    ['Cadre modulaire fusionné','Mélangeur',  'Cadre modulaire lourd',1.5, 'Boîtiers en aluminium',75,'Cadre modulaire fusionné',1.5,'Gaz azote',37.5,'T8'],
    ['Turbocarburant mixte', 'Mélangeur',    'Carburant',15,               'Résidu d\'huile lourde',30,'Turbocarburant',45,'Caoutchouc',15,'T5'],
    ['Acide nitrique',       'Mélangeur',    'Gaz azote',120,              'Eau',30,   'Acide nitrique',30,   'Plaque de fer',10,          'T8'],
    ['Uranium non fissile',  'Mélangeur',    'Déchet d\'uranium',37.5,     'Silice',25,'Uranium non fissile',50,'Eau',15,                  'T8'],
    ['Pastille de plutonium','Mélangeur',    'Uranium non fissile',100,    'Déchet d\'uranium',25,'Pastille de plutonium',30,'',0,         'T8'],
    ['Carburant de fusée',   'Mélangeur',    'Turbocarburant',60,          'Acide nitrique',10,'Carburant de fusée',100,'Charbon compacté',10,'T8'],

    // ── Centrale nucléaire ────────────────────────────────────
    ['Énergie uranium',      'Centrale nucléaire','Barre d\'uranium',0.2,  'Eau',240,'Déchet d\'uranium',10,  '',0,  'T8'],
    ['Énergie plutonium',    'Centrale nucléaire','Barre de plutonium',0.1,'Eau',240,'Déchet de plutonium',1, '',0,  'T8'],

    // ── Foreuses (taux nœud Normal, Mk.1) ────────────────────
    ['Extraire: Fer',        'Foreuse Mk.1', 'Minerai de fer',0,           '',0,  'Minerai de fer',60,                        '',0,  'T0'],
    ['Extraire: Cuivre',     'Foreuse Mk.1', 'Minerai de cuivre',0,        '',0,  'Minerai de cuivre',60,                     '',0,  'T0'],
    ['Extraire: Calcaire',   'Foreuse Mk.1', 'Calcaire',0,                 '',0,  'Calcaire',60,                              '',0,  'T0'],
    ['Extraire: Charbon',    'Foreuse Mk.1', 'Charbon',0,                  '',0,  'Charbon',60,                               '',0,  'T0'],
    ['Extraire: Caterium',   'Foreuse Mk.1', 'Minerai de caterium',0,      '',0,  'Minerai de caterium',60,                   '',0,  'T3'],
    ['Extraire: Quartz',     'Foreuse Mk.1', 'Quartz brut',0,              '',0,  'Quartz brut',60,                           '',0,  'T3'],
    ['Extraire: Soufre',     'Foreuse Mk.1', 'Soufre',0,                   '',0,  'Soufre',60,                                '',0,  'T5'],
    ['Extraire: Bauxite',    'Foreuse Mk.1', 'Bauxite',0,                  '',0,  'Bauxite',60,                               '',0,  'T7'],
    ['Extraire: Uranium',    'Foreuse Mk.1', 'Uranium',0,                  '',0,  'Uranium',60,                               '',0,  'T8'],
    ['Extraire: É.M.E.',     'Foreuse Mk.1', 'É.M.E.',0,                   '',0,  'É.M.E.',60,                                '',0,  'T9'],
    ['Pomper: Eau',          'Pompe à eau',  'Eau',0,                      '',0,  'Eau',120,                                  '',0,  'T3'],
    ['Extraire: Pétrole',    'Puit de pétrole','Pétrole brut',0,           '',0,  'Pétrole brut',120,                         '',0,  'T3'],

    // ── Accélérateur de particules ────────────────────────────
    ['Bon FICSIT',           'Accélérateur de particules','Poudre de cuivre',300,'',0,'Bon FICSIT',50,        '',0,  'T4'],
    ['Pâte nucléaire',       'Accélérateur de particules','Poudre de cuivre',100,'Cube de conversion de pression',0.5,'Pâte nucléaire',0.5,'',0,'T9'],
    ['Diamants',             'Accélérateur de particules','Charbon',600,   'Turbocarburant',40,'Diamants',30,   '',0, 'T9'],

    // ── Encodeur quantique ────────────────────────────────────
    ['Serveur d\'expansion IA','Encodeur quantique','Processeur neuro-quantique',1,'Oscillateur de superposition',1,'Serveur d\'expansion IA',1,'',0,'T9'],
    ['Moteur à distorsion balistique','Encodeur quantique','Fusée à propulsion thermique',1,'Cellule de singularité',5,'Moteur à distorsion balistique',1,'',0,'T9'],
    ['Ficsonium',            'Encodeur quantique','Déchet de plutonium',10,'Cellule de singularité',10,'Ficsonium',10,'Résidu de matière noire',10,'T9'],
    ['Barre de ficsonium',   'Encodeur quantique','Ficsonium',5,           'Tige de contrôle électromagnétique',2.5,'Barre de ficsonium',1,'',0,'T9'],

    // ── Convertisseur ─────────────────────────────────────────
    ['Diamants (Convertisseur)','Convertisseur','É.M.E.',30,              'É.M.E. réanimée',100,'Diamants',30,                '',0, 'T9'],
    ['Cristal temporel',     'Convertisseur','Diamants',12,               'É.M.E.',30,           'Cristal temporel',6,        '',0, 'T9'],
    ['Cristal de matière noire','Convertisseur','Diamants',150,           'Résidu de matière noire',50,'Cristal de matière noire',30,'',0,'T9'],
    ['Lingot de ficsite (Fer)','Convertisseur','Lingot de fer',120,       'É.M.E. réanimée',40,  'Lingot de ficsite',15,      '',0, 'T9'],
    ['Lingot de ficsite (Alu)','Convertisseur','Lingot d\'aluminium',120, 'É.M.E. réanimée',40,  'Lingot de ficsite',30,      '',0, 'T9'],
    ['Cellule de singularité','Convertisseur','Pâte nucléaire',1,         'Cristal de matière noire',20,'Cellule de singularité',10,'',0,'T9'],
    ['Oscillateur de superposition','Convertisseur','Cristal de matière noire',30,'Oscillateur à cristal',5,'Oscillateur de superposition',5,'',0,'T9'],
    ['Processeur neuro-quantique','Convertisseur','Cristal temporel',25,  'Superordinateur',1,   'Processeur neuro-quantique',1,'',0,'T9'],
    ['Sculpteur biochimique','Convertisseur','Système de directeur d\'assemblage',0.5,'Trigon en ficsite',80,'Sculpteur biochimique',4,'',0,'T9'],
    ['Fluctuateur d\'É.M.E.','Convertisseur','É.M.E. réanimée',60,       'Fil électrique',50,   'Fluctuateur d\'É.M.E.',30,  '',0, 'T9']
  ]

};
