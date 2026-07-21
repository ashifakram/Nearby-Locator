import { describe, it, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import request from 'supertest';
import app from '../index.js';
import db from '../db.js';
import client from '../redisClient.js';
import config from '../config/index.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { cleanDatabase, resetGlobalState, flushRedisTestCache, teardownConnections } from './helpers.js';
import { Worker } from '../utils/queue.js';
import { jobRegistry } from '../jobs/index.js';

describe('🛡️ Hardened Admin Operations & Internal Control Plane Suite', () => {
  let worker = null;

  beforeEach(async () => {
    process.env.NODE_ENV = 'test';
    // Clear dynamic break glass controls
    delete process.env.BREAK_GLASS_ENABLED;
    delete process.env.BREAK_GLASS_SECRET;
    delete process.env.TEST_BREAK_GLASS_STARTUP_TIME;
    
    await cleanDatabase();
    await flushRedisTestCache();
    resetGlobalState();
  });

  after(async () => {
    if (worker) {
      await worker.shutdown();
      worker = null;
    }
    await teardownConnections();
  });

  // Helper: create a user with a hashed password
  const createUser = async (email, role = 'user') => {
    const password_hash = await bcrypt.hash('SecurePassword123!', 10);
    const [user] = await db('users').insert({ email, password_hash, role }).returning('*');
    return user;
  };

  // Helper: establish an active session in DB and cache it in Redis
  const establishActiveSession = async (user) => {
    const sessionId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 3600000); // 1 hour TTL
    
    await db('user_sessions').insert({
      id: sessionId,
      user_id: user.id,
      ip_address: '127.0.0.1',
      user_agent: 'NodeTest',
      expires_at: expiresAt,
      refresh_token_hash: crypto.createHash('sha256').update(crypto.randomBytes(32)).digest('hex'),
      session_family_id: crypto.randomUUID()
    });

    const cacheKey = `session:active:${sessionId}`;
    const sessionCache = {
      userId: user.id,
      email: user.email,
      role: user.role,
      isSuspended: !!user.is_suspended,
      sudoUntil: null
    };

    await client.set(cacheKey, JSON.stringify(sessionCache), { EX: 3600 });
    const token = jwt.sign({ sub: user.id, sid: sessionId }, config.auth.jwtSecret, { expiresIn: '1h' });

    return { sessionId, token };
  };

  // Helper: elevate session to "sudo" status directly in Redis
  const elevateToSudo = async (sessionId) => {
    const cacheKey = `session:active:${sessionId}`;
    const cached = await client.get(cacheKey);
    const sessionData = JSON.parse(cached);
    sessionData.sudoUntil = Date.now() + 5 * 60 * 1000;
    await client.set(cacheKey, JSON.stringify(sessionData), { EX: 3600 });
  };

  // ---------------------------------------------------------------------------
  // TEST 1: Role Hierarchical Permissions & Suspension Weight Ceiling Checks
  // ---------------------------------------------------------------------------
  it('1. Enforces role hierarchical permissions & anti-escalation weight ceilings on suspension', async () => {
    const superAdmin = await createUser('super@saas.com', 'super_admin');
    const supportLead = await createUser('lead@saas.com', 'support_lead');
    const supportAgent = await createUser('agent@saas.com', 'support_agent');
    const targetUser = await createUser('target@saas.com', 'user');

    const superAdminSession = await establishActiveSession(superAdmin);
    const supportLeadSession = await establishActiveSession(supportLead);
    const supportAgentSession = await establishActiveSession(supportAgent);

    // Support Agent has view permission but NOT moderate permission -> gets 403
    const agentRes = await request(app)
      .post('/api/admin/suspend')
      .set('Authorization', `Bearer ${supportAgentSession.token}`)
      .send({ userId: targetUser.id, reason: 'Abusing nearby search endpoint' });

    assert.equal(agentRes.status, 403);
    assert.equal(agentRes.body.error.code, 'FORBIDDEN');

    // Support Lead has moderate permission and higher weight -> suspends normal user successfully
    const leadRes = await request(app)
      .post('/api/admin/suspend')
      .set('Authorization', `Bearer ${supportLeadSession.token}`)
      .send({ userId: targetUser.id, reason: 'Repeated telemetry spam trigger' });

    assert.equal(leadRes.status, 200);

    // Support Lead tries to suspend Super Admin -> gets 403 FORBIDDEN (privilege ceiling)
    const ceilingRes = await request(app)
      .post('/api/admin/suspend')
      .set('Authorization', `Bearer ${supportLeadSession.token}`)
      .send({ userId: superAdmin.id, reason: 'Rogue administrator actions' });

    assert.equal(ceilingRes.status, 403);
    assert.equal(ceilingRes.body.error.code, 'FORBIDDEN');
    assert.match(ceilingRes.body.message, /ceiling/i);
  });

  // ---------------------------------------------------------------------------
  // TEST 2: Step-up Sudo Confirmation Guard
  // ---------------------------------------------------------------------------
  it('2. Gates dangerous control actions with out-of-band step-up Sudo confirmation', async () => {
    const superAdmin = await createUser('admin@saas.com', 'super_admin');
    const targetUser = await createUser('escalatee@saas.com', 'user');
    
    const adminSession = await establishActiveSession(superAdmin);

    // 1. Attempting role escalation without step-up elevation -> gets 403 SUDO_REQUIRED
    const preSudoRes = await request(app)
      .post('/api/admin/escalate-role')
      .set('Authorization', `Bearer ${adminSession.token}`)
      .send({ userId: targetUser.id, requestedRole: 'support_agent' });

    assert.equal(preSudoRes.status, 403);
    assert.equal(preSudoRes.body.error.code, 'SUDO_REQUIRED');

    // 2. Perform out-of-bound step-up confirmation by verifying password
    const sudoConfirmRes = await request(app)
      .post('/api/admin/sudo-confirm')
      .set('Authorization', `Bearer ${adminSession.token}`)
      .send({ password: 'SecurePassword123!' });

    assert.equal(sudoConfirmRes.status, 200);
    assert.ok(sudoConfirmRes.body.data.sudoUntil);

    // 3. Escalation succeeded now that isSudo is active inside Redis session context!
    const postSudoRes = await request(app)
      .post('/api/admin/escalate-role')
      .set('Authorization', `Bearer ${adminSession.token}`)
      .send({ userId: targetUser.id, requestedRole: 'support_agent' });

    assert.equal(postSudoRes.status, 200);

    const updatedUser = await db('users').where({ id: targetUser.id }).first();
    assert.equal(updatedUser.role, 'support_agent');
  });

  // ---------------------------------------------------------------------------
  // TEST 3: Suspension Instant Eviction & Login Gateway Block
  // ---------------------------------------------------------------------------
  it('3. Triggers immediate session cache evictions on suspension and blocks auth logins', async () => {
    const supportLead = await createUser('moderator@saas.com', 'support_lead');
    const targetUser = await createUser('violator@saas.com', 'user');
    
    const moderatorSession = await establishActiveSession(supportLead);
    const targetSession = await establishActiveSession(targetUser);

    // Verify target user is currently able to make authenticated API requests
    const preCheck = await request(app)
      .get('/api/users/profile')
      .set('Authorization', `Bearer ${targetSession.token}`);
    assert.equal(preCheck.status, 200);

    // Moderate and suspend user
    const suspendRes = await request(app)
      .post('/api/admin/suspend')
      .set('Authorization', `Bearer ${moderatorSession.token}`)
      .send({ userId: targetUser.id, reason: 'Severe IP rate limit bypass attempts' });

    assert.equal(suspendRes.status, 200);

    // Target session should be instantly evicted from Redis and return 401 REVOKED_SESSION on subsequent requests
    const postCheck = await request(app)
      .get('/api/users/profile')
      .set('Authorization', `Bearer ${targetSession.token}`);
    
    assert.equal(postCheck.status, 401);
    assert.equal(postCheck.body.error.code, 'REVOKED_SESSION');

    // Suspended user attempts to log in again -> rejected at auth gateway
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'violator@saas.com', password: 'SecurePassword123!' });

    assert.equal(loginRes.status, 403);
    assert.equal(loginRes.body.error.code, 'REVOKED_SESSION');
  });

  // ---------------------------------------------------------------------------
  // TEST 4: Hardened Support Impersonation Sandbox Restrictions
  // ---------------------------------------------------------------------------
  it('4. Sandbox-restricts impersonated sessions and attributes original admin in audit trails', async () => {
    const supportLead = await createUser('troubleshooter@saas.com', 'support_lead');
    const targetUser = await createUser('customer@saas.com', 'user');

    const leadSession = await establishActiveSession(supportLead);
    await elevateToSudo(leadSession.sessionId);

    // 1. Establish impersonation session
    const impersonateRes = await request(app)
      .post('/api/admin/impersonate')
      .set('Authorization', `Bearer ${leadSession.token}`)
      .send({ targetUserId: targetUser.id });

    assert.equal(impersonateRes.status, 200);
    const impersonationToken = impersonateRes.body.data.token;
    assert.ok(impersonationToken);

    // 2. Perform user action using the impersonated token (e.g. view profile)
    const profileRes = await request(app)
      .get('/api/users/profile')
      .set('Authorization', `Bearer ${impersonationToken}`);

    assert.equal(profileRes.status, 200);
    assert.equal(profileRes.body.data.user.email, 'customer@saas.com');

    // 3. Security Sandbox Gate: Impersonated requests are blocked from resetting password
    const passwordRes = await request(app)
      .post('/api/auth/google/delink')
      .set('Authorization', `Bearer ${impersonationToken}`)
      .send();

    assert.equal(passwordRes.status, 403);
    assert.equal(passwordRes.body.error.code, 'FORBIDDEN');
    assert.match(passwordRes.body.message, /blocked during impersonation/i);

    // 4. Traceability: Audit log double-attributes actual admin and effective target
    const auditRecord = await db('audit_logs')
      .where({ action: 'IMPERSONATION_INITIATED' })
      .first();

    assert.ok(auditRecord);
    assert.equal(auditRecord.actor_id, supportLead.id);
    assert.equal(auditRecord.target_user_id, targetUser.id);
    
    const metadata = typeof auditRecord.metadata === 'string'
      ? JSON.parse(auditRecord.metadata)
      : auditRecord.metadata;
    assert.equal(metadata.impersonated, true);
  });

  // ---------------------------------------------------------------------------
  // TEST 5: Single-Use Encrypted Data Export Downloads
  // ---------------------------------------------------------------------------
  it('5. Compiles async user data exports and enforces single-use download tokens', async () => {
    worker = new Worker(jobRegistry);
    await worker.start();

    const superAdmin = await createUser('exporter@saas.com', 'super_admin');
    const targetUser = await createUser('exported@saas.com', 'user');

    const adminSession = await establishActiveSession(superAdmin);
    await elevateToSudo(adminSession.sessionId);

    // 1. Request async export -> returns 202 Accepted and ticket
    const exportRes = await request(app)
      .post('/api/admin/export-data')
      .set('Authorization', `Bearer ${adminSession.token}`)
      .send({ userId: targetUser.id });

    assert.equal(exportRes.status, 202);
    const exportId = exportRes.body.data.exportId;
    assert.ok(exportId);

    // 2. Poll Redis and wait for job execution to complete
    let downloadToken = null;
    for (let i = 0; i < 15; i++) {
      const statusRes = await request(app)
        .get(`/api/admin/export-status/${exportId}`)
        .set('Authorization', `Bearer ${adminSession.token}`);
      
      if (statusRes.body.data.status === 'READY') {
        downloadToken = statusRes.body.data.downloadToken;
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    assert.ok(downloadToken, 'Download token should be compiled by background worker');

    // 3. Download the data successfully
    const downloadRes = await request(app)
      .get(`/api/admin/downloads/${downloadToken}`)
      .set('Authorization', `Bearer ${adminSession.token}`);

    assert.equal(downloadRes.status, 200);
    assert.equal(downloadRes.body.data.user.email, 'exported@saas.com');
    assert.ok(Array.isArray(downloadRes.body.data.sessions));

    // 4. Single-Use enforcement: Second download request gets 410 Gone immediately!
    const reDownloadRes = await request(app)
      .get(`/api/admin/downloads/${downloadToken}`)
      .set('Authorization', `Bearer ${adminSession.token}`);

    assert.equal(reDownloadRes.status, 410);
    assert.equal(reDownloadRes.body.error.code, 'INVALID_TOKEN');
  });

  // ---------------------------------------------------------------------------
  // TEST 6: Bounded Retention Pause & Cooldown Restrictions
  // ---------------------------------------------------------------------------
  it('6. Enforces maximum pause limits and cooldown windows on retention overrides', async () => {
    const superAdmin = await createUser('superman@saas.com', 'super_admin');
    const adminSession = await establishActiveSession(superAdmin);
    await elevateToSudo(adminSession.sessionId);

    // 1. Attempting 10 days override -> fails (capped at 7 days)
    const invalidPauseRes = await request(app)
      .post('/api/admin/retention-override')
      .set('Authorization', `Bearer ${adminSession.token}`)
      .send({ durationDays: 10, reason: 'Database migration and profiling testing' });

    assert.equal(invalidPauseRes.status, 400);

    // 2. Pause for 5 days successfully
    const validPauseRes = await request(app)
      .post('/api/admin/retention-override')
      .set('Authorization', `Bearer ${adminSession.token}`)
      .send({ durationDays: 5, reason: 'Database migration and profiling testing' });

    assert.equal(validPauseRes.status, 200);
    assert.ok(validPauseRes.body.data.pausedUntil);

    // 3. Cooldown boundary: Immediate second pause request rejected with 429
    const secondPauseRes = await request(app)
      .post('/api/admin/retention-override')
      .set('Authorization', `Bearer ${adminSession.token}`)
      .send({ durationDays: 2, reason: 'Additional profiling time required' });

    assert.equal(secondPauseRes.status, 429);
    assert.equal(secondPauseRes.body.error.code, 'COOLDOWN_ACTIVE');
  });

  // ---------------------------------------------------------------------------
  // TEST 7: Break-Glass Operational Safety and Expiration limits
  // ---------------------------------------------------------------------------
  it('7. Enforces disabled-by-default break-glass, high-audited visibility, and 1-hour expiration limits', async () => {
    // 1. Break-glass disabled by default (no environment variable matches)
    const preBypassRes = await request(app)
      .get('/api/admin/audit-logs')
      .set('x-break-glass-secret', 'EmergencySecretKey123!');
    assert.equal(preBypassRes.status, 401); // Standard Bearer token requested

    // 2. Enable Break-Glass mode via test environment configurations
    process.env.BREAK_GLASS_ENABLED = 'true';
    process.env.BREAK_GLASS_SECRET = 'EmergencySecretKey123!';

    const bypassRes = await request(app)
      .get('/api/admin/audit-logs')
      .set('x-break-glass-secret', 'EmergencySecretKey123!');

    assert.equal(bypassRes.status, 200);
    assert.ok(Array.isArray(bypassRes.body.data.logs));

    // Verify Break-Glass actions are highly audited and carry [BREAK_GLASS_ACCESS]
    const auditRecord = await db('audit_logs')
      .where('action', 'like', '%BREAK_GLASS%')
      .first();

    assert.ok(auditRecord);
    assert.equal(auditRecord.actor_id, null);
    assert.equal(auditRecord.severity, 'CRITICAL');
    
    const metadata = typeof auditRecord.metadata === 'string'
      ? JSON.parse(auditRecord.metadata)
      : auditRecord.metadata;
    assert.equal(metadata.breakGlass, true);

    // 3. Time-bounded safety: Set test startup time to 2 hours ago -> gets 403 BREAK_GLASS_EXPIRED
    process.env.TEST_BREAK_GLASS_STARTUP_TIME = String(Date.now() - 2 * 3600 * 1000);

    const expiredBypassRes = await request(app)
      .get('/api/admin/audit-logs')
      .set('x-break-glass-secret', 'EmergencySecretKey123!');

    assert.equal(expiredBypassRes.status, 403);
    assert.equal(expiredBypassRes.body.error.code, 'BREAK_GLASS_EXPIRED');
  });
});
