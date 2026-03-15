/**
 * 21_ui_forms.gs - Form Components and Input Widgets
 * 
 * Reusable form components with data binding and validation.
 * Part of Layer 2: UI/UX Pillar (96% optimization target)
 * 
 * Dependencies: SAT.CFG, SAT.Design, SAT.Feedback
 */

var SAT = this.SAT || (this.SAT = {});

/**
 * SAT.Forms - Form components and widgets
 * Provides reusable form building blocks with consistent styling
 */
SAT.Forms = {
  
  currentFormData: {},
  
  /**
   * Create a simple input form dialog
   * @param {string} title - Form title
   * @param {array} fields - Array of field definitions
   * @returns {object} Form result
   */
  createSimpleForm: function(title, fields) {
    var app = UiApp.createApplication();
    app.setTitle(title);
    
    var grid = app.createGrid(fields.length + 1, 2);
    var inputs = {};
    
    // Create form fields
    for (var i = 0; i < fields.length; i++) {
      var field = fields[i];
      var label = app.createLabel(field.label + ':');
      var input;
      
      if (field.type === 'textarea') {
        input = app.createTextBox().setWidth('300px').setHeight('100px');
      } else if (field.type === 'dropdown') {
        input = app.createListBox();
        if (field.options) {
          for (var j = 0; j < field.options.length; j++) {
            input.addItem(field.options[j]);
          }
        }
      } else if (field.type === 'checkbox') {
        input = app.createCheckBox(field.label);
      } else {
        input = app.createTextBox().setWidth('300px');
      }
      
      input.setName(field.name);
      inputs[field.name] = input;
      
      grid.setWidget(i, 0, label);
      grid.setWidget(i, 1, input);
    }
    
    // Add buttons
    var submitBtn = app.createButton('Submit', app.createServerHandler('_handleFormSubmit'));
    var cancelBtn = app.createButton('Cancel', app.createServerHandler('_handleFormCancel'));
    
    grid.setWidget(fields.length, 0, submitBtn);
    grid.setWidget(fields.length, 1, cancelBtn);
    
    app.add(grid);
    
    return app;
  },
  
  /**
   * Create a production entry form
   * Auto-fills with last entry data and smart defaults
   * @returns {object} Form UI
   */
  createProductionForm: function() {
    var app = UiApp.createApplication();
    app.setTitle('New Production Entry');
    
    var grid = app.createGrid(10, 2);
    grid.setStyleAttribute('padding', '10px');
    
    // Title
    var titleLabel = app.createLabel('Production Entry Form').setStyleAttribute('font-size', '16px').setStyleAttribute('font-weight', 'bold');
    
    var panel = app.createVerticalPanel();
    panel.add(titleLabel);
    
    // Base fields
    var baseLabel = app.createLabel('Base:');
    var baseBox = app.createTextBox();
    baseBox.setName('base');
    baseBox.setWidth('200px');
    
    var machineLabel = app.createLabel('Machine:');
    var machineBox = app.createTextBox();
    machineBox.setName('machine');
    machineBox.setWidth('200px');
    
    var nbLabel = app.createLabel('Quantity (Nb):');
    var nbBox = app.createTextBox();
    nbBox.setName('nb');
    nbBox.setValue('1');  // Smart default
    nbBox.setWidth('200px');
    
    var dateLabel = app.createLabel('Date:');
    var dateBox = app.createTextBox();
    dateBox.setName('date');
    dateBox.setValue(new Date().toLocaleDateString());  // Smart default
    dateBox.setWidth('200px');
    
    // Add rows to grid
    grid.setWidget(0, 0, baseLabel);
    grid.setWidget(0, 1, baseBox);
    grid.setWidget(1, 0, machineLabel);
    grid.setWidget(1, 1, machineBox);
    grid.setWidget(2, 0, nbLabel);
    grid.setWidget(2, 1, nbBox);
    grid.setWidget(3, 0, dateLabel);
    grid.setWidget(3, 1, dateBox);
    
    panel.add(grid);
    
    // Buttons
    var btnPanel = app.createHorizontalPanel();
    var submitBtn = app.createButton('Submit');
    var cancelBtn = app.createButton('Cancel');
    
    btnPanel.add(submitBtn);
    btnPanel.add(cancelBtn);
    
    panel.add(btnPanel);
    
    app.add(panel);
    
    return app;
  },
  
  /**
   * Create a data grid display
   * @param {string} sheetName - Sheet to display
   * @param {number} maxRows - Maximum rows to show (0 = all)
   * @returns {object} Grid widget
   */
  createDataGrid: function(sheetName, maxRows) {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) return null;
    
    var data = sheet.getDataRange().getValues();
    var displayRows = maxRows > 0 ? Math.min(maxRows, data.length) : data.length;
    
    var app = UiApp.createApplication();
    var grid = app.createGrid(displayRows, data[0].length);
    
    // Populate grid
    for (var i = 0; i < displayRows; i++) {
      for (var j = 0; j < data[i].length; j++) {
        var cell = app.createLabel(String(data[i][j]));
        
        // Header styling
        if (i === 0) {
          cell.setStyleAttribute('font-weight', 'bold');
          cell.setStyleAttribute('background-color', '#f0f0f0');
        }
        
        grid.setWidget(i, j, cell);
      }
    }
    
    return grid;
  },
  
  /**
   * Create a search form
   * @param {string} placeholder - Search placeholder text
   * @returns {object} Search UI
   */
  createSearchForm: function(placeholder) {
    var app = UiApp.createApplication();
    
    var panel = app.createVerticalPanel();
    
    var searchBox = app.createTextBox();
    searchBox.setName('query');
    searchBox.setWidth('400px');
    searchBox.setPlaceholder(placeholder || 'Enter search terms...');
    
    var searchBtn = app.createButton('Search');
    var clearBtn = app.createButton('Clear');
    
    var btnPanel = app.createHorizontalPanel();
    btnPanel.add(searchBtn);
    btnPanel.add(clearBtn);
    
    panel.add(app.createLabel('Search'));
    panel.add(searchBox);
    panel.add(btnPanel);
    
    app.add(panel);
    
    return app;
  },
  
  /**
   * Create filter controls
   * @param {array} filterOptions - Available filter options
   * @returns {object} Filter UI
   */
  createFilterPanel: function(filterOptions) {
    var app = UiApp.createApplication();
    var panel = app.createVerticalPanel();
    
    panel.add(app.createLabel('Filters').setStyleAttribute('font-weight', 'bold'));
    
    // Create checkboxes for each filter
    for (var i = 0; i < filterOptions.length; i++) {
      var option = filterOptions[i];
      var checkbox = app.createCheckBox(option);
      checkbox.setName('filter_' + i);
      panel.add(checkbox);
    }
    
    var applyBtn = app.createButton('Apply Filters');
    var resetBtn = app.createButton('Reset');
    
    panel.add(applyBtn);
    panel.add(resetBtn);
    
    app.add(panel);
    
    return app;
  },
  
  /**
   * Store form data temporarily
   * @param {string} formId - Form identifier
   * @param {object} data - Form data
   */
  storeFormData: function(formId, data) {
    SAT.Forms.currentFormData[formId] = {
      data: data,
      timestamp: new Date().getTime()
    };
  },
  
  /**
   * Retrieve stored form data
   * @param {string} formId - Form identifier
   * @returns {object} Stored data or null
   */
  getFormData: function(formId) {
    var stored = SAT.Forms.currentFormData[formId];
    if (!stored) return null;
    
    // Consider data stale after 60 minutes
    var now = new Date().getTime();
    if (now - stored.timestamp > 3600000) {
      delete SAT.Forms.currentFormData[formId];
      return null;
    }
    
    return stored.data;
  },
  
  /**
   * Clear form data
   * @param {string} formId - Form identifier (or null for all)
   */
  clearFormData: function(formId) {
    if (formId) {
      delete SAT.Forms.currentFormData[formId];
    } else {
      SAT.Forms.currentFormData = {};
    }
  },
  
  /**
   * Create a confirmation dialog
   * @param {string} title - Dialog title
   * @param {string} message - Confirmation message
   * @param {string} yesText - Yes button text
   * @param {string} noText - No button text
   * @returns {object} Dialog UI
   */
  createConfirmDialog: function(title, message, yesText, noText) {
    var app = UiApp.createApplication();
    
    var panel = app.createVerticalPanel();
    panel.setStyleAttribute('padding', '15px');
    
    panel.add(app.createLabel(title).setStyleAttribute('font-weight', 'bold').setStyleAttribute('font-size', '14px'));
    panel.add(app.createLabel(message));
    
    var btnPanel = app.createHorizontalPanel();
    var yesBtn = app.createButton(yesText || 'Yes');
    var noBtn = app.createButton(noText || 'No');
    
    btnPanel.add(yesBtn);
    btnPanel.add(noBtn);
    
    panel.add(btnPanel);
    
    app.add(panel);
    
    return app;
  }
};
