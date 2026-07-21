import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { validateEnv } from './app/config';
import Providers from './app/providers';
import { logger } from './utils/logger';
import { authService } from './services/auth';
import { useAuthStore } from './store/useAuthStore';

// 1. Assert runtime environment validation immediately upon startup (Problem 3 Safety)
try {
  validateEnv();
  logger.info('Frontend environment validation successful!');
} catch (err) {
  logger.error('Fatal environment bootstrap configuration failure:', err.message);
  // Render clean crash feedback direct to screen bypassing React stack
  const rootEl = document.getElementById('root');
  if (rootEl) {
    rootEl.innerHTML = `
      <div style="background-color: #0b0f19; color: #f87171; font-family: monospace; padding: 2rem; min-height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center;">
        <h1 style="font-size: 1.5rem; margin-bottom: 1rem;">⚠️ FATAL CONFIGURATION ERROR</h1>
        <p style="color: #9ca3af; max-width: 500px;">${err.message}</p>
        <p style="color: #4b5563; font-size: 0.8rem; margin-top: 2rem;">Nearby Locator Platform Environment Assert Safety Layer</p>
      </div>
    `;
  }
}

// 2. Perform silent initial session restoration check asynchronously (Problem 1 Session Restore)
authService.getProfile()
  .then((data) => {
    logger.info('User session restored successfully:', data);
  })
  .catch((err) => {
    logger.info('No active credentials/cookie restored. Session started in guest mode.');
    useAuthStore.getState().finishRestoring();
  });

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <Providers />
  </React.StrictMode>
);
