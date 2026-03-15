/**
 * 42_ergonomic_guidance.gs - Progressive Onboarding and User Guidance
 * 
 * Step-by-step tutorials, contextual help, and intelligent guidance.
 * Part of Layer 4: Ergonomics Pillar (96% ergonomics target)
 * 
 * Dependencies: SAT.CFG, SAT.Design, SAT.Feedback, SAT.Panels
 */

var SAT = this.SAT || (this.SAT = {});

/**
 * SAT.UserGuidance - Progressive onboarding and contextual help
 * Guides users through workflows with clear step-by-step instructions
 */
SAT.UserGuidance = {
  
  userState: {
    isFirstTime: true,
    completedTutorials: [],
    currentStep: 0,
    preferences: {}
  },
  
  /**
   * Check if user is first-time
   * @returns {boolean} True if first time
   */
  isFirstTimeUser: function() {
    try {
      var props = PropertiesService.getUserProperties();
      var visited = props.getProperty('SAT_VISITED');
      
      if (!visited) {
        props.setProperty('SAT_VISITED', 'true');
        props.setProperty('SAT_FIRST_VISIT', new Date().toString());
        SAT.UserGuidance.userState.isFirstTime = true;
        return true;
      }
      
      SAT.UserGuidance.userState.isFirstTime = false;
      return false;
      
    } catch (e) {
      Logger.log('First-time check error: ' + e.message);
      return false;
    }
  },
  
  /**
   * Show progressive onboarding guide
   * Displays step-by-step tutorial for first-time users
   */
  showOnboarding: function() {
    try {
      var steps = [
        {
          step: 1,
          title: 'Welcome to S.A.T!',
          content: 'Satisfactory Automated Tool (S.A.T) helps you manage production efficiently.\n\nLet\'s get started with a quick tour.',
          action: 'Next'
        },
        {
          step: 2,
          title: 'Understanding Sheets',
          content: 'The system has several sheets:\n\n• Production: Enter your daily production\n• Overview: See live statistics\n• References: Manage base data (machines, bases, etc)\n\nYou\'ll work mostly in Production sheet.',
          action: 'Next'
        },
        {
          step: 3,
          title: 'Adding Your First Entry',
          content: 'Go to Production sheet and:\n\n1. Enter Base name\n2. Select Machine\n3. Enter Quantity (defaults to 1)\n4. Check TODO when done\n5. Input/Output rates calculate automatically!',
          action: 'Next'
        },
        {
          step: 4,
          title: 'Smart Features',
          content: 'S.A.T remembers your last entry and:\n\n✓ Auto-fills next time\n✓ Suggests values\n✓ Calculates rates\n✓ Monitors performance\n\nEverything works without manual clicking!',
          action: 'Next'
        },
        {
          step: 5,
          title: 'Using Keyboard Shortcuts',
          content: 'Pro tip - Use shortcuts to work faster:\n\n• Ctrl+Shift+N: New row\n• Ctrl+F: Search\n• F5: Quick recalc\n• Ctrl+S: Save & sync',
          action: 'Finish'
        }
      ];
      
      SAT.UserGuidance.showStep(steps[0]);
      
    } catch (e) {
      Logger.log('Onboarding error: ' + e.message);
    }
  },
  
  /**
   * Show a specific step
   * @param {object} step - Step object
   */
  showStep: function(step) {
    try {
      if (typeof SAT.Feedback !== 'undefined') {
        var message = 'Step ' + step.step + ' of 5\n\n' + 
                     step.content;
        
        SAT.Feedback.alert(step.title, message);
      }
      
      SAT.UserGuidance.userState.currentStep = step.step;
      
    } catch (e) {
      Logger.log('Step display error: ' + e.message);
    }
  },
  
  /**
   * Get next step in tutorial
   * @param {string} context - Current context (production, overview, etc)
   * @returns {object} Next step or null
   */
  getNextStep: function(context) {
    try {
      var steps = {};
      
      steps.production = [
        {title: 'Enter Base', hint: 'Click first cell in row and select or type base name', action: 'tryNow'},
        {title: 'Select Machine', hint: 'Click Machine column and choose from dropdown', action: 'tryNow'},
        {title: 'Set Quantity', hint: 'Enter number in Quantity column (defaults to 1)', action: 'tryNow'},
        {title: 'Mark TODO', hint: 'Check TODO box when production starts', action: 'tryNow'},
        {title: 'Auto Calculation', hint: 'IN/OUT rates calculate automatically!', action: 'none'}
      ];
      
      steps.overview = [
        {title: 'View Summary', hint: 'Overview sheet shows live statistics', action: 'viewAll'},
        {title: 'Monitor Performance', hint: 'Check real-time metrics and health', action: 'viewAll'},
        {title: 'Identify Issues', hint: 'Warning color shows items needing attention', action: 'viewAll'}
      ];
      
      steps.reference = [
        {title: 'Manage Bases', hint: 'Add/edit base information here', action: 'edit'},
        {title: 'Configure Machines', hint: 'Define machine types and settings', action: 'edit'}
      ];
      
      var contextSteps = steps[context] || [];
      var currentIdx = SAT.UserGuidance.userState.currentStep;
      
      if (currentIdx < contextSteps.length) {
        return contextSteps[currentIdx];
      }
      
      return null;
      
    } catch (e) {
      Logger.log('Next step error: ' + e.message);
      return null;
    }
  },
  
  /**
   * Show context-sensitive help
   * @param {string} fieldName - Field name
   */
  showContextHelp: function(fieldName) {
    try {
      var helpTexts = {
        'Base': 'Production base name. Must be defined in References → Bases',
        'Machine': 'Machine type used. Select from Machines reference list',
        'Nb': 'Quantity produced. Must be positive number',
        'IN': 'Input amount. Auto-calculated if left blank',
        'OUT': 'Output amount. Auto-calculated if left blank',
        'RATE_IN': 'Input rate per unit. Auto-calculated (IN ÷ Nb)',
        'RATE_OUT': 'Output rate per unit. Auto-calculated (OUT ÷ Nb)',
        'DATE': 'Production date. Defaults to today',
        'TODO': 'Mark to indicate production in progress',
        'STATUS': 'Automatic status (PENDING, DONE, ERROR)'
      };
      
      var help = helpTexts[fieldName] || 'Field: ' + fieldName;
      
      if (typeof SAT.Feedback !== 'undefined') {
        SAT.Feedback.alert('Help: ' + fieldName, help);
      }
      
    } catch (e) {
      Logger.log('Context help error: ' + e.message);
    }
  },
  
  /**
   * Mark tutorial as completed
   * @param {string} tutorialName - Tutorial identifier
   */
  markTutorialComplete: function(tutorialName) {
    try {
      if (!SAT.UserGuidance.userState.completedTutorials.includes(tutorialName)) {
        SAT.UserGuidance.userState.completedTutorials.push(tutorialName);
      }
      
      var props = PropertiesService.getUserProperties();
      props.setProperty('SAT_TUTORIALS', JSON.stringify(SAT.UserGuidance.userState.completedTutorials));
      
      Logger.log('Tutorial completed: ' + tutorialName);
      
    } catch (e) {
      Logger.log('Mark tutorial error: ' + e.message);
    }
  },
  
  /**
   * Create quick-start guide card
   * @returns {string} HTML guide card
   */
  createQuickStartGuide: function() {
    var html = '<div style="padding: 20px; background: #E3F2FD; border-radius: 8px; font-family: Arial;">' +
      '<h2 style="margin-top: 0; color: #1976D2;">Quick Start Guide</h2>' +
      '<ol style="line-height: 1.8;">' +
      '<li><strong>Go to Production tab</strong></li>' +
      '<li><strong>Enter/Select Base</strong> - Production location</li>' +
      '<li><strong>Select Machine</strong> - Equipment type</li>' +
      '<li><strong>Enter Quantity</strong> - Units produced (defaults to 1)</li>' +
      '<li><strong>Fill IN/OUT</strong> - Input/output amounts</li>' +
      '<li><strong>Rates auto-calculate</strong> - Automatically computed!</li>' +
      '<li><strong>Mark TODO</strong> - Check when production starts</li>' +
      '<li><strong>View Overview</strong> - See live statistics</li>' +
      '</ol>' +
      '<p style="background: #FFF59D; padding: 10px; border-radius: 4px; margin-top: 15px;">' +
      '<strong>💡 Tip:</strong> Last entry auto-fills next time! Smart defaults save time.</p>' +
      '</div>';
    
    return html;
  },
  
  /**
   * Create keyboard shortcuts reference
   * @returns {string} HTML shortcuts card
   */
  createShortcutsReference: function() {
    var html = '<div style="padding: 20px; background: #F3E5F5; border-radius: 8px; font-family: monospace; font-size: 12px;">' +
      '<h3 style="margin-top: 0; color: #7B1FA2;">Keyboard Shortcuts</h3>' +
      '<table style="width: 100%; border-collapse: collapse;">' +
      '<tr style="background: #E1BEE7;"><th style="padding: 8px; text-align: left;">Keys</th><th style="padding: 8px; text-align: left;">Action</th></tr>' +
      '<tr><td style="padding: 8px;">Ctrl+Shift+N</td><td style="padding: 8px;">New row</td></tr>' +
      '<tr style="background: #F5F5F5;"><td style="padding: 8px;">Ctrl+F</td><td style="padding: 8px;">Search</td></tr>' +
      '<tr><td style="padding: 8px;">F5</td><td style="padding: 8px;">Quick recalculate</td></tr>' +
      '<tr style="background: #F5F5F5;"><td style="padding: 8px;">Ctrl+S</td><td style="padding: 8px;">Save & sync</td></tr>' +
      '<tr><td style="padding: 8px;">Ctrl+Z</td><td style="padding: 8px;">Undo last change</td></tr>' +
      '<tr style="background: #F5F5F5;"><td style="padding: 8px;">Ctrl+Y</td><td style="padding: 8px;">Redo</td></tr>' +
      '<tr><td style="padding: 8px;">F1</td><td style="padding: 8px;">Help</td></tr>' +
      '</table>' +
      '</div>';
    
    return html;
  },
  
  /**
   * Track user action for guidance
   * @param {string} action - Action performed
   * @param {string} context - Context (sheet, menu, etc)
   */
  trackAction: function(action, context) {
    try {
      var userProps = PropertiesService.getUserProperties();
      var allActions = userProps.getProperty('SAT_ACTIONS') || '[]';
      
      var actionList = JSON.parse(allActions);
      actionList.push({
        action: action,
        context: context,
        timestamp: new Date().toString()
      });
      
      // Keep only last 50 actions
      if (actionList.length > 50) {
        actionList = actionList.slice(-50);
      }
      
      userProps.setProperty('SAT_ACTIONS', JSON.stringify(actionList));
      
    } catch (e) {
      Logger.log('Action tracking error: ' + e.message);
    }
  },
  
  /**
   * Get user proficiency level based on actions
   * @returns {string} Proficiency level (BEGINNER, INTERMEDIATE, ADVANCED)
   */
  getProficiencyLevel: function() {
    try {
      var userProps = PropertiesService.getUserProperties();
      var allActions = userProps.getProperty('SAT_ACTIONS') || '[]';
      
      var actionList = JSON.parse(allActions);
      
      if (actionList.length < 10) return 'BEGINNER';
      if (actionList.length < 50) return 'INTERMEDIATE';
      return 'ADVANCED';
      
    } catch (e) {
      return 'BEGINNER';
    }
  }
};
