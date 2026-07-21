import db from '../db.js';
import client from '../redisClient.js';
import { SpotRepository } from '../repositories/spotRepository.js';
import { logger } from '../utils/logger.js';
import { ValidationError, AppError } from '../utils/errors.js';
import { QueryIntelligenceService } from '../services/queryIntelligenceService.js';
import { AutocompleteService } from '../services/autocompleteService.js';

export const DiscoveryController = {
  /**
   * Perform nearby search utilizing CTE Composite Ranking, snapping density normalizations,
   * soft duplication de-emphasis, and post-processing category diversity.
   * Logs a search event in discovery_searches to track clickstream abandonment.
   */
  async search(req, res, next) {
    try {
      const { lat, lng, radius, limit, category, lastCursor, q } = req.query;

      if (!lat || !lng) {
        throw new ValidationError('Coordinates (lat, lng) are required for discovery searches.');
      }

      const parsedLat = parseFloat(lat);
      const parsedLng = parseFloat(lng);
      const parsedRadius = radius ? parseInt(radius, 10) : 5000;
      const parsedLimit = limit ? parseInt(limit, 10) : 20;

      // Decode Base64 cursor if provided
      let lastDistance = null;
      let lastId = null;
      if (lastCursor) {
        try {
          const decoded = Buffer.from(lastCursor, 'base64').toString('utf8');
          const parts = decoded.split('|');
          if (parts.length === 2) {
            lastDistance = parseFloat(parts[0]);
            lastId = parts[1];
          }
        } catch (err) {
          logger.warn('Failed parsing Base64 discovery search cursor, falling back to page 1:', err.message);
        }
      }

      // --- QUERY INTELLIGENCE PIPELINE ENGINE ---
      const normalized = QueryIntelligenceService.normalizeQuery(q);
      const { cleanedQuery, intent } = QueryIntelligenceService.detectIntents(normalized);
      const { correctedQuery, didYouMean, isTypoCorrected } = await QueryIntelligenceService.evaluateTypos(cleanedQuery);
      const { tsquery, expandedTerms, isSynonymExpanded } = await QueryIntelligenceService.expandSynonyms(correctedQuery, category || null);

      // Execute primary composite relevance search query
      let { data, nextCursor } = await SpotRepository.findNearby({
        lat: parsedLat,
        lng: parsedLng,
        radius: parsedRadius,
        limit: parsedLimit,
        category: category || null,
        lastDistance,
        lastId,
        discoverySearch: true,
        tsquery: tsquery || null,
        intent
      });

      // --- EMPTY-RESULT RECOVERY ENGINE (Contextual Radius Caps) ---
      let recoveryDetails = null;
      if (data.length === 0) {
        const getContextualMaxRadius = (cat) => {
          const lower = (cat || '').toLowerCase();
          if (['food', 'drink', 'cafe', 'restaurant', 'bakery'].some(k => lower.includes(k))) {
            return 10000; // Capped at 10km for local food/drinks
          }
          if (['hospital', 'emergency', 'health', 'clinic', 'medical'].some(k => lower.includes(k))) {
            return 50000; // Capped at 50km for hospitals / emergency services
          }
          return 25000; // Capped at 25km for other default services
        };

        let currentRadius = parsedRadius;
        const maxRadiusCap = getContextualMaxRadius(category);

        while (data.length === 0 && currentRadius < maxRadiusCap) {
          currentRadius = Math.min(currentRadius * 2, maxRadiusCap);
          logger.info(`[RECOVERY] Empty search results, widening search radius to ${currentRadius} meters`);

          const recoveryResult = await SpotRepository.findNearby({
            lat: parsedLat,
            lng: parsedLng,
            radius: currentRadius,
            limit: parsedLimit,
            category: category || null,
            lastDistance,
            lastId,
            discoverySearch: true,
            tsquery: tsquery || null,
            intent
          });

          if (recoveryResult.data.length > 0) {
            data = recoveryResult.data;
            nextCursor = recoveryResult.nextCursor;
            recoveryDetails = {
              expandedRadius: currentRadius,
              originalRadius: parsedRadius,
              synonymExpanded: isSynonymExpanded,
              typoCorrected: isTypoCorrected
            };
            break;
          }
        }
      }

      // Log append-only search telemetry event with query intelligence details
      const userId = req.user ? req.user.id : null;
      const [searchLog] = await db('discovery_searches')
        .insert({
          user_id: userId,
          query_text: q || null,
          category: category || null,
          latitude: parsedLat,
          longitude: parsedLng,
          results_count: data.length,
          abandoned: true, // Defaults to true; marked false when a search click is registered
          raw_query: q || null,
          normalized_query: normalized || null,
          corrected_query: correctedQuery || null,
          did_you_mean: didYouMean || null,
          intent_detected: JSON.stringify(intent),
          recovery_details: recoveryDetails ? JSON.stringify(recoveryDetails) : null,
          is_typo_corrected: isTypoCorrected,
          is_synonym_expanded: isSynonymExpanded
        })
        .returning('id');

      return res.status(200).json({
        success: true,
        searchId: searchLog.id,
        data,
        nextCursor,
        meta: {
          didYouMean: didYouMean || null,
          intent,
          recovery: recoveryDetails || null
        }
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Autocomplete endpoint supporting prefix matching, blocklist checks,
   * unique sessions weighting, and trending lookups.
   */
  async autocomplete(req, res, next) {
    try {
      const { q } = req.query;
      if (!q) {
        // Return trending suggestions if search input is empty
        const trending = await AutocompleteService.getTrending();
        return res.status(200).json({
          success: true,
          suggestions: trending
        });
      }

      const suggestions = await AutocompleteService.getSuggestions(q);
      return res.status(200).json({
        success: true,
        suggestions
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Log an append-only search click telemetry event, marking search abandoned = false,
   * and incrementing popularity metrics. Employs Redis bot blocks and click dedupe buffers.
   */
  async logClick(req, res, next) {
    try {
      const { searchId, spotId, rank } = req.body;

      if (!searchId || !spotId || rank === undefined) {
        throw new ValidationError('Parameters searchId, spotId, and rank are required.');
      }

      const userId = req.user ? req.user.id : null;
      const clientIp = req.ip || '127.0.0.1';
      const actorKey = userId ? `user:${userId}` : `ip:${clientIp}`;

      // 1. Anti-Bot click velocity throttle in Redis (limit to 20 clicks per minute)
      const velocityKey = `clicks:velocity:${actorKey}`;
      const clicksInWindow = await client.incr(velocityKey);
      if (clicksInWindow === 1) {
        await client.expire(velocityKey, 60);
      }
      if (clicksInWindow > 20) {
        logger.warn(`Potential click-jacking or bot activity detected from ${actorKey}. Clicks count in current minute: ${clicksInWindow}`);
        
        // Flag spot as suspicious to trigger admin queue warning without auto-quarantining
        await db('spots')
          .where({ id: spotId })
          .update({ suspicious_telemetry_flag: true });

        return res.status(429).json({
          error: 'TOO_MANY_REQUESTS',
          message: 'Rate limit exceeded. Too many clicks registered.'
        });
      }

      // 2. Redis 10-minute session-based click deduplication window
      const dedupeKey = `clicks:dedupe:${searchId}:${actorKey}:${spotId}`;
      const isDuplicate = await client.get(dedupeKey);

      if (!isDuplicate) {
        // Set dedupe key to ignore duplicate clicks within 10 minutes
        await client.set(dedupeKey, '1', 'EX', 600);

        // Mark search abandoned = false in append-only table
        await db('discovery_searches')
          .where({ id: searchId })
          .update({ abandoned: false });

        // Log search click
        await db('discovery_clicks').insert({
          search_id: searchId,
          spot_id: spotId,
          rank: parseInt(rank, 10)
        });
      }

      return res.status(200).json({ success: true, deduplicated: !!isDuplicate });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Log an append-only location save event to database discovery_saves.
   */
  async saveLocation(req, res, next) {
    try {
      const { spotId } = req.body;

      if (!spotId) {
        throw new ValidationError('Parameter spotId is required.');
      }

      if (!req.user || !req.user.id) {
        throw new ValidationError('Authentication is required to save locations.');
      }

      // Log save event (enforcing database unique index)
      try {
        await db('discovery_saves').insert({
          user_id: req.user.id,
          spot_id: spotId
        });
      } catch (dbErr) {
        if (dbErr.code === '23505') {
          // Already saved, return success gracefully
          return res.status(200).json({ success: true, alreadySaved: true });
        }
        throw dbErr;
      }

      return res.status(200).json({ success: true });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Calculate discovery telemetry metrics including Click-Through-Rate (CTR),
   * zero-result query frequencies, and detailed composite ranking distributions.
   */
  async getTelemetry(req, res, next) {
    try {
      const totalSearches = await db('discovery_searches').count('id as count').first();
      const countTotal = parseInt(totalSearches.count || 0, 10);

      if (countTotal === 0) {
        return res.status(200).json({
          success: true,
          ctr: 0.0,
          zeroResultFrequency: 0.0,
          abandonmentRate: 0.0,
          totalSearchesCount: 0
        });
      }

      const zeroSearches = await db('discovery_searches').where({ results_count: 0 }).count('id as count').first();
      const countZero = parseInt(zeroSearches.count || 0, 10);

      const abandonedSearches = await db('discovery_searches').where({ abandoned: true }).count('id as count').first();
      const countAbandoned = parseInt(abandonedSearches.count || 0, 10);

      const uniqueClickedSearches = countTotal - countAbandoned;
      const ctr = parseFloat(((uniqueClickedSearches / countTotal) * 100).toFixed(2));
      const zeroResultFrequency = parseFloat(((countZero / countTotal) * 100).toFixed(2));
      const abandonmentRate = parseFloat(((countAbandoned / countTotal) * 100).toFixed(2));

      // Calculate position click distributions to audit ranking effectiveness
      const clickPositions = await db('discovery_clicks')
        .select('rank')
        .count('id as count')
        .groupBy('rank')
        .orderBy('rank', 'asc')
        .limit(10);

      return res.status(200).json({
        success: true,
        totalSearchesCount: countTotal,
        ctr,
        zeroResultFrequency,
        abandonmentRate,
        clickPositions: clickPositions.map(c => ({
          rank: parseInt(c.rank, 10),
          clicks: parseInt(c.count, 10)
        }))
      });
    } catch (err) {
      next(err);
    }
  }
};
