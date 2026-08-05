/**
 * Migration: Add terms & privacy agreement columns to users table
 * agreed_to_terms: boolean, default false
 * agreed_to_terms_at: timestamp, nullable
 */
export async function up(knex) {
  await knex.schema.alterTable('users', (table) => {
    table.boolean('agreed_to_terms').notNullable().defaultTo(false);
    table.timestamp('agreed_to_terms_at').nullable();
  });
}

export async function down(knex) {
  await knex.schema.alterTable('users', (table) => {
    table.dropColumn('agreed_to_terms');
    table.dropColumn('agreed_to_terms_at');
  });
}
