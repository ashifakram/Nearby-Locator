/**
 * Migration: Create user_oauth_accounts table for provider-agnostic identity resolution.
 */

export async function up(knex) {
  await knex.schema.createTable('user_oauth_accounts', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE').notNullable();
    table.string('provider', 50).notNullable(); // e.g., 'google', 'apple'
    table.string('provider_user_id', 255).notNullable(); // e.g., google 'sub'
    table.string('email', 255).notNullable();
    table.boolean('is_email_verified').notNullable().defaultTo(false);
    
    // Lifecycle: ACTIVE, UNLINKED, REVOKED_BY_PROVIDER, DISABLED
    table.string('lifecycle_status', 50).notNullable().defaultTo('ACTIVE');
    
    table.timestamp('linked_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('last_login_at').nullable();
    
    // Strictly validated at app level (e.g., {hd, picture, locale} or {is_private_email})
    table.jsonb('metadata').notNullable().defaultTo('{}');

    // Indexes & Constraints
    table.unique(['provider', 'provider_user_id'], 'idx_oauth_provider_uid');
    table.index(['user_id'], 'idx_oauth_user_id');
  });

  // Safe Backfill: Copy existing google users over without dropping columns yet
  await knex.raw(`
    INSERT INTO user_oauth_accounts (
      user_id, provider, provider_user_id, email, is_email_verified, lifecycle_status, metadata
    )
    SELECT 
      id, 'google', google_id, email, true, 'ACTIVE', '{}'::jsonb
    FROM users
    WHERE provider = 'google' AND google_id IS NOT NULL
  `);
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('user_oauth_accounts');
}
