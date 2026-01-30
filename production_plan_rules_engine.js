/**
 * Production Plan Rules Engine
 * Analyzes production plans and generates intelligent recommendations
 *
 * Key Functions:
 * - Gap Analysis: Identify weeks with shortfalls
 * - CTB Constraint Detection: Find capacity bottlenecks
 * - Stability Check: Detect volatility and ramp issues
 * - Recovery Plan Generation: Suggest mitigation actions
 */

const ProductionPlanRulesEngine = (function() {
  'use strict';

  /**
   * Main analysis function
   * @param {Object} planResults - Production plan results
   * @param {Object} config - Plan configuration
   * @returns {Object} Analysis results with recommendations
   */
  function analyzePlan(planResults, config) {
    const analysis = {
      timestamp: new Date().toISOString(),
      config: config,
      summary: {},
      issues: [],
      recommendations: [],
      scores: {}
    };

    // Handle both single mode and combined mode
    const isCombined = planResults.mode === 'combined';
    const constrainedResults = isCombined ? planResults.constrained : planResults;
    const unconstrainedResults = isCombined ? planResults.unconstrained : null;

    // Run all analysis rules
    const gapAnalysis = analyzeGaps(constrainedResults, config);
    const ctbAnalysis = analyzeCTBConstraints(constrainedResults, unconstrainedResults, config);
    const stabilityAnalysis = analyzeStability(constrainedResults, config);
    const rampAnalysis = analyzeRampCurve(constrainedResults, config);

    // Combine results
    analysis.gapAnalysis = gapAnalysis;
    analysis.ctbAnalysis = ctbAnalysis;
    analysis.stabilityAnalysis = stabilityAnalysis;
    analysis.rampAnalysis = rampAnalysis;

    // Calculate overall scores
    analysis.scores = {
      gapScore: calculateGapScore(gapAnalysis),
      ctbScore: calculateCTBScore(ctbAnalysis),
      stabilityScore: calculateStabilityScore(stabilityAnalysis),
      rampScore: calculateRampScore(rampAnalysis),
      overall: 0
    };

    analysis.scores.overall = (
      analysis.scores.gapScore * 0.4 +
      analysis.scores.ctbScore * 0.2 +
      analysis.scores.stabilityScore * 0.2 +
      analysis.scores.rampScore * 0.2
    );

    // Generate consolidated issues and recommendations
    analysis.issues = [
      ...gapAnalysis.issues,
      ...ctbAnalysis.issues,
      ...stabilityAnalysis.issues,
      ...rampAnalysis.issues
    ];

    analysis.recommendations = generateRecommendations(analysis);

    // Generate summary
    analysis.summary = {
      totalIssues: analysis.issues.length,
      criticalIssues: analysis.issues.filter(i => i.severity === 'critical').length,
      warningIssues: analysis.issues.filter(i => i.severity === 'warning').length,
      infoIssues: analysis.issues.filter(i => i.severity === 'info').length,
      overallHealth: getHealthStatus(analysis.scores.overall)
    };

    return analysis;
  }

  /**
   * Analyze gaps between demand and shipment
   */
  function analyzeGaps(results, config) {
    const weeklyMetrics = results.weeklyMetrics || [];
    const issues = [];
    const gapWeeks = [];

    weeklyMetrics.forEach(week => {
      const gap = week.gap || (week.shipments - week.demand);
      const attainment = week.demand > 0 ? (week.shipments / week.demand * 100) : 100;

      if (gap < 0) {
        const severity = attainment < 80 ? 'critical' : attainment < 90 ? 'warning' : 'info';

        gapWeeks.push({
          week_id: week.week_id,
          gap: gap,
          attainment: attainment,
          demand: week.demand,
          shipment: week.shipments
        });

        issues.push({
          type: 'gap',
          severity: severity,
          week_id: week.week_id,
          message: `Week ${week.week_id}: Shortfall of ${Math.abs(gap).toLocaleString()} units (${attainment.toFixed(1)}% attainment)`,
          details: {
            gap: gap,
            attainment: attainment,
            demand: week.demand,
            shipment: week.shipments
          }
        });
      }
    });

    const totalGap = gapWeeks.reduce((sum, w) => sum + w.gap, 0);
    const avgAttainment = gapWeeks.length > 0
      ? gapWeeks.reduce((sum, w) => sum + w.attainment, 0) / gapWeeks.length
      : 100;

    return {
      issues: issues,
      gapWeeks: gapWeeks,
      totalGap: totalGap,
      avgAttainment: avgAttainment,
      weeksWithGap: gapWeeks.length,
      totalWeeks: weeklyMetrics.length
    };
  }

  /**
   * Analyze CTB (Capacity, Tooling, Build) constraints
   */
  function analyzeCTBConstraints(constrainedResults, unconstrainedResults, config) {
    const issues = [];
    const constraints = [];

    if (!unconstrainedResults) {
      return { issues: [], constraints: [], hasConstraints: false };
    }

    // Compare constrained vs unconstrained
    const constrainedTotal = constrainedResults.summary.totalOutput;
    const unconstrainedTotal = unconstrainedResults.summary.totalOutput;
    const constraintImpact = unconstrainedTotal - constrainedTotal;
    const impactPercent = (constraintImpact / unconstrainedTotal * 100);

    if (constraintImpact > 0) {
      const severity = impactPercent > 20 ? 'critical' : impactPercent > 10 ? 'warning' : 'info';

      issues.push({
        type: 'ctb_constraint',
        severity: severity,
        message: `Constraints reduced output by ${constraintImpact.toLocaleString()} units (${impactPercent.toFixed(1)}%)`,
        details: {
          constrainedTotal: constrainedTotal,
          unconstrainedTotal: unconstrainedTotal,
          impact: constraintImpact,
          impactPercent: impactPercent
        }
      });

      // Analyze daily differences to find specific constraint periods
      constrainedResults.programResults.forEach((day, idx) => {
        const uncDay = unconstrainedResults.programResults[idx];
        if (uncDay) {
          const dailyDiff = uncDay.output_final - day.output_final;
          if (dailyDiff > 0) {
            constraints.push({
              date: day.date,
              constrained: day.output_final,
              unconstrained: uncDay.output_final,
              difference: dailyDiff
            });
          }
        }
      });
    }

    return {
      issues: issues,
      constraints: constraints,
      hasConstraints: constraintImpact > 0,
      totalImpact: constraintImpact,
      impactPercent: impactPercent,
      constrainedDays: constraints.length
    };
  }

  /**
   * Analyze output stability (volatility)
   */
  function analyzeStability(results, config) {
    const issues = [];
    const programResults = results.programResults || [];

    if (programResults.length < 2) {
      return { issues: [], volatility: 0, spikes: [] };
    }

    // Calculate day-to-day changes
    const dailyChanges = [];
    const spikes = [];

    for (let i = 1; i < programResults.length; i++) {
      const prev = programResults[i - 1];
      const curr = programResults[i];

      const change = curr.output_final - prev.output_final;
      const changePercent = prev.output_final > 0 ? (change / prev.output_final * 100) : 0;

      dailyChanges.push(Math.abs(changePercent));

      // Detect spikes (>30% change)
      if (Math.abs(changePercent) > 30) {
        spikes.push({
          date: curr.date,
          prevOutput: prev.output_final,
          currOutput: curr.output_final,
          change: change,
          changePercent: changePercent
        });

        issues.push({
          type: 'stability',
          severity: Math.abs(changePercent) > 50 ? 'warning' : 'info',
          message: `${curr.date}: Output ${changePercent > 0 ? 'jumped' : 'dropped'} by ${Math.abs(changePercent).toFixed(1)}%`,
          details: {
            date: curr.date,
            change: change,
            changePercent: changePercent
          }
        });
      }
    }

    // Calculate average volatility
    const avgVolatility = dailyChanges.reduce((sum, v) => sum + v, 0) / dailyChanges.length;

    return {
      issues: issues,
      volatility: avgVolatility,
      spikes: spikes,
      avgDailyChange: avgVolatility
    };
  }

  /**
   * Analyze ramp curve health
   */
  function analyzeRampCurve(results, config) {
    const issues = [];
    const programResults = results.programResults || [];

    if (programResults.length < 7) {
      return { issues: [], rampHealth: 'unknown' };
    }

    // Check first week ramp
    const firstWeekOutput = programResults.slice(0, 7).reduce((sum, d) => sum + d.output_final, 0);
    const lastWeekOutput = programResults.slice(-7).reduce((sum, d) => sum + d.output_final, 0);

    const rampRatio = lastWeekOutput / firstWeekOutput;

    // Detect ramp issues
    if (rampRatio < 1.2 && programResults.length > 14) {
      issues.push({
        type: 'ramp',
        severity: 'info',
        message: 'Slow ramp detected: Output not increasing significantly over time',
        details: {
          firstWeekOutput: firstWeekOutput,
          lastWeekOutput: lastWeekOutput,
          rampRatio: rampRatio
        }
      });
    }

    if (rampRatio > 3) {
      issues.push({
        type: 'ramp',
        severity: 'warning',
        message: 'Aggressive ramp detected: Output increasing very rapidly',
        details: {
          firstWeekOutput: firstWeekOutput,
          lastWeekOutput: lastWeekOutput,
          rampRatio: rampRatio
        }
      });
    }

    return {
      issues: issues,
      rampRatio: rampRatio,
      rampHealth: rampRatio >= 1.2 && rampRatio <= 3 ? 'healthy' : 'suboptimal'
    };
  }

  /**
   * Generate actionable recommendations
   */
  function generateRecommendations(analysis) {
    const recommendations = [];

    // Gap-based recommendations
    if (analysis.gapAnalysis.weeksWithGap > 0) {
      if (analysis.gapAnalysis.avgAttainment < 80) {
        recommendations.push({
          priority: 'high',
          category: 'capacity',
          title: 'Critical capacity shortfall detected',
          action: 'Consider enabling overtime, adding shifts, or sourcing additional sites',
          expectedImpact: 'Could improve attainment by 10-20%',
          affectedWeeks: analysis.gapAnalysis.gapWeeks.map(w => w.week_id)
        });
      } else if (analysis.gapAnalysis.avgAttainment < 90) {
        recommendations.push({
          priority: 'medium',
          category: 'capacity',
          title: 'Moderate capacity gaps',
          action: 'Enable Sunday OT or optimize ramp curve to improve output',
          expectedImpact: 'Could improve attainment by 5-10%',
          affectedWeeks: analysis.gapAnalysis.gapWeeks.map(w => w.week_id)
        });
      }
    }

    // CTB-based recommendations
    if (analysis.ctbAnalysis.hasConstraints && analysis.ctbAnalysis.impactPercent > 10) {
      recommendations.push({
        priority: 'high',
        category: 'constraints',
        title: 'Significant constraint impact',
        action: 'Review tooling capacity, build plan allocation, or site selection to reduce constraints',
        expectedImpact: `Could unlock ${analysis.ctbAnalysis.totalImpact.toLocaleString()} additional units`,
        affectedDays: analysis.ctbAnalysis.constrainedDays
      });
    }

    // Stability-based recommendations
    if (analysis.stabilityAnalysis.spikes.length > 0) {
      recommendations.push({
        priority: 'low',
        category: 'stability',
        title: 'Output volatility detected',
        action: 'Smooth ramp curve to reduce day-to-day fluctuations',
        expectedImpact: 'Improves predictability and reduces operational risk',
        affectedDates: analysis.stabilityAnalysis.spikes.map(s => s.date)
      });
    }

    // Ramp-based recommendations
    if (analysis.rampAnalysis.rampHealth === 'suboptimal') {
      recommendations.push({
        priority: 'medium',
        category: 'ramp',
        title: 'Ramp curve optimization opportunity',
        action: analysis.rampAnalysis.rampRatio < 1.2
          ? 'Consider more aggressive ramp to increase output faster'
          : 'Consider smoother ramp to reduce risk',
        expectedImpact: 'Optimizes balance between output and operational stability'
      });
    }

    // Sort by priority
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    return recommendations;
  }

  /**
   * Calculate scores (0-100)
   */
  function calculateGapScore(gapAnalysis) {
    if (gapAnalysis.totalWeeks === 0) return 100;
    const gapRatio = gapAnalysis.weeksWithGap / gapAnalysis.totalWeeks;
    return Math.max(0, 100 - (gapRatio * 100 + (100 - gapAnalysis.avgAttainment)));
  }

  function calculateCTBScore(ctbAnalysis) {
    if (!ctbAnalysis.hasConstraints) return 100;
    return Math.max(0, 100 - ctbAnalysis.impactPercent * 3);
  }

  function calculateStabilityScore(stabilityAnalysis) {
    return Math.max(0, 100 - stabilityAnalysis.volatility * 2);
  }

  function calculateRampScore(rampAnalysis) {
    if (rampAnalysis.rampHealth === 'healthy') return 100;
    if (rampAnalysis.rampHealth === 'unknown') return 80;
    return 60;
  }

  function getHealthStatus(score) {
    if (score >= 90) return 'excellent';
    if (score >= 75) return 'good';
    if (score >= 60) return 'fair';
    if (score >= 40) return 'poor';
    return 'critical';
  }

  /**
   * Generate AI-powered insights
   * @param {Object} analysis - Analysis results from analyzePlan
   * @returns {Promise<Object>} AI insights
   */
  async function generateAIInsights(analysis) {
    if (typeof window === 'undefined' || !window.AI_SYSTEM) {
      console.warn('[RulesEngine] AI_SYSTEM not available');
      return {
        available: false,
        error: 'AI system not loaded'
      };
    }

    try {
      // Prepare analysis summary for AI
      const summary = {
        overallHealth: analysis.summary.overallHealth,
        overallScore: analysis.scores.overall.toFixed(1),
        totalIssues: analysis.summary.totalIssues,
        criticalIssues: analysis.summary.criticalIssues,
        gapAnalysis: {
          weeksWithGap: analysis.gapAnalysis.weeksWithGap,
          totalWeeks: analysis.gapAnalysis.totalWeeks,
          avgAttainment: analysis.gapAnalysis.avgAttainment.toFixed(1),
          totalGap: Math.round(analysis.gapAnalysis.totalGap)
        },
        ctbAnalysis: {
          hasConstraints: analysis.ctbAnalysis.hasConstraints,
          impactPercent: analysis.ctbAnalysis.impactPercent?.toFixed(1),
          constrainedDays: analysis.ctbAnalysis.constrainedDays
        },
        topIssues: analysis.issues.slice(0, 5).map(i => ({
          type: i.type,
          severity: i.severity,
          message: i.message
        }))
      };

      const prompt = `You are a production planning expert. Analyze this production plan:

Overall Health: ${summary.overallHealth} (Score: ${summary.overallScore}/100)
Total Issues: ${summary.totalIssues} (${summary.criticalIssues} critical)

Gap Analysis:
- ${summary.gapAnalysis.weeksWithGap} out of ${summary.gapAnalysis.totalWeeks} weeks have shortfall
- Average attainment: ${summary.gapAnalysis.avgAttainment}%
- Total gap: ${summary.gapAnalysis.totalGap} units

${summary.ctbAnalysis.hasConstraints ? `CTB Constraints:
- Constraints reduce output by ${summary.ctbAnalysis.impactPercent}%
- ${summary.ctbAnalysis.constrainedDays} days affected` : 'No significant CTB constraints detected'}

Top Issues:
${summary.topIssues.map(i => `- [${i.severity.toUpperCase()}] ${i.message}`).join('\n')}

Please provide:
1. **Root Cause Analysis** (2-3 sentences): What's causing the main problems?
2. **Key Insights** (3-4 bullet points): What are the most important findings?
3. **Strategic Recommendations** (3 prioritized actions): What should be done?

Keep it concise and actionable. Use business language, not technical jargon.`;

      const response = await window.AI_SYSTEM.chat(prompt);

      return {
        available: true,
        response: response,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('[RulesEngine] AI insights generation failed:', error);
      return {
        available: false,
        error: error.message
      };
    }
  }

  /**
   * Detect anomalies using AI
   * @param {Array} programResults - Daily program results
   * @returns {Promise<Object>} Anomaly detection results
   */
  async function detectAnomaliesWithAI(programResults) {
    if (typeof window === 'undefined' || !window.AI_SYSTEM) {
      return { available: false };
    }

    try {
      // Sample data to avoid token overflow
      const sampleSize = Math.min(programResults.length, 30);
      const step = Math.ceil(programResults.length / sampleSize);
      const sampledData = programResults.filter((_, idx) => idx % step === 0);

      const features = sampledData.map((day, idx) => {
        const prevDay = idx > 0 ? sampledData[idx - 1] : null;
        return {
          date: day.date,
          output: day.output_final,
          changeFromPrev: prevDay ? day.output_final - prevDay.output_final : 0,
          changePercent: prevDay && prevDay.output_final > 0
            ? ((day.output_final - prevDay.output_final) / prevDay.output_final * 100).toFixed(1)
            : 0
        };
      });

      const prompt = `Analyze this daily production output data for anomalies:

${features.map(f => `${f.date}: ${f.output} units (${f.changeFromPrev >= 0 ? '+' : ''}${f.changePercent}%)`).join('\n')}

Identify:
1. Any unusual spikes or drops
2. Patterns that seem abnormal
3. Potential operational risks

Provide 2-3 specific findings with dates.`;

      const response = await window.AI_SYSTEM.chat(prompt);

      return {
        available: true,
        response: response,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('[RulesEngine] Anomaly detection failed:', error);
      return { available: false, error: error.message };
    }
  }

  // Public API
  return {
    analyzePlan,
    analyzeGaps,
    analyzeCTBConstraints,
    analyzeStability,
    analyzeRampCurve,
    generateRecommendations,
    generateAIInsights,
    detectAnomaliesWithAI
  };
})();

// Export to global scope
if (typeof window !== 'undefined') {
  window.ProductionPlanRulesEngine = ProductionPlanRulesEngine;
}
