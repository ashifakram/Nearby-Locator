import { loadConfig } from './loader.js';

// Resolve configuration Singleton on module load
const config = loadConfig();

export default config;
export { redactSecrets } from './loader.js';
export { ConfigValidationError } from './errors.js';
