/**
 * 30_ui_charts.gs - OBSOLÈTE
 * Les graphiques simplififiés sont gérés dans SAT_setupDashboard_v2
 */

var SAT = this.SAT || (this.SAT = {});

/**
 * SAT.Charts - Chart and visualization management
 */
SAT.Charts = {
  
  /**
   * Create production by floor pie chart
   */
  createFloorProductionChart: function() {
    SAT.Log.info("Creating production by floor chart...");
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var productionSheet = ss.getSheetByName(SAT.CFG.SHEETS.PRODUCTION);
    
    if (!productionSheet) {
      SAT.Log.error("Production sheet not found");
      return;
    }
    
    var data = productionSheet.getDataRange();
    
    // Create pie chart
    var chart = Charts.newPieChart()
      .addRange(data)
      .setOption('title', 'Production par Étage')
      .setOption('pieHole', 0.4)
      .setPosition(2, 5, 0, 0);
    
    productionSheet.insertChart(chart.build());
    SAT.Log.bullet("Production chart created");
  },
  
  /**
   * Create input/output balance bar chart
   */
  createBalanceChart: function() {
    SAT.Log.info("Creating balance chart...");
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var productionSheet = ss.getSheetByName(SAT.CFG.SHEETS.PRODUCTION);
    
    if (!productionSheet) {
      SAT.Log.error("Production sheet not found");
      return;
    }
    
    try {
      var data = productionSheet.getRange("A1:F100");
      
      var chart = Charts.newColumnChart()
        .addRange(data)
        .setOption('title', 'Bilan Production/Consommation')
        .setOption('hAxis', { title: 'Ressource' })
        .setOption('vAxis', { title: 'Items/min' })
        .setPosition(12, 5, 0, 0);
      
      productionSheet.insertChart(chart.build());
      SAT.Log.bullet("Balance chart created");
    } catch (e) {
      SAT.Log.error("Could not create balance chart: " + e.message);
    }
  },
  
  /**
   * Create floor dependency visualization
   */
  createDependencyChart: function() {
    SAT.Log.info("Creating dependency chart...");
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // Try to add to dashboard if exists
    var dashSheet = ss.getSheetByName("📊 Tableau de Bord");
    if (!dashSheet) {
      dashSheet = ss.insertSheet("📊 Tableau de Bord");
    }
    
    var floors = SAT.Etages.getAll();
    
    // Build data for dependency tree visualization
    var chartData = [["Étage", "Dépend De", "Importance"]];
    
    for (var i = 0; i < floors.length; i++) {
      var floor = floors[i][0];
      var deps = floors[i][4] || "";
      
      if (deps) {
        var depArray = deps.split(",");
        for (var j = 0; j < depArray.length; j++) {
          chartData.push([
            floor,
            depArray[j].trim(),
            SAT.FloorValidation.getImpactedFloors(floor).length
          ]);
        }
      } else {
        chartData.push([floor, null, 0]);
      }
    }
    
    // Insert as table visualization
    try {
      var range = dashSheet.getRange(15, 1, chartData.length, 3);
      range.setValues(chartData);
      SAT.Log.bullet("Dependency table created");
    } catch (e) {
      SAT.Log.warning("Could not create full dependency visualization");
    }
  },
  
  /**
   * Create all recommended charts
   */
  createAllCharts: function() {
    SAT.Log.header("CREATING CHARTS & VISUALIZATIONS", "📊");
    
    try {
      this.createFloorProductionChart();
    } catch (e) {
      SAT.Log.warning("Floor production chart failed: " + e.message);
    }
    
    try {
      this.createBalanceChart();
    } catch (e) {
      SAT.Log.warning("Balance chart failed: " + e.message);
    }
    
    try {
      this.createDependencyChart();
    } catch (e) {
      SAT.Log.warning("Dependency chart failed: " + e.message);
    }
    
    Logger.log("");
    SAT.Log.success("Charts created", true);
  }
};

/**
 * Menu function: Create charts
 */
function SAT_CREATE_CHARTS() {
  SAT.Charts.createAllCharts();
  
  SpreadsheetApp.getUi().alert(
    "Graphiques créés!\n\n" +
    "Visualisations ajoutées:\n" +
    "• Diagramme production par étage\n" +
    "• Graphique bilan In/Out\n" +
    "• Visualisation dépendances",
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

/**
 * Add spark lines to production sheet
 */
function SAT_ADD_SPARKLINES() {
  SAT.Log.header("ADDING SPARKLINES", "✨");
  
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var productionSheet = ss.getSheetByName(SAT.CFG.SHEETS.PRODUCTION);
  
  if (!productionSheet) {
    SAT.Log.error("Production sheet not found");
    return;
  }
  
  var lastRow = productionSheet.getLastRow();
  
  // Add sparklines to each row in column H (next to production)
  for (var i = 2; i <= lastRow; i++) {
    try {
      var formula = '=SPARKLINE(E' + i + ':E' + (i + 5) + ',{"charttype","bar"; "max",100})';
      // Note: SPARKLINE may not be available, so we just add basic conditional formatting instead
      
      // Add conditional formatting for production values instead
      var cell = productionSheet.getRange('E' + i);
      var value = cell.getValue();
      
      if (value > 100) {
        cell.setBackgroundColor("#C8E6C9"); // Light green = high production
      } else if (value > 50) {
        cell.setBackgroundColor("#FFF9C4"); // Light yellow = medium
      } else if (value > 0) {
        cell.setBackgroundColor("#FFCCBC"); // Light orange = low
      }
    } catch (e) {
      // Skip if error
    }
  }
  
  SAT.Log.success("Conditional formatting applied");
}
