import OAuthProvider from './OAuthProvider.js';
import { OAuth2Client } from 'google-auth-library';

export default class GoogleProvider extends OAuthProvider {
  constructor() {
    super();
    this.clientId = process.env.GOOGLE_CLIENT_ID || 'dummy-client-id-for-tests';
    this.client = new OAuth2Client(this.clientId);
  }

  get name() {
    return 'google';
  }

  async verifyAndNormalize(tokenOrCode) {
    if (!tokenOrCode || typeof tokenOrCode !== 'string') {
      const err = new Error('Google token must be a string');
      err.code = 'INVALID_INPUT';
      throw err;
    }

    let payload;
    try {
      // Cryptographically verifies the signature, issuer, audience, and expiration
      const ticket = await this.client.verifyIdToken({
        idToken: tokenOrCode,
        audience: this.clientId
      });
      payload = ticket.getPayload();
    } catch (e) {
      const err = new Error('Google token verification failed: ' + e.message);
      err.code = 'INVALID_TOKEN';
      throw err;
    }

    if (!payload || !payload.email) {
      const err = new Error('Email is required from Google payload');
      err.code = 'INVALID_INPUT';
      throw err;
    }

    return {
      provider: this.name,
      providerUserId: payload.sub,
      email: payload.email,
      emailVerified: payload.email_verified !== false,
      name: payload.name || 'Google User',
      metadata: {
        hd: payload.hd || null,
        picture: payload.picture || null,
        locale: payload.locale || 'en'
      }
    };
  }
}
