/* ============================================================
 * 52_bottleneck.gs — SAT Bottleneck Detector
 *
 * Detects and ranks production bottlenecks:
 *   1. Belt throughput saturation (>90% of tier capacity)
 *   2. Building efficiency deficit (OC < 70% = potential input starvation)
 *
 * Usage:
 *   var rows        = SAT.Engine.buildIndex();
 *   var bottlenecks = SAT.Bottleneck.analyze(rows);
 *   var text        = SAT.Bottleneck.report(bottlenecks);
 *
 *   // Or from a stats object (for Assistant integration):
 *   var stats       = SAT.Engine.stats(rows);
 *   // underProduced already carries resource-level deficits
 * ============================================================ */

var SAT = this.SAT || (this.SAT = {});

SAT.Bottleneck = {

  // ── Constants ────────────────────────────────────────────────────────────

  /**
   * Satisfactory 1.1 conveyor belt tiers — capacity in items/min.
   * Pipe Mk.1 = 300, Mk.2 = 600 are handled separately via isSolid flag.
   */
  BELT_TIERS: [
    { mk: 1, capacity:   60, nextMk: 2, nextCapacity:  120 },
    { mk: 2, capacity:  120, nextMk: 3, nextCapacity:  270 },
    { mk: 3, capacity:  270, nextMk: 4, nextCapacity:  480 },
    { mk: 4, capacity:  480, nextMk: 5, nextCapacity:  780 },
    { mk: 5, capacity:  780, nextMk: 6, nextCapacity: 1200 },
    { mk: 6, capacity: 1200, nextMk: null, nextCapacity: null }
  ],

  /** Flag belt throughput when throughput exceeds this fraction of tier capacity. */
  SATURATION_MIN: 0.90,

  /** Flag building efficiency when OC is below this fraction (70% = potential starvation). */
  EFFICIENCY_MIN: 0.70,

  // ── Public API ────────────────────────────────────────────────────────────

  /**
   * Analyse production rows and return a ranked list of bottlenecks.
   *
   * Each entry has:
   *   { type, location, recipe, machine, metric, impact, suggestion }
   *   - type:       'belt_throughput' | 'building_efficiency'
   *   - location:   étage label
   *   - recipe:     recipe name
   *   - machine:    machine name
   *   - metric:     saturation % (belt) or OC % (building)
   *   - impact:     items/min blocked or lost (used for ranking)
   *   - suggestion: actionable fix text
   *
   * @param {Array} rows — output of SAT.Engine.buildIndex()
   * @returns {Array}
   */
  analyze: function(rows) {
    var self = SAT.Bottleneck;
    var bottlenecks = [];

    rows.forEach(function(r) {
      var nb = r.nb || 0;
      if (nb === 0 || !r.rec) return;

      // ── A. Building efficiency (OC < EFFICIENCY_MIN) ─────────────────────
      var oc = r.oc || 0;
      if (oc > 0 && oc < self.EFFICIENCY_MIN * 100) {
        var maxOutRate = r.rec.outRate1 || 0;
        var lostPerMin = Math.round(maxOutRate * nb * (1 - oc / 100) * 10) / 10;
        if (lostPerMin > 0.1) {
          var inputName = r.inRes1 || 'input resource';
          bottlenecks.push({
            type:       'building_efficiency',
            location:   r.etage,
            recipe:     r.recipe || '(unknown)',
            machine:    r.machine || '(unknown)',
            metric:     oc,
            impact:     lostPerMin,
            suggestion: oc < 40
              ? 'Check input supply for ' + inputName + ' — severe starvation suspected'
              : 'Raise OC to 100% or replace with ' + Math.ceil(nb * oc / 100) + ' machine(s) @100% OC'
          });
        }
      }

      // ── B. Belt throughput saturation ─────────────────────────────────────
      var totalOut = (r.outRate1 || 0) * nb;
      var totalIn  = (r.inRate1  || 0) * nb;
      var maxTp    = Math.max(totalOut, totalIn);
      if (maxTp > 0) {
        var tier = self._beltTier(maxTp);
        var saturation = maxTp / tier.capacity;
        if (saturation >= self.SATURATION_MIN) {
          var isOver = maxTp > 1200;
          bottlenecks.push({
            type:       'belt_throughput',
            location:   r.etage,
            recipe:     r.recipe || '(unknown)',
            machine:    r.machine || '(unknown)',
            metric:     Math.round(saturation * 100),
            impact:     Math.round(maxTp * 10) / 10,
            suggestion: isOver
              ? 'Split output across ' + Math.ceil(maxTp / 1200) + ' Mk.6 belt(s)'
              : (tier.nextMk
                  ? 'Upgrade to Mk.' + tier.nextMk + ' belt (' + tier.nextCapacity + '/min capacity)'
                  : 'Belt Mk.6 at limit — split across ' + Math.ceil(maxTp / 1200) + ' belts')
          });
        }
      }
    });

    // Sort by impact descending (highest items/min blocked/lost first)
    bottlenecks.sort(function(a, b) { return b.impact - a.impact; });
    return bottlenecks;
  },

  /**
   * Format a bottleneck list as a readable text report.
   * @param {Array} bottlenecks — output of analyze()
   * @returns {string}
   */
  report: function(bottlenecks) {
    if (!bottlenecks || bottlenecks.length === 0) {
      return '✅ No bottlenecks detected.';
    }

    var counts = { belt_throughput: 0, building_efficiency: 0 };
    bottlenecks.forEach(function(b) {
      counts[b.type] = (counts[b.type] || 0) + 1;
    });

    var lines = [
      '=== SAT Bottleneck Report — ' + bottlenecks.length + ' detected ===',
      '  Belt throughput  : ' + (counts['belt_throughput']    || 0),
      '  Building efficiency: ' + (counts['building_efficiency'] || 0),
      ''
    ];

    bottlenecks.forEach(function(b, i) {
      var icon  = b.type === 'belt_throughput' ? '🟠' : '📉';
      var label = b.type === 'belt_throughput'
        ? 'Belt ' + b.metric + '% saturated'
        : 'OC ' + b.metric + '% (below 70%)';
      lines.push(
        (i + 1) + '. ' + icon + ' [' + b.location + '] ' + b.recipe,
        '   Type   : ' + label,
        '   Impact : ' + b.impact + '/min blocked/lost',
        '   Fix    : ' + b.suggestion,
        ''
      );
    });

    return lines.join('\n');
  },

  // ── Private helpers ───────────────────────────────────────────────────────

  /**
   * Returns the belt tier whose capacity is the smallest value >= tpMin.
   * Always returns a valid tier object (last tier if tpMin exceeds Mk.6).
   * @param {number} tpMin — items/min
   * @returns {{mk, capacity, nextMk, nextCapacity}}
   */
  _beltTier: function(tpMin) {
    var tiers = SAT.Bottleneck.BELT_TIERS;
    for (var i = 0; i < tiers.length; i++) {
      if (tpMin <= tiers[i].capacity) return tiers[i];
    }
    return tiers[tiers.length - 1];
  }

};
