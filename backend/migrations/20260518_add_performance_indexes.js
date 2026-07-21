export async function up(knex) {
  // 1. Add Index to user_sessions Foreign Key and Token lookups
  await knex.schema.alterTable('user_sessions', (table) => {
    table.index(['user_id'], 'idx_user_sessions_user_id');
    table.unique(['session_token'], 'uq_user_sessions_token');
  });

  // 2. Add Composite Partial Indexes to login_attempts for failed brute-force check scans
  // Indexes ONLY failures where is_successful = false to reduce physical size by ~99%
  await knex.schema.raw(`
    CREATE INDEX idx_login_attempts_email_failures 
    ON login_attempts (email, attempted_at) 
    WHERE is_successful = false
  `);

  await knex.schema.raw(`
    CREATE INDEX idx_login_attempts_ip_failures 
    ON login_attempts (ip_address, attempted_at) 
    WHERE is_successful = false
  `);

  // 3. Add Index to system_errors for chronological sorting
  await knex.schema.alterTable('system_errors', (table) => {
    table.index(['occurred_at'], 'idx_system_errors_occurred');
  });
}

export async function down(knex) {
  await knex.schema.alterTable('user_sessions', (table) => {
    table.dropIndex(['user_id'], 'idx_user_sessions_user_id');
    table.dropUnique(['session_token'], 'uq_user_sessions_token');
  });

  await knex.schema.raw('DROP INDEX IF EXISTS idx_login_attempts_email_failures');
  await knex.schema.raw('DROP INDEX IF EXISTS idx_login_attempts_ip_failures');

  await knex.schema.alterTable('system_errors', (table) => {
    table.dropIndex(['occurred_at'], 'idx_system_errors_occurred');
  });
}
