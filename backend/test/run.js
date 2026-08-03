import knex from 'knex';
import fs from 'fs';
import path from 'path';

async function bootstrap() {
  console.log('🚀 Bootstrapping test environment and database safety checks...');
  
  // 1. Connect to default postgres database to guarantee test database exists
  const baseDb = knex({
    client: 'pg',
    connection: 'postgres://postgres:root@localhost:5432/postgres'
  });
  
  try {
    await baseDb.raw('CREATE DATABASE nearby_locator_test;');
    console.log('✅ Created pristine test database: nearby_locator_test');
  } catch (err) {
    if (err.code === '42P04') {
      console.log('✅ Test database nearby_locator_test already exists.');
    } else {
      console.warn('⚠️ Warning checking test database:', err.message);
    }
  } finally {
    await baseDb.destroy();
  }

  // 2. Generate a pristine .env.test override if not present
  const envTestPath = path.resolve(process.cwd(), '.env.test');
  if (!fs.existsSync(envTestPath)) {
    const envTestContent = `NODE_ENV=test
PORT=5001
DATABASE_URL=postgres://postgres:root@localhost:5432/nearby_locator_test
REDIS_URL=redis://localhost:6379
JWT_SECRET=4f9c7c6f8e5a2d1b3c9f0a6e7d8b1c2f5a9e3d7c1b6f8a0d4e2c9b7a1f5d6e8
GOOGLE_API_KEY=test_google_api_key_placeholder
GOOGLE_CLIENT_ID=test_google_client_id_placeholder.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=test_google_client_secret_placeholder
`;
    fs.writeFileSync(envTestPath, envTestContent, 'utf-8');
    console.log('✅ Generated .env.test override configuration file.');
  }

  // 3. Bind environment parameters before module imports execute
  process.env.NODE_ENV = 'test';
  process.env.MOCK_REDIS = 'true';

  // 4. Force latest knex migrations against the test database from a pristine schema
  console.log('🗄️  Resetting and running Knex database migrations on nearby_locator_test...');
  const { default: db } = await import('../db.js');
  
  // Safety Guard: Protect against accidental schema drop on non-test DBs
  const dbUrl = db.client.config.connection?.connectionString || '';
  if (process.env.NODE_ENV !== 'test' || !dbUrl.includes('_test')) {
    throw new Error(
      `[CRITICAL ENVIRONMENT SAFETY VIOLATION] Refusing to drop schema! ` +
      `Schema reset can only execute when process.env.NODE_ENV === 'test' and database URL contains '_test'. ` +
      `Target DB URL: "${dbUrl}"`
    );
  }

  await db.raw('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  await db.migrate.latest();
  console.log('✅ Schema migrated cleanly.');

  // 5. Spawn native Node test runner
  console.log('🧪 Starting native Node.js integration test runner...');
  const { spawn } = await import('child_process');
  
  const testProcess = spawn('node', [
    '--test',
    '--test-concurrency=1',
    'test/queryUtils.test.js',
    'test/auth.test.js',
    'test/failures.test.js',
    'test/observability.test.js',
    'test/migrations.test.js',
    'test/queue.test.js',
    'test/analytics.test.js',
    'test/admin.test.js',
    'test/geo.test.js',
    'test/notification.test.js',
    'test/discovery.test.js',
    'test/moderation.test.js',
    'test/searchQuality.test.js',
    'test/accountManagement.test.js',
    'test/adminUserManagement.test.js',
    'test/adminPlatform.test.js'
  ], {
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'test', FORCE_LOGGING: 'true' }
  });

  testProcess.on('close', (code) => {
    process.exit(code);
  });
}

bootstrap().catch(err => {
  console.error('❌ Test bootstrap failed:', err);
  process.exit(1);
});
