import db from '../db.js';

class OAuthRepositoryClass {
  /**
   * Links a new OAuth provider to an existing user.
   */
  async linkProvider(userId, profile, executor = db) {
    const records = await executor('user_oauth_accounts')
      .insert({
        user_id: userId,
        provider: profile.provider,
        provider_user_id: profile.providerUserId,
        email: profile.email,
        is_email_verified: profile.emailVerified,
        lifecycle_status: 'ACTIVE',
        metadata: profile.metadata || {}
      })
      .returning('*');
    return records[0];
  }

  /**
   * Finds an existing active OAuth account by provider and ID.
   */
  async findByProvider(provider, providerUserId, executor = db) {
    return await executor('user_oauth_accounts')
      .where({
        provider,
        provider_user_id: providerUserId,
        lifecycle_status: 'ACTIVE'
      })
      .first();
  }

  /**
   * Lists all active OAuth providers linked to a user.
   */
  async findByUser(userId, executor = db) {
    return await executor('user_oauth_accounts')
      .where({ user_id: userId, lifecycle_status: 'ACTIVE' });
  }

  /**
   * Soft unlinks a provider by setting its lifecycle status.
   */
  async unlinkProvider(userId, provider, executor = db) {
    return await executor('user_oauth_accounts')
      .where({ user_id: userId, provider, lifecycle_status: 'ACTIVE' })
      .update({ lifecycle_status: 'UNLINKED' });
  }

  /**
   * Updates the last login timestamp.
   */
  async touchLastLogin(accountId, executor = db) {
    await executor('user_oauth_accounts')
      .where({ id: accountId })
      .update({ last_login_at: executor.fn.now() });
  }
}

const instance = new OAuthRepositoryClass();
export { instance as OAuthRepository };
export default instance;
