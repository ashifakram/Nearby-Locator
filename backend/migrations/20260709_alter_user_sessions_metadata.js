/**
 * Migration: Add metadata to user_sessions to support enterprise device analytics.
 */

export async function up(knex) {
  await knex.schema.alterTable('user_sessions', (table) => {
    table.jsonb('metadata').notNullable().defaultTo('{}');
  });
}

export async function down(knex) {
  await knex.schema.alterTable('user_sessions', (table) => {
    table.dropColumn('metadata');
  });
}
