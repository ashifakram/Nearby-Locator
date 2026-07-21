export default class OAuthProvider {
  /**
   * Uniquely identifies the provider (e.g., 'google', 'apple')
   */
  get name() {
    throw new Error('OAuthProvider subclass must implement getter for name');
  }

  /**
   * Validates an incoming token/code and normalizes the external profile.
   * Must return: { provider, providerUserId, email, emailVerified, metadata }
   */
  async verifyAndNormalize(tokenOrCode) {
    throw new Error('OAuthProvider subclass must implement verifyAndNormalize');
  }

  /**
   * Revokes the token at the identity provider level (if supported).
   */
  async revoke(providerAccountId) {
    // Default implementation: no-op. Subclasses can override if they support remote revocation.
  }
}
