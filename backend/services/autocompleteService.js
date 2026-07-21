import db from '../db.js';
import { QueryIntelligenceService } from './queryIntelligenceService.js';

export const AutocompleteService = {
  /**
   * Get suggestions matching partial query (Fuzzy + Prefix)
   * Utilizing GIN Trigram index and strict blocklist checks.
   */
  async getSuggestions(partialQuery, limit = 10, trx = db) {
    if (!partialQuery) return [];

    const normalized = QueryIntelligenceService.normalizeQuery(partialQuery);
    if (!normalized) return [];

    const safeLimit = Math.min(Math.max(1, limit), 50);

    // Prefix search with trigram similarity fallback
    const suggestions = await trx('search_suggestions')
      .select('phrase', 'frequency')
      .select(trx.raw('similarity(phrase, ?) as score', [normalized]))
      .where((builder) => {
        builder.whereRaw('phrase % ?', [normalized])
               .orWhere('phrase', 'like', `${normalized}%`);
      })
      .andWhere({ is_blocked: false })
      .orderByRaw('similarity(phrase, ?) DESC', [normalized])
      .orderBy('frequency', 'desc')
      .limit(safeLimit);

    return suggestions.map(s => ({
      phrase: s.phrase,
      frequency: parseInt(s.frequency || 0, 10)
    }));
  },

  /**
   * Get trending suggestions
   * Fetches phrases with high frequency counts that are active.
   */
  async getTrending(limit = 5, trx = db) {
    const safeLimit = Math.min(Math.max(1, limit), 20);

    const trending = await trx('search_suggestions')
      .select('phrase', 'frequency')
      .where({ is_blocked: false })
      .orderBy('frequency', 'desc')
      .limit(safeLimit);

    return trending.map(t => ({
      phrase: t.phrase,
      frequency: parseInt(t.frequency || 0, 10)
    }));
  }
};
