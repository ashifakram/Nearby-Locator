/**
 * Migration: Add OTP Infrastructure Columns & Indexes
 */
export async function up(knex) {
  // 1. Evolve email_verification_tokens
  await knex.schema.alterTable('email_verification_tokens', (table) => {
    table.string('otp_code_hash', 64).nullable();
    table.integer('attempt_count').notNullable().defaultTo(0);
    table.index(['user_id', 'otp_code_hash'], 'idx_email_verif_user_otp');
  });

  // 2. Evolve password_reset_tokens
  await knex.schema.alterTable('password_reset_tokens', (table) => {
    table.string('otp_code_hash', 64).nullable();
    table.integer('attempt_count').notNullable().defaultTo(0);
    table.string('reset_grant_token_hash', 64).nullable();
    table.index(['user_id', 'otp_code_hash'], 'idx_pass_reset_user_otp');
    table.index(['user_id', 'reset_grant_token_hash'], 'idx_pass_reset_grant');
  });
}

export async function down(knex) {
  await knex.schema.alterTable('email_verification_tokens', (table) => {
    table.dropIndex(['user_id', 'otp_code_hash'], 'idx_email_verif_user_otp');
    table.dropColumn('otp_code_hash');
    table.dropColumn('attempt_count');
  });

  await knex.schema.alterTable('password_reset_tokens', (table) => {
    table.dropIndex(['user_id', 'otp_code_hash'], 'idx_pass_reset_user_otp');
    table.dropIndex(['user_id', 'reset_grant_token_hash'], 'idx_pass_reset_grant');
    table.dropColumn('otp_code_hash');
    table.dropColumn('attempt_count');
    table.dropColumn('reset_grant_token_hash');
  });
}
