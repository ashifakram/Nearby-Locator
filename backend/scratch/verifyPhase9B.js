import axios from 'axios';
import { logger } from '../utils/logger.js';
import { dbLogger } from '../utils/dbLogger.js';
import { logAudit } from '../utils/auditLogger.js';

const PORT = process.env.PORT || 5000;
const BASE_URL = `http://localhost:${PORT}`;

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function verifyPhase9B() {
  console.log('--- Phase 9B: Enterprise Observability E2E Verification ---\n');
  
  try {
    // 1. Verify Pino Logger structured output
    console.log('[1] Testing Pino Structured Logger...');
    logger.info('System startup verified', { env: 'production', module: 'core' }, 'BOOTSTRAP');
    dbLogger.info('Database connected successfully', { poolSize: 10 });
    
    // Simulate an error
    logger.error('CRIT_ERR', 'Simulated Redis timeout', new Error('Redis connection lost'), { retryCount: 3 });

    // 2. Verify Enriched Audit Logs
    console.log('\n[2] Testing Enriched Security Audit Logger...');
    await logAudit({
      actorId: null,
      targetUserId: null,
      action: 'ELEVATE_PRIVILEGES',
      severity: 'HIGH',
      metadata: {
        amr: ['pwd', 'mfa'],
        provider: 'local',
        tenantContext: 'enterprise-org-id',
        deviceId: 'device-fingerprint-999',
        userAgent: 'Mozilla/5.0'
      }
    });

    // We wait 1 sec to ensure the server had time to boot if it's running
    await sleep(1000);

    // 3. Verify Health Endpoints
    console.log('\n[3] Testing Liveness & Readiness Probes...');
    const liveRes = await axios.get(`${BASE_URL}/health/live`);
    if (liveRes.data.status !== 'UP') throw new Error('Liveness failed');
    console.log('✅ /health/live returned 200 OK');

    const readyRes = await axios.get(`${BASE_URL}/health/ready`);
    if (readyRes.data.status !== 'UP') throw new Error('Readiness failed');
    console.log('✅ /health/ready returned 200 OK');

    // 4. Verify Prometheus /metrics endpoint
    console.log('\n[4] Testing Prometheus Metrics Integration...');
    const metricsRes = await axios.get(`${BASE_URL}/metrics`);
    const metricsData = metricsRes.data;
    
    if (!metricsData.includes('http_request_duration_seconds')) {
      throw new Error('Prometheus metrics missing HTTP duration');
    }
    if (!metricsData.includes('auth_login_success_total')) {
      throw new Error('Prometheus metrics missing auth counters');
    }
    if (!metricsData.includes('db_query_duration_seconds')) {
      throw new Error('Prometheus metrics missing database latency');
    }

    console.log('✅ /metrics successfully exposed Prometheus registry format (text/plain).');
    
    // Output a snippet of the metrics
    console.log('\nMetrics Snippet:');
    const snippet = metricsData.split('\n').filter(line => 
      line.startsWith('http_request_duration') || 
      line.startsWith('auth_login_success') ||
      line.startsWith('db_query_duration')
    ).slice(0, 10).join('\n');
    console.log(snippet);

    console.log('\n🎉 Enterprise Observability Verification Complete!');
    process.exit(0);
  } catch (e) {
    if (e.code === 'ECONNREFUSED') {
      console.log('\n⚠️ Server is not running. Please start the server using `npm start` before running the E2E verification test.');
    } else {
      console.error('\n❌ E2E TEST FAILED:', e.message);
      console.error(e.response ? e.response.data : '');
    }
    process.exit(1);
  }
}

verifyPhase9B();
