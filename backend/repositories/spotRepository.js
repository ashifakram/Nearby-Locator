import db from '../db.js';
import { withTransientRetry } from '../utils/dbRetry.js';
import { handleDbError } from '../utils/dbErrors.js';
import { discoveryConfig } from '../config/discovery.js';

let isPostgisSupported = null;

// Dynamic check to determine if PostGIS is installed
async function checkPostgisSupport(trx = db) {
  if (isPostgisSupported !== null) return isPostgisSupported;
  try {
    const result = await trx.raw("SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'postgis') AS installed");
    isPostgisSupported = result.rows[0].installed;
  } catch (err) {
    isPostgisSupported = false;
  }
  return isPostgisSupported;
}

/**
 * Greedy Maximal Marginal Relevance style diversity re-ranking in Javascript.
 * Post-processes candidates, penalizing category monotony in generic discovery searches.
 */
export function applyCategoryDiversity(spots, limit) {
  if (spots.length === 0) return [];
  
  const result = [];
  const candidates = [...spots];
  
  let lastCategory = null;
  let consecutiveCount = 0;
  
  while (result.length < limit && candidates.length > 0) {
    let bestIndex = 0;
    let bestScore = -Infinity;
    
    for (let i = 0; i < candidates.length; i++) {
      const candidate = candidates[i];
      let score = candidate.composite_score;
      
      if (candidate.category === lastCategory) {
        score -= (0.10 * (consecutiveCount + 1));
      }
      
      if (score > bestScore) {
        bestScore = score;
        bestIndex = i;
      }
    }
    
    const chosen = candidates.splice(bestIndex, 1)[0];
    result.push(chosen);
    
    if (chosen.category === lastCategory) {
      consecutiveCount++;
    } else {
      lastCategory = chosen.category;
      consecutiveCount = 1;
    }
  }
  
  return result;
}

export const SpotRepository = {
  /**
   * Create a new spot. Location coordinate synchronization trigger handles building coordinates column.
   */
  async create({ name, category, latitude, longitude, rating = 0.0, address = null, is_active = true, creator_id = null }, trx = db) {
    try {
      return await withTransientRetry(() =>
        trx.transaction(async (innerTrx) => {
          const [newSpot] = await innerTrx('spots')
            .insert({
              name,
              category,
              latitude,
              longitude,
              rating,
              address,
              is_active,
              creator_id,
              created_at: innerTrx.fn.now(),
              updated_at: innerTrx.fn.now()
            })
            .returning('*');
          return newSpot;
        })
      );
    } catch (err) {
      throw handleDbError(err);
    }
  },

  /**
   * Find spot by ID.
   */
  async findById(id, trx = db) {
    try {
      return await withTransientRetry(() => trx('spots').where({ id }).first());
    } catch (err) {
      throw handleDbError(err);
    }
  },

  /**
   * Perform a robust, performance-optimized, stable nearby search.
   * Supports both simple distance-sorted nearby-search and dynamic explainable CTE composite relevance search.
   */
  async findNearby({ lat, lng, radius = 5000, limit = 20, category = null, lastDistance = null, lastId = null, discoverySearch = false, tsquery = null, intent = null }, trx = db) {
    try {
      const hasPostgis = await checkPostgisSupport(trx);
      
      const safeLimit = Math.min(Math.max(1, limit), 100);
      const safeRadius = Math.min(Math.max(1, radius), 50000); // strictly capped at 50km
      
      // Upper bound limit of coordinates scanned by GIST to protect CPU
      const maxScanLimit = 1000;
      
      // Cursor parsing
      const parsedLastDistance = lastDistance !== null ? parseFloat(lastDistance) : (discoverySearch ? 999999.0 : 0.0);
      const parsedLastId = lastId || null;

      // Extract dynamic configuration variables
      const w_dist = discoveryConfig.weights.distance;
      const w_pop = discoveryConfig.weights.popularity;
      const w_fresh = discoveryConfig.weights.freshness;
      const trendingBoostMax = discoveryConfig.weights.trendingBoostMax;
      const distanceScale = discoveryConfig.scales.distanceMeters;
      const freshnessDaysScale = discoveryConfig.scales.freshnessDays;
      const softDuplicatePenalty = discoveryConfig.penalties.softDuplicate;
      const densityMaxPenalty = discoveryConfig.penalties.densityMaxPenalty;
      const spamReportPenalty = discoveryConfig.penalties.spamReportWeight || 0.05;

      let query;
      let bindings;

      if (discoverySearch) {
        // Advanced Composite Ranking CTE Query
        if (hasPostgis) {
          let whereCategoryClause = '';
          if (category) {
            whereCategoryClause = 'AND s.category = :category';
          }
          
          let whereFtsClause = '';
          if (tsquery) {
            whereFtsClause = "AND to_tsvector('english', s.name || ' ' || s.category || ' ' || COALESCE(s.address, '')) @@ to_tsquery('english', :tsquery)";
          }

          query = `
            WITH candidates AS (
              SELECT 
                s.id, s.name, s.category, s.latitude, s.longitude, s.rating, s.address, s.is_active, s.created_at, s.updated_at,
                s.spam_score, s.reports_count, s.is_duplicate, s.coordinates, s.moderation_status,
                ROUND(ST_Distance(s.coordinates, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography)::numeric, 3) AS rounded_dist
              FROM spots s
              WHERE ST_DWithin(s.coordinates, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography, :radius)
                AND s.is_active = true
                AND s.moderation_status <> 'SUSPENDED'
                ${whereCategoryClause}
                ${whereFtsClause}
              ORDER BY s.coordinates <-> ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography
              LIMIT :maxScanLimit
            ),
            density_cte AS (
              SELECT 
                ROUND(latitude::numeric, 2) AS snap_lat, ROUND(longitude::numeric, 2) AS snap_lng,
                COUNT(*)::int AS count_spots
              FROM spots
              WHERE is_active = true
              GROUP BY ROUND(latitude::numeric, 2), ROUND(longitude::numeric, 2)
            ),
            engagement_cte AS (
              SELECT 
                c.id AS spot_id,
                COALESCE(COUNT(DISTINCT cl.id), 0)::int AS clicks_count,
                COALESCE(COUNT(DISTINCT sa.id), 0)::int AS saves_count,
                COALESCE(COUNT(DISTINCT CASE WHEN cl.created_at >= NOW() - INTERVAL '7 days' THEN cl.id END), 0)::int AS weekly_clicks_count,
                COALESCE(COUNT(DISTINCT CASE WHEN sa.created_at >= NOW() - INTERVAL '7 days' THEN sa.id END), 0)::int AS weekly_saves_count
              FROM candidates c
              LEFT JOIN discovery_clicks cl ON cl.spot_id = c.id
              LEFT JOIN discovery_saves sa ON sa.spot_id = c.id
              GROUP BY c.id
            ),
            duplicate_cte AS (
              SELECT 
                c1.id AS spot_id,
                EXISTS (
                  SELECT 1 
                  FROM spots s2
                  WHERE s2.id <> c1.id 
                    AND s2.is_active = true
                    AND (LOWER(s2.name) LIKE LOWER(c1.name) || '%' OR LOWER(c1.name) LIKE LOWER(s2.name) || '%')
                    AND ST_DWithin(s2.coordinates, c1.coordinates, 50)
                ) AS is_soft_duplicate
              FROM candidates c1
            ),
            scored_candidates AS (
              SELECT 
                c.id, c.name, c.category, c.latitude, c.longitude, c.rating, c.address, c.is_active, c.created_at, c.updated_at,
                c.spam_score, c.reports_count, c.is_duplicate, c.rounded_dist, c.moderation_status,
                e.clicks_count, e.saves_count, e.weekly_clicks_count, e.weekly_saves_count,
                COALESCE(d.count_spots, 1) AS density_grid_count,
                dup.is_soft_duplicate,
                -- Scoring metrics
                ROUND((1.0 / (1.0 + (c.rounded_dist / :distanceScale::numeric)))::numeric, 4) AS distance_score,
                ROUND((1.0 / (1.0 + (EXTRACT(EPOCH FROM (NOW() - c.updated_at)) / (86400.0 * :freshnessDaysScale::numeric))))::numeric, 4) AS freshness_score,
                ROUND((LN(1.0 + e.clicks_count * 1.0 + e.saves_count * 3.0) / (1.0 + LN(1.0 + e.clicks_count * 1.0 + e.saves_count * 3.0)))::numeric, 4) AS popularity_score,
                ROUND(((e.weekly_clicks_count * 1.0 + e.weekly_saves_count * 3.0) / (100.0 + e.weekly_clicks_count * 1.0 + e.weekly_saves_count * 3.0) * :trendingBoostMax::numeric)::numeric, 4) AS trending_boost,
                ROUND((c.spam_score + (c.reports_count::numeric * :spamReportPenalty::numeric) + CASE WHEN c.is_duplicate = true THEN 100.0 ELSE 0.0 END)::numeric, 4) AS spam_penalty,
                ROUND((CASE WHEN d.count_spots > 5 THEN LEAST(:densityMaxPenalty::numeric, (LN(d.count_spots - 4) / 12.0)) ELSE 0.0 END)::numeric, 4) AS density_penalty,
                ROUND((CASE WHEN dup.is_soft_duplicate = true THEN :softDuplicatePenalty::numeric ELSE 0.0 END)::numeric, 4) AS soft_duplicate_penalty,
                -- Overall composite score
                ROUND((
                  ((1.0 / (1.0 + (c.rounded_dist / :distanceScale::numeric))) * :w_dist::numeric) +
                  ((LN(1.0 + e.clicks_count * 1.0 + e.saves_count * 3.0) / (1.0 + LN(1.0 + e.clicks_count * 1.0 + e.saves_count * 3.0))) * :w_pop::numeric) +
                  ((1.0 / (1.0 + (EXTRACT(EPOCH FROM (NOW() - c.updated_at)) / (86400.0 * :freshnessDaysScale::numeric)))) * :w_fresh::numeric) +
                  ((e.weekly_clicks_count * 1.0 + e.weekly_saves_count * 3.0) / (100.0 + e.weekly_clicks_count * 1.0 + e.weekly_saves_count * 3.0) * :trendingBoostMax::numeric) -
                  (c.spam_score + (c.reports_count::numeric * :spamReportPenalty::numeric) + CASE WHEN c.is_duplicate = true THEN 100.0 ELSE 0.0 END) -
                  (CASE WHEN d.count_spots > 5 THEN LEAST(:densityMaxPenalty::numeric, (LN(d.count_spots - 4) / 12.0)) ELSE 0.0 END) -
                  (CASE WHEN dup.is_soft_duplicate = true THEN :softDuplicatePenalty::numeric ELSE 0.0 END) -
                  (CASE WHEN c.moderation_status = 'QUARANTINED' THEN 0.85 ELSE 0.0 END) +
                  (CASE WHEN :intentCheap = true THEN (CASE WHEN c.rating >= 4.0 THEN 0.15 ELSE 0.05 END) ELSE 0.0 END) +
                  (CASE WHEN :intentRepair = true THEN 0.10 ELSE 0.0 END)
                )::numeric, 4) AS composite_score
              FROM candidates c
              LEFT JOIN engagement_cte e ON e.spot_id = c.id
              LEFT JOIN density_cte d ON d.snap_lat = ROUND(c.latitude::numeric, 2) AND d.snap_lng = ROUND(c.longitude::numeric, 2)
              LEFT JOIN duplicate_cte dup ON dup.spot_id = c.id
            )
            SELECT *, (SELECT COUNT(*)::int FROM scored_candidates) AS rows_scanned
            FROM scored_candidates
            WHERE composite_score < :parsedLastDistance
               OR (composite_score = :parsedLastDistance AND (:parsedLastId::text IS NULL OR id > :parsedLastId::uuid))
            ORDER BY composite_score DESC, id ASC
            LIMIT :maxCandidatesLimit;
          `;
        } else {
          let whereCategoryClause = '';
          if (category) {
            whereCategoryClause = 'AND s.category = :category';
          }
          
          let whereFtsClause = '';
          if (tsquery) {
            whereFtsClause = "AND to_tsvector('english', s.name || ' ' || s.category || ' ' || COALESCE(s.address, '')) @@ to_tsquery('english', :tsquery)";
          }

          query = `
            WITH candidates AS (
              SELECT 
                s.id, s.name, s.category, s.latitude, s.longitude, s.rating, s.address, s.is_active, s.created_at, s.updated_at,
                s.spam_score, s.reports_count, s.is_duplicate, s.moderation_status,
                ROUND((6371000.0 * acos(LEAST(1.0, GREATEST(-1.0, 
                  sin(radians(:lat)) * sin(radians(latitude)) + 
                  cos(radians(:lat)) * cos(radians(latitude)) * 
                  cos(radians(longitude) - radians(:lng))
                ))))::numeric, 3) AS rounded_dist
              FROM spots s
              WHERE s.is_active = true
                AND s.moderation_status <> 'SUSPENDED'
                ${whereCategoryClause}
                ${whereFtsClause}
              ORDER BY s.coordinates <-> point(:lng, :lat)
              LIMIT :maxScanLimit
            ),
            density_cte AS (
              SELECT 
                ROUND(latitude::numeric, 2) AS snap_lat, ROUND(longitude::numeric, 2) AS snap_lng,
                COUNT(*)::int AS count_spots
              FROM spots
              WHERE is_active = true
              GROUP BY ROUND(latitude::numeric, 2), ROUND(longitude::numeric, 2)
            ),
            engagement_cte AS (
              SELECT 
                c.id AS spot_id,
                COALESCE(COUNT(DISTINCT cl.id), 0)::int AS clicks_count,
                COALESCE(COUNT(DISTINCT sa.id), 0)::int AS saves_count,
                COALESCE(COUNT(DISTINCT CASE WHEN cl.created_at >= NOW() - INTERVAL '7 days' THEN cl.id END), 0)::int AS weekly_clicks_count,
                COALESCE(COUNT(DISTINCT CASE WHEN sa.created_at >= NOW() - INTERVAL '7 days' THEN sa.id END), 0)::int AS weekly_saves_count
              FROM candidates c
              LEFT JOIN discovery_clicks cl ON cl.spot_id = c.id
              LEFT JOIN discovery_saves sa ON sa.spot_id = c.id
              GROUP BY c.id
            ),
            duplicate_cte AS (
              SELECT 
                c1.id AS spot_id,
                EXISTS (
                  SELECT 1 
                  FROM spots s2
                  WHERE s2.id <> c1.id 
                    AND s2.is_active = true
                    AND (LOWER(s2.name) LIKE LOWER(c1.name) || '%' OR LOWER(c1.name) LIKE LOWER(s2.name) || '%')
                    AND (6371000.0 * acos(LEAST(1.0, sin(radians(s2.latitude)) * sin(radians(c1.latitude)) + cos(radians(s2.latitude)) * cos(radians(c1.latitude)) * cos(radians(s2.longitude) - radians(c1.longitude))))) <= 50
                ) AS is_soft_duplicate
              FROM candidates c1
            ),
            scored_candidates AS (
              SELECT 
                c.id, c.name, c.category, c.latitude, c.longitude, c.rating, c.address, c.is_active, c.created_at, c.updated_at,
                c.spam_score, c.reports_count, c.is_duplicate, c.rounded_dist, c.moderation_status,
                e.clicks_count, e.saves_count, e.weekly_clicks_count, e.weekly_saves_count,
                COALESCE(d.count_spots, 1) AS density_grid_count,
                dup.is_soft_duplicate,
                -- Scoring metrics
                ROUND((1.0 / (1.0 + (c.rounded_dist / :distanceScale::numeric)))::numeric, 4) AS distance_score,
                ROUND((1.0 / (1.0 + (EXTRACT(EPOCH FROM (NOW() - c.updated_at)) / (86400.0 * :freshnessDaysScale::numeric))))::numeric, 4) AS freshness_score,
                ROUND((LN(1.0 + e.clicks_count * 1.0 + e.saves_count * 3.0) / (1.0 + LN(1.0 + e.clicks_count * 1.0 + e.saves_count * 3.0)))::numeric, 4) AS popularity_score,
                ROUND(((e.weekly_clicks_count * 1.0 + e.weekly_saves_count * 3.0) / (100.0 + e.weekly_clicks_count * 1.0 + e.weekly_saves_count * 3.0) * :trendingBoostMax::numeric)::numeric, 4) AS trending_boost,
                ROUND((c.spam_score + (c.reports_count::numeric * :spamReportPenalty::numeric) + CASE WHEN c.is_duplicate = true THEN 100.0 ELSE 0.0 END)::numeric, 4) AS spam_penalty,
                ROUND((CASE WHEN d.count_spots > 5 THEN LEAST(:densityMaxPenalty::numeric, (LN(d.count_spots - 4) / 12.0)) ELSE 0.0 END)::numeric, 4) AS density_penalty,
                ROUND((CASE WHEN dup.is_soft_duplicate = true THEN :softDuplicatePenalty::numeric ELSE 0.0 END)::numeric, 4) AS soft_duplicate_penalty,
                -- Overall composite score
                ROUND((
                  ((1.0 / (1.0 + (c.rounded_dist / :distanceScale::numeric))) * :w_dist::numeric) +
                  ((LN(1.0 + e.clicks_count * 1.0 + e.saves_count * 3.0) / (1.0 + LN(1.0 + e.clicks_count * 1.0 + e.saves_count * 3.0))) * :w_pop::numeric) +
                  ((1.0 / (1.0 + (EXTRACT(EPOCH FROM (NOW() - c.updated_at)) / (86400.0 * :freshnessDaysScale::numeric)))) * :w_fresh::numeric) +
                  ((e.weekly_clicks_count * 1.0 + e.weekly_saves_count * 3.0) / (100.0 + e.weekly_clicks_count * 1.0 + e.weekly_saves_count * 3.0) * :trendingBoostMax::numeric) -
                  (c.spam_score + (c.reports_count::numeric * :spamReportPenalty::numeric) + CASE WHEN c.is_duplicate = true THEN 100.0 ELSE 0.0 END) -
                  (CASE WHEN d.count_spots > 5 THEN LEAST(:densityMaxPenalty::numeric, (LN(d.count_spots - 4) / 12.0)) ELSE 0.0 END) -
                  (CASE WHEN dup.is_soft_duplicate = true THEN :softDuplicatePenalty::numeric ELSE 0.0 END) -
                  (CASE WHEN c.moderation_status = 'QUARANTINED' THEN 0.85 ELSE 0.0 END) +
                  (CASE WHEN :intentCheap = true THEN (CASE WHEN c.rating >= 4.0 THEN 0.15 ELSE 0.05 END) ELSE 0.0 END) +
                  (CASE WHEN :intentRepair = true THEN 0.10 ELSE 0.0 END)
                )::numeric, 4) AS composite_score
              FROM candidates c
              LEFT JOIN engagement_cte e ON e.spot_id = c.id
              LEFT JOIN density_cte d ON d.snap_lat = ROUND(c.latitude::numeric, 2) AND d.snap_lng = ROUND(c.longitude::numeric, 2)
              LEFT JOIN duplicate_cte dup ON dup.spot_id = c.id
              WHERE c.rounded_dist <= :radius
            )
            SELECT *, (SELECT COUNT(*)::int FROM scored_candidates) AS rows_scanned
            FROM scored_candidates
            WHERE composite_score < :parsedLastDistance
               OR (composite_score = :parsedLastDistance AND (:parsedLastId::text IS NULL OR id > :parsedLastId::uuid))
            ORDER BY composite_score DESC, id ASC
            LIMIT :maxCandidatesLimit;
          `;
        }

        bindings = {
          lat,
          lng,
          radius: safeRadius,
          category,
          maxScanLimit,
          parsedLastDistance,
          parsedLastId,
          maxCandidatesLimit: category ? safeLimit : 50, // Bypass diversity fetch expansion if target category active
          w_dist,
          w_pop,
          w_fresh,
          trendingBoostMax,
          distanceScale,
          freshnessDaysScale,
          softDuplicatePenalty,
          densityMaxPenalty,
          spamReportPenalty,
          tsquery: tsquery || null,
          intentCheap: intent && intent.cheap ? true : false,
          intentRepair: intent && intent.repair ? true : false
        };
      } else {
        // Standard Distance-Sorted query (Backward Compatible & fast)
        if (hasPostgis) {
          let whereCategoryClause = '';
          if (category) {
            whereCategoryClause = 'AND category = :category';
          }
          
          let whereFtsStandardClause = '';
          if (tsquery) {
            whereFtsStandardClause = "AND to_tsvector('english', name || ' ' || category || ' ' || COALESCE(address, '')) @@ to_tsquery('english', :tsquery)";
          }

          query = `
            WITH distance_cte AS (
              SELECT 
                id, name, category, latitude, longitude, rating, address, is_active,
                ROUND(ST_Distance(coordinates, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography)::numeric, 3) AS rounded_dist
              FROM spots
              WHERE ST_DWithin(coordinates, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography, :radius)
                AND is_active = true
                AND moderation_status <> 'QUARANTINED'
                AND moderation_status <> 'SUSPENDED'
                ${whereCategoryClause}
                ${whereFtsStandardClause}
              ORDER BY coordinates <-> ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography
              LIMIT :maxScanLimit
            )
            SELECT *, (SELECT COUNT(*)::int FROM distance_cte) AS rows_scanned
            FROM distance_cte
            WHERE rounded_dist > :parsedLastDistance
               OR (rounded_dist = :parsedLastDistance AND (:parsedLastId::text IS NULL OR id > :parsedLastId::uuid))
            ORDER BY rounded_dist ASC, id ASC
            LIMIT :safeLimit;
          `;

          bindings = {
            lat,
            lng,
            radius: safeRadius,
            category,
            maxScanLimit,
            parsedLastDistance,
            parsedLastId,
            safeLimit,
            tsquery: tsquery || null
          };
        } else {
          let whereCategoryClause = '';
          if (category) {
            whereCategoryClause = 'AND category = :category';
          }
          
          let whereFtsStandardClause = '';
          if (tsquery) {
            whereFtsStandardClause = "AND to_tsvector('english', name || ' ' || category || ' ' || COALESCE(address, '')) @@ to_tsquery('english', :tsquery)";
          }

          query = `
            WITH distance_cte AS (
              SELECT 
                id, name, category, latitude, longitude, rating, address, is_active,
                ROUND((6371000.0 * acos(LEAST(1.0, GREATEST(-1.0, 
                  sin(radians(:lat)) * sin(radians(latitude)) + 
                  cos(radians(:lat)) * cos(radians(latitude)) * 
                  cos(radians(longitude) - radians(:lng))
                ))))::numeric, 3) AS rounded_dist
              FROM spots
              WHERE is_active = true
                AND moderation_status <> 'QUARANTINED'
                AND moderation_status <> 'SUSPENDED'
                ${whereCategoryClause}
                ${whereFtsStandardClause}
              ORDER BY coordinates <-> point(:lng, :lat)
              LIMIT :maxScanLimit
            )
            SELECT *, (SELECT COUNT(*)::int FROM distance_cte) AS rows_scanned
            FROM distance_cte
            WHERE rounded_dist <= :radius
              AND (
                rounded_dist > :parsedLastDistance
                OR (rounded_dist = :parsedLastDistance AND (:parsedLastId::text IS NULL OR id > :parsedLastId::uuid))
              )
            ORDER BY rounded_dist ASC, id ASC
            LIMIT :safeLimit;
          `;

          bindings = {
            lat,
            lng,
            radius: safeRadius,
            category,
            maxScanLimit,
            parsedLastDistance,
            parsedLastId,
            safeLimit,
            tsquery: tsquery || null
          };
        }
      }

      const result = await withTransientRetry(() => trx.raw(query, bindings));
      const results = result.rows || [];

      // Determine rows scanned
      const rowsScanned = results.length > 0 ? results[0].rows_scanned : 0;
      
      // Map back properties
      let data = results.map(row => {
        const { rows_scanned, ...spotData } = row;
        spotData.latitude = parseFloat(spotData.latitude);
        spotData.longitude = parseFloat(spotData.longitude);
        spotData.rounded_dist = parseFloat(spotData.rounded_dist);
        if (discoverySearch) {
          spotData.composite_score = parseFloat(spotData.composite_score);
          spotData.distance_score = parseFloat(spotData.distance_score);
          spotData.freshness_score = parseFloat(spotData.freshness_score);
          spotData.popularity_score = parseFloat(spotData.popularity_score);
          spotData.trending_boost = parseFloat(spotData.trending_boost);
          spotData.spam_penalty = parseFloat(spotData.spam_penalty);
          spotData.density_penalty = parseFloat(spotData.density_penalty);
          spotData.soft_duplicate_penalty = parseFloat(spotData.soft_duplicate_penalty);
        }
        return spotData;
      });

      // 4. Apply Category Diversity Post-Processing if Discovery Search and no explicit category set
      if (discoverySearch && !category) {
        data = applyCategoryDiversity(data, safeLimit);
      }

      // Encode next page cursor
      let nextCursor = null;
      if (results.length >= safeLimit && data.length > 0) {
        const lastItem = data[data.length - 1];
        const cursorField = discoverySearch ? lastItem.composite_score : lastItem.rounded_dist;
        nextCursor = Buffer.from(`${cursorField}|${lastItem.id}`).toString('base64');
      }

      return {
        data,
        nextCursor,
        rowsScanned
      };
    } catch (err) {
      throw handleDbError(err);
    }
  },

  /**
   * Zoom-aware map clustering query.
   * Leverages numeric AVG averages to completely avoid memory-intensive ST_Collect/ST_Centroid,
   * EPSG:3857 projecting for scale-ready meter grids, and strict marker counts ceiling.
   */
  async getMapClusters({ lat, lng, radius = 10000, zoom = 12 }, trx = db) {
    try {
      const hasPostgis = await checkPostgisSupport(trx);
      
      const safeRadius = Math.min(Math.max(1, radius), 50000); // 50km ceiling
      const safeZoom = Math.min(Math.max(0, zoom), 20);

      // Translate zoom levels to meter-based or degree-based snapping cell grids
      // Zoom levels range from 0 (world) to 20 (street). Scale-ready meters represent uniform sizes.
      let query;
      let bindings;

      if (hasPostgis) {
        // PostGIS Meter-Based EPSG:3857 Grid snaptogrid with AVG centroids (bounds memory)
        let meterGridSize = 2000; // default for zoom 12
        if (safeZoom >= 15) meterGridSize = 100;    // zoom 15+: detailed
        else if (safeZoom >= 13) meterGridSize = 500;  // zoom 13-14: ~500m
        else if (safeZoom >= 11) meterGridSize = 2000; // zoom 11-12: ~2km
        else if (safeZoom >= 8) meterGridSize = 10000; // zoom 8-10: ~10km
        else if (safeZoom >= 5) meterGridSize = 40000; // zoom 5-7: ~40km
        else meterGridSize = 150000;                   // zoom < 5: large regions

        query = `
          SELECT 
            ROUND(AVG(latitude)::numeric, 6)::float AS latitude,
            ROUND(AVG(longitude)::numeric, 6)::float AS longitude,
            COUNT(*)::int AS count,
            MIN(id::text) AS representative_id,
            MIN(name) AS representative_name
          FROM spots
          WHERE ST_DWithin(coordinates, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography, :radius)
            AND is_active = true
          GROUP BY ST_SnapToGrid(ST_Transform(coordinates::geometry, 3857), :meterGridSize)
          LIMIT 500; -- Strict cluster count safeguard
        `;

        bindings = { lat, lng, radius: safeRadius, meterGridSize };
      } else {
        // Planar Degree-Based SnapToGrid AVG centroids fallback
        let degreeGridSize = 0.02; // default
        if (safeZoom >= 15) degreeGridSize = 0.001;    // very dense
        else if (safeZoom >= 13) degreeGridSize = 0.005;
        else if (safeZoom >= 11) degreeGridSize = 0.02;
        else if (safeZoom >= 8) degreeGridSize = 0.1;
        else if (safeZoom >= 5) degreeGridSize = 0.4;
        else degreeGridSize = 1.5;

        query = `
          SELECT 
            ROUND(AVG(latitude)::numeric, 6)::float AS latitude,
            ROUND(AVG(longitude)::numeric, 6)::float AS longitude,
            COUNT(*)::int AS count,
            MIN(id::text) AS representative_id,
            MIN(name) AS representative_name
          FROM spots
          WHERE is_active = true
            AND (6371000.0 * acos(LEAST(1.0, GREATEST(-1.0, 
                sin(radians(:lat)) * sin(radians(latitude)) + 
                cos(radians(:lat)) * cos(radians(latitude)) * 
                cos(radians(longitude) - radians(:lng))
              )))) <= :radius
          GROUP BY 
            ROUND(latitude / :degreeGridSize) * :degreeGridSize,
            ROUND(longitude / :degreeGridSize) * :degreeGridSize
          LIMIT 500; -- Strict cluster count safeguard
        `;

        bindings = { lat, lng, radius: safeRadius, degreeGridSize };
      }

      const result = await withTransientRetry(() => trx.raw(query, bindings));
      return result.rows || [];
    } catch (err) {
      throw handleDbError(err);
    }
  }
};
