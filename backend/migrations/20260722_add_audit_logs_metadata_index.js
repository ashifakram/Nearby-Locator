/**
 * Migration: Add GIN index on audit_logs metadata for correlation ID searching
 */

export async function up(knex) {
  await knex.schema.alterTable('audit_logs', (table) => {
    table.index('metadata', 'idx_audit_logs_metadata', 'GIN');
  });
}

export async function down(knex) {
  await knex.schema.alterTable('audit_logs', (table) => {
    table.dropIndex('metadata', 'idx_audit_logs_metadata');
  });
}
