const REQUIRED_ENV = ['VITE_API_URL'];

export function validateEnv() {
  const missing = REQUIRED_ENV.filter((key) => !import.meta.env[key]);
  if (missing.length > 0) {
    console.error(`[FATAL] Missing required environment variables:`, missing);
    throw new Error(`[FATAL] Missing required environment variables: ${missing.join(', ')}`);
  }
  try {
    new URL(import.meta.env.VITE_API_URL);
  } catch (err) {
    console.error(`[FATAL] Invalid VITE_API_URL provided: ${import.meta.env.VITE_API_URL}`);
    throw new Error(`[FATAL] Invalid VITE_API_URL provided: ${import.meta.env.VITE_API_URL}`);
  }
}

export const config = {
  apiUrl: import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000/api',
  isProduction: import.meta.env.MODE === 'production',
};
