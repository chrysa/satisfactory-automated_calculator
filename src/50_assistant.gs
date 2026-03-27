/* ============================================================
 * 50_assistant.gs — SAT Smart Production Assistant
 *
 * Sidebar that analyzes the current factory state and returns
 * actionable recommendation cards:
 *   - Configuration errors / incomplete rows
 *   - Bottlenecks with one-click solver fix
 *   - High overclock warnings with equivalent setup suggestion
 *   - Phase progression coaching with recipe list
 *   - Nuclear waste reminder
 *   - Power budget summary
 *   - Large surplus detection
 * ============================================================ */

var SAT = this.SAT || (this.SAT = {});

// ─── Tier ordering (used for phase detection) ────────────────────────────────
var _TIER_RANK = { T0: 0, T1: 1, T2: 2, T3: 3, T4: 4, MAM: 4, T5: 5, T6: 6, T7: 7, T8: 8, T9: 9 };

SAT.Assistant = {

  /**
   * Analyze production data and return an array of recommendation cards.
   * Each card can have an optional `actions` array of {label, fn, args} objects
   * that will be rendered as clickable buttons in the sidebar.
   *
   * @param {Object} stats  — output of SAT.Engine.stats()
   * @param {Array}  rows   — output of SAT.Engine.buildIndex()
   * @returns {Array<{type, icon, title, body, actions?}>}
   */
  analyze: function(stats, rows) {
    var cards = [];

    // ── Empty factory ────────────────────────────────────────────────────
    if (stats.lines === 0) {
      cards.push({
        type:  'info',
        icon:  '🚀',
        title: 'Usine vide — premier démarrage',
        body:  'Utilise S.A.T. → Ajouter une ligne de production,\nou remplis la feuille Objectifs et lance le Solveur.',
        actions: [
          { label: '➕ Ajouter une ligne',  fn: 'SAT_showAddProductionForm', args: [] },
          { label: '🎯 Ouvrir les objectifs', fn: 'SAT_focusObjectives',      args: [] }
        ]
      });
      return cards;
    }

    // ── 1. Configuration errors ──────────────────────────────────────────
    if (stats.errors > 0) {
      cards.push({
        type:  'error',
        icon:  '❌',
        title: stats.errors + ' erreur(s) de configuration',
        body:  'Vérifie la colonne J (Cause) de la feuille Production.',
        actions: [
          { label: '📋 Voir les erreurs', fn: 'SAT_focusProduction', args: [] }
        ]
      });
    }

    // ── 2. Incomplete rows ───────────────────────────────────────────────
    if (stats.todo > 0) {
      cards.push({
        type:  'warn',
        icon:  '⚠️',
        title: stats.todo + ' ligne(s) incomplète(s)',
        body:  'Des lignes ont un étage ou une recette manquante.\nComplète les colonnes A (Étage) et C (Recette).'
      });
    }

    // ── 3. Bottlenecks with one-click solver fix ─────────────────────────
    if (stats.underProduced && stats.underProduced.length > 0) {
      var recIdx = SAT.getRecipeIndex();

      // Build reverse lookup: resource → first main (non-ALT) recipe name
      var resToRecipe = {};
      Object.keys(recIdx).forEach(function(rName) {
        var rec = recIdx[rName];
        if (rec.tier === 'ALT') return;
        if (rec.outRes1 && !resToRecipe[rec.outRes1]) resToRecipe[rec.outRes1] = rName;
        if (rec.outRes2 && !resToRecipe[rec.outRes2]) resToRecipe[rec.outRes2] = rName;
      });

      var topDeficits = stats.underProduced.slice(0, 5);

      topDeficits.forEach(function(r) {
        var recName = resToRecipe[r.name];
        var actions = [];
        if (recName) {
          // Suggest adding machines via solver to cover the deficit
          actions.push({
            label: '🔧 Corriger le déficit (' + r.deficit.toFixed(0) + '/min)',
            fn:    'SAT_assistantFixBottleneck',
            args:  [r.name, r.deficit]
          });
        }
        cards.push({
          type:    'bottleneck',
          icon:    '📉',
          title:   r.name + ' — déficit ' + r.deficit.toFixed(1) + '/min',
          body:    'Produit : ' + r.prod.toFixed(1) + '/min  ·  Consommé : ' + r.cons.toFixed(1) + '/min' +
                   (recName ? '\nRecette suggérée : "' + recName + '"' : '\n(Ressource brute — ajoute des extraction nodes)'),
          actions: actions
        });
      });

      if (stats.underProduced.length > 5) {
        cards.push({
          type:  'bottleneck',
          icon:  '📉',
          title: (stats.underProduced.length - 5) + ' autre(s) goulot(s)',
          body:  'Fais défiler le Dashboard (colonne Goulots) pour les voir.'
        });
      }
    }

    // ── 4. High overclock warning with equivalent suggestion ─────────────
    var highOcRows = rows.filter(function(r) { return r.oc > 150; });
    if (highOcRows.length > 0) {
      var byMachine = {};
      highOcRows.forEach(function(r) {
        var key = r.machine + '|' + r.etage + '|' + r.recipe;
        if (!byMachine[key]) byMachine[key] = { machine: r.machine, etage: r.etage, recipe: r.recipe, maxOC: 0, nb: 0 };
        if (r.oc > byMachine[key].maxOC) byMachine[key].maxOC = r.oc;
        byMachine[key].nb = r.nb;
      });

      Object.keys(byMachine).slice(0, 4).forEach(function(key) {
        var d         = byMachine[key];
        var pwrRatio  = Math.round(Math.pow(d.maxOC / 100, 1.321) * 100);
        // Equivalent: same throughput at OC=100% needs ceil(nb × OC/100) machines
        var equivNb   = Math.ceil(d.nb * d.maxOC / 100);
        var equivPwr  = Math.round(d.nb * Math.pow(d.maxOC / 100, 1.321) * 100);
        var savedPct  = pwrRatio - 100; // overhead vs nominal

        cards.push({
          type:    'warn',
          icon:    '⚡',
          title:   d.machine + ' @' + d.maxOC + '% OC (+' + savedPct + '% MW)',
          body:    'Étage : ' + d.etage + '  ·  ' + d.nb + ' machine(s) @' + d.maxOC + '% = ' + pwrRatio + '% MW\n' +
                   'Suggestion : ' + equivNb + ' machine(s) @100% OC = 100% MW (−' + (equivPwr - 100) + '% conso)',
          actions: [
            {
              label: '🔄 Appliquer (' + equivNb + ' machines @100%)',
              fn:    'SAT_assistantNormalizeOC',
              args:  [d.etage, d.recipe, equivNb]
            }
          ]
        });
      });
    }

    // ── 5. Phase progression coaching ────────────────────────────────────
    var maxTierRank = -1;
    rows.forEach(function(r) {
      if (r.rec && r.rec.tier && r.rec.tier !== 'ALT') {
        var rank = _TIER_RANK[r.rec.tier];
        if (rank !== undefined && rank > maxTierRank) maxTierRank = rank;
      }
    });

    if (maxTierRank >= 0) {
      var phases       = SAT.CFG.PHASES;
      var currentPhase = null;
      var nextPhase    = null;

      for (var p = 0; p < phases.length; p++) {
        var ph     = phases[p];
        var phMax  = ph.tiers.reduce(function(m, t) {
          return Math.max(m, _TIER_RANK[t] !== undefined ? _TIER_RANK[t] : -1);
        }, -1);
        if (maxTierRank <= phMax) { currentPhase = ph; nextPhase = phases[p + 1] || null; break; }
      }
      if (!currentPhase) currentPhase = phases[phases.length - 1];

      // List recipes available in next phase not yet used
      var usedRecipes = {};
      rows.forEach(function(r) { if (r.recipe) usedRecipes[r.recipe] = true; });

      var nextRecipes = [];
      if (nextPhase) {
        var allowedTiers = {};
        nextPhase.tiers.forEach(function(t) { allowedTiers[t] = true; });
        var recIdx2 = SAT.getRecipeIndex();
        Object.keys(recIdx2).forEach(function(rn) {
          var rec = recIdx2[rn];
          if (allowedTiers[rec.tier] && !usedRecipes[rn] && rec.tier !== 'ALT') {
            nextRecipes.push(rn);
          }
        });
        nextRecipes.sort();
      }

      var phaseBody = 'Phase courante : ' + currentPhase.label;
      if (nextPhase) {
        phaseBody += '\n→ Prochaine : ' + nextPhase.label;
        if (nextRecipes.length > 0) {
          phaseBody += '\nRecettes disponibles non utilisées :\n' +
            nextRecipes.slice(0, 6).map(function(r) { return '  • ' + r; }).join('\n');
          if (nextRecipes.length > 6) phaseBody += '\n  (+ ' + (nextRecipes.length - 6) + ' autres…)';
        }
      } else {
        phaseBody += '\nPhase 6 — objectif final débloqué !';
      }

      cards.push({
        type:  'info',
        icon:  '🎯',
        title: 'Progression : ' + currentPhase.label,
        body:  phaseBody
      });
    }

    // ── 6. Nuclear waste reminder ────────────────────────────────────────
    var nuclearRows = rows.filter(function(r) { return /Centrale nucl/i.test(r.machine); });
    if (nuclearRows.length > 0) {
      var totalWaste = nuclearRows.reduce(function(sum, r) { return sum + (r.nb || 0) * 12; }, 0);
      cards.push({
        type:  'nuclear',
        icon:  '☢️',
        title: 'Déchets nucléaires : ' + totalWaste + '/min',
        body:  nuclearRows.length + ' centrale(s) active(s).\nPlanifie une chaîne de retraitement ou de stockage.'
      });
    }

    // ── 7. Large surplus detection ───────────────────────────────────────
    var produced = {}, consumed = {};
    rows.forEach(function(r) {
      var nb = r.nb || 0;
      if (r.outRes1 && r.outRate1 > 0) produced[r.outRes1] = (produced[r.outRes1] || 0) + r.outRate1 * nb;
      if (r.outRes2 && r.outRate2 > 0) produced[r.outRes2] = (produced[r.outRes2] || 0) + r.outRate2 * nb;
      if (r.inRes1  && r.inRate1  > 0) consumed[r.inRes1]  = (consumed[r.inRes1]  || 0) + r.inRate1  * nb;
      if (r.inRes2  && r.inRate2  > 0) consumed[r.inRes2]  = (consumed[r.inRes2]  || 0) + r.inRate2  * nb;
    });
    var surplus = [];
    Object.keys(produced).forEach(function(res) {
      var p = produced[res], c = consumed[res] || 0, extra = p - c;
      if (extra > 100 && extra / p > 0.6) {
        surplus.push({ name: res, surplus: Math.round(extra * 10) / 10 });
      }
    });
    surplus.sort(function(a, b) { return b.surplus - a.surplus; });
    if (surplus.length > 0) {
      var surLines = surplus.slice(0, 3).map(function(r) {
        return '• ' + r.name + ' : +' + r.surplus.toFixed(1) + '/min inutilisé(s)';
      });
      cards.push({
        type:  'info',
        icon:  '📦',
        title: surplus.length + ' ressource(s) en fort excédent',
        body:  surLines.join('\n') + '\nEnvisage d\'ajouter des recettes en aval.'
      });
    }

    // ── 8. Power budget summary ──────────────────────────────────────────
    if (stats.totalMW > 0) {
      var utilPct = stats.maxMW > 0 ? Math.round(stats.totalMW / stats.maxMW * 100) : 0;
      cards.push({
        type:  'power',
        icon:  '🔋',
        title: 'Consommation électrique',
        body:  'Actuelle  : ' + stats.totalMW.toFixed(0) + ' MW\n' +
               'Max @250% : ' + stats.maxMW.toFixed(0) + ' MW\n' +
               'Utilisation : ' + utilPct + '% du pic théorique'
      });
    }

    // ── 9. All good fallback ─────────────────────────────────────────────
    var criticalCount = cards.filter(function(c) {
      return c.type === 'error' || c.type === 'bottleneck';
    }).length;
    if (criticalCount === 0) {
      cards.unshift({
        type:  'ok',
        icon:  '✅',
        title: 'Usine en bonne santé !',
        body:  stats.lines + ' ligne(s)  ·  ' + stats.machines + ' machine(s)  ·  ' +
               stats.etages + ' étage(s)  ·  ' + stats.totalMW.toFixed(0) + ' MW'
      });
    }

    return cards;
  },

  // ─── HTML builder ──────────────────────────────────────────────────────────

  _buildHtml: function(cards, stats) {
    var BG = { error:'#FFEBEE', warn:'#FFF8E1', bottleneck:'#FBE9E7',
               info:'#E3F2FD',  ok:'#E8F5E9',  nuclear:'#FFF3E0', power:'#F3E5F5' };
    var BD = { error:'#EF9A9A', warn:'#FFE082', bottleneck:'#FF8A65',
               info:'#90CAF9',  ok:'#A5D6A7',  nuclear:'#FFCC80',  power:'#CE93D8' };

    // Encode all action calls into an inline data attribute for the JS handler
    var cardHtml = cards.map(function(c) {
      var bg = BG[c.type] || '#F5F5F5';
      var bd = BD[c.type] || '#E0E0E0';

      var actionsHtml = '';
      if (c.actions && c.actions.length) {
        actionsHtml = c.actions.map(function(a) {
          // Safely encode args as JSON in a data attribute
          var dataArgs = JSON.stringify(a.args || []).replace(/</g, '\\u003c').replace(/>/g, '\\u003e');
          return '<button class="act" data-fn="' + _asst_esc(a.fn) + '" data-args=\'' + dataArgs + '\'>' +
                 _asst_esc(a.label) + '</button>';
        }).join('');
      }

      return '<div style="margin:6px 0;padding:10px 12px;background:' + bg +
        ';border-left:4px solid ' + bd + ';border-radius:4px;">' +
        '<div style="font-weight:600;font-size:13px;margin-bottom:3px;">' +
        c.icon + ' ' + _asst_esc(c.title) + '</div>' +
        '<div style="font-size:12px;color:#5f6368;white-space:pre-wrap;margin-bottom:' + (actionsHtml ? '6px' : '0') + ';">' +
        _asst_esc(c.body) + '</div>' +
        actionsHtml +
        '</div>';
    }).join('');

    var errBg = stats.errors > 0 ? '#FFCDD2' : '#E8F0FE';
    var chips = [
      { label: 'Lignes',   value: stats.lines },
      { label: 'Machines', value: stats.machines },
      { label: 'Étages',   value: stats.etages },
      { label: 'Erreurs',  value: stats.errors, bg: errBg },
      { label: 'MW',       value: stats.totalMW ? stats.totalMW.toFixed(0) : '0' }
    ].map(function(ch) {
      return '<span style="background:' + (ch.bg || '#E8F0FE') + ';padding:3px 8px;border-radius:12px;' +
        'font-size:11px;font-weight:600;white-space:nowrap;">' + ch.label + ': ' + ch.value + '</span>';
    }).join('');

    var css = [
      'body{font-family:"Google Sans",Arial,sans-serif;font-size:13px;padding:12px;margin:0;color:#202124;background:#f8f9fa;}',
      'h3{margin:0 0 8px;font-size:15px;font-weight:700;display:flex;align-items:center;gap:6px;}',
      '.ver{font-size:10px;font-weight:400;color:#9aa0a6;}',
      '.chips{display:flex;flex-wrap:wrap;gap:5px;margin-bottom:10px;}',
      '.refr{background:#1a73e8;color:#fff;border:none;padding:8px 14px;border-radius:6px;cursor:pointer;',
      '  font-size:12px;font-weight:600;margin-top:8px;width:100%;}',
      '.refr:hover{background:#1557b0;}',
      '.refr:disabled{background:#9aa0a6;cursor:default;}',
      '.act{background:#fff;color:#1a73e8;border:1px solid #1a73e8;padding:5px 10px;border-radius:6px;',
      '  cursor:pointer;font-size:11px;font-weight:600;margin:2px 3px 0 0;display:inline-block;}',
      '.act:hover{background:#e8f0fe;}',
      '.act:disabled{opacity:.5;cursor:default;}',
      '.toast{display:none;position:fixed;bottom:10px;left:10px;right:10px;padding:8px 12px;',
      '  border-radius:6px;font-size:12px;z-index:999;text-align:center;}',
      '.t-ok{background:#137333;color:#fff;}',
      '.t-er{background:#c5221f;color:#fff;}'
    ].join('');

    var js = '(function(){' +
      // Refresh button
      'document.getElementById("refr").addEventListener("click",function(){' +
      '  callServer("SAT_openAssistant",[],this);' +
      '});' +
      // Generic action button handler
      'document.querySelectorAll(".act").forEach(function(btn){' +
      '  btn.addEventListener("click",function(){' +
      '    var fn=this.getAttribute("data-fn");' +
      '    var args=JSON.parse(this.getAttribute("data-args")||"[]");' +
      '    callServer(fn,args,this);' +
      '  });' +
      '});' +
      // Generic server caller
      'function callServer(fn,args,btn){' +
      '  if(btn){btn.disabled=true;btn.textContent="\u23f3 En cours\u2026";}' +
      '  var runner=google.script.run' +
      '    .withSuccessHandler(function(r){' +
      '      showToast(r&&r.error?"\u274c "+r.error:"\u2713 "+(r&&r.msg?r.msg:"OK"),' +
      '        r&&r.error?"er":"ok");' +
      '      // Refresh sidebar after successful action' +
      '      if(!r||!r.error) callServer("SAT_openAssistant",[],null);' +
      '    })' +
      '    .withFailureHandler(function(e){' +
      '      showToast("\u274c "+e.message,"er");' +
      '      if(btn){btn.disabled=false;btn.textContent=btn.getAttribute("data-fn");}' +
      '    });' +
      '  runner[fn].apply(runner,args);' +
      '}' +
      // Toast helper
      'function showToast(msg,type){' +
      '  var t=document.getElementById("toast");' +
      '  t.className="toast t-"+(type||"ok");' +
      '  t.textContent=msg;' +
      '  t.style.display="block";' +
      '  setTimeout(function(){t.style.display="none";},3500);' +
      '}' +
      '})();';

    return '<!DOCTYPE html><html><head><meta charset="utf-8"><style>' + css + '</style></head><body>' +
      '<h3>🤖 SAT Assistant <span class="ver">v' + SAT.CFG.VERSION + '</span></h3>' +
      '<div class="chips">' + chips + '</div>' +
      cardHtml +
      '<button id="refr" class="refr">🔄 Rafraîchir l\'analyse</button>' +
      '<div id="toast" class="toast"></div>' +
      '<script>(' + js + ')</script>' +
      '</body></html>';
  }

};

// ─── Private HTML helper ─────────────────────────────────────────────────────

/** Escapes HTML special characters to prevent XSS in the sidebar. */
function _asst_esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ─── Public entry point ──────────────────────────────────────────────────────

/**
 * Opens (or refreshes) the SAT Assistant sidebar.
 * Called from the S.A.T. menu and from the sidebar refresh button.
 */
function SAT_openAssistant() {
  SAT.loadGameData();
  var rows  = SAT.Engine.buildIndex();
  var stats = SAT.Engine.stats(rows);
  var cards = SAT.Assistant.analyze(stats, rows);
  var html  = SAT.Assistant._buildHtml(cards, stats);

  SpreadsheetApp.getUi().showSidebar(
    HtmlService.createHtmlOutput(html).setTitle('🤖 SAT Assistant')
  );
}

// ─── Action handlers (called from sidebar buttons) ───────────────────────────

/**
 * Fixes a bottleneck by running the solver for the deficit resource
 * and writing the resulting rows to Production.
 * Returns {ok, msg, error} for the sidebar JS handler.
 *
 * @param {string} resource  - resource name in deficit
 * @param {number} deficit   - Qt/min to cover
 */
function SAT_assistantFixBottleneck(resource, deficit) {
  try {
    SAT.loadGameData();
    var result = SAT.Solver.solve(resource, deficit, null);
    if (!result || !result.nodes || result.nodes.length === 0) {
      return { error: 'Aucune recette trouvée pour "' + resource + '"' };
    }
    var etage   = 'Solveur — ' + resource;
    var written = SAT.Solver.writeToProduction(result.nodes, etage);
    SAT.Engine.writeFlags(SAT.Engine.buildIndex());
    var msg = written + ' ligne(s) ajoutée(s) pour "' + resource + '"';
    if (result.warnings && result.warnings.length > 0) {
      msg += ' ⚠ ' + result.warnings.length + ' avertissement(s)';
    }
    return { ok: true, msg: msg };
  } catch (e) {
    return { error: e.message };
  }
}

/**
 * Normalizes overclock for a given (etage, recipe) combination:
 * sets Nb = equivNb and OC = 100 on all matching rows.
 * Returns {ok, msg, error}.
 *
 * @param {string} etage    - floor name
 * @param {string} recipe   - recipe name
 * @param {number} equivNb  - target machine count at OC=100%
 */
function SAT_assistantNormalizeOC(etage, recipe, equivNb) {
  try {
    var cfg    = SAT.CFG;
    var sh     = SAT.S.get(cfg.SHEETS.PROD);
    if (!sh) return { error: 'Feuille Production introuvable' };

    var lastRow = sh.getLastRow();
    if (lastRow < cfg.DAT_ROW) return { error: 'Feuille Production vide' };

    var data    = sh.getRange(cfg.DAT_ROW, 1, lastRow - cfg.DAT_ROW + 1, cfg.C.OC).getValues();
    var updated = 0;

    data.forEach(function(r, i) {
      var rowEtage  = String(r[cfg.C.ETAGE  - 1] || '').trim();
      var rowRecipe = String(r[cfg.C.RECIPE - 1] || '').trim();
      if (rowEtage === etage && rowRecipe === recipe) {
        var rowNum = cfg.DAT_ROW + i;
        sh.getRange(rowNum, cfg.C.NB).setValue(equivNb);
        sh.getRange(rowNum, cfg.C.OC).setValue(100);
        updated++;
      }
    });

    if (updated === 0) return { error: 'Aucune ligne trouvée pour "' + recipe + '" dans "' + etage + '"' };

    SAT.Engine.writeFlags(SAT.Engine.buildIndex());
    return { ok: true, msg: updated + ' ligne(s) mise(s) à jour : ' + equivNb + ' machines @100% OC' };
  } catch (e) {
    return { error: e.message };
  }
}

/** Navigates to the Production sheet and activates it. */
function SAT_focusProduction() {
  try {
    var sh = SAT.S.get(SAT.CFG.SHEETS.PROD);
    if (sh) SpreadsheetApp.getActiveSpreadsheet().setActiveSheet(sh);
    return { ok: true, msg: 'Feuille Production activée' };
  } catch (e) {
    return { error: e.message };
  }
}

/** Navigates to the Objectives sheet and activates it. */
function SAT_focusObjectives() {
  try {
    var sh = SAT.S.get(SAT.CFG.SHEETS.OBJ);
    if (sh) SpreadsheetApp.getActiveSpreadsheet().setActiveSheet(sh);
    return { ok: true, msg: 'Feuille Objectifs activée' };
  } catch (e) {
    return { error: e.message };
  }
}
