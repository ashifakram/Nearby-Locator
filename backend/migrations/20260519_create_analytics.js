/**
 * Migration: Create analytics_events (raw) and daily_analytics_rollups tables.
 *
 * Dual-layer strategy:
 *   - analytics_events:         High-fidelity raw events, pruned at 30 days.
 *   - daily_analytics_rollups:  Compact daily aggregate rows, retained permanently.
 */
export async function up(knex) {
  // 1. Raw product + security event log
  await knex.schema.createTable('analytics_events', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Queryable scalar dimensions — NOT pushed into JSONB to allow B-tree index speed
    table.string('event_type', 20).notNullable();   // 'PRODUCT' | 'SECURITY'
    table.string('event_name', 50).notNullable();   // from allowlist enum
    table.integer('schema_version').defaultTo(1).notNullable();

    // Relational reference only — never store email/name/PII directly
    table.uuid('user_id').references('id').inTable('users').onDelete('SET NULL').nullable();
    table.uuid('request_id').nullable(); // Correlation trace ID from AsyncLocalStorage

    // Anonymised IP (last octet zeroed, e.g. 198.51.100.XXX) — never raw IP
    table.string('ip_hash', 20).nullable();

    // JSONB strictly for non-queryable supplementary attributes.
    // High-cardinality dimensions that are frequently queried MUST be promoted
    // to dedicated physical columns with B-tree indexes rather than stored here.
    table.jsonb('payload').notNullable().defaultTo('{}');

    table.timestamp('occurred_at').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable();

    // Composite B-tree indexes for time-scoped rollup queries and pruning sweeps
    table.index(['occurred_at'], 'idx_ae_occurred');
    table.index(['event_name', 'occurred_at'], 'idx_ae_name_occurred');
    table.index(['event_type', 'occurred_at'], 'idx_ae_type_occurred');
    table.index(['user_id', 'occurred_at'], 'idx_ae_user_occurred');
  });

  // 2. Pre-aggregated daily rollup table — 1 row per calendar date, retained permanently
  await knex.schema.createTable('daily_analytics_rollups', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.date('rollup_date').unique().notNullable(); // Unique per calendar day

    // Core active-user counts (populated by daily rollup worker)
    table.integer('dau').defaultTo(0).notNullable();   // Daily Active Users
    table.integer('wau').defaultTo(0).notNullable();   // Weekly (trailing 7d)
    table.integer('mau').defaultTo(0).notNullable();   // Monthly (trailing 30d)
    table.integer('new_signups').defaultTo(0).notNullable();

    // Per-event-name occurrence counts: { "search_executed": 1203, "favorites_toggled": 44 }
    // JSONB is appropriate here: not queried at event granularity — only read as blobs for dashboards
    table.jsonb('event_counts').notNullable().defaultTo('{}');

    // Funnel conversion metrics: { "registered_to_search_pct": 83.5, "search_to_detail_pct": 61.2 }
    table.jsonb('funnel_metrics').notNullable().defaultTo('{}');

    // Security anomaly summary: { "replays": 2, "rate_limits": 45, "suspicious_logins": 3 }
    table.jsonb('security_summary').notNullable().defaultTo('{}');

    table.timestamp('computed_at').defaultTo(knex.fn.now()).notNullable();
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('daily_analytics_rollups');
  await knex.schema.dropTableIfExists('analytics_events');
}
