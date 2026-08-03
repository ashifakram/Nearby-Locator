import assert from 'assert';
import db from '../db.js';
import { OwnershipService } from '../services/ownershipService.js';
import request from 'supertest';
import app from '../index.js';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';

describe('Phase 3B: Ownership Verification', () => {
  let userA, userB;
  let tokenA, tokenB;
  let sessionA, sessionB;

  before(async () => {
    // Ensure DB is clean
    await db('user_sessions').del();
    await db('users').del();

    // Create User A
    [userA] = await db('users').insert({
      email: 'usera@example.com',
      password_hash: 'hash',
      name: 'User A',
      status: 'ACTIVE'
    }).returning('*');

    // Create User B
    [userB] = await db('users').insert({
      email: 'userb@example.com',
      password_hash: 'hash',
      name: 'User B',
      status: 'ACTIVE'
    }).returning('*');

    // Create a session for User A
    [sessionA] = await db('user_sessions').insert({
      user_id: userA.id,
      session_family_id: randomUUID(),
      refresh_token_hash: 'hashA',
      ip_address: '127.0.0.1',
      expires_at: new Date(Date.now() + 86400000)
    }).returning('*');

    // Create a session for User B
    [sessionB] = await db('user_sessions').insert({
      user_id: userB.id,
      session_family_id: randomUUID(),
      refresh_token_hash: 'hashB',
      ip_address: '127.0.0.1',
      expires_at: new Date(Date.now() + 86400000)
    }).returning('*');

    tokenA = jwt.sign({ sub: userA.id, email: userA.email, sid: sessionA.id }, process.env.JWT_SECRET || 'test_secret_key');
    tokenB = jwt.sign({ sub: userB.id, email: userB.email, sid: sessionB.id }, process.env.JWT_SECRET || 'test_secret_key');
  });

  describe('OwnershipService Unit Tests', () => {
    it('should throw 403 FORBIDDEN when ownership fails and hideExistence is false', () => {
      try {
        OwnershipService.verifyOwnership({
          actorId: userA.id,
          ownerId: userB.id,
          hideExistence: false
        });
        assert.fail('Should have thrown an error');
      } catch (err) {
        assert.equal(err.status, 403);
        assert.equal(err.code, 'ACTION_FORBIDDEN');
      }
    });

    it('should throw 404 NOT_FOUND when ownership fails and hideExistence is true', () => {
      try {
        OwnershipService.verifyOwnership({
          actorId: userA.id,
          ownerId: userB.id,
          hideExistence: true
        });
        assert.fail('Should have thrown an error');
      } catch (err) {
        assert.equal(err.status, 404);
        assert.equal(err.code, 'NOT_FOUND');
      }
    });

    it('should bypass ownership check if adminPermission is present in permissions', () => {
      let threw = false;
      try {
        OwnershipService.verifyOwnership({
          actorId: userA.id,
          ownerId: userB.id,
          adminPermission: 'admin.access',
          permissions: ['admin.access']
        });
      } catch(e) { threw = true; }
      assert.ok(!threw);
    });
  });

  describe('Negative Ownership Mutation Check via HTTP', () => {
    it('User A attempting to delete User B device session should return 404 (hideExistence)', async () => {
      // Act: User A tries to revoke User B's session
      const res = await request(app)
        .delete(`/api/users/me/devices/${sessionB.id}`)
        .set('Authorization', `Bearer ${tokenA}`);
      
      assert.equal(res.status, 404);

      // Verify no mutation occurred (User B's session still exists)
      const verifySession = await db('user_sessions').where({ id: sessionB.id }).first();
      assert.ok(verifySession);
      assert.strictEqual(verifySession.is_revoked, false);
    });

    it('User A should be able to delete their own device session', async () => {
      const res = await request(app)
        .delete(`/api/users/me/devices/${sessionA.id}`)
        .set('Authorization', `Bearer ${tokenA}`);
      
      assert.equal(res.status, 200);

      // Verify mutation did occur
      const verifySession = await db('user_sessions').where({ id: sessionA.id }).first();
      assert.strictEqual(verifySession.is_revoked, true);
    });
  });
});
