/* 00_core_config.gs - Configuration globale S.A.T */
var SAT = this.SAT || (this.SAT = {});

SAT.CFG = SAT.CFG || {
  VERSION: "S.A.T-2026.03",

  SHEETS: {
    DASHBOARD: "📊 Dashboard",
    PRODUCTION: "📈 Production",
    RESOURCES: "📋 Ressources",
    MACHINES: "🏗️ Machines",
    FLOORS: "🏢 Étages"
  },

  THEME: {
    bg: "#F5F5F5",
    header: "#1E88E5",
    headerText: "#FFFFFF",
    accent: "#42A5F5"
  },

  PRODUCTION: {
    HEADER_ROW: 2,
    DATA_ROW: 3,
    COLS: {
      ETAGE: 1,
      MACHINE: 2,
      IN_RES: 3,
      IN_RATE: 4,
      OUT_RES: 5,
      OUT_RATE: 6,
      NB: 7,
      NOTE: 8
    }
  },

  RESOURCES: {
    HEADER_ROW: 1,
    DATA_ROW: 2,
    COLS: { NAME: 1, TYPE: 2, NOTE: 3 }
  },

  MACHINES: {
    HEADER_ROW: 1,
    DATA_ROW: 2,
    COLS: { NAME: 1, HEIGHT: 2, WIDTH: 3, LENGTH: 4, NOTE: 5 }
  },

  FLOORS: {
    HEADER_ROW: 1,
    DATA_ROW: 2,
    COLS: { NAME: 1, RESOURCE: 2, MACHINE: 3, QTY: 4, RATE: 5, TOTAL: 6 }
  },

  DASHBOARD: {
    TITLE_ROW: 1,
    STATS_ROW: 3,
    CHARTS_ROW: 8
  },

  SEED: {
    BASE_RESOURCES: [
      // Ressources Pures
      ["Minerai de Fer", "Pur", "Minerai rouge"],
      ["Minerai de Cuivre", "Pur", "Minerai brun"],
      ["Charbon", "Pur", "Minerai noir"],
      ["Calcaire", "Pur", "Minerai blanc"],
      ["Minerai de Cathium", "Pur", "Minerai bleu"],
      ["Soufre", "Pur", "Minerai jaune"],
      ["Bauxite", "Pur", "Minerai orange"],
      ["Uranium", "Pur", "Minerai radioactif"],
      ["Silice", "Pur", "Minerai sableux"],
      
      // Ressources Organiques
      ["Bois", "Organique", "Des arbres"],
      ["Feuilles", "Organique", "Des arbres"],
      ["Mycélium", "Organique", "Souterrain"],
      ["Pétales de Fleur", "Organique", "Plantes colorées"],
      
      // Fluides
      ["Pétrole Brut", "Fluide", "Pétrole brut"],
      ["Eau", "Fluide", "Ressource essentielle"],
      ["Gaz Azote", "Fluide", "Atmosphérique"],
      
      // Produits Raffinés
      ["Plaque de Fer", "Raffiné", "Depuis minerai de fer"],
      ["Tige de Fer", "Raffiné", "Depuis minerai de fer"],
      ["Feuille de Cuivre", "Raffiné", "Depuis minerai de cuivre"],
      ["Béton", "Raffiné", "Depuis calcaire"],
      ["Lingot d'Acier", "Raffiné", "Depuis charbon+fer"],
      ["Plastique", "Raffiné", "Depuis pétrole brut"],
      ["Caoutchouc", "Raffiné", "Depuis pétrole brut"],
      ["Tissu", "Raffiné", "Depuis feuilles/pétales"],
      ["Débris d'Aluminium", "Raffiné", "Depuis bauxite"],
      
      // Produits Avancés
      ["Poutre Industrielle Blindée", "Avancé", "Construction complexe"],
      ["Plaque de Fer Renforcée", "Avancé", "Objet de luxe"],
      ["Moteur Modulaire", "Avancé", "Haute technologie"],
      ["Turbocompresseur", "Avancé", "Haute technologie"],
      ["Cristal d'Énergie", "Avancé", "Spécial"],
      
      // Carburants
      ["Biocombustible Solide", "Carburant", "Combustible"],
      ["Pétrole Emballé", "Carburant", "Carburant liquide"],
      ["Résidu de Pétrole Lourd Emballé", "Carburant", "Sous-produit"],
      
      // Spécial
      ["Cristal de Quartz", "Pur", "Minéral"],
      ["Cristal d'Amélioration", "Défense", "Amélioration HUB"]
    ],

    MACHINES: [
      ["Mineur Mk.1", 8, 8, 9, "Extraction basique"],
      ["Mineur Mk.2", 8, 8, 9, "Extraction plus rapide"],
      ["Mineur Mk.3", 8, 8, 9, "Extraction élite"],
      ["Pompe à Eau", 10, 10, 10, "Pompe l'eau"],
      ["Pompe à Pétrole", 10, 10, 10, "Pompe le pétrole"],
      
      ["Fonderie", 9, 10, 9, "Minerai + charbon → lingot"],
      ["Creuset", 12, 15, 12, "Fonte avancée"],
      ["Constructeur", 8, 8, 10, "Fabrique basique"],
      ["Assembleur", 11, 9, 16, "Assemblage complexe"],
      ["Mixeur", 15, 18, 16, "Mélange fluides+solides"],
      ["Emballeur", 10, 10, 10, "Empaquette les fluides"],
      ["Dépakeur", 10, 10, 10, "Dépaquette les fluides"],
      
      ["Raffinerie", 30, 10, 22, "Traitement du pétrole"],
      ["Extraction par Fracturation", 28, 18, 24, "Fluides rocheux"],
      ["Extraction d'Eau Distillée", 12, 12, 12, "Eau pure"],
      
      ["Accélérateur de Particules", 32, 24, 38, "Installation recherche"],
      ["Convertisseur", 18, 16, 16, "Conversion exotique"],
      ["Encodeur Quantique", 18, 22, 50, "Technologie avancée"],
      ["Réacteur à Singularité", 38, 38, 40, "Puissance fin-game"],
      
      ["Fabricateur", 12, 18, 20, "Fabrication avancée"],
      ["Constructeur Automatique", 15, 20, 25, "Recette automatique"],
      ["Collecteur", 10, 10, 10, "Routage multi-chemins"],
      
      ["Centrale Nucléaire", 39, 36, 43, "Puissance extrême"],
      ["Biolaboratoire", 14, 14, 14, "Traitement biologique"]
    ],

    ETAGES: []  // Vide - l'utilisateur crée la structure
  }
};
