/**
 * 20_ui_design_system.gs - UI/UX Design Layer
 * 
 * ✅ Centralized Design System
 * ✅ Unified UX decisions
 * ✅ Visual + Interaction consistency
 */

var SAT = this.SAT || (this.SAT = {});

/**
 * SAT.Design - Design System centralisé
 */
SAT.Design = SAT.Design || (function() {
  
  var colors = {
    PRIMARY: "#1a73e8",
    SUCCESS: "#0d652d",
    WARNING: "#f9ab00",
    ERROR: "#d33b27",
    INFO: "#1e88e5",
    
    BG_LIGHT: "#F3F4F6",
    BG_DARK: "#111827",
    TEXT_DARK: "#111827",
    TEXT_LIGHT: "#FFFFFF",
    
    YELLOW_TODO: "#FFF8E1",
    RED_ERROR: "#FFEBEE",
    ORANGE_WARN: "#FFF3E0",
    GREEN_OK: "#E8F5E9"
  };
  
  var spacing = {
    XS: 4,
    S: 8,
    M: 16,
    L: 24,
    XL: 32
  };
  
  return {
    colors: colors,
    spacing: spacing,
    
    /**
     * Apply design theme
     */
    applyTheme: function(sheet, theme) {
      theme = theme || "light";
      var cs = colors;
      
      if (theme === "light") {
        sheet.getRange(1, 1, sheet.getMaxRows(), sheet.getMaxColumns())
          .setBackground(cs.BG_LIGHT)
          .setFontColor(cs.TEXT_DARK);
      } else if (theme === "dark") {
        sheet.getRange(1, 1, sheet.getMaxRows(), sheet.getMaxColumns())
          .setBackground(cs.BG_DARK)
          .setFontColor(cs.TEXT_LIGHT);
      } else if (theme === "high-contrast") {
        sheet.getRange(1, 1, sheet.getMaxRows(), sheet.getMaxColumns())
          .setBackground("#FFFFFF")
          .setFontColor("#000000")
          .setFontWeight("bold");
      }
    },
    
    /**
     * Style header
     */
    styleHeader: function(range) {
      range
        .setFontWeight("bold")
        .setBackground(colors.PRIMARY)
        .setFontColor(colors.TEXT_LIGHT)
        .setHorizontalAlignment("center")
        .setVerticalAlignment("middle");
    },

    /**
     * Apply theme to sheet (header + background)
     */
    applySheetTheme: function(sheet, themeName) {
      var theme = SAT.CFG.THEMES[themeName] || SAT.CFG.THEMES.PRODUCTION;
      var lastRow = Math.max(100, sheet.getLastRow());
      var lastCol = sheet.getMaxColumns();

      // Apply background theme
      sheet.getRange(1, 1, lastRow, lastCol)
        .setBackground(theme.bg);

      // Style header row
      sheet.getRange(1, 1, 1, lastCol)
        .setFontColor(theme.fg)
        .setFontWeight("bold")
        .setBackground(theme.accent)
        .setHorizontalAlignment("center");

      Logger.log("✓ Thème appliqué: " + themeName);
    },
    
    /**
     * Style error row
     */
    styleErrorRow: function(range) {
      range.setBackground(colors.RED_ERROR);
    },
    
    /**
     * Style warning row
     */
    styleWarningRow: function(range) {
      range.setBackground(colors.YELLOW_TODO);
    },
    
    /**
     * Style success row
     */
    styleSuccessRow: function(range) {
      range.setBackground(colors.GREEN_OK);
    },
    
    /**
     * Style panel title
     */
    stylePanelTitle: function(range) {
      range
        .setFontWeight("bold")
        .setBackground(colors.BG_DARK)
        .setFontColor(colors.TEXT_LIGHT)
        .setHorizontalAlignment("center");
    },
    
    /**
     * Style panel body
     */
    stylePanelBody: function(range) {
      range
        .setBackground(colors.BG_LIGHT)
        .setFontColor(colors.TEXT_DARK)
        .setWrap(true)
        .setVerticalAlignment("top");
    }
  };
})();

/**
 * SAT.Feedback - Retours utilisateur cohérents
 */
SAT.Feedback = SAT.Feedback || (function() {
  
  return {
    /**
     * Alert dialog
     */
    alert: function(title, msg, type) {
      var icon = {
        success: "✅",
        error: "❌",
        warning: "⚠️",
        info: "ℹ️"
      }[type || "info"];
      
      var ui = SpreadsheetApp.getUi();
      ui.alert(icon + " " + title, msg, ui.ButtonSet.OK);
    },
    
    /**
     * Confirm dialog
     */
    confirm: function(title, msg) {
      var ui = SpreadsheetApp.getUi();
      var response = ui.alert(title, msg, ui.ButtonSet.YES_NO);
      return response === ui.Button.YES;
    },
    
    /**
     * Double confirm (dangerous)
     */
    confirmDangerous: function(title, msg1, msg2) {
      if (!this.confirm(title, msg1)) return false;
      if (!this.confirm("⚠️ FINAL CONFIRMATION", msg2)) return false;
      return true;
    },
    
    /**
     * Toast notification
     */
    toast: function(msg, duration) {
      duration = duration || 3;
      SpreadsheetApp.getActiveSheet().getRange(1, 1).setNote(msg);
      Utilities.sleep(duration * 1000);
    },
    
    /**
     * Show validation error
     */
    showValidationError: function(validation) {
      if (!validation.valid) {
        var msg = "❌ Erreurs:\n" + validation.errors.join("\n");
        if (validation.warnings.length > 0) {
          msg += "\n\n⚠️ Warnings:\n" + validation.warnings.join("\n");
        }
        this.alert("Validation échouée", msg, "error");
      }
    },
    
    /**
     * Show success
     */
    showSuccess: function(title, msg) {
      this.alert(title, msg, "success");
    },
    
    /**
     * Show info
     */
    showInfo: function(title, msg) {
      this.alert(title, msg, "info");
    }
  };
})();

/**
 * SAT.Panels - Panneaux aide contextuels
 */
SAT.Panels = SAT.Panels || (function() {
  
  return {
    /**
     * Render help panel
     */
    render: function(sheet, pos, title, lines) {
      var cs = SAT.Design.colors;
      var r = pos.ROW, c = pos.COL, w = pos.WIDTH, h = pos.HEIGHT;
      
      sheet.getRange(r, c, h, w).clearContent();
      
      // Title
      var titleRange = sheet.getRange(r, c, 1, w);
      titleRange.merge();
      titleRange.setValue(title);
      SAT.Design.stylePanelTitle(titleRange);
      
      // Body
      var bodyRange = sheet.getRange(r + 1, c, h - 1, w);
      bodyRange.merge();
      bodyRange.setValue(lines.join("\n"));
      SAT.Design.stylePanelBody(bodyRange);
    },
    
    /**
     * Render all panels
     */
    renderAll: function() {
      var cfg = SAT.CFG;
      
      // Overview panel
      this.render(
        SAT.S.must(cfg.SHEETS.OVERVIEW),
        cfg.UI.PANELS.OVERVIEW,
        "📋 OVERVIEW AIDE",
        [
          "✓ TODO: Lignes à finaliser (Nb vide/0)",
          "⚠️ ERROR: Erreurs dépendances",
          "📊 STATS: Hauteur, count, deps"
        ]
      );
      
      Logger.log("✅ Panels rendered");
    }
  };
})();
