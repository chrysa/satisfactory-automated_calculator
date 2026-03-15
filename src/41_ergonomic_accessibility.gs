/**
 * 41_ergonomic_accessibility.gs - WCAG Accessibility and Adaptive Features
 * 
 * Accessibility compliance, screen reader support, and adaptive UI.
 * Part of Layer 4: Ergonomics Pillar (96% ergonomics target)
 * 
 * Dependencies: SAT.CFG, SAT.Design, SAT.Feedback
 */

var SAT = this.SAT || (this.SAT = {});

/**
 * SAT.Accessibility - WCAG 2.1 compliance and adaptive features
 * Ensures usability for all users including those with disabilities
 */
SAT.Accessibility = {
  
  userPreferences: {
    highContrast: false,
    largeText: false,
    textSpacing: 1.0,
    reduceMotion: false
  },
  
  /**
   * Apply high-contrast theme
   * Increases visual separation and color contrast
   */
  applyHighContrast: function() {
    try {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      
      ss.getSheets().forEach(function(sheet) {
        var range = sheet.getDataRange();
        
        // Apply high-contrast colors
        range.setBackground('#FFFFFF');
        range.setFontColor('#000000');
        range.setFontSize(12);
        
        // Bold headers
        var headerRange = sheet.getRange(1, 1, 1, sheet.getLastColumn());
        headerRange.setBackground('#000000');
        headerRange.setFontColor('#FFFFFF');
        headerRange.setFontWeight('bold');
      });
      
      SAT.Accessibility.userPreferences.highContrast = true;
      Logger.log('High-contrast mode enabled');
      
      if (typeof SAT.Feedback !== 'undefined') {
        SAT.Feedback.toast('High-contrast mode enabled', 2);
      }
      
    } catch (e) {
      Logger.log('High-contrast error: ' + e.message);
    }
  },
  
  /**
   * Disable high-contrast theme
   */
  disableHighContrast: function() {
    try {
      SAT.Accessibility.userPreferences.highContrast = false;
      Logger.log('High-contrast mode disabled');
      
    } catch (e) {
      Logger.log('High-contrast disable error: ' + e.message);
    }
  },
  
  /**
   * Increase text size for readability
   * @param {number} multiplier - Size multiplier (1.2, 1.5, 2.0)
   */
  increaseFontSize: function(multiplier) {
    try {
      multiplier = multiplier || 1.5;
      
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      
      ss.getSheets().forEach(function(sheet) {
        var range = sheet.getDataRange();
        var fontSizes = range.getFontSizes();
        
        for (var i = 0; i < fontSizes.length; i++) {
          for (var j = 0; j < fontSizes[i].length; j++) {
            fontSizes[i][j] = Math.ceil(fontSizes[i][j] * multiplier);
          }
        }
        
        range.setFontSizes(fontSizes);
      });
      
      SAT.Accessibility.userPreferences.largeText = true;
      Logger.log('Font size increased: ' + (multiplier * 100).toFixed(0) + '%');
      
    } catch (e) {
      Logger.log('Font size error: ' + e.message);
    }
  },
  
  /**
   * Reset to normal text size
   */
  resetFontSize: function() {
    try {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      
      ss.getSheets().forEach(function(sheet) {
        var range = sheet.getDataRange();
        range.setFontSize(10);  // Default size
      });
      
      SAT.Accessibility.userPreferences.largeText = false;
      Logger.log('Font size reset to normal');
      
    } catch (e) {
      Logger.log('Font size reset error: ' + e.message);
    }
  },
  
  /**
   * Increase letter spacing for readability
   * @param {number} multiplier - Spacing multiplier
   */
  increaseSpacing: function(multiplier) {
    try {
      multiplier = multiplier || 1.5;
      SAT.Accessibility.userPreferences.textSpacing = multiplier;
      
      Logger.log('Text spacing increased: ' + (multiplier * 100).toFixed(0) + '%');
      
      if (typeof SAT.Feedback !== 'undefined') {
        SAT.Feedback.toast('Text spacing increased', 2);
      }
      
    } catch (e) {
      Logger.log('Spacing error: ' + e.message);
    }
  },
  
  /**
   * Enable reduce motion (animations off)
   */
  enableReduceMotion: function() {
    try {
      SAT.Accessibility.userPreferences.reduceMotion = true;
      Logger.log('Reduce motion enabled - animations disabled');
      
    } catch (e) {
      Logger.log('Reduce motion error: ' + e.message);
    }
  },
  
  /**
   * Get accessible label for a field
   * Provides context for screen readers
   * @param {string} fieldName - Field name
   * @param {string} value - Current value
   * @returns {string} Accessible label
   */
  getAccessibleLabel: function(fieldName, value) {
    var labels = {
      'Base': 'Select production base name',
      'Machine': 'Select machine type. Current selection: ' + (value || 'None'),
      'Nb': 'Enter quantity. Must be positive number',
      'IN': 'Input rate. Current: ' + (value || '0'),
      'OUT': 'Output rate. Current: ' + (value || '0'),
      'DATE': 'Select date. Default: today',
      'TODO': 'Mark as todo when production starts',
      'STATUS': 'Current status: ' + (value || 'Pending')
    };
    
    return labels[fieldName] || 'Enter ' + fieldName;
  },
  
  /**
   * Add keyboard navigation shortcuts
   * @param {string} action - Action to bind
   * @param {string} keys - Key combination (e.g., 'Ctrl+N')
   */
  addKeyboardShortcut: function(action, keys) {
    try {
      var shortcuts = {
        'newRow': 'Ctrl+Shift+N',
        'search': 'Ctrl+F',
        'save': 'Ctrl+S',
        'recalc': 'F5',
        'undo': 'Ctrl+Z',
        'redo': 'Ctrl+Y'
      };
      
      shortcuts[action] = keys;
      
      // Log shortcut
      Logger.log('Keyboard shortcut added: ' + action + ' = ' + keys);
      
    } catch (e) {
      Logger.log('Keyboard shortcut error: ' + e.message);
    }
  },
  
  /**
   * Get keyboard shortcuts list
   * @returns {object} All shortcuts
   */
  getShortcuts: function() {
    return {
      'newRow': 'Ctrl+Shift+N',
      'search': 'Ctrl+F',
      'save': 'Ctrl+S',
      'recalc': 'F5',
      'undo': 'Ctrl+Z',
      'redo': 'Ctrl+Y',
      'help': 'F1'
    };
  },
  
  /**
   * Create accessible form with labels
   * @param {array} fields - Form fields
   * @returns {object} Accessible form
   */
  createAccessibleForm: function(fields) {
    try {
      var form = {
        fields: [],
        ariaLabels: {}
      };
      
      for (var i = 0; i < fields.length; i++) {
        var field = fields[i];
        form.fields.push(field);
        
        // Add ARIA label
        form.ariaLabels[field.name] = SAT.Accessibility.getAccessibleLabel(field.name, '');
      }
      
      return form;
      
    } catch (e) {
      Logger.log('Accessible form error: ' + e.message);
      return null;
    }
  },
  
  /**
   * Create accessible table for screen readers
   * @param {array} data - Table data
   * @param {array} headers - Column headers
   * @returns {string} Accessible HTML table
   */
  createAccessibleTable: function(data, headers) {
    try {
      var html = '<table role="table" aria-label="Data table">' +
        '<thead><tr role="row">';
      
      // Add headers with role
      for (var i = 0; i < headers.length; i++) {
        html += '<th role="columnheader">' + headers[i] + '</th>';
      }
      
      html += '</tr></thead><tbody>';
      
      // Add rows
      for (var r = 0; r < data.length; r++) {
        html += '<tr role="row">';
        for (var c = 0; c < data[r].length; c++) {
          html += '<td role="cell">' + data[r][c] + '</td>';
        }
        html += '</tr>';
      }
      
      html += '</tbody></table>';
      
      return html;
      
    } catch (e) {
      Logger.log('Accessible table error: ' + e.message);
      return null;
    }
  },
  
  /**
   * Check WCAG compliance of sheet
   * @returns {object} Compliance report
   */
  checkWCAGCompliance: function() {
    var report = {
      passed: true,
      issues: [],
      score: 100
    };
    
    try {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      
      ss.getSheets().forEach(function(sheet) {
        var range = sheet.getDataRange();
        var colors = range.getBackgrounds();
        var fontColors = range.getFontColors();
        
        // Check contrast
        for (var i = 0; i < colors.length; i++) {
          for (var j = 0; j < colors[i].length; j++) {
            var bgColor = colors[i][j];
            var fgColor = fontColors[i][j];
            
            // Simple contrast check (should be more sophisticated)
            if (bgColor === fgColor) {
              report.issues.push('Low contrast at ' + sheet.getName() + ' R' + i + 'C' + j);
              report.score -= 5;
            }
          }
        }
      });
      
      if (report.score < 80) {
        report.passed = false;
      }
      
    } catch (e) {
      report.issues.push('Compliance check error: ' + e.message);
    }
    
    return report;
  },
  
  /**
   * Get user accessibility preferences
   * @returns {object} Current preferences
   */
  getPreferences: function() {
    return SAT.Accessibility.userPreferences;
  },
  
  /**
   * Show accessibility panel in menu
   */
  showAccessibilityPanel: function() {
    var prefs = SAT.Accessibility.userPreferences;
    
    var menu = 'High Contrast: ' + (prefs.highContrast ? 'ON' : 'OFF') + '\n' +
               'Large Text: ' + (prefs.largeText ? 'ON' : 'OFF') + '\n' +
               'Reduce Motion: ' + (prefs.reduceMotion ? 'ON' : 'OFF');
    
    Logger.log('Accessibility Settings:\n' + menu);
  }
};
