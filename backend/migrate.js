import dotenv from 'dotenv';
import db from './db.js';
dotenv.config();

// Run latest migrations
(async () => {
  try {
    await db.migrate.latest();
    console.log('Migrations completed');
    process.exit(0);
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  }
})();
