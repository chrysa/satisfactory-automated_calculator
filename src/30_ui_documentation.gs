/**
 * 30_ui_documentation.gs - Help panels, legends, and documentation UI
 * 
 * Creates documentation panels, legends, and visual guides in sheets
 */

var SAT = this.SAT || (this.SAT = {});

/**
 * SAT.Documentation - Documentation & help system
 */
SAT.Documentation = {
  
  /**
   * Create a help sheet if it doesn't exist
   */
  ensureHelpSheet: function() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var helpSheet = ss.getSheetByName("📖 Aide");
    
    if (helpSheet) return helpSheet;
    
    // Create help sheet
    helpSheet = ss.insertSheet("📖 Aide", 0);
    
    var content = [
      ["S.A.T - Guide Complet", "", ""],
      ["", "", ""],
      ["📊 PRODUCTION", "Décrivez votre production ici", ""],
      ["  • Étage", "Nom de l'étage (ex: Étage 0, Mine)", "Auto-créé si manquant"],
      ["  • Machine", "Type de machine production", ""],
      ["  • Ressource", "Ce qui est produit/consommé", ""],
      ["  • Input/Output", "Quantité par minute (items/min)", "Positif = production, Négatif = consommation"],
      ["", "", ""],
      ["🏢 ÉTAGES", "Organisez par étages", ""],
      ["  • Numérique", "Étage 0, Étage 1, etc", "Sans dépendances"],
      ["  • Spécialisé", "Mine, Affinerie, etc", "Peut avoir dépendances"],
      ["  • Dépendances", "Lister les étages requis", "Ex: Étage 0,Étage 1"],
      ["", "", ""],
      ["⚙️ AUTO-DÉTECTION", "Le système détecte automatiquement", ""],
      ["  • 🔍 Nouveaux étages", "Ajoutés automatiquement lors qu'utilisés en production", ""],
      ["  • 🔗 Dépendances", "Détectées à partir des patterns de production", ""],
      ["  • 📈 Graphiques", "Mis à jour en temps réel", ""],
      ["", "", ""],
      ["💡 ASTUCES", "", ""],
      ["  1. Commencez par Étage 0 (base)", "Ajoutez les entités basiques", ""],
      ["  2. Ajoutez production", "Les étages se créent automatiquement", ""],
      ["  3. Gérez dépendances", "Si besoin, liaisons étages spécialisés", ""],
      ["  4. Consultez graphiques", "Vérifiez équilibre et impacts", ""]
    ];
    
    helpSheet.getRange(1, 1, content.length, 3).setValues(content);
    
    // Format
    helpSheet.setColumnWidth(1, 200);
    helpSheet.setColumnWidth(2, 300);
    helpSheet.setColumnWidth(3, 200);
    
    // Style headers
    helpSheet.getRange("A1:C1").setFontSize(14).setFontWeight("bold");
    helpSheet.getRange("A3:C3").setFontSize(12).setFontWeight("bold").setBackgroundColor("#E8F5E9");
    helpSheet.getRange("A9:C9").setFontSize(12).setFontWeight("bold").setBackgroundColor("#E3F2FD");
    helpSheet.getRange("A14:C14").setFontSize(12).setFontWeight("bold").setBackgroundColor("#FFF3E0");
    helpSheet.getRange("A19:C19").setFontSize(11).setFontWeight("bold").setBackgroundColor("#F3E5F5");
    
    return helpSheet;
  },
  
  /**
   * Create legend sheet for symbols and meanings
   */
  ensureLegendSheet: function() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var legendSheet = ss.getSheetByName("📋 Légende");
    
    if (legendSheet) return legendSheet;
    
    legendSheet = ss.insertSheet("📋 Légende", 1);
    
    var content = [
      ["SYMBOLES & LÉGENDE", "", "", ""],
      ["", "", "", ""],
      ["ÉTAGES", "", "", ""],
      ["Étage X", "Étage numérique", "Non-spécialisé, base de production", "Ex: Étage 0, Étage 1"],
      ["Mine", "Étage spécialisé acquisition", "Récolte ressources brutes", "Dépend: Étage 0"],
      ["Affinerie", "Étage spécialisé raffinage", "Traite les matériaux", "Dépend: Mine"],
      ["Entrepôt", "Étage de stockage", "Limite dépôt temporaire", "Dépend: Étage 0"],
      ["Usine", "Étage de fabrication avancée", "Fabrique composants complexes", "Dépend: Étage 1+"],
      ["", "", "", ""],
      ["RESSOURCES", "", "", ""],
      ["Ore/Minerai", "Matériau brut", "Trouvé en Mine", "Input pour raffinage"],
      ["Ingots", "Matériau traité", "Produit par Affinerie", "Usable en Usine"],
      ["Composants", "Produits assemblés", "Fait à l'Usine", "Ressource finale"],
      ["", "", "", ""],
      ["COULEURS", "", "", ""],
      ["Vert 🟢", "Statut OK / En équilibre", "Production = Consommation", ""],
      ["Jaune 🟡", "Attention / Léger surstock", "Production > Consommation", ""],
      ["Rouge 🔴", "Alerte / Pénurie critique", "Production < Consommation", "Action requise"],
      ["Bleu 🔵", "Info / À surveiller", "Dépendances critiques", "Impact système"],
      ["", "", "", ""],
      ["SYMBOLES SPÉCIAUX", "", "", ""],
      ["→", "Flux de dépendance", "A -> B = A dépend de B", ""],
      ["*", "Critique", "Étage essentiel au système", "Maintenance = arrêt complet"],
      ["!", "Alerte", "Action nécessaire", "Vérifier logs pour détails"]
    ];
    
    legendSheet.getRange(1, 1, content.length, 4).setValues(content);
    
    for (var i = 0; i < 4; i++) {
      legendSheet.setColumnWidth(i + 1, 150);
    }
    
    legendSheet.getRange("A1:D1").setFontSize(14).setFontWeight("bold").setBackgroundColor("#FFE082");
    legendSheet.getRange("A3:D3").setFontSize(11).setFontWeight("bold").setBackgroundColor("#C8E6C9");
    legendSheet.getRange("A10:D10").setFontSize(11).setFontWeight("bold").setBackgroundColor("#BBDEFB");
    legendSheet.getRange("A15:D15").setFontSize(11).setFontWeight("bold").setBackgroundColor("#FFF9C4");
    legendSheet.getRange("A20:D20").setFontSize(11).setFontWeight("bold").setBackgroundColor("#F8BBD0");
    
    return legendSheet;
  },
  
  /**
   * Create dashboard with key metrics
   */
  ensureDashboardSheet: function() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var dashSheet = ss.getSheetByName("📊 Tableau de Bord");
    
    if (dashSheet) return dashSheet;
    
    dashSheet = ss.insertSheet("📊 Tableau de Bord", 2);
    
    var headers = [
      ["TABLEAU DE BORD SYSTÈME", "", "", ""],
      ["", "", "", ""],
      ["RÉSUMÉ ÉTAGES", "", "RESSOURCES", ""],
      ["Nombre d'étages", "=COUNTA('🏢 Étages'!A2:A)", "Total ressources", "=COUNTA('📋 Referentiel'!A2:A)"],
      ["Étages numériques", "=COUNTIF('🏢 Étages'!C:C,\"Normal\")", "Ressources critiques", "=COUNTIF('📋 Referentiel'!D:D,1)"],
      ["Étages spécialisés", "=COUNTIF('🏢 Étages'!C:C,\"Special\")", "", ""],
      ["", "", "", ""],
      ["PRODUCTION", "", "SANTÉ", ""],
      ["Entrées totales", "=SUM(IF('📈 Production'!E:E>0,'📈 Production'!E:E,0))", "Triggers actifs", "=COUNTA('📈 Production'!A:A)-1"],
      ["Sorties totales", "=SUM(IF('📈 Production'!E:E<0,-'📈 Production'!E:E,0))", "Erreurs détectées", "0"],
      ["Équilibre", "=E9-E10", "Performance", "Normal"],
      ["", "", "", ""]
    ];
    
    dashSheet.getRange(1, 1, headers.length, 4).setValues(headers);
    
    for (var i = 0; i < 4; i++) {
      dashSheet.setColumnWidth(i + 1, 200);
    }
    
    dashSheet.getRange("A1:D1").setFontSize(14).setFontWeight("bold").setBackgroundColor("#42A5F5");
    dashSheet.getRange("A3:B3").setFontSize(11).setFontWeight("bold").setBackgroundColor("#C8E6C9");
    dashSheet.getRange("C3:D3").setFontSize(11).setFontWeight("bold").setBackgroundColor("#C8E6C9");
    dashSheet.getRange("A8:B8").setFontSize(11).setFontWeight("bold").setBackgroundColor("#FFE0B2");
    dashSheet.getRange("C8:D8").setFontSize(11).setFontWeight("bold").setBackgroundColor("#FFE0B2");
    
    return dashSheet;
  },
  
  /**
   * Create a visual guide sheet
   */
  ensureVisualGuideSheet: function() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var guideSheet = ss.getSheetByName("🎨 Guide Visuel");
    
    if (guideSheet) return guideSheet;
    
    guideSheet = ss.insertSheet("🎨 Guide Visuel", 3);
    
    var content = [
      ["ARCHITECTURE PRODUCTION", "", "", "", "", ""],
      ["", "", "", "", "", ""],
      ["ÉTAGE 0 (Base)", "ÉTAGE 1 (Inter)", "SPÉCIALISÉS", "", "", ""],
      ["• Ressources", "• Traitement", "", "", "", ""],
      ["• Stockage min.", "• Raffinage", "Mine →", "Ore brut", "", ""],
      ["• Outils simple", "• Premiers items", "Affinerie →", "Ingots", "", ""],
      ["", "", "Usine →", "Composants", "", ""],
      ["", "", "Dépôt →", "Stock", "", ""],
      ["", "", "", "", "", ""],
      ["FLUX TYPIQUE", "", "", "", "", ""],
      ["Étage 0", "→", "Étage 1", "→", "Mine", "→ Affinerie → Usine"],
      ["(Base)", "", "(Inter)", "", "(Acqui.)", ""],
      ["", "", "", "", "", ""],
      ["DÉPENDANCES", "", "", "", "", ""],
      ["Mine", "dépend de", "Étage 0", "✓ OUI", "", "Sans Étage 0, pas de Mine"],
      ["Affinerie", "dépend de", "Mine", "✓ OUI", "", "Raffinerie demande minerai"],
      ["Usine", "dépend de", "Théoriquement Étage 1", "? OUI", "", "À configurer selon setup"]
    ];
    
    guideSheet.getRange(1, 1, content.length, 6).setValues(content);
    
    for (var i = 0; i < 6; i++) {
      guideSheet.setColumnWidth(i + 1, 130);
    }
    
    guideSheet.getRange("A1:F1").setFontSize(13).setFontWeight("bold").setBackgroundColor("#81C784");
    guideSheet.getRange("A10:F10").setFontSize(12).setFontWeight("bold").setBackgroundColor("#64B5F6");
    guideSheet.getRange("A14:F14").setFontSize(12).setFontWeight("bold").setBackgroundColor("#FFB74D");
    
    return guideSheet;
  },
  
  /**
   * Setup all documentation sheets
   */
  setupAll: function() {
    SAT.Log.header("CREATING DOCUMENTATION SHEETS", "📚");
    
    this.ensureHelpSheet();
    SAT.Log.bullet("Help sheet created");
    
    this.ensureLegendSheet();
    SAT.Log.bullet("Legend sheet created");
    
    this.ensureDashboardSheet();
    SAT.Log.bullet("Dashboard sheet created");
    
    this.ensureVisualGuideSheet();
    SAT.Log.bullet("Visual guide sheet created");
    
    Logger.log("");
    SAT.Log.success("Documentation sheets ready", true);
  }
};

/**
 * Menu function to create documentation
 */
function SAT_CREATE_DOCUMENTATION() {
  SAT.Documentation.setupAll();
  
  SpreadsheetApp.getUi().alert(
    "Documentation créée!\n\n" +
    "Onglets ajoutés:\n" +
    "• 📖 Aide - Guide complet\n" +
    "• 📋 Légende - Symboles\n" +
    "• 📊 Tableau de Bord - Métriques clés\n" +
    "• 🎨 Guide Visuel - Architecture",
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

/**
 * Refresh dashboard metrics
 */
function SAT_REFRESH_DASHBOARD() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var dashSheet = ss.getSheetByName("📊 Tableau de Bord");
  
  if (!dashSheet) {
    SAT.Documentation.setupAll();
    dashSheet = ss.getSheetByName("📊 Tableau de Bord");
  }
  
  // Force recalc of formulas
  dashSheet.getRange("B4:D11").recalculate();
  
  SAT.Log.success("Dashboard refreshed");
}
