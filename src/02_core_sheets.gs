/* 02_sat.sheets.gs */
var SAT = this.SAT || (this.SAT = {});

SAT.S = SAT.S || (function () {
  function ss() { return SpreadsheetApp.getActiveSpreadsheet(); }
  function sheet(name) { return ss().getSheetByName(name); }
  function must(name) {
    var sh = sheet(name);
    if (!sh) throw new Error("Feuille introuvable: " + name);
    return sh;
  }
  function ensure(name) {
    var s = ss();
    var sh = s.getSheetByName(name);
    if (!sh) sh = s.insertSheet(name);
    return sh;
  }
  return { ss: ss, sheet: sheet, must: must, ensure: ensure };
})();
