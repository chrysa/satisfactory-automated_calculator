/* 01_sat.utils.gs */
var SAT = this.SAT || (this.SAT = {});

SAT.U = SAT.U || (function () {
  function nowText() {
    var tz = SpreadsheetApp.getActive().getSpreadsheetTimeZone();
    return Utilities.formatDate(new Date(), tz, "yyyy-MM-dd HH:mm:ss");
  }

  function norm(s) {
    return String(s || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .replace(/\s+/g, " ");
  }

  // Normalization stricte : uniquement minuscule + trim (sans accents)
  function normStrict(s) {
    return String(s || "")
      .toLowerCase()
      .trim();
  }

  function str(v) { return String(v || "").trim(); }

  function num(v) {
    if (v === "" || v === null || typeof v === "undefined") return 0;
    var n = Number(v);
    return isFinite(n) ? n : 0;
  }

  function int(v) { return Math.round(num(v)); }

  function uniq(arr) {
    var s = new Set();
    (arr || []).forEach(function (x) {
      if (x === "" || x === null || typeof x === "undefined") return;
      s.add(String(x));
    });
    return Array.from(s);
  }

  return { nowText: nowText, norm: norm, normStrict: normStrict, str: str, num: num, int: int, uniq: uniq };
})();
