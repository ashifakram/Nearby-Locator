export async function up(knex) {
  // 1. Modify user_sessions table to support true family lineage tracking
  await knex.schema.alterTable('user_sessions', (table) => {
    table.dropColumn('session_token');
    table.uuid('session_family_id').notNullable();
    table.string('refresh_token_hash', 64).notNullable();
    table.boolean('is_rotated').defaultTo(false).notNullable();
    table.string('ip_address', 45);
    table.string('user_agent', 255);
    table.boolean('is_revoked').defaultTo(false).notNullable();
    
    // Add indices for speedy lineage revocations and token queries
    table.index(['session_family_id'], 'idx_user_sessions_family');
    table.index(['refresh_token_hash'], 'idx_user_sessions_token_hash');
  });

  // 2. Add password reset and email verification columns to users table
  await knex.schema.alterTable('users', (table) => {
    table.string('password_reset_token_hash', 64);
    table.timestamp('password_reset_expires_at');
    table.string('email_verification_token_hash', 64);
    table.timestamp('email_verification_expires_at');
    table.timestamp('last_reset_request_at');
    table.timestamp('last_verification_request_at');
  });
}

export async function down(knex) {
  // Truncate existing sessions to prevent NOT NULL constraint violations on session_token restore
  await knex('user_sessions').del();

  await knex.schema.alterTable('user_sessions', (table) => {
    table.dropIndex(['session_family_id'], 'idx_user_sessions_family');
    table.dropIndex(['refresh_token_hash'], 'idx_user_sessions_token_hash');
    table.dropColumn('refresh_token_hash');
    table.dropColumn('session_family_id');
    table.dropColumn('is_rotated');
    table.dropColumn('ip_address');
    table.dropColumn('user_agent');
    table.dropColumn('is_revoked');
    table.string('session_token').notNullable().unique('uq_user_sessions_token');
  });

  await knex.schema.alterTable('users', (table) => {
    table.dropColumn('password_reset_token_hash');
    table.dropColumn('password_reset_expires_at');
    table.dropColumn('email_verification_token_hash');
    table.dropColumn('email_verification_expires_at');
    table.dropColumn('last_reset_request_at');
    table.dropColumn('last_verification_request_at');
  });
}
