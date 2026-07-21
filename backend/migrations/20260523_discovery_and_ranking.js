/**
 * Migration: Create discovery telemetry tables and alter spots table with popularity/spam indexes.
 */
export async function up(knex) {
  // 1. Alter spots table to add metadata columns
  await knex.schema.alterTable('spots', (table) => {
    table.double('spam_score').defaultTo(0.0).notNullable();
    table.integer('reports_count').defaultTo(0).notNullable();
    table.boolean('is_duplicate').defaultTo(false).notNullable();
  });

  // 2. Create discovery_searches table (append-only)
  await knex.schema.createTable('discovery_searches', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').references('id').inTable('users').onDelete('SET NULL');
    table.string('query_text', 255).nullable();
    table.string('category', 100).nullable();
    table.double('latitude').notNullable();
    table.double('longitude').notNullable();
    table.integer('results_count').notNullable().defaultTo(0);
    table.boolean('abandoned').notNullable().defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable();

    table.index('created_at');
    table.index('user_id');
  });

  // 3. Create discovery_clicks table (append-only)
  await knex.schema.createTable('discovery_clicks', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('search_id').references('id').inTable('discovery_searches').onDelete('CASCADE').notNullable();
    table.uuid('spot_id').references('id').inTable('spots').onDelete('CASCADE').notNullable();
    table.integer('rank').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable();

    table.index('created_at');
    table.index('spot_id');
    table.index('search_id');
  });

  // 4. Create discovery_saves table (append-only saves)
  await knex.schema.createTable('discovery_saves', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE').notNullable();
    table.uuid('spot_id').references('id').inTable('spots').onDelete('CASCADE').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable();

    table.unique(['user_id', 'spot_id']);
    table.index('created_at');
    table.index('spot_id');
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('discovery_saves');
  await knex.schema.dropTableIfExists('discovery_clicks');
  await knex.schema.dropTableIfExists('discovery_searches');

  await knex.schema.alterTable('spots', (table) => {
    table.dropColumn('spam_score');
    table.dropColumn('reports_count');
    table.dropColumn('is_duplicate');
  });
}
