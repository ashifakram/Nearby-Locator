/**
 * Migration: Create email_verification_tokens and password_reset_tokens tables
 */

export async function up(knex) {
  // Create email_verification_tokens table
  await knex.schema.createTable('email_verification_tokens', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE').notNullable();
    table.string('token_hash').notNullable().unique(); // Explicit unique index
    table.timestamp('expires_at').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable();
    table.timestamp('consumed_at').nullable();
    
    // Indexes for fast lookups and cleanup
    table.index(['user_id'], 'idx_evt_user_id');
    table.index(['expires_at'], 'idx_evt_expires_at');
  });

  // Create password_reset_tokens table
  await knex.schema.createTable('password_reset_tokens', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE').notNullable();
    table.string('token_hash').notNullable().unique(); // Explicit unique index
    table.timestamp('expires_at').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable();
    table.timestamp('consumed_at').nullable();
    table.timestamp('invalidated_at').nullable(); // Password resets support explicit invalidation
    
    // Indexes for fast lookups and cleanup
    table.index(['user_id'], 'idx_prt_user_id');
    table.index(['expires_at'], 'idx_prt_expires_at');
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('password_reset_tokens');
  await knex.schema.dropTableIfExists('email_verification_tokens');
}
