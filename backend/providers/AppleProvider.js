import OAuthProvider from './OAuthProvider.js';

export default class AppleProvider extends OAuthProvider {
  get name() {
    return 'apple';
  }

  async verifyAndNormalize(tokenOrCode) {
    // Stub implementation for Apple Sign-In
    // In real life, this verifies the Apple JWT and handles the Authorization Code exchange.
    let payload = tokenOrCode;
    if (typeof tokenOrCode === 'string') {
      try {
        payload = JSON.parse(tokenOrCode);
      } catch (e) {
        payload = { sub: tokenOrCode, email: 'mock@apple.com' };
      }
    }

    if (!payload.email) {
      const err = new Error('Email is required from Apple payload');
      err.code = 'INVALID_INPUT';
      throw err;
    }

    return {
      provider: this.name,
      providerUserId: payload.sub || payload.apple_id || 'mock-apple-sub',
      email: payload.email,
      emailVerified: true, // Apple always verifies the email it provides
      metadata: {
        is_private_email: payload.is_private_email || false,
        real_user_status: payload.real_user_status || 1
      }
    };
  }

  async revoke(providerAccountId) {
    // Apple requires server-to-server revocation of the user's token when unlinking.
    // Stub for HTTP call to https://appleid.apple.com/auth/revoke
    console.log(`[AppleProvider] Revoking token for providerAccountId: ${providerAccountId}`);
  }
}
