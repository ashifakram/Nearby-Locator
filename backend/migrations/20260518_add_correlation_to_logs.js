export async function up(knex) {
  // 1. Add request_id column to system_errors table for tracking unhandled operational crashes
  await knex.schema.alterTable('system_errors', (table) => {
    table.string('request_id', 36);
  });

  // 2. Add request_id column to login_attempts table for audit timeline correlations
  await knex.schema.alterTable('login_attempts', (table) => {
    table.string('request_id', 36);
  });
}

export async function down(knex) {
  await knex.schema.alterTable('system_errors', (table) => {
    table.dropColumn('request_id');
  });

  await knex.schema.alterTable('login_attempts', (table) => {
    table.dropColumn('request_id');
  });
}
