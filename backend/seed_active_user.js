import db from './db.js';
import { IdentityService } from './services/identityService.js';
import { RbacRepository } from './repositories/rbacRepository.js';

async function seed() {
  try {
    const email = 'flow2_tester@example.com';
    const password = 'SecurePass123!';
    
    // Clean up if exists
    await db('users').where({ email }).del();

    const role = await RbacRepository.getRoleByName('User');
    const passwordHash = await IdentityService.hashPassword(password);
    
    await db('users').insert({
      email,
      password_hash: passwordHash,
      status: 'ACTIVE',
      role_id: role.id,
      name: 'Flow Two Tester'
    });

    console.log('ACTIVE user seeded successfully.');
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

seed();
