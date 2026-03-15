# GitHub Copilot Integration Guide

**Last Updated**: 22 février 2026  
**Version**: 2026.03  
**Status**: ✅ Production Ready  

---

## 🎯 Quick Start

**For best results with Copilot:**
1. Refer to **Code Patterns** section when generating code
2. Use **Copilot Prompts** examples as templates
3. Follow **Best Practices** to avoid common pitfalls
4. Check **Glossary** for terminology

---

## 📚 Part 1: Code Patterns Reference

### Module Template (All files follow this)

```javascript
var SAT = this.SAT || (this.SAT = {});

// ============================================================================
// SAT.ModuleName - Brief description
// ============================================================================

SAT.ModuleName = SAT.ModuleName || {
  
  // ======= PUBLIC METHODS =======
  
  /**
   * Description of what this does
   * @param {type} paramName - Description
   * @returns {type} Description of return
   * @throws {Error} When this happens
   */
  publicMethod: function(paramName) {
    try {
      var cfg = SAT._ensureAPI("CFG", "00_core_config");
      var log = SAT._ensureAPI("Log", "00_core_logging");
      
      // Your implementation here
      log.info("✓ publicMethod completed");
      return result;
    } catch (e) {
      SAT.Log.error("publicMethod failed: " + e.message);
      throw e;
    }
  },
  
  anotherPublicMethod: function() {
    // More methods
  },
  
  // ======= PRIVATE METHODS =======
  
  _privateHelper: function() {
    // Private implementation (starts with _)
  }
};

// Verify module loaded
Logger.log("✅ 15_filename.gs loaded");
```

### API Guard Pattern (ALWAYS use this!)

```javascript
// At start of any function accessing core APIs:
var cfg = SAT._ensureAPI("CFG", "00_core_config");
var log = SAT._ensureAPI("Log", "00_core_logging");
var sheets = SAT._ensureAPI("S", "02_core_sheets");

// Then use safely:
if (!cfg.PRODUCTION || !cfg.PRODUCTION.SHEET_NAME) {
  log.error("Production config missing");
  return null;
}
```

### Error Handling Pattern

```javascript
try {
  var data = SAT.SomeModule.getData();
  SAT.Log.info("✓ Data loaded: " + data.length + " rows");
  return data;
} catch (e) {
  SAT.Log.error("getData failed: " + e.message + " at " + e.fileName + ":" + e.lineNumber);
  // Send to error sheet
  SAT.Engine.recordError({
    source: "SAT.Module.method",
    error: e.message,
    stack: e.stack
  });
  throw e;
}
```

### Sheet Access Pattern

```javascript
// Get sheet safely
var sheet = SAT.S.must(SAT.CFG.PRODUCTION.SHEET_NAME, "Production");

// Read data from column
var data = sheet.getRange(
  SAT.CFG.DATA_START_ROW,  // Start row (usually 2, skipping header)
  SAT.CFG.DATA_START_COL,  // Start column
  sheet.getLastRow() - SAT.CFG.DATA_START_ROW + 1,  // Num rows
  SAT.CFG.DATA_END_COL - SAT.CFG.DATA_START_COL + 1 // Num cols
).getValues();

// Process each row
for (var i = 0; i < data.length; i++) {
  var row = data[i];
  // row[0] = first column, row[1] = second, etc.
}
```

### Configuration Pattern

```javascript
// In 00_core_config.gs, define centrally:
SAT.CFG = {
  PRODUCTION: {
    SHEET_NAME: "📈 Production",
    DATA_START_ROW: 2,
    HEADER_ROW: 1,
    COLUMNS: {
      NAME: 1,
      FLOOR: 2,
      RATE: 3
    }
  },
  ERRORS: {
    SHEET_NAME: "🔴 Errors",
    DATA_START_ROW: 2
  }
};

// Access from other files:
var prodSheetName = SAT.CFG.PRODUCTION.SHEET_NAME;
var errorSheetName = SAT.CFG.ERRORS.SHEET_NAME;
```

### Logging Pattern

```javascript
// Use these log levels:
SAT.Log.info("✓ Normal operation: " + message);
SAT.Log.warn("⚠ Warning: " + message);
SAT.Log.error("🔴 Error: " + message);
SAT.Log.debug("🔍 Debug info: " + message);

// They automatically handle:
// - Logging to Google Sheets
// - Console output with emojis
// - Timestamp and source tracking
// - Error/warning prioritization
```

### Trigger Pattern

```javascript
// onOpen() - Sheet opened
function onOpen(e) {
  try {
    SAT._verifyCriticalInit();  // First line!
    SAT._executeDeferredInit(); // Deferred tasks
    
    // Now safe to use everything
    SAT.UI.buildMenu();
    SAT.Etages.autoDetect();
  } catch (e) {
    Logger.log("🔴 onOpen failed: " + e.message);
  }
}

// onEdit(e) - Cell changed
function onEdit(e) {
  try {
    var range = e.range;
    var sheet = range.getSheet();
    var value = range.getValue();
    
    // Your edit handling here
  } catch (e) {
    Logger.log("🔴 onEdit failed: " + e.message);
  }
}
```

### Retry Pattern (NEW - v2026.03)

```javascript
// For operations that should retry on failure:
var retryResult = SAT_Resilience_Retry(
  function() {
    // Your operation here
    return doSomething();
  },
  3,      // maxRetries
  500,    // initialDelayMs
  "OperationName"  // for logging
);

if (retryResult.success) {
  SAT.Log.info("✓ Success after " + retryResult.attempts + " attempt(s)");
  return retryResult.result;
} else {
  SAT.Log.error("✗ Failed: " + retryResult.error);
  return null;
}

// Or use simple version:
var result = SAT_Resilience_RetrySimple(fn, "OperationName");
```

---

## 📂 Part 2: File Organization (5 Layers)

### Layer 0: Bootstrap (Guaranteed First)
```
00_bootstrap.gs         - SAT initialization guards
```

### Layer 1: Core APIs (Base Utilities)
```
00_core_config.gs       - SAT.CFG (all configuration, centralized)
00_core_logging.gs      - SAT.Log (logging system)
01_core_helpers.gs      - SAT.Utils (utility functions)
01_core_resilience.gs   - SAT.Resilience (recovery/retry logic)
01_core_utils.gs        - Additional utilities
02_core_sheets.gs       - SAT.S (sheet access wrapper)
```

### Layer 2: Business Logic (Core Features)
```
04_context_tracking.gs  - Documentation sheets
10_core_etages.gs       - SAT.Etages (floor management)
10_automation_handlers.gs - Automation handlers
10_data_repo.gs         - Data repository
11_automation_executor.gs - Automation executor
12_automation_scheduler.gs - Automation scheduler
```

### Layer 3: Features (UI & Ergonomics)
```
20_ui_design_system.gs  - Design system
21_ui_forms.gs          - Forms UI
22_ui_panels.gs         - Panel management
30_resilience_monitor.gs - Monitoring
30_ui_charts.gs         - Charts
31_resilience_health.gs - Health checks
32_resilience_recovery.gs - Recovery logic
40_ergonomic_adaptive.gs - Adaptive UI
41_ergonomic_accessibility.gs - Accessibility
42_ergonomic_guidance.gs - Guidance system
```

### Layer 4: Application (Entry Points & Installation)
```
50_app_recalc.gs        - Recalculation engine
51_app_initial_setup.gs - Initial setup
51_app_install.gs       - Installation
51_app_setup_stubs.gs   - Setup helpers
51_app_sheet_order.gs   - Sheet ordering
51_app_sheet_migration.gs - Sheet migration
52_app_triggers.gs      - Event triggers
53_app_menu.gs          - MAIN ENTRY POINT
30_ui_documentation.gs  - Documentation UI
30_ui_charts.gs         - Charts UI
```

**Load Order**: Files load alphabetically. Use naming to guarantee dependencies load correctly.

---

## 💡 Part 3: Critical APIs (Most Common)

### SAT.CFG - Configuration
```javascript
// Central configuration - all settings here
SAT.CFG = {
  PRODUCTION: { SHEET_NAME: "📈 Production", ... },
  ERRORS: { SHEET_NAME: "🔴 Errors", ... },
  // Add your config here
};

// Usage:
var prodSheet = SAT.CFG.PRODUCTION.SHEET_NAME;
var startRow = SAT.CFG.PRODUCTION.DATA_START_ROW;
```

### SAT.Log - Logging
```javascript
SAT.Log.info("✓ Operation succeeded");
SAT.Log.warn("⚠ Warning message");
SAT.Log.error("🔴 Error occurred");
SAT.Log.debug("🔍 Debug info");

// Automatically logs to:
// - Google Sheets (🔴 Errors sheet)
// - Console (Execution log)
```

### SAT.S - Sheet Access
```javascript
// Get sheet with error handling
var sheet = SAT.S.must(sheetName, "Display name");

// Get range
var range = sheet.getRange(row, col, numRows, numCols);
var values = range.getValues();

// Set values
range.setValues(newValues);

// must() throws error if sheet not found
```

### SAT.Etages - Floor Management
```javascript
// Get all floors
var floors = SAT.Etages.getAll();

// Get floor names
var names = SAT.Etages.getNames(); // ["Ground", "Floor 1", ...]

// Add floor
SAT.Etages.add("Floor 2", 2, "numeric");

// Check if numeric floor
var isNumeric = SAT.Etages.isNumeric("Ground"); // false
```

### SAT._ensureAPI - Safety Guard
```javascript
// Always use with core APIs
var cfg = SAT._ensureAPI("CFG", "00_core_config");

// If CFG not defined:
// - Throws error with helpful message
// - Shows which file should be loaded
// - Stops execution safely
```

---

## 🤖 Part 4: How to Use Copilot Effectively

### Context Setup

**Load this file as reference** when asking Copilot for help.

**Example good prompt:**
```
Using COPILOT_GUIDE.md code patterns for SAT ASSIST 2026:
In file 10_core_etages.gs, add method validateFloorName(name)
that checks if a floor exists and throws if not.
Use SAT._ensureAPI() pattern for guards and SAT.Log for errors.
```

### Code Generation Tasks

#### Generate New Module
```
Prompt: "Create a new SAT module in 15_feature_name.gs for [functionality]. 
Use the naming pattern from COPILOT_GUIDE.md. 
Include SAT._ensureAPI() guards and Logger.log() at end."

Copilot will:
- Create proper file header with SAT namespace
- Follow var SAT = this.SAT pattern
- Add error handling
- Include load logging
```

#### Generate New Function
```
Prompt: "Add function SAT_doSomething() in 50_app_recalc.gs.
Should use try-catch pattern from COPILOT_GUIDE.
Access SAT.CFG via _ensureAPI pattern.
Log using SAT.Log.* methods."

Copilot will:
- Generate proper error handling
- Use configuration correctly
- Follow logging conventions
```

#### Generate Sheet Operations
```
Prompt: "Create function to get all data from 📈 Production sheet
starting at DATA_ROW. Use SAT.S and SAT.CFG patterns.
Return array of rows with error handling."

Copilot will:
- Use SAT.S.must() for sheet access
- Reference SAT.CFG.PRODUCTION.* correctly
- Include bounds checking
- Handle errors properly
```

### Code Review Tasks

#### Ask Copilot to Review
```
Prompt: "Review this SAT.Etages.add() implementation.
Does it follow error handling patterns?
Does it use SAT.Log properly?
Does it reference SAT.CFG correctly?"

Copilot will check code against patterns.
```

#### Ask Copilot to Fix
```
Prompt: "This function crashes when SAT.Log is undefined.
Fix using SAT._ensureAPI pattern from COPILOT_GUIDE.
Add proper error messages."

Copilot will fix the issue and explain the fix.
```

### Copilot-Friendly Prompt Structure

```
[Reference this guide]
[What you want done]
[Patterns/constraints to follow]
[Desired outcome format]

EXAMPLE:
"Using COPILOT_GUIDE.md patterns for SAT ASSIST 2026:
Generate menu item handler SAT_myAction() in 53_app_menu.gs.
Must: Use try-catch, SAT.Log.*, SAT._ensureAPI().
Should return boolean (true=success).
Include error dialog showing failure reason."
```

### Common Workflows

#### Add New Feature
1. Ask: "Generate new module SAT.MyFeature in file 15_myfeature.gs"
2. Ask: "Add method getData() that accesses 📈 Production sheet"
3. Ask: "Add error handling and logging per COPILOT_GUIDE patterns"
4. Test: `SAT.MyFeature.getData()`

#### Fix Bugs
1. Describe: "When adding floor, get 'SAT.CFG undefined' error"
2. Ask: "Check if using _ensureAPI() pattern? Add if missing"
3. Ask: "Verify layer load order - is this in Layer 2+?"
4. Test: Run function from menu

#### Optimize Code
1. Ask: "Review SAT.FloorLayout.calculateDimensions() for efficiency"
2. Ask: "Suggest optimizations using SAT.CFG patterns"
3. Ask: "Generate improved version"

---

## ✅ Best Practices

### DO:
- ✅ Reference `COPILOT_GUIDE.md` explicitly in prompts
- ✅ Include file names in prompts
- ✅ Mention layer/structure (Layer 1, 2, etc.)
- ✅ Give specific examples
- ✅ Ask for patterns to follow
- ✅ Include error handling requirements
- ✅ Use SAT._ensureAPI() guards
- ✅ Use SAT.Log instead of console
- ✅ Test generated code before deploying

### DON'T:
- ❌ Vague requests ("make it work")
- ❌ No file context
- ❌ Skip mentioning patterns
- ❌ Ask for features without requirements
- ❌ Ignore error handling
- ❌ Use hardcoded sheet names (use SAT.CFG)
- ❌ Forget SAT._ensureAPI() guards
- ❌ Use Logger.log() directly (use SAT.Log)

---

## 🔧 Problem Diagnosis

### Problem: "SAT.CFG is undefined"

**Cause**: Accessing SAT.CFG in global scope or before Layer 1 loads

**Fix**:
```javascript
// ❌ WRONG - Global scope
var config = SAT.CFG;

// ✅ RIGHT - Inside function, with guard
function myFunction() {
  var cfg = SAT._ensureAPI("CFG", "00_core_config");
  var value = cfg.SOME_SETTING;
}
```

### Problem: "SAT.Log is not defined"

**Cause**: Not using _ensureAPI guard

**Fix**:
```javascript
// ❌ WRONG
Logger.log(SAT.Log.info("test"));

// ✅ RIGHT
function myFunction() {
  var log = SAT._ensureAPI("Log", "00_core_logging");
  log.info("test");
}
```

### Problem: Code works once then crashes

**Cause**: Sheet renamed or deleted

**Fix**:
```javascript
// Use SAT.CFG instead of hardcoding sheet names
var sheet = SAT.S.must(SAT.CFG.PRODUCTION.SHEET_NAME, "Production");

// If sheet doesn't exist:
// - SAT.S.must() throws helpful error
// - Error is logged
// - You can handle it in catch block
```

### Problem: Copilot generated code breaks patterns

**Solution**: Reference `COPILOT_GUIDE.md` and ask Copilot:
```
This code violates COPILOT_GUIDE patterns. Fix:
- Add SAT._ensureAPI guards
- Use SAT.Log not console
- Use SAT.CFG for config
- Add proper error handling
```

---

## 📚 Common Tasks - Step by Step

### Task: Add New Configuration

**Step 1**: Edit `00_core_config.gs`
```javascript
SAT.CFG = {
  // ... existing config
  MY_NEW_SETTING: {
    ENABLED: true,
    VALUE: 100
  }
};
```

**Step 2**: Reference in your module
```javascript
var enabled = SAT.CFG.MY_NEW_SETTING.ENABLED;
```

### Task: Create New Feature Module

**Step 1**: Choose layer
- Layer 1: Core utility → `03_core_*.gs`
- Layer 2: Feature → `10_feature_*.gs`
- Layer 3: UI → `30_ui_*.gs`

**Step 2**: Create file `15_feature_myfeature.gs`
```javascript
var SAT = this.SAT || (this.SAT = {});

SAT.MyFeature = SAT.MyFeature || {
  doSomething: function() {
    var cfg = SAT._ensureAPI("CFG", "00_core_config");
    // Implementation
  }
};

Logger.log("✅ 15_feature_myfeature.gs loaded");
```

**Step 3**: Reference from other code
```javascript
SAT.MyFeature.doSomething();
```

### Task: Access Production Data

**Step 1**: Ensure you're in a function (not global)
```javascript
function processProduction() {
  var cfg = SAT._ensureAPI("CFG", "00_core_config");
  var sheet = SAT.S.must(cfg.PRODUCTION.SHEET_NAME, "Production");
  
  var data = sheet.getRange(
    cfg.PRODUCTION.DATA_START_ROW,
    1,
    sheet.getLastRow() - cfg.PRODUCTION.DATA_START_ROW + 1,
    sheet.getLastColumn()
  ).getValues();
  
  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    // Process row
  }
}
```

### Task: Handle Error Safely

**When to use try-catch**:
- Accessing sheets
- Calling other SAT modules
- Processing arrays (bounds errors)
- API calls (network issues)

**Template**:
```javascript
try {
  var result = SAT.SomeModule.doSomething();
  SAT.Log.info("✓ Success: " + result);
  return result;
} catch (e) {
  SAT.Log.error("Failed: " + e.message);
  // Optional: Log to error sheet
  return null;
}
```

### Task: Implement Retry Logic

**Use SAT_Resilience_Retry for transient failures:**
```javascript
function unreliableOperation() {
  return SAT_Resilience_Retry(
    function() {
      // Operation that might fail temporarily
      return callExternalAPI();
    },
    3,      // Max retries
    500,    // Initial delay (ms)
    "External API call"  // Operation name
  );
}
```

---

## 📖 Testing Code

### Quick Test in Console

```javascript
// Test in Apps Script Editor Console:

// Check module exists
Logger.log(typeof SAT.MyModule !== 'undefined' ? "✓ Loaded" : "✗ Not loaded");

// Test method
try {
  var result = SAT.MyModule.myMethod("test");
  Logger.log("✓ Result: " + JSON.stringify(result));
} catch (e) {
  Logger.log("✗ Error: " + e.message);
}

// Check config
Logger.log("Config: " + JSON.stringify(SAT.CFG, null, 2));
```

### Run Code Manually

```javascript
// Simulate onOpen
function testOnOpen() {
  onOpen();
  Logger.log("✓ onOpen() completed without errors");
}

// Then press "Run" button in Apps Script editor
```

---

## 📝 Glossary

| Term | Meaning |
|------|---------|
| **SAT** | Namespace for all project code |
| **Layer 0** | Bootstrap - initialization guards |
| **Layer 1** | Core APIs - config, logging, sheets |
| **Layer 2** | Business logic - features, engines |
| **Layer 3-4** | Features - UI, forms, resilience |
| **Layer 5** | Application - menu, triggers, setup |
| **_ensureAPI** | Guard function - ensures API loaded |
| **CFG** | Central configuration object |
| **Log** | Logging system with levels |
| **S** | Sheet access wrapper |
| **Etages** | Floor management system |
| **Emoji prefix** | ✓ ✅ ⚠ 🔴 🔍 - log level indicator |
| **Retry Pattern** | Exponential backoff with jitter (NEW v2026.03) |

---

## 🚀 Next Steps

1. **Reference COPILOT_GUIDE.md** in Copilot prompts
2. **Use code patterns** from Part 1 as templates
3. **Check file organization** (Part 2) before creating files
4. **Always use guards** with SAT._ensureAPI()
5. **Test in console** before deploying
6. **Log everything** using SAT.Log.*
7. **Use retry pattern** for operations that might fail transiently

---

**Remember**: Files load alphabetically. Start of filename determines execution order. Use naming to guarantee dependencies load in correct sequence.

**Updated in v2026.03**: Consolidated Copilot documentation, added Retry Pattern (SAT_Resilience_Retry), improved menu system with context detection.
