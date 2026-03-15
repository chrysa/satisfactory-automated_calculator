/**
 * 22_ui_panels.gs - Side Panels and Help Interface
 * 
 * Side panels for help, guidance, and contextual information.
 * Part of Layer 2: UI/UX Pillar (96% optimization target)
 * 
 * Dependencies: SAT.CFG, SAT.Design, SAT.S
 */

var SAT = this.SAT || (this.SAT = {});

/**
 * SAT.Panels - Contextual help and information panels
 * Displays help panels on the side without disrupting workflow
 */
SAT.Panels = {
  
  panelCache: {},
  activePanel: null,
  
  /**
   * Create help panel for production sheet
   * @returns {object} Panel widget
   */
  createProductionHelp: function() {
    var html = '<div style="padding: 15px; font-family: Arial; line-height: 1.6;">' +
      '<h3 style="color: #2196F3; margin-top: 0;">Production Entry</h3>' +
      '<p><strong>Steps:</strong></p>' +
      '<ol>' +
      '<li>Enter or select <strong>Base</strong> name</li>' +
      '<li>Select <strong>Machine</strong> type</li>' +
      '<li>Enter <strong>Quantity</strong> (defaults to 1)</li>' +
      '<li>Check <strong>TODO</strong> when started</li>' +
      '<li>IN/OUT rates auto-calculate</li>' +
      '</ol>' +
      '<p><strong>Tips:</strong></p>' +
      '<ul>' +
      '<li>Last entry auto-fills next time</li>' +
      '<li>Today\'s date auto-fills</li>' +
      '<li>Mark TODO to auto-complete row</li>' +
      '</ul>' +
      '</div>';
    
    return html;
  },
  
  /**
   * Create help panel for overview sheet
   * @returns {object} Panel widget
   */
  createOverviewHelp: function() {
    var html = '<div style="padding: 15px; font-family: Arial; line-height: 1.6;">' +
      '<h3 style="color: #4CAF50; margin-top: 0;">Overview</h3>' +
      '<p>Real-time dashboard showing:</p>' +
      '<ul>' +
      '<li>Total production count</li>' +
      '<li>Active machines</li>' +
      '<li>Performance metrics</li>' +
      '<li>Status summary</li>' +
      '</ul>' +
      '<p><strong>Updates automatically</strong> when you edit production entries.</p>' +
      '</div>';
    
    return html;
  },
  
  /**
   * Create help panel for reference sheets
   * @returns {object} Panel widget
   */
  createReferenceHelp: function() {
    var html = '<div style="padding: 15px; font-family: Arial; line-height: 1.6;">' +
      '<h3 style="color: #FF9800; margin-top: 0;">Reference Data</h3>' +
      '<p>These sheets contain master data:</p>' +
      '<ul>' +
      '<li><strong>Bases</strong> - Available production bases</li>' +
      '<li><strong>Machines</strong> - Machine types and settings</li>' +
      '<li><strong>Floors</strong> - Building floor information</li>' +
      '</ul>' +
      '<p><strong>Edit carefully</strong> - changes affect all entries.</p>' +
      '</div>';
    
    return html;
  },
  
  /**
   * Create error message panel
   * @param {string} errorMsg - Error message
   * @returns {object} Panel widget
   */
  createErrorPanel: function(errorMsg) {
    var html = '<div style="padding: 15px; background-color: #FFEBEE; border-left: 4px solid #F44336; font-family: Arial;">' +
      '<h3 style="color: #F44336; margin-top: 0;">Error</h3>' +
      '<p>' + String(errorMsg) + '</p>' +
      '<p style="font-size: 12px; color: #666;">Contact support if problem persists.</p>' +
      '</div>';
    
    return html;
  },
  
  /**
   * Create status panel
   * @param {string} status - Current status (READY, PROCESSING, ERROR, etc)
   * @returns {object} Panel widget
   */
  createStatusPanel: function(status) {
    var colors = {
      'READY': '#4CAF50',
      'PROCESSING': '#2196F3',
      'ERROR': '#F44336',
      'WARNING': '#FF9800',
      'INFO': '#2196F3'
    };
    
    var color = colors[status] || '#999';
    
    var html = '<div style="padding: 15px; border: 2px solid ' + color + '; border-radius: 4px; font-family: Arial;">' +
      '<p style="margin: 0; font-weight: bold; color: ' + color + ';">Status: ' + status + '</p>' +
      '</div>';
    
    return html;
  },
  
  /**
   * Create keyboard shortcuts help panel
   * @returns {object} Panel widget
   */
  createShortcutsHelp: function() {
    var html = '<div style="padding: 15px; font-family: monospace; font-size: 12px; line-height: 1.8;">' +
      '<h3 style="color: #9C27B0; margin-top: 0;">Keyboard Shortcuts</h3>' +
      '<table style="width: 100%; border-collapse: collapse;">' +
      '<tr style="border-bottom: 1px solid #ddd;"><td><strong>Ctrl+Shift+N</strong></td><td>New row</td></tr>' +
      '<tr style="border-bottom: 1px solid #ddd;"><td><strong>Ctrl+F</strong></td><td>Search</td></tr>' +
      '<tr style="border-bottom: 1px solid #ddd;"><td><strong>F5</strong></td><td>Quick recalc</td></tr>' +
      '<tr style="border-bottom: 1px solid #ddd;"><td><strong>Ctrl+Shift+S</strong></td><td>Save & sync</td></tr>' +
      '</table>' +
      '<p style="font-size: 11px; margin-top: 10px; color: #666;">Pro tip: Use shortcuts to work faster!</p>' +
      '</div>';
    
    return html;
  },
  
  /**
   * Create performance metrics panel
   * @param {object} metrics - Performance data
   * @returns {object} Panel widget
   */
  createMetricsPanel: function(metrics) {
    var html = '<div style="padding: 15px; font-family: Arial;">' +
      '<h3 style="color: #2196F3; margin-top: 0;">Performance</h3>' +
      '<table style="width: 100%; font-size: 12px;">' +
      '<tr><td><strong>Last Recalc:</strong></td><td>' + (metrics.lastRecalcTime || 'N/A') + 'ms</td></tr>' +
      '<tr><td><strong>Total Rows:</strong></td><td>' + (metrics.totalRows || 0) + '</td></tr>' +
      '<tr><td><strong>Errors:</strong></td><td>' + (metrics.errorCount || 0) + '</td></tr>' +
      '<tr><td><strong>Health:</strong></td><td>' + (metrics.health || 'GOOD') + '</td></tr>' +
      '</table>' +
      '</div>';
    
    return html;
  },
  
  /**
   * Create welcome/onboarding panel for first-time users
   * @returns {object} Panel widget
   */
  createWelcomePanel: function() {
    var html = '<div style="padding: 15px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; font-family: Arial; border-radius: 4px;">' +
      '<h2 style="margin: 0 0 10px 0;">Welcome to S.A.T!</h2>' +
      '<p style="margin: 0 0 10px 0;">Satisfactory Automated Tool for production management</p>' +
      '<h4 style="margin: 10px 0 5px 0;">Quick Start:</h4>' +
      '<ol style="margin: 0; padding-left: 20px;">' +
      '<li>Click "Production" tab</li>' +
      '<li>Add your first entry</li>' +
      '<li>Watch data auto-calculate!</li>' +
      '</ol>' +
      '<p style="font-size: 12px; margin: 10px 0 0 0; opacity: 0.9;">💡 Tip: Check help icons for detailed guides</p>' +
      '</div>';
    
    return html;
  },
  
  /**
   * Render panel in spreadsheet
   * @param {string} sheetName - Target sheet
   * @param {string} panelType - Type of panel to render
   * @param {object} data - Optional data for panel
   */
  render: function(sheetName, panelType, data) {
    try {
      var html = '';
      
      switch (panelType) {
        case 'production':
          html = SAT.Panels.createProductionHelp();
          break;
        case 'overview':
          html = SAT.Panels.createOverviewHelp();
          break;
        case 'reference':
          html = SAT.Panels.createReferenceHelp();
          break;
        case 'shortcuts':
          html = SAT.Panels.createShortcutsHelp();
          break;
        case 'metrics':
          html = SAT.Panels.createMetricsPanel(data || {});
          break;
        case 'welcome':
          html = SAT.Panels.createWelcomePanel();
          break;
        case 'error':
          html = SAT.Panels.createErrorPanel(data || 'Unknown error');
          break;
        case 'status':
          html = SAT.Panels.createStatusPanel(data || 'INFO');
          break;
      }
      
      // Store in cache
      SAT.Panels.panelCache[sheetName] = {
        type: panelType,
        html: html,
        renderedAt: new Date().getTime()
      };
      
    } catch (e) {
      Logger.log('Panel render error: ' + e.message);
    }
  },
  
  /**
   * Get cached panel HTML
   * @param {string} sheetName - Sheet identifier
   * @returns {string} HTML content or null
   */
  getPanel: function(sheetName) {
    var panel = SAT.Panels.panelCache[sheetName];
    return panel ? panel.html : null;
  },
  
  /**
   * Clear caches
   */
  clearCache: function() {
    SAT.Panels.panelCache = {};
    SAT.Panels.activePanel = null;
  }
};
