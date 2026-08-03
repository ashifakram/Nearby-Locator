/**
 * Migration: Expand users.status check constraint to support full authentication lifecycle
 * and enforce canonical UPPERCASE casing convention.
 */

export async function up(knex) {
  // 1. Drop the legacy restrictive check constraint
  await knex.raw('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_status_check');
  
  // 2. Standardize casing using explicit CASE mapping for known legacy values
  await knex.raw(`
    UPDATE users SET status = CASE 
      WHEN status = 'active' THEN 'ACTIVE'
      WHEN status = 'disabled' THEN 'DISABLED'
      ELSE status
    END
  `);

  // 3. Set default column value to uppercase 'ACTIVE' to match constraint
  await knex.raw("ALTER TABLE users ALTER COLUMN status SET DEFAULT 'ACTIVE'");

  // 4. Add the expanded check constraint enforcing the canonical catalog
  await knex.raw(`
    ALTER TABLE users 
    ADD CONSTRAINT users_status_check 
    CHECK (status IN ('ACTIVE', 'DISABLED', 'PENDING_VERIFICATION', 'LOCKED', 'BANNED', 'SOFT_DELETED'))
  `);
}

export async function down(knex) {
  // Explicitly Irreversible Migration
  // Rolling back would require blindly assigning active/disabled to users currently marked as 
  // PENDING_VERIFICATION, LOCKED, BANNED, or SOFT_DELETED, causing destructive data loss 
  // of their true lifecycle state.
  throw new Error('Irreversible migration: users.status lifecycle expansion cannot be rolled back without data loss.');
}
