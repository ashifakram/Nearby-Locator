/**
 * Migration: Add role column to users table for RBAC.
 */
export async function up(knex) {
  await knex.schema.alterTable('users', (table) => {
    table.string('role', 20).notNullable().defaultTo('user');
    table.index(['role'], 'idx_users_role');
  });
}

export async function down(knex) {
  await knex.schema.alterTable('users', (table) => {
    table.dropIndex(['role'], 'idx_users_role');
    table.dropColumn('role');
  });
}
