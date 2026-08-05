/**
 * Migration: Cleanup Duplicate RBAC Roles & Enforce Case-Insensitive Uniqueness
 *
 * 1. Environment-Independent Duplicate Identification:
 *    Groups roles by LOWER(TRIM(name)).
 * 2. Deterministic Primary Role Selection (4-level hierarchy):
 *    - Level 1: Role with active user assignments (user_roles count > 0)
 *    - Level 2: Role with permission mappings (role_permissions count > 0)
 *    - Level 3: Title-cased canonical system role name ('Super Admin', 'Admin', 'Moderator', 'User')
 *    - Level 4: Earliest created record (created_at ASC)
 * 3. Pre-Deletion Verification Guard:
 *    Asserts 0 users, 0 permissions, and 0 FK references for candidate duplicate roles.
 * 4. Idempotent PostgreSQL Unique Index:
 *    CREATE UNIQUE INDEX IF NOT EXISTS idx_roles_lower_name ON roles (LOWER(TRIM(name)))
 */

const CANONICAL_ROLE_NAMES = ['Super Admin', 'Admin', 'Moderator', 'User'];

export async function up(knex) {
  // 1. Fetch all roles
  const allRoles = await knex('roles').select('*');

  // Group roles by LOWER(TRIM(name))
  const groups = {};
  for (const role of allRoles) {
    const normalized = (role.name || '').toLowerCase().trim();
    if (!groups[normalized]) groups[normalized] = [];
    groups[normalized].push(role);
  }

  const rolesToDelete = [];

  for (const [normalizedName, rolesInGroup] of Object.entries(groups)) {
    if (rolesInGroup.length <= 1) continue;

    console.log(`[MIGRATION] Found ${rolesInGroup.length} duplicate candidate roles for normalized name "${normalizedName}"`);

    // Fetch user_roles count and role_permissions count for each role in group
    const enrichedRoles = [];
    for (const r of rolesInGroup) {
      const userCountRes = await knex('user_roles').where({ role_id: r.id }).count('user_id as count').first();
      const permCountRes = await knex('role_permissions').where({ role_id: r.id }).count('permission_id as count').first();

      const userCount = parseInt(userCountRes?.count || 0, 10);
      const permCount = parseInt(permCountRes?.count || 0, 10);
      const isCanonical = CANONICAL_ROLE_NAMES.includes(r.name);

      enrichedRoles.push({
        ...r,
        userCount,
        permCount,
        isCanonical
      });
    }

    // Sort deterministic tie-breaker hierarchy:
    // 1. userCount DESC
    // 2. permCount DESC
    // 3. isCanonical (true first)
    // 4. created_at ASC
    enrichedRoles.sort((a, b) => {
      if (b.userCount !== a.userCount) return b.userCount - a.userCount;
      if (b.permCount !== a.permCount) return b.permCount - a.permCount;
      if (b.isCanonical !== a.isCanonical) return (b.isCanonical ? 1 : 0) - (a.isCanonical ? 1 : 0);
      return new Date(a.created_at || 0) - new Date(b.created_at || 0);
    });

    const primaryRole = enrichedRoles[0];
    const duplicates = enrichedRoles.slice(1);

    console.log(`[MIGRATION] Preserving primary role: "${primaryRole.name}" (ID: ${primaryRole.id}, Users: ${primaryRole.userCount}, Perms: ${primaryRole.permCount})`);

    // Pre-Deletion Verification Guard on all duplicates
    for (const dup of duplicates) {
      console.log(`[MIGRATION] Verifying candidate duplicate: "${dup.name}" (ID: ${dup.id})...`);

      if (dup.userCount > 0) {
        throw new Error(`[MIGRATION ABORTED] Security guard failed: Duplicate role "${dup.name}" (ID: ${dup.id}) has ${dup.userCount} active user assignments!`);
      }
      if (dup.permCount > 0) {
        throw new Error(`[MIGRATION ABORTED] Security guard failed: Duplicate role "${dup.name}" (ID: ${dup.id}) has ${dup.permCount} active permission mappings!`);
      }

      rolesToDelete.push(dup);
    }
  }

  // Execute safe deletion of verified duplicate candidate roles
  if (rolesToDelete.length > 0) {
    const idsToDelete = rolesToDelete.map(r => r.id);
    console.log(`[MIGRATION] Deleting ${rolesToDelete.length} unreferenced duplicate role records:`, idsToDelete);
    await knex('roles').whereIn('id', idsToDelete).del();
  } else {
    console.log('[MIGRATION] Zero duplicate role records required deletion.');
  }

  // Post-Cleanup Duplicate Assertion Check
  const remainingDuplicates = await knex.raw(`
    SELECT LOWER(TRIM(name)) as norm_name, COUNT(*) as count 
    FROM roles 
    GROUP BY LOWER(TRIM(name)) 
    HAVING COUNT(*) > 1
  `);

  const remainingRows = remainingDuplicates.rows || remainingDuplicates;
  if (remainingRows.length > 0) {
    throw new Error(`[MIGRATION ABORTED] Post-cleanup duplicate verification failed! Duplicate role names still exist: ${JSON.stringify(remainingRows)}`);
  }

  // Create PostgreSQL Case-Insensitive Unique Index Idempotently
  console.log('[MIGRATION] Creating PostgreSQL case-insensitive UNIQUE INDEX idx_roles_lower_name...');
  await knex.raw(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_roles_lower_name ON roles (LOWER(TRIM(name)));
  `);
  console.log('[MIGRATION] ✅ RBAC Duplicate Cleanup & Unique Index completed successfully.');
}

export async function down(knex) {
  console.log('[MIGRATION DOWN] Dropping unique index idx_roles_lower_name...');
  await knex.raw(`DROP INDEX IF EXISTS idx_roles_lower_name;`);
}
