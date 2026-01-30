/**
 * Simulation & POR Version Management Module
 *
 * Handles:
 * - Simulation CRUD operations
 * - POR (Plan of Record) version management
 * - Version comparison and promotion
 *
 * Author: Claude Code
 * Created: 2026-01-29
 * Version: 1.0
 */

const SimulationManager = (function() {
  'use strict';

  // ==================== Constants ====================
  const STORAGE_KEYS = {
    SIMULATIONS: 'productionPlan_simulations',
    CURRENT_POR: 'productionPlan_currentPOR',
    POR_HISTORY: 'productionPlan_porHistory'
  };

  const VERSION_TYPES = {
    SIMULATION: 'SIMULATION',
    POR: 'POR'
  };

  // ==================== Data Access ====================

  /**
   * Get all simulations from localStorage
   * @returns {Array} Array of simulation objects
   */
  function getSimulations() {
    const data = localStorage.getItem(STORAGE_KEYS.SIMULATIONS);
    return data ? JSON.parse(data) : [];
  }

  /**
   * Get simulation by ID
   * @param {string} id - Simulation ID
   * @returns {Object|null} Simulation object or null
   */
  function getSimulationById(id) {
    const simulations = getSimulations();
    return simulations.find(s => s.id === id) || null;
  }

  /**
   * Save simulations to localStorage
   * @param {Array} simulations - Array of simulation objects
   */
  function saveSimulationsToStorage(simulations) {
    localStorage.setItem(STORAGE_KEYS.SIMULATIONS, JSON.stringify(simulations));
  }

  /**
   * Get current POR
   * @returns {Object|null} Current POR object or null
   */
  function getCurrentPOR() {
    const data = localStorage.getItem(STORAGE_KEYS.CURRENT_POR);
    return data ? JSON.parse(data) : null;
  }

  /**
   * Save current POR to localStorage
   * @param {Object} por - POR object
   */
  function saveCurrentPOR(por) {
    localStorage.setItem(STORAGE_KEYS.CURRENT_POR, JSON.stringify(por));
  }

  /**
   * Get POR history
   * @returns {Array} Array of historical POR objects
   */
  function getPORHistory() {
    const data = localStorage.getItem(STORAGE_KEYS.POR_HISTORY);
    return data ? JSON.parse(data) : [];
  }

  /**
   * Save POR history to localStorage
   * @param {Array} history - Array of POR objects
   */
  function savePORHistory(history) {
    localStorage.setItem(STORAGE_KEYS.POR_HISTORY, JSON.stringify(history));
  }

  // ==================== Simulation Operations ====================

  /**
   * Create and save a new simulation
   * @param {Object} params - Simulation parameters
   * @param {string} params.name - Simulation name
   * @param {string} params.description - Description (optional)
   * @param {Array} params.tags - Tags (optional)
   * @param {Object} params.config - Configuration object
   * @param {Object} params.results - Results object
   * @returns {string} New simulation ID
   */
  function createSimulation({ name, description = '', tags = [], config, results }) {
    const simulation = {
      id: 'sim_' + Date.now(),
      type: VERSION_TYPES.SIMULATION,
      name,
      description,
      tags,
      config,
      results,
      createdAt: new Date().toISOString(),
      createdBy: 'current_user' // TODO: Replace with actual user
    };

    const simulations = getSimulations();
    simulations.push(simulation);
    saveSimulationsToStorage(simulations);

    console.log('[SimulationManager] Simulation created:', simulation.id);
    return simulation.id;
  }

  /**
   * Update an existing simulation
   * @param {string} id - Simulation ID
   * @param {Object} updates - Fields to update
   * @returns {boolean} Success status
   */
  function updateSimulation(id, updates) {
    const simulations = getSimulations();
    const index = simulations.findIndex(s => s.id === id);

    if (index === -1) {
      console.error('[SimulationManager] Simulation not found:', id);
      return false;
    }

    simulations[index] = {
      ...simulations[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    saveSimulationsToStorage(simulations);
    console.log('[SimulationManager] Simulation updated:', id);
    return true;
  }

  /**
   * Delete a simulation
   * @param {string} id - Simulation ID
   * @returns {boolean} Success status
   */
  function deleteSimulation(id) {
    const simulations = getSimulations();
    const filtered = simulations.filter(s => s.id !== id);

    if (filtered.length === simulations.length) {
      console.error('[SimulationManager] Simulation not found:', id);
      return false;
    }

    saveSimulationsToStorage(filtered);
    console.log('[SimulationManager] Simulation deleted:', id);
    return true;
  }

  /**
   * Search and filter simulations
   * @param {Object} filters - Filter criteria
   * @param {string} filters.searchTerm - Search in name/description
   * @param {string} filters.mode - Filter by planning mode
   * @param {Array} filters.tags - Filter by tags
   * @returns {Array} Filtered simulations
   */
  function searchSimulations({ searchTerm = '', mode = null, tags = [] } = {}) {
    let simulations = getSimulations();

    // Search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      simulations = simulations.filter(s =>
        s.name.toLowerCase().includes(term) ||
        s.description.toLowerCase().includes(term)
      );
    }

    // Mode filter
    if (mode) {
      simulations = simulations.filter(s => s.config.mode === mode);
    }

    // Tags filter
    if (tags.length > 0) {
      simulations = simulations.filter(s =>
        tags.some(tag => s.tags.includes(tag))
      );
    }

    return simulations;
  }

  // ==================== POR Operations ====================

  /**
   * Calculate next POR version number
   * @param {Object} currentPOR - Current POR object
   * @param {Object} newConfig - New configuration
   * @returns {string} Next version number
   */
  function calculateNextVersion(currentPOR, newConfig) {
    if (!currentPOR) {
      return 'v1.0';
    }

    const currentVersion = currentPOR.version;
    const [, major, minor] = currentVersion.match(/v(\d+)\.(\d+)/) || ['', '0', '0'];

    // Check if major change
    const isMajorChange = (
      currentPOR.config.mode !== newConfig.mode ||
      JSON.stringify(currentPOR.config.sites) !== JSON.stringify(newConfig.sites) ||
      Math.abs(
        new Date(currentPOR.config.dateRange.end) - new Date(newConfig.dateRange.end)
      ) > 7 * 24 * 60 * 60 * 1000 // > 7 days
    );

    if (isMajorChange) {
      return `v${parseInt(major) + 1}.0`;
    } else {
      return `v${major}.${parseInt(minor) + 1}`;
    }
  }

  /**
   * Archive current POR to history
   * @param {Object} por - POR object to archive
   */
  function archivePOR(por) {
    const history = getPORHistory();
    history.unshift(por); // Add to beginning

    // Keep only last 20 versions
    if (history.length > 20) {
      history.splice(20);
    }

    savePORHistory(history);
    console.log('[SimulationManager] POR archived:', por.version);
  }

  /**
   * Compare two configurations
   * @param {Object} configA - First configuration
   * @param {Object} configB - Second configuration
   * @returns {Array} Array of change objects
   */
  function compareConfigs(configA, configB) {
    const changes = [];

    // Mode
    if (configA.mode !== configB.mode) {
      changes.push({
        parameter: 'Mode',
        oldValue: configA.mode,
        newValue: configB.mode,
        type: 'changed'
      });
    }

    // Sites
    const sitesA = JSON.stringify(configA.sites);
    const sitesB = JSON.stringify(configB.sites);
    if (sitesA !== sitesB) {
      changes.push({
        parameter: 'Sites',
        oldValue: configA.sites.join(', '),
        newValue: configB.sites.join(', '),
        type: 'changed'
      });
    }

    // Date Range
    if (configA.dateRange.start !== configB.dateRange.start ||
        configA.dateRange.end !== configB.dateRange.end) {
      changes.push({
        parameter: 'Date Range',
        oldValue: `${configA.dateRange.start} to ${configA.dateRange.end}`,
        newValue: `${configB.dateRange.start} to ${configB.dateRange.end}`,
        type: 'changed'
      });
    }

    // Ramp Curve
    if (configA.rampCurve !== configB.rampCurve) {
      changes.push({
        parameter: 'Ramp Curve',
        oldValue: configA.rampCurve,
        newValue: configB.rampCurve,
        type: 'changed'
      });
    }

    // OT Settings
    if (configA.otEnabled !== configB.otEnabled) {
      changes.push({
        parameter: 'Sunday OT',
        oldValue: configA.otEnabled ? 'Enabled' : 'Disabled',
        newValue: configB.otEnabled ? 'Enabled' : 'Disabled',
        type: 'changed'
      });
    }

    return changes;
  }

  /**
   * Compare two result summaries
   * @param {Object} summaryA - First summary
   * @param {Object} summaryB - Second summary
   * @returns {Array} Array of metric change objects
   */
  function compareSummaries(summaryA, summaryB) {
    const metrics = [];

    // Total Output
    const outputDelta = summaryB.totalOutput - summaryA.totalOutput;
    const outputPct = (outputDelta / summaryA.totalOutput) * 100;
    metrics.push({
      metric: 'Total Output',
      oldValue: summaryA.totalOutput,
      newValue: summaryB.totalOutput,
      delta: outputDelta,
      deltaPercent: outputPct
    });

    // Total Shipment
    const shipmentDelta = summaryB.totalShipment - summaryA.totalShipment;
    const shipmentPct = (shipmentDelta / summaryA.totalShipment) * 100;
    metrics.push({
      metric: 'Total Shipment',
      oldValue: summaryA.totalShipment,
      newValue: summaryB.totalShipment,
      delta: shipmentDelta,
      deltaPercent: shipmentPct
    });

    // Overall Attainment
    const attainmentDelta = summaryB.overallAttainment - summaryA.overallAttainment;
    metrics.push({
      metric: 'Overall Attainment',
      oldValue: summaryA.overallAttainment,
      newValue: summaryB.overallAttainment,
      delta: attainmentDelta,
      deltaPercent: null // Already a percentage
    });

    // Weeks with Gap
    const gapDelta = summaryB.weeksWithGap.length - summaryA.weeksWithGap.length;
    metrics.push({
      metric: 'Weeks with Gap < 0',
      oldValue: summaryA.weeksWithGap.length,
      newValue: summaryB.weeksWithGap.length,
      delta: gapDelta,
      deltaPercent: null
    });

    return metrics;
  }

  /**
   * Compare weekly metrics between two plans
   * @param {Array} metricsA - First plan weekly metrics
   * @param {Array} metricsB - Second plan weekly metrics
   * @returns {Array} Week-by-week comparison
   */
  function compareWeeklyMetrics(metricsA, metricsB) {
    const comparison = [];

    metricsA.forEach(weekA => {
      const weekB = metricsB.find(w => w.week_id === weekA.week_id);
      if (weekB) {
        comparison.push({
          week: weekA.week_id,
          gapA: weekA.gap,
          gapB: weekB.gap,
          gapDelta: weekB.gap - weekA.gap,
          attainmentA: weekA.attainment,
          attainmentB: weekB.attainment
        });
      }
    });

    return comparison;
  }

  /**
   * Promote simulation to POR
   * @param {string} simulationId - Simulation ID to promote
   * @param {string} notes - Optional notes for the promotion
   * @returns {Object|null} New POR object or null on error
   */
  function promoteSimulationToPOR(simulationId, notes = '') {
    const simulation = getSimulationById(simulationId);
    if (!simulation) {
      console.error('[SimulationManager] Simulation not found:', simulationId);
      return null;
    }

    // Archive current POR
    const currentPOR = getCurrentPOR();
    if (currentPOR) {
      archivePOR(currentPOR);
    }

    // Calculate new version
    const newVersion = calculateNextVersion(currentPOR, simulation.config);

    // Create new POR
    const newPOR = {
      id: 'POR_' + newVersion.replace(/\./g, '_'),
      version: newVersion,
      type: VERSION_TYPES.POR,
      promotedFrom: simulationId,
      name: simulation.name,
      description: simulation.description,
      config: simulation.config,
      results: simulation.results,
      createdAt: new Date().toISOString(),
      createdBy: simulation.createdBy,
      notes,
      changesFromPrevious: currentPOR ? {
        configChanges: compareConfigs(currentPOR.config, simulation.config),
        summaryChanges: compareSummaries(currentPOR.results.summary, simulation.results.summary),
        weeklyComparison: compareWeeklyMetrics(
          currentPOR.results.weeklyMetrics,
          simulation.results.weeklyMetrics
        )
      } : null
    };

    saveCurrentPOR(newPOR);
    console.log('[SimulationManager] Simulation promoted to POR:', newVersion);

    return newPOR;
  }

  /**
   * Get POR by version
   * @param {string} version - POR version (e.g., 'v2.3')
   * @returns {Object|null} POR object or null
   */
  function getPORByVersion(version) {
    // Check current POR
    const currentPOR = getCurrentPOR();
    if (currentPOR && currentPOR.version === version) {
      return currentPOR;
    }

    // Check history
    const history = getPORHistory();
    return history.find(p => p.version === version) || null;
  }

  // ==================== Comparison Operations ====================

  /**
   * Compare multiple simulations
   * @param {Array} simulationIds - Array of simulation IDs
   * @returns {Object} Comparison result
   */
  function compareSimulations(simulationIds) {
    const simulations = simulationIds.map(id => getSimulationById(id)).filter(Boolean);

    if (simulations.length < 2) {
      console.error('[SimulationManager] Need at least 2 simulations to compare');
      return null;
    }

    return {
      simulations: simulations.map(s => ({
        id: s.id,
        name: s.name,
        config: s.config,
        summary: s.results.summary
      })),
      weeklyComparison: generateWeeklyComparisonTable(simulations)
    };
  }

  /**
   * Generate weekly comparison table for multiple simulations
   * @param {Array} simulations - Array of simulation objects
   * @returns {Array} Weekly comparison data
   */
  function generateWeeklyComparisonTable(simulations) {
    const weeks = new Set();
    simulations.forEach(sim => {
      sim.results.weeklyMetrics.forEach(week => weeks.add(week.week_id));
    });

    const comparison = [];
    Array.from(weeks).sort().forEach(weekId => {
      const weekData = { week: weekId };
      simulations.forEach((sim, idx) => {
        const weekMetric = sim.results.weeklyMetrics.find(w => w.week_id === weekId);
        weekData[`sim${idx}_gap`] = weekMetric ? weekMetric.gap : null;
        weekData[`sim${idx}_attainment`] = weekMetric ? weekMetric.attainment : null;
      });
      comparison.push(weekData);
    });

    return comparison;
  }

  // ==================== Utility Functions ====================

  /**
   * Clean up old simulations (keep only recent 20)
   */
  function cleanupOldSimulations() {
    const simulations = getSimulations();
    if (simulations.length <= 20) return;

    // Sort by creation date, keep most recent 20
    const sorted = simulations.sort((a, b) =>
      new Date(b.createdAt) - new Date(a.createdAt)
    );

    const toKeep = sorted.slice(0, 20);
    saveSimulationsToStorage(toKeep);

    console.log('[SimulationManager] Cleaned up old simulations, kept', toKeep.length);
  }

  /**
   * Clean up old production plan data from localStorage
   * Keeps only recent 10 plans and deletes plans older than 7 days
   */
  function cleanupOldPlans() {
    const keys = Object.keys(localStorage)
      .filter(k => k.startsWith('productionPlan_') && k !== 'productionPlan_simulations' && k !== 'productionPlan_currentPOR' && k !== 'productionPlan_porHistory')
      .map(k => {
        try {
          const data = JSON.parse(localStorage.getItem(k));
          const createdAt = data.generatedAt || data.createdAt || new Date(0).toISOString();
          return { key: k, createdAt: new Date(createdAt) };
        } catch {
          return { key: k, createdAt: new Date(0) };
        }
      })
      .sort((a, b) => b.createdAt - a.createdAt);

    // Keep only recent 10
    if (keys.length > 10) {
      keys.slice(10).forEach(({ key }) => {
        localStorage.removeItem(key);
        console.log('[SimulationManager] Removed old plan:', key);
      });
    }

    // Also remove plans older than 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    keys.forEach(({ key, createdAt }) => {
      if (createdAt < sevenDaysAgo) {
        localStorage.removeItem(key);
        console.log('[SimulationManager] Removed expired plan:', key);
      }
    });

    console.log('[SimulationManager] Cleanup complete. Kept', Math.min(keys.length, 10), 'recent plans');
  }

  /**
   * Auto-run cleanup on module load
   */
  (function autoCleanup() {
    try {
      cleanupOldSimulations();
      cleanupOldPlans();
    } catch (error) {
      console.error('[SimulationManager] Auto cleanup failed:', error);
    }
  })();

  /**
   * Export all data (for backup)
   * @returns {Object} All data
   */
  function exportAllData() {
    return {
      simulations: getSimulations(),
      currentPOR: getCurrentPOR(),
      porHistory: getPORHistory(),
      exportedAt: new Date().toISOString()
    };
  }

  /**
   * Import data (for restore)
   * @param {Object} data - Data to import
   * @returns {boolean} Success status
   */
  function importAllData(data) {
    try {
      if (data.simulations) {
        saveSimulationsToStorage(data.simulations);
      }
      if (data.currentPOR) {
        saveCurrentPOR(data.currentPOR);
      }
      if (data.porHistory) {
        savePORHistory(data.porHistory);
      }
      console.log('[SimulationManager] Data imported successfully');
      return true;
    } catch (error) {
      console.error('[SimulationManager] Import failed:', error);
      return false;
    }
  }

  // ==================== Public API ====================

  return {
    // Simulation operations
    createSimulation,
    getSimulations,
    getSimulationById,
    updateSimulation,
    deleteSimulation,
    searchSimulations,

    // POR operations
    getCurrentPOR,
    getPORHistory,
    getPORByVersion,
    promoteSimulationToPOR,

    // Comparison
    compareSimulations,
    compareConfigs,
    compareSummaries,
    compareWeeklyMetrics,

    // Utilities
    cleanupOldSimulations,
    exportAllData,
    importAllData,

    // Constants (for external use)
    VERSION_TYPES,
    STORAGE_KEYS
  };
})();

// Make available globally
window.SimulationManager = SimulationManager;

console.log('[SimulationManager] Module loaded');
