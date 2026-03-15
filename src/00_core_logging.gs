/**
 * 00_core_logging.gs - Centralized Logging & Output Formatting
 * 
 * Shared logging functions for consistent output across all modules
 * Reduces code duplication for log boxes, headers, separators
 */

var SAT = this.SAT || (this.SAT = {});

/**
 * SAT.Log - Centralized logging utilities
 */
SAT.Log = {
  
  /**
   * Print a section header/box  
   * @param {string} title - Header title
   * @param {string} emoji - Optional emoji prefix
   */
  header: function(title, emoji) {
    emoji = emoji || "📋";
    Logger.log("\n╔════════════════════════════════════════════════════════╗");
    Logger.log("║          " + emoji + " " + _padCenter(title, 48) + "║");
    Logger.log("╚════════════════════════════════════════════════════════╝\n");
  },
  
  /**
   * Print a subsection header
   * @param {string} title - Subsection title
   * @param {string} emoji - Optional emoji prefix
   */
  subheader: function(title, emoji) {
    emoji = emoji || "›";
    Logger.log("\n" + emoji + " " + title);
    Logger.log("─".repeat(60));
  },
  
  /**
   * Print a divider line
   */
  divider: function() {
    Logger.log("═".repeat(60));
  },
  
  /**
   * Print success message
   * @param {string} message - Success message
   * @param {boolean} newlines - Add newlines before/after
   */
  success: function(message, newlines) {
    if (newlines === undefined) newlines = false;
    if (newlines) Logger.log("");
    Logger.log("  ✅ " + message);
    if (newlines) Logger.log("");
  },
  
  /**
   * Print error message
   * @param {string} message - Error message
   * @param {boolean} newlines - Add newlines before/after
   */
  error: function(message, newlines) {
    if (newlines === undefined) newlines = false;
    if (newlines) Logger.log("");
    Logger.log("  ❌ " + message);
    if (newlines) Logger.log("");
  },
  
  /**
   * Print warning message
   * @param {string} message - Warning message
   * @param {boolean} newlines - Add newlines before/after
   */
  warning: function(message, newlines) {
    if (newlines === undefined) newlines = false;
    if (newlines) Logger.log("");
    Logger.log("  ⚠️ " + message);
    if (newlines) Logger.log("");
  },
  
  /**
   * Print info message
   * @param {string} message - Info message
   */
  info: function(message) {
    Logger.log("  ℹ️ " + message);
  },
  
  /**
   * Print bullet point
   * @param {string} message - Bullet message
   * @param {string} indent - Indentation level (default 1)
   */
  bullet: function(message, indent) {
    indent = indent || 1;
    var spaces = "  ".repeat(indent);
    Logger.log(spaces + "• " + message);
  },
  
  /**
   * Print progress bar
   * @param {number} current - Current step
   * @param {number} total - Total steps
   * @param {string} message - Progress message
   */
  progress: function(current, total, message) {
    var percent = Math.round((current / total) * 100);
    var filledBars = Math.round(percent / 5);
    var emptyBars = 20 - filledBars;
    var bar = "[" + "█".repeat(filledBars) + "░".repeat(emptyBars) + "]";
    Logger.log("  ⏳ " + bar + " " + percent + "% - " + message);
  },
  
  /**
   * Print table row
   * @param {Array<string>} columns - Column values
   * @param {Array<number>} widths - Column widths (optional)
   */
  row: function(columns, widths) {
    var row = "  ";
    for (var i = 0; i < columns.length; i++) {
      var width = widths && widths[i] ? widths[i] : 20;
      row += _padRight(String(columns[i]), width) + " │ ";
    }
    Logger.log(row);
  },
  
  /**
   * Print key-value pair
   * @param {string} key - Key name
   * @param {*} value - Value
   * @param {string} icon - Optional icon prefix
   */
  pair: function(key, value, icon) {
    icon = icon || "•";
    Logger.log("  " + icon + " " + _padRight(key + ":", 25) + value);
  },
  
  /**
   * Print summary box
   * @param {object} data - Key-value pairs to display
   */
  summary: function(data) {
    SAT.Log.subheader("SUMMARY", "📊");
    for (var key in data) {
      if (data.hasOwnProperty(key)) {
        SAT.Log.pair(key, data[key]);
      }
    }
  },
  
  /**
   * Print completion status
   * @param {number} count - Count of completed items
   */
  complete: function(count) {
    Logger.log("\n🎉 Complete! (" + count + " item" + (count === 1 ? "" : "s") + ")");
  }
};

/**
 * Helper: Pad string to center within width
 */
function _padCenter(str, width) {
  if (str.length >= width) return str.substring(0, width);
  var left = Math.floor((width - str.length) / 2);
  var right = width - str.length - left;
  return " ".repeat(left) + str + " ".repeat(right);
}

/**
 * Helper: Pad string to right within width
 */
function _padRight(str, width) {
  if (str.length >= width) return str.substring(0, width);
  return str + " ".repeat(width - str.length);
}

/**
 * Helper: Pad string to left within width
 */
function _padLeft(str, width) {
  if (str.length >= width) return str.substring(0, width);
  return " ".repeat(width - str.length) + str;
}
