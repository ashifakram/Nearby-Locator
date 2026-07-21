/**
 * Central configuration file for discovery, ranking, and relevance scoring heuristics.
 * Separates weight factors and scale models from hardcoded raw SQL components.
 */
export const discoveryConfig = {
  weights: {
    distance: 0.40,      // Primary geospatial weight
    popularity: 0.30,    // Engagement weight
    freshness: 0.30,     // Inactivity decay weight
    trendingBoostMax: 0.20 // Maximum bonus velocity boost
  },
  scales: {
    distanceMeters: 2000.0, // 2km rational decay midpoint scale
    freshnessDays: 45.0      // 45-day freshness decay scale
  },
  penalties: {
    softDuplicate: 0.15,     // Penalty applied to co-located matching spot names
    densityMaxPenalty: 0.15  // Maximum capacity penalty for dense grids
  }
};
