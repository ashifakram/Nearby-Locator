/**
 * DEVELOPMENT ONLY — Super Admin Seed Script
 *
 * Creates a local Super Admin account for development testing.
 * - Idempotent: safe to run multiple times (upserts by email)
 * - Blocked in production: reads NODE_ENV
 * - Reads credentials from env (with safe dev defaults)
 *
 * Usage: node seed_super_admin.js
 */

import db from './db.js';
import { IdentityService } from './services/identityService.js';
import { RbacRepository } from './repositories/rbacRepository.js';

const GUARD_ENV = process.env.NODE_ENV;

if (GUARD_ENV === 'production') {
  console.error('[SEED] ❌  This seed is blocked in production. NODE_ENV=production detected. Aborting.');
  process.exit(1);
}

const SEED_EMAIL    = process.env.SEED_SUPER_ADMIN_EMAIL    || 'superadmin@nearby-dev.local';
const SEED_PASSWORD = process.env.SEED_SUPER_ADMIN_PASSWORD || 'SuperAdmin123!Dev';
const SEED_NAME     = process.env.SEED_SUPER_ADMIN_NAME     || 'Super Admin (Dev)';

async function seed() {
  console.log('[SEED] Starting Super Admin seed…');
  console.log(`[SEED] Environment : ${GUARD_ENV || 'development'}`);
  console.log(`[SEED] Target email: ${SEED_EMAIL}`);

  try {
    // 1. Resolve Super Admin role (must exist — created by RBAC migration)
    const superAdminRole = await RbacRepository.getRoleByName('Super Admin');
    if (!superAdminRole) {
      console.error('[SEED] ❌  "Super Admin" role not found. Run migrations first: npm run migrate');
      process.exit(1);
    }

    // 2. Hash password
    const passwordHash = await IdentityService.hashPassword(SEED_PASSWORD);

    // 3. Upsert — insert or update (idempotent)
    await db.transaction(async (trx) => {
      const [user] = await trx('users')
        .insert({
          email:         SEED_EMAIL,
          name:          SEED_NAME,
          password_hash: passwordHash,
          status:        'ACTIVE',
          provider:      'local',
        })
        .onConflict('email')
        .merge({
          name:          SEED_NAME,
          password_hash: passwordHash,
          status:        'ACTIVE',
        })
        .returning(['id']);

      await trx('user_roles')
        .insert({ user_id: user.id, role_id: superAdminRole.id })
        .onConflict(['user_id', 'role_id'])
        .ignore();
    });

    console.log(`[SEED] ✅  Super Admin processed → ${SEED_EMAIL}`);
    console.log(`[SEED] Password: ${SEED_PASSWORD}`);
    console.log('[SEED] Done. Log in at /login with the credentials above.');
    process.exit(0);
  } catch (err) {
    console.error('[SEED] ❌  Seed failed:', err.message);
    process.exit(1);
  }
}

seed();
