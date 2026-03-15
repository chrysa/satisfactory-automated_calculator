/**
 * 12_automation_scheduler.gs - Time-based and Event-driven Task Scheduler
 * 
 * Manages scheduled tasks, recurring checks, and delayed execution.
 * Part of Layer 1: Automation Pillar (96% automation target)
 * 
 * Dependencies: SAT.CFG, SAT.Executor, SAT.Monitor
 */

var SAT = this.SAT || (this.SAT = {});

/**
 * SAT.Scheduler - Event and time-based task scheduling
 * Manages recurring checks, health monitoring, and delayed tasks
 */
SAT.Scheduler = {
  
  tasks: {},
  intervals: {
    QUICK: 60000,        // 1 minute
    NORMAL: 300000,      // 5 minutes
    HOURLY: 3600000,     // 1 hour
    DAILY: 86400000      // 24 hours
  },
  
  /**
   * Schedule a task to run at regular intervals
   * @param {string} taskName - Unique task identifier
   * @param {function} callback - Function to execute
   * @param {string} interval - Interval type (QUICK, NORMAL, HOURLY, DAILY)
   * @param {boolean} immediate - Run immediately before scheduling
   */
  scheduleTask: function(taskName, callback, interval, immediate) {
    if (!callback || typeof callback !== 'function') {
      throw new Error('Invalid callback for task: ' + taskName);
    }
    
    var intervalMs = SAT.Scheduler.intervals[interval] || SAT.Scheduler.intervals.NORMAL;
    
    // Store task
    SAT.Scheduler.tasks[taskName] = {
      callback: callback,
      interval: intervalMs,
      lastRun: immediate ? 0 : new Date().getTime(),
      runCount: 0,
      errors: 0
    };
    
    // Run immediately if requested
    if (immediate) {
      SAT.Scheduler.executeTask(taskName);
    }
  },
  
  /**
   * Execute a scheduled task
   * @param {string} taskName - Task to execute
   */
  executeTask: function(taskName) {
    var task = SAT.Scheduler.tasks[taskName];
    if (!task) return;
    
    var now = new Date().getTime();
    var timeSinceLastRun = now - task.lastRun;
    
    // Check if enough time has passed
    if (timeSinceLastRun < task.interval) {
      return;
    }
    
    try {
      var startTime = new Date().getTime();
      
      // Execute the task
      task.callback();
      
      // Record execution
      var duration = new Date().getTime() - startTime;
      task.lastRun = now;
      task.runCount += 1;
      
      if (typeof SAT.Monitor !== 'undefined') {
        SAT.Monitor.recordExecution('Scheduled: ' + taskName, duration);
      }
      
    } catch (e) {
      // Log error
      task.errors += 1;
      
      if (typeof SAT.Monitor !== 'undefined') {
        SAT.Monitor.recordError('Task failed: ' + taskName, 'error', {
          task: taskName,
          error: e.message,
          occurredAt: new Date()
        });
      }
      
      // Stop task if too many errors
      if (task.errors > 5) {
        delete SAT.Scheduler.tasks[taskName];
        Logger.log('Task disabled due to repeated errors: ' + taskName);
      }
    }
  },
  
  /**
   * Execute all due tasks
   * Call periodically from time-based trigger
   */
  executeAllDueTasks: function() {
    var taskNames = Object.keys(SAT.Scheduler.tasks);
    
    for (var i = 0; i < taskNames.length; i++) {
      try {
        SAT.Scheduler.executeTask(taskNames[i]);
      } catch (e) {
        Logger.log('Error executing task: ' + taskNames[i] + ' - ' + e.message);
      }
    }
  },
  
  /**
   * Cancel a scheduled task
   * @param {string} taskName - Task to cancel
   */
  cancelTask: function(taskName) {
    if (SAT.Scheduler.tasks[taskName]) {
      delete SAT.Scheduler.tasks[taskName];
      Logger.log('Task cancelled: ' + taskName);
    }
  },
  
  /**
   * Get task status
   * @param {string} taskName - Task to check
   * @returns {object} Task status
   */
  getTaskStatus: function(taskName) {
    var task = SAT.Scheduler.tasks[taskName];
    if (!task) return null;
    
    return {
      name: taskName,
      runCount: task.runCount,
      errors: task.errors,
      lastRun: new Date(task.lastRun),
      nextRun: new Date(task.lastRun + task.interval),
      status: task.errors > 5 ? 'DISABLED' : 'RUNNING'
    };
  },
  
  /**
   * Initialize default scheduled tasks
   * Call from SAT.AutoHandlers.initOnOpen()
   */
  initDefaultTasks: function() {
    // Health check every 5 minutes
    SAT.Scheduler.scheduleTask(
      'healthCheck',
      function() {
        if (typeof SAT.HealthCheck !== 'undefined') {
          SAT.HealthCheck.quick();
        }
      },
      'NORMAL',
      false
    );
    
    // Recalculation check every 1 minute
    SAT.Scheduler.scheduleTask(
      'autoRecalc',
      function() {
        if (typeof SAT.Executor !== 'undefined') {
          SAT.Executor.queue('recalcAll', {});
          SAT.Executor.processQueue();
        }
      },
      'QUICK',
      false
    );
    
    // Full validation every 1 hour
    SAT.Scheduler.scheduleTask(
      'fullValidation',
      function() {
        if (typeof SAT.Validator !== 'undefined') {
          SAT.Validator.validate({}, {});
        }
      },
      'HOURLY',
      false
    );
    
    Logger.log('Default scheduled tasks initialized');
  },
  
  /**
   * Stop all scheduled tasks
   */
  stopAll: function() {
    var taskNames = Object.keys(SAT.Scheduler.tasks);
    for (var i = 0; i < taskNames.length; i++) {
      SAT.Scheduler.cancelTask(taskNames[i]);
    }
    Logger.log('All scheduled tasks stopped');
  },
  
  /**
   * Get all tasks status
   * @returns {array} Array of task statuses
   */
  getAllTasksStatus: function() {
    var taskNames = Object.keys(SAT.Scheduler.tasks);
    var statuses = [];
    
    for (var i = 0; i < taskNames.length; i++) {
      statuses.push(SAT.Scheduler.getTaskStatus(taskNames[i]));
    }
    
    return statuses;
  }
};

/**
 * Time-based trigger handler - Call from Apps Script trigger
 * Set up trigger: Edit menu → Current project's triggers → 
 * Add trigger for 'SAT_SCHEDULED_TRIGGER' with time-based handler
 */
function SAT_SCHEDULED_TRIGGER() {
  try {
    if (typeof SAT.Scheduler !== 'undefined') {
      SAT.Scheduler.executeAllDueTasks();
    }
  } catch (e) {
    Logger.log('Scheduler trigger error: ' + e.message);
  }
}
