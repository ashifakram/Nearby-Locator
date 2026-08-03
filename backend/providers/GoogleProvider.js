import OAuthProvider from './OAuthProvider.js';
import { OAuth2Client } from 'google-auth-library';

export default class GoogleProvider extends OAuthProvider {
  constructor() {
    super();
    this.clientId = process.env.GOOGLE_CLIENT_ID || 'dummy-client-id-for-tests';
    this.clientSecret = process.env.GOOGLE_CLIENT_SECRET || null;
    this.client = new OAuth2Client(
      this.clientId,
      this.clientSecret,
      'postmessage' // Required for popup/code flow from browser
    );
  }

  get name() {
    return 'google';
  }

  /**
   * Accepts either:
   *   - An ID token string (legacy GSI credential flow)
   *   - An authorization code string (new popup OAuth2 code flow)
   */
  async verifyAndNormalize(tokenOrCode, isAuthCode = false) {
    if (!tokenOrCode || typeof tokenOrCode !== 'string') {
      const err = new Error('Google token must be a string');
      err.code = 'INVALID_INPUT';
      throw err;
    }

    let payload;

    if (isAuthCode) {
      // --- Auth Code Flow (from initCodeClient popup) ---
      // Exchange the code for tokens, then extract the ID token payload
      try {
        const { tokens } = await this.client.getToken(tokenOrCode);
        if (!tokens.id_token) {
          const err = new Error('Google auth code exchange did not return an ID token');
          err.code = 'INVALID_TOKEN';
          throw err;
        }
        const ticket = await this.client.verifyIdToken({
          idToken: tokens.id_token,
          audience: this.clientId,
        });
        payload = ticket.getPayload();
      } catch (e) {
        const err = new Error('Google auth code exchange failed: ' + e.message);
        err.code = 'INVALID_TOKEN';
        throw err;
      }
    } else {
      // --- ID Token Flow (legacy GSI credential / One Tap) ---
      try {
        const ticket = await this.client.verifyIdToken({
          idToken: tokenOrCode,
          audience: this.clientId,
        });
        payload = ticket.getPayload();
      } catch (e) {
        const err = new Error('Google token verification failed: ' + e.message);
        err.code = 'INVALID_TOKEN';
        throw err;
      }
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
        locale: payload.locale || 'en',
      },
    };
  }
}
