/**
 * Phase 10: Dynamic RBAC Architecture Migration
 *
 * 1. Creates permissions, roles, and role_permissions tables.
 * 2. Seeds standard CRUD permissions and baseline System Roles.
 * 3. Migrates users.role to users.role_id and users.is_suspended to users.status.
 */

export async function up(knex) {
  // 1. Create `permissions` table
  await knex.schema.createTable('permissions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name', 100).notNullable().unique(); // e.g. 'users.read'
    table.string('description', 255).notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable();
  });

  // 2. Create `roles` table
  await knex.schema.createTable('roles', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name', 50).notNullable().unique();
    table.string('description', 255).notNullable();
    table.boolean('is_system').defaultTo(false).notNullable();
    table.integer('priority').notNullable().defaultTo(10);
    table.enu('status', ['ACTIVE', 'DISABLED'], { useNative: false, enumName: 'role_status_enum' }).defaultTo('ACTIVE').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable();
    table.timestamp('updated_at').defaultTo(knex.fn.now()).notNullable();
  });

  // 3. Create `role_permissions` mapping table
  await knex.schema.createTable('role_permissions', (table) => {
    table.uuid('role_id').references('id').inTable('roles').onDelete('CASCADE');
    table.uuid('permission_id').references('id').inTable('permissions').onDelete('CASCADE');
    table.primary(['role_id', 'permission_id']);
  });

  // 4. Seed Permissions
  const permissionsData = [
    { name: 'users.read', description: 'View user profiles and lists' },
    { name: 'users.create', description: 'Create new users' },
    { name: 'users.update', description: 'Modify user details, status, and role' },
    { name: 'users.delete', description: 'Permanently delete users' },
    { name: 'roles.read', description: 'View roles' },
    { name: 'roles.create', description: 'Create custom roles' },
    { name: 'roles.update', description: 'Modify roles and their permissions' },
    { name: 'roles.delete', description: 'Delete custom roles' },
    { name: 'permissions.read', description: 'View available permissions' },
    { name: 'permissions.update', description: 'Modify permission definitions' },
    { name: 'audit.read', description: 'View security audit logs' },
    { name: 'audit.export', description: 'Export audit logs' },
    { name: 'logs.read', description: 'View system logs' },
    { name: 'metrics.read', description: 'View system metrics' },
    { name: 'settings.read', description: 'View global settings' },
    { name: 'settings.update', description: 'Modify global settings' },
    { name: 'oauth.read', description: 'View OAuth providers' },
    { name: 'oauth.update', description: 'Manage OAuth providers' },
    { name: 'smtp.read', description: 'View SMTP config' },
    { name: 'smtp.update', description: 'Modify SMTP config' }
  ];

  await knex('permissions').insert(permissionsData).onConflict('name').ignore();
  const dbPermissions = await knex('permissions').select('id', 'name');
  const permMap = dbPermissions.reduce((acc, p) => { acc[p.name] = p.id; return acc; }, {});

  // 5. Seed Roles
  const rolesData = [
    { name: 'Super Admin', description: 'Absolute system control', is_system: true, priority: 100 },
    { name: 'Admin', description: 'Standard administrative access', is_system: true, priority: 50 },
    { name: 'User', description: 'Standard user access', is_system: true, priority: 10 }
  ];

  await knex('roles').insert(rolesData).onConflict('name').ignore();
  const dbRoles = await knex('roles').select('id', 'name');
  const roleMap = dbRoles.reduce((acc, r) => { acc[r.name] = r.id; return acc; }, {});

  // 6. Map Role Permissions
  const rolePermInserts = [];
  
  // Super Admin gets everything
  Object.values(permMap).forEach(permId => {
    rolePermInserts.push({ role_id: roleMap['Super Admin'], permission_id: permId });
  });

  // Admin gets subset (no settings/smtp/oauth updates, no audit export)
  const adminPerms = [
    'users.read', 'users.create', 'users.update', 'users.delete',
    'roles.read', 'permissions.read', 'audit.read', 'metrics.read', 'logs.read',
    'settings.read', 'oauth.read', 'smtp.read'
  ];
  adminPerms.forEach(pName => {
    rolePermInserts.push({ role_id: roleMap['Admin'], permission_id: permMap[pName] });
  });

  if (rolePermInserts.length > 0) {
    await knex('role_permissions').insert(rolePermInserts).onConflict(['role_id', 'permission_id']).ignore();
  }

  // 7. Migrate Users Table
  await knex.schema.alterTable('users', (table) => {
    table.uuid('role_id').references('id').inTable('roles').nullable();
    table.index(['role_id'], 'idx_users_role_id');
  });

  // Port existing users.role to role_id
  await knex('users').where({ role: 'super_admin' }).update({ role_id: roleMap['Super Admin'] });
  await knex('users').where({ role: 'admin' }).update({ role_id: roleMap['Admin'] });
  await knex('users').where({ role: 'user' }).update({ role_id: roleMap['User'] });
  await knex('users').whereNull('role_id').update({ role_id: roleMap['User'] });

  // Port is_suspended to status
  await knex('users').where({ is_suspended: true }).update({ status: 'BANNED' });

  // Now that data is migrated, make role_id not nullable and drop old columns
  await knex.schema.alterTable('users', (table) => {
    table.dropIndex(['role'], 'idx_users_role');
    table.dropIndex(['is_suspended'], 'idx_users_suspended');
    table.dropColumn('role');
    table.dropColumn('is_suspended');
  });
  
  // Enforce not nullable on role_id after populating
  await knex.raw('ALTER TABLE users ALTER COLUMN role_id SET NOT NULL');
}

export async function down(knex) {
  await knex.schema.alterTable('users', (table) => {
    table.string('role', 20).notNullable().defaultTo('user');
    table.boolean('is_suspended').defaultTo(false).notNullable();
    table.index(['role'], 'idx_users_role');
    table.index(['is_suspended'], 'idx_users_suspended');
  });

  await knex('users').update({ is_suspended: true }).where({ status: 'BANNED' });
  
  const superAdminRole = await knex('roles').where({ name: 'Super Admin' }).first();
  const adminRole = await knex('roles').where({ name: 'Admin' }).first();
  if (superAdminRole) await knex('users').where({ role_id: superAdminRole.id }).update({ role: 'super_admin' });
  if (adminRole) await knex('users').where({ role_id: adminRole.id }).update({ role: 'admin' });

  await knex.schema.alterTable('users', (table) => {
    table.dropIndex(['role_id'], 'idx_users_role_id');
    table.dropColumn('role_id');
  });

  await knex.schema.dropTableIfExists('role_permissions');
  await knex.schema.dropTableIfExists('roles');
  await knex.schema.dropTableIfExists('permissions');
}
