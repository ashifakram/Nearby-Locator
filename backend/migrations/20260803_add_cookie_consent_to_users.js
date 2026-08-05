/**
 * Migration: Add cookie_consent column to user_preferences table
 * Stores per-user cookie preference selections as JSONB
 * Shape: { functional: bool, analytics: bool, saved_at: ISO string }
 */
export async function up(knex) {
  await knex.schema.alterTable('user_preferences', (table) => {
    table.jsonb('cookie_consent').nullable().defaultTo(null);
  });
}

export async function down(knex) {
  await knex.schema.alterTable('user_preferences', (table) => {
    table.dropColumn('cookie_consent');
  });
}
