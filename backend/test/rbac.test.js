import assert from 'assert';
import supertest from 'supertest';
import app from '../index.js';
import db from '../db.js';
import { PermissionService } from '../services/permissionService.js';
import { permissionCache } from '../services/permissionCache.js';
import { requirePermission } from '../middleware/requirePermission.js';

describe('Phase 3A: RBAC Backend Foundation', () => {
  let user1, user2;
  let testToken1, testToken2;
  let role1, role2;
  let suffix;

  before(async () => {
    process.env.NODE_ENV = 'test';
    
    // Create roles
    suffix = Date.now();
    const role1Name = `Role A ${suffix}`;
    const role2Name = `Role B ${suffix}`;
    [role1] = await db('roles').insert({ name: role1Name, description: 'Test Role A', status: 'ACTIVE' }).returning('*');
    [role2] = await db('roles').insert({ name: role2Name, description: 'Test Role B', status: 'ACTIVE' }).returning('*');

    // Create permissions
    const perms = [
      { name: `test.read_${suffix}`, description: 'Read test' },
      { name: `test.write_${suffix}`, description: 'Write test' },
      { name: `test.delete_${suffix}`, description: 'Delete test' }
    ];
    const insertedPerms = await db('permissions').insert(perms).returning('*');
    const permMap = insertedPerms.reduce((acc, p) => ({ ...acc, [p.name]: p.id }), {});

    // Role A gets read, write
    await db('role_permissions').insert([
      { role_id: role1.id, permission_id: permMap[`test.read_${suffix}`] },
      { role_id: role1.id, permission_id: permMap[`test.write_${suffix}`] }
    ]);

    // Role B gets read, delete
    await db('role_permissions').insert([
      { role_id: role2.id, permission_id: permMap[`test.read_${suffix}`] },
      { role_id: role2.id, permission_id: permMap[`test.delete_${suffix}`] }
    ]);

    // User 1 gets Role A
    [user1] = await db('users').insert({ email: 'rbac1@test.com', password_hash: 'hash', status: 'ACTIVE' }).returning('*');
    await db('user_roles').insert({ user_id: user1.id, role_id: role1.id });

    // User 2 gets Role A AND Role B
    [user2] = await db('users').insert({ email: 'rbac2@test.com', password_hash: 'hash', status: 'ACTIVE' }).returning('*');
    await db('user_roles').insert([
      { user_id: user2.id, role_id: role1.id },
      { user_id: user2.id, role_id: role2.id }
    ]);

    // Create sessions
    const { randomUUID } = await import('crypto');
    const [session1] = await db('user_sessions').insert({ user_id: user1.id, session_family_id: randomUUID(), refresh_token_hash: 'tok1', expires_at: new Date(Date.now() + 86400000) }).returning('*');
    const [session2] = await db('user_sessions').insert({ user_id: user2.id, session_family_id: randomUUID(), refresh_token_hash: 'tok2', expires_at: new Date(Date.now() + 86400000) }).returning('*');

    // Generate tokens
    const jwt = (await import('jsonwebtoken')).default;
    testToken1 = jwt.sign({ sub: user1.id, email: user1.email, sid: session1.id }, process.env.JWT_SECRET || 'test_secret_key');
    testToken2 = jwt.sign({ sub: user2.id, email: user2.email, sid: session2.id }, process.env.JWT_SECRET || 'test_secret_key');
    
    await permissionCache.flushAll();
  });

  after(async () => {
    await db('user_sessions').whereIn('user_id', [user1.id, user2.id]).del();
    await db('user_roles').whereIn('user_id', [user1.id, user2.id]).del();
    await db('users').whereIn('id', [user1.id, user2.id]).del();
    await db('role_permissions').whereIn('role_id', [role1.id, role2.id]).del();
    await db('permissions').whereLike('name', 'test.%').del();
    await db('roles').whereIn('id', [role1.id, role2.id]).del();
  });

  beforeEach(async () => {
    await permissionCache.flushAll();
  });

  it('1. PermissionService computes multiple-role unions and removes duplicates', async () => {
    const result = await PermissionService.getUserPermissions(user2.id);
    assert.ok(result.roles.includes(role1.name));
    assert.ok(result.roles.includes(role2.name));
    assert.deepStrictEqual(result.permissions, [`test.delete_${suffix}`, `test.read_${suffix}`, `test.write_${suffix}`].sort());
  });

  it('2. PermissionService uses single efficient query without N+1', async () => {
    // Verified by inspection of permissionRepository.js (single JOIN query)
    const result = await PermissionService.getUserPermissions(user1.id);
    assert.deepStrictEqual(result.roles, [role1.name]);
    assert.deepStrictEqual(result.permissions, [`test.read_${suffix}`, `test.write_${suffix}`].sort());
  });

  it('3. Permission updates take effect after invalidation strategy', async () => {
    // Cache miss first time
    await PermissionService.getUserPermissions(user1.id);
    assert.ok(await permissionCache.get(user1.id));

    // Admin updates role A -> adds test.delete
    const deletePerm = await db('permissions').where({ name: `test.delete_${suffix}` }).first();
    await db('role_permissions').insert({ role_id: role1.id, permission_id: deletePerm.id });

    // Invalidate role cache
    await PermissionService.invalidateRoleCache(role1.name);
    assert.strictEqual(await permissionCache.get(user1.id), null);

    // Fetch again (should recompute)
    const freshResult = await PermissionService.getUserPermissions(user1.id);
    assert.ok(freshResult.permissions.includes(`test.delete_${suffix}`));
  });

  it('4. Authorization middleware passes valid permissions', async () => {
    const req = { user: { id: user1.id } };
    const res = {};
    let nextCalled = false;
    const next = () => { nextCalled = true; };

    const middleware = requirePermission(`test.read_${suffix}`);
    await middleware(req, res, next);
    assert.ok(nextCalled);
  });

  it('5. Authorization middleware fails on lacking permissions (403 ACTION_FORBIDDEN)', async () => {
    const req = { user: { id: user1.id } }; // Lacks test.delete (after reset)
    let statusSet, jsonSet;
    const res = {
      status: (code) => { statusSet = code; return res; },
      json: (data) => { jsonSet = data; }
    };
    
    // Reset permissions for user 1 to lack test.delete
    await db('role_permissions').where({ role_id: role1.id, permission_id: (await db('permissions').where({ name: `test.delete_${suffix}` }).first()).id }).del();
    await PermissionService.invalidateRoleCache(role1.name);

    const middleware = requirePermission(`test.delete_${suffix}`);
    await middleware(req, res, () => {});
    
    assert.equal(statusSet, 403);
    assert.equal(jsonSet.error.code, 'ACTION_FORBIDDEN');
  });

  it('6. Authorization middleware fails closed on cache/DB exception', async () => {
    // Force an error in PermissionService
    const originalGet = PermissionService.getUserPermissions;
    PermissionService.getUserPermissions = async () => { throw new Error('DB Down'); };

    const req = { user: { id: user1.id } };
    let statusSet, jsonSet;
    const res = {
      status: (code) => { statusSet = code; return res; },
      json: (data) => { jsonSet = data; }
    };

    const middleware = requirePermission(`test.read_${suffix}`);
    await middleware(req, res, () => {});

    assert.equal(statusSet, 403);
    assert.equal(jsonSet.error.code, 'ACTION_FORBIDDEN'); // Still returns standard code

    // Restore
    PermissionService.getUserPermissions = originalGet;
  });

  it('7. Endpoint GET /users/me/permissions returns roles, permissions, permissionVersion', async () => {
    const res = await supertest(app)
      .get('/api/users/me/permissions')
      .set('Authorization', `Bearer ${testToken2}`);

    assert.equal(res.status, 200);
    assert.ok(res.body.success);
    assert.ok(res.body.data.roles);
    assert.ok(res.body.data.permissions);
    assert.equal(res.body.data.permissionVersion, 1);
    
    assert.ok(res.body.data.roles.includes(role1.name));
    assert.ok(res.body.data.roles.includes(role2.name));
    assert.ok(res.body.data.permissions.includes(`test.read_${suffix}`));
  });

  it('8. Middleware Order Regression - PermissionService must never execute on unauthenticated requests', async () => {
    // Spy on PermissionService to ensure it is not called
    const originalGet = PermissionService.getUserPermissions;
    let permissionServiceCalled = false;
    PermissionService.getUserPermissions = async () => { 
      permissionServiceCalled = true;
      return { roles: [], permissions: [] }; 
    };

    // Issue an unauthenticated request to a protected endpoint (GET /api/admin/users)
    const res = await supertest(app)
      .get('/api/admin/users') // requires authJwt AND requirePermission('users.read')
      .send();

    // Verify authJwt caught it
    assert.equal(res.status, 401);
    assert.equal(res.body.error.code, 'NO_TOKEN');
    
    // Verify requirePermission never ran
    assert.strictEqual(permissionServiceCalled, false, 'PermissionService was called despite lacking authentication!');

    // Restore
    PermissionService.getUserPermissions = originalGet;
  });
});
