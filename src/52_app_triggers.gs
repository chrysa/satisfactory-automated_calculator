/**
 * 52_app_triggers.gs - Automated Trigger System
 * Critical triggers for onEdit and onOpen
 */
var SAT = this.SAT || (this.SAT = {});

/**
 * ⭐ onEdit - Auto-update when data is edited
 * Automatically recalculates when cells change
 */
function onEdit(e) {
  if (!e || !e.range) {
    return;
  }
  
  var sheetName = e.range.getSheet().getName();
  var cfg = SAT.CFG || null;
  
  // Critical sheets that trigger recalc
  var criticalSheets = [
    '📈 Production',
    '📋 Referentiel',
    '🏗️ Machines',
    '🏢 Étages'
  ];
  
  // Check if this is a critical sheet
  if (criticalSheets.indexOf(sheetName) === -1) {
    return;
  }
  
  try {
    // Attempt 1: Use SAT.AutoHandlers if available
    if (typeof SAT.AutoHandlers !== 'undefined' && typeof SAT.AutoHandlers.handleEdit === 'function') {
      SAT.AutoHandlers.handleEdit(e.range, sheetName);
      return;
    }
    
    // Attempt 2: Direct recalc if AutoHandlers unavailable
    if (typeof SAT_recalcAll === 'function') {
      // Throttle: check last recalc time
      var now = new Date().getTime();
      var lastRecalc = (typeof SAT.LAST_RECALC !== 'undefined') ? SAT.LAST_RECALC : 0;
      
      if (now - lastRecalc >= 2000) {  // Minimum 2 seconds between recalcs
        SAT.LAST_RECALC = now;
        SAT_recalcAll();
      }
    }
  } catch (err) {
    Logger.log('⚠️ onEdit error: ' + err.message);
  }
}


