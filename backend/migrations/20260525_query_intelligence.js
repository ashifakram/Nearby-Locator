/**
 * Migration: Create synonyms, vocabulary, autocomplete registries, and alter discovery_searches.
 */
export async function up(knex) {
  // 1. Enable pg_trgm extension for fast trigram index lookups
  await knex.raw('CREATE EXTENSION IF NOT EXISTS pg_trgm');

  // 2. Curated Category-Aware Search Synonyms table
  await knex.schema.createTable('search_synonyms', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('source_phrase', 255).notNullable();
    table.string('target_phrase', 255).notNullable();
    table.string('restricted_category', 100).nullable();
    table.float('weight').defaultTo(1.0).notNullable();
    table.boolean('bi_directional').defaultTo(true).notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable();

    table.unique(['source_phrase', 'target_phrase']);
    table.index(['source_phrase']);
  });

  // 3. Search Vocabulary dictionary cache for typo corrections
  await knex.schema.createTable('search_terms', (table) => {
    table.string('term', 100).primary();
    table.integer('frequency').defaultTo(1).notNullable();
    table.timestamp('updated_at').defaultTo(knex.fn.now()).notNullable();
  });
  await knex.raw('CREATE INDEX idx_search_terms_trgm ON search_terms USING GIN (term gin_trgm_ops)');

  // 4. Autocomplete Suggestions (abuse-gated registry)
  await knex.schema.createTable('search_suggestions', (table) => {
    table.string('phrase', 255).primary();
    table.integer('frequency').defaultTo(1).notNullable();
    table.boolean('is_blocked').defaultTo(false).notNullable();
    table.timestamp('updated_at').defaultTo(knex.fn.now()).notNullable();
  });
  await knex.raw('CREATE INDEX idx_search_suggestions_trgm ON search_suggestions USING GIN (phrase gin_trgm_ops)');

  // 5. Add search quality telemetry columns to discovery_searches
  await knex.schema.alterTable('discovery_searches', (table) => {
    table.string('raw_query', 255).nullable();
    table.string('normalized_query', 255).nullable();
    table.string('corrected_query', 255).nullable();
    table.string('did_you_mean', 255).nullable();
    table.jsonb('intent_detected').nullable();
    table.jsonb('recovery_details').nullable();
    table.boolean('is_typo_corrected').defaultTo(false).notNullable();
    table.boolean('is_synonym_expanded').defaultTo(false).notNullable();
  });
}

export async function down(knex) {
  await knex.schema.alterTable('discovery_searches', (table) => {
    table.dropColumns([
      'raw_query', 'normalized_query', 'corrected_query', 'did_you_mean',
      'intent_detected', 'recovery_details', 'is_typo_corrected', 'is_synonym_expanded'
    ]);
  });
  await knex.schema.dropTableIfExists('search_suggestions');
  await knex.schema.dropTableIfExists('search_terms');
  await knex.schema.dropTableIfExists('search_synonyms');
}
