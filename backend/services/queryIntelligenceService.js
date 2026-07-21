import db from '../db.js';
import { logger } from '../utils/logger.js';

// Filler words list (stopwords) to remove for clean query FTS mapping
const FILLER_WORDS = new Set(['in', 'near', 'at', 'the', 'a', 'an', 'of', 'for', 'with', 'on', 'and', 'by']);

export const QueryIntelligenceService = {
  /**
   * 1. Query Normalization
   * Lowercases the string, strips unwanted punctuation, filters filler words/stopwords,
   * but leaves letters, numbers, and spaces intact. No naive JS plural stripping.
   */
  normalizeQuery(query) {
    if (!query || typeof query !== 'string') return '';
    
    // Normalize casing and clean punctuation
    const lower = query.toLowerCase().trim();
    // Replace non-alphanumeric (except spaces) with space
    const cleaned = lower.replace(/[^a-z0-9\s]/g, ' ');
    
    // Split into individual tokens
    const tokens = cleaned.split(/\s+/).filter(Boolean);
    
    // Filter filler/stopwords to keep query pure
    const filteredTokens = tokens.filter(token => !FILLER_WORDS.has(token));
    
    return filteredTokens.join(' ');
  },

  /**
   * 2. Intent-Aware Parsing
   * Detects intent phrases (cheap, open now, repair) and strips them from the search string
   * so they do not cause literal FTS word mismatches, returning a structured intent object.
   */
  detectIntents(normalizedQuery) {
    if (!normalizedQuery) {
      return { cleanedQuery: '', intent: { cheap: false, openNow: false, repair: false } };
    }

    const intent = {
      cheap: false,
      openNow: false,
      repair: false
    };

    let cleaned = normalizedQuery;

    // Detect "cheap", "affordable", "low cost"
    if (/\b(cheap|affordable|low\s+cost)\b/i.test(cleaned)) {
      intent.cheap = true;
      cleaned = cleaned.replace(/\b(cheap|affordable|low\s+cost)\b/ig, '');
    }

    // Detect "open now", "active now", "active"
    if (/\b(open\s+now|active\s+now|active)\b/i.test(cleaned)) {
      intent.openNow = true;
      cleaned = cleaned.replace(/\b(open\s+now|active\s+now|active)\b/ig, '');
    }

    // Detect "repair", "fix"
    if (/\b(repair|fix)\b/i.test(cleaned)) {
      intent.repair = true;
      cleaned = cleaned.replace(/\b(repair|fix)\b/ig, '');
    }

    // Reclean double spaces
    const cleanedQuery = cleaned.split(/\s+/).filter(Boolean).join(' ');

    return { cleanedQuery, intent };
  },

  /**
   * 3. Softened Typo Auto-Correction (Fuzzy lookups using GIN Trigram similarity)
   * Evaluates each word against the `search_terms` vocabulary index:
   * - Only evaluate words >= 3 chars to prevent false positive short abbreviation matches.
   * - If exact match in search_terms or word is not found, search with pg_trgm similarity >= 0.5.
   * - If similarity >= 0.75: auto-correct word conservatively.
   * - If 0.5 <= similarity < 0.75: keep original query but append a "did you mean" suggestion.
   */
  async evaluateTypos(queryText, trx = db) {
    if (!queryText) {
      return { correctedQuery: '', didYouMean: null, isTypoCorrected: false };
    }

    const words = queryText.split(/\s+/).filter(Boolean);
    const correctedWords = [];
    const suggestionWords = [];
    let isTypoCorrected = false;
    let hasSuggested = false;

    for (const word of words) {
      if (word.length < 3) {
        correctedWords.push(word);
        suggestionWords.push(word);
        continue;
      }

      // Check if word is already a valid term in the vocabulary (exact match)
      const exactMatch = await trx('search_terms').where({ term: word }).first();
      if (exactMatch) {
        correctedWords.push(word);
        suggestionWords.push(word);
        continue;
      }

      // Query trigram similarity dictionary
      const fuzzyMatch = await trx('search_terms')
        .select('term')
        .select(trx.raw('similarity(term, ?) as score', [word]))
        .whereRaw('similarity(term, ?) >= 0.5', [word])
        .orderByRaw('similarity(term, ?) DESC', [word])
        .first();

      if (fuzzyMatch) {
        const score = parseFloat(fuzzyMatch.score);
        if (score >= 0.75) {
          // Strong confidence: auto-correct word
          correctedWords.push(fuzzyMatch.term);
          suggestionWords.push(fuzzyMatch.term);
          isTypoCorrected = true;
        } else {
          // Borderline confidence: preserve original, suggest did you mean
          correctedWords.push(word);
          suggestionWords.push(fuzzyMatch.term);
          hasSuggested = true;
        }
      } else {
        // No match found: keep original
        correctedWords.push(word);
        suggestionWords.push(word);
      }
    }

    const correctedQuery = correctedWords.join(' ');
    const suggestedQuery = suggestionWords.join(' ');

    return {
      correctedQuery,
      didYouMean: hasSuggested ? suggestedQuery : null,
      isTypoCorrected
    };
  },

  /**
   * 4. Constrained Category-Aware Synonym Expansion (Depth = 1)
   * Resolves category filters and weight limits. Compiles FTS matching phrases.
   * If a term has synonyms, it compiles: (term | synonym1 | synonym2)
   */
  async expandSynonyms(queryText, categoryFilter = null, trx = db) {
    if (!queryText) {
      return { tsquery: '', expandedTerms: [], isSynonymExpanded: false };
    }

    const words = queryText.split(/\s+/).filter(Boolean);
    const tsQueryParts = [];
    const expandedTerms = [];
    let isSynonymExpanded = false;

    for (const word of words) {
      // Find valid synonyms with weight >= 0.6
      let query = trx('search_synonyms')
        .select('target_phrase', 'source_phrase', 'bi_directional')
        .where((builder) => {
          builder.where({ source_phrase: word })
                 .orWhere(function() {
                   this.where({ target_phrase: word }).andWhere({ bi_directional: true });
                 });
        })
        .andWhere('weight', '>=', 0.6);

      if (categoryFilter) {
        query = query.andWhere((builder) => {
          builder.whereNull('restricted_category')
                 .orWhere({ restricted_category: categoryFilter });
        });
      } else {
        query = query.whereNull('restricted_category');
      }

      const synonyms = await query;

      if (synonyms.length > 0) {
        isSynonymExpanded = true;
        const synonymWords = new Set([word]);
        
        for (const syn of synonyms) {
          const match = (syn.source_phrase === word) ? syn.target_phrase : syn.source_phrase;
          synonymWords.add(match);
          expandedTerms.push(match);
        }

        // Format to tsquery OR format: (word1 | word2)
        const ftsOrString = '(' + Array.from(synonymWords).join(' | ') + ')';
        tsQueryParts.push(ftsOrString);
      } else {
        tsQueryParts.push(word);
      }
    }

    // Assemble tsquery string utilizing AND operator for consecutive tokens: token1 & token2
    const tsquery = tsQueryParts.join(' & ');

    return {
      tsquery,
      expandedTerms,
      isSynonymExpanded
    };
  }
};
