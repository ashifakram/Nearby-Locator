export async function up(knex) {
  // 1. Create `user_roles` mapping table
  await knex.schema.createTable('user_roles', (table) => {
    table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.uuid('role_id').references('id').inTable('roles').onDelete('CASCADE');
    table.primary(['user_id', 'role_id']);
  });

  // 2. Migrate existing role assignments from users.role_id to user_roles
  // (We assume users.role_id is populated from the previous migration)
  await knex.raw(`
    INSERT INTO user_roles (user_id, role_id)
    SELECT id, role_id FROM users WHERE role_id IS NOT NULL
  `);

  // 3. Drop role_id from users
  await knex.schema.alterTable('users', (table) => {
    table.dropIndex(['role_id'], 'idx_users_role_id');
    table.dropColumn('role_id');
  });

  // 4. Add is_active to roles table (default true)
  await knex.schema.alterTable('roles', (table) => {
    table.boolean('is_active').defaultTo(true).notNullable();
  });

  // 5. Insert any missing standard permissions (e.g. for Places/Reports if missing)
  const missingPermissions = [
    { name: 'admin.access', description: 'Global administrative override access' },
    { name: 'reports.read', description: 'View analytical reports' },
    { name: 'places.read', description: 'View places' },
    { name: 'places.create', description: 'Create places' },
    { name: 'places.update', description: 'Update places' },
    { name: 'places.delete', description: 'Delete places' }
  ];

  await knex('permissions').insert(missingPermissions).onConflict('name').ignore();

  // Assign these to the Super Admin role
  const superAdminRole = await knex('roles').where({ name: 'Super Admin' }).first();
  if (superAdminRole) {
    const dbPermissions = await knex('permissions').select('id', 'name');
    const permMap = dbPermissions.reduce((acc, p) => { acc[p.name] = p.id; return acc; }, {});
    
    const rolePermInserts = [];
    missingPermissions.forEach(p => {
      if (permMap[p.name]) {
        rolePermInserts.push({ role_id: superAdminRole.id, permission_id: permMap[p.name] });
      }
    });

    if (rolePermInserts.length > 0) {
      await knex('role_permissions').insert(rolePermInserts).onConflict(['role_id', 'permission_id']).ignore();
    }
  }
}

export async function down(knex) {
  // 1. Add role_id back to users
  await knex.schema.alterTable('users', (table) => {
    table.uuid('role_id').references('id').inTable('roles').nullable();
    table.index(['role_id'], 'idx_users_role_id');
  });

  // 2. Restore user.role_id from user_roles
  // (We'll just pick one role if they have multiple)
  await knex.raw(`
    UPDATE users u
    SET role_id = (
      SELECT role_id FROM user_roles ur WHERE ur.user_id = u.id LIMIT 1
    )
  `);

  // Delete orphaned users with no role_id? In theory we should enforce NOT NULL
  // await knex.raw('ALTER TABLE users ALTER COLUMN role_id SET NOT NULL');
  // but to be safe we'll leave it nullable or handle bad data.

  // 3. Drop user_roles table
  await knex.schema.dropTableIfExists('user_roles');

  // 4. Drop is_active from roles
  await knex.schema.alterTable('roles', (table) => {
    table.dropColumn('is_active');
  });
}
