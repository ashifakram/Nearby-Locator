import db from '../db.js';
import { logger } from '../utils/logger.js';
import { QueryIntelligenceService } from '../services/queryIntelligenceService.js';

export const SearchRollupJob = {
  /**
   * Run authoritative query intelligence rollups:
   * 1. Aggregate unique vocabulary words from active approved high-trust listings into search_terms.
   * 2. Aggregate conversions (searches with clicks) from trusted sessions into search_suggestions.
   */
  async execute(trx = db) {
    logger.info('[SEARCH_ROLLUP] Starting scheduled search telemetry rollup job...');
    const start = Date.now();

    try {
      await trx.transaction(async (innerTrx) => {
        // --- STEP A: REBUILD DICTIONARY VOCABULARY (search_terms) ---
        // Fetch all spots that are approved and high-trust, and whose creators are high-trust
        const spots = await innerTrx('spots')
          .select('spots.name', 'spots.category', 'spots.address')
          .leftJoin('users', 'users.id', 'spots.creator_id')
          .where('spots.is_active', true)
          .where('spots.moderation_status', 'APPROVED')
          .where('spots.trust_score', '>=', 0.7)
          .andWhere((builder) => {
            builder.whereNull('spots.creator_id')
                   .orWhere('users.trust_score', '>=', 0.5);
          });

        const termCounts = {};

        for (const spot of spots) {
          const textBlock = `${spot.name} ${spot.category} ${spot.address || ''}`;
          // Normalize text to lowercase and clean punctuation
          const normalized = textBlock.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
          const tokens = normalized.split(/\s+/).filter(Boolean);

          for (const token of tokens) {
            // Dict words must be >= 3 characters to protect typo-tolerance precision
            if (token.length >= 3) {
              termCounts[token] = (termCounts[token] || 0) + 1;
            }
          }
        }

        // Upsert vocabulary terms
        const vocabularyWords = Object.keys(termCounts);
        if (vocabularyWords.length > 0) {
          // Truncate search_terms table for fresh vocabulary rebuild
          await innerTrx('search_terms').del();

          // Batch insert in chunks to avoid single query execution payload exhaustion
          const chunks = [];
          const chunkSize = 200;
          for (let i = 0; i < vocabularyWords.length; i += chunkSize) {
            chunks.push(vocabularyWords.slice(i, i + chunkSize));
          }

          for (const chunk of chunks) {
            const inserts = chunk.map(term => ({
              term,
              frequency: termCounts[term],
              updated_at: innerTrx.fn.now()
            }));
            await innerTrx('search_terms').insert(inserts);
          }
        }

        // --- STEP B: BUILD AUTOCOMPLETE SUGGESTIONS (search_suggestions) ---
        // Only queries that led to successful conversions (result clicks) from non-suspended users
        const convertedSearches = await innerTrx('discovery_searches as ds')
          .join('discovery_clicks as dc', 'dc.search_id', 'ds.id')
          .leftJoin('users as u', 'u.id', 'ds.user_id')
          .select('ds.raw_query')
          .whereNotNull('ds.raw_query')
          .andWhere((builder) => {
            builder.whereNull('ds.user_id')
                   .orWhere('u.trust_score', '>=', 0.5);
          });

        const suggestionCounts = {};

        for (const search of convertedSearches) {
          const normalized = QueryIntelligenceService.normalizeQuery(search.raw_query);
          if (normalized && normalized.length >= 3) {
            suggestionCounts[normalized] = (suggestionCounts[normalized] || 0) + 1;
          }
        }

        const uniqueSuggestions = Object.keys(suggestionCounts);
        if (uniqueSuggestions.length > 0) {
          // Truncate existing suggestions that are not explicitly blocked by moderators
          await innerTrx('search_suggestions').where({ is_blocked: false }).del();

          const chunks = [];
          const chunkSize = 200;
          for (let i = 0; i < uniqueSuggestions.length; i += chunkSize) {
            chunks.push(uniqueSuggestions.slice(i, i + chunkSize));
          }

          for (const chunk of chunks) {
            const inserts = chunk.map(phrase => ({
              phrase,
              frequency: suggestionCounts[phrase],
              is_blocked: false,
              updated_at: innerTrx.fn.now()
            }));
            // Insert suggestions; ignore conflict if phrase was manually blocked by admin (is_blocked = true)
            await innerTrx('search_suggestions')
              .insert(inserts)
              .onConflict('phrase')
              .ignore();
          }
        }
      });

      logger.info(`[SEARCH_ROLLUP] Successfully completed telemetry rollup job in ${Date.now() - start}ms.`);
    } catch (err) {
      logger.error('[SEARCH_ROLLUP] Error executing telemetry rollup job:', err);
      throw err;
    }
  }
};
