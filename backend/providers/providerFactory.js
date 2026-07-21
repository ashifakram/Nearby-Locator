import GoogleProvider from './GoogleProvider.js';
import AppleProvider from './AppleProvider.js';

const providers = new Map();

providers.set('google', new GoogleProvider());
providers.set('apple', new AppleProvider());

export default class ProviderFactory {
  static get(providerName) {
    const provider = providers.get(providerName.toLowerCase());
    if (!provider) {
      const err = new Error(`Unsupported OAuth provider: ${providerName}`);
      err.code = 'UNSUPPORTED_PROVIDER';
      throw err;
    }
    return provider;
  }
}
