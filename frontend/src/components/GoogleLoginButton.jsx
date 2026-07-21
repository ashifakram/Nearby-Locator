import React, { useEffect, useRef, useState } from 'react';
import { authService } from '../services/auth';
import { useToastStore } from '../store/useToastStore';
import { useNavigate } from 'react-router-dom';
import { normalizeError } from '../utils/errors';

export default function GoogleLoginButton({
  theme = 'filled_black',
  shape = 'pill',
  text = 'signin_with',
  height = 44,
  colorScheme = 'dark',
  variant = 'gsi',
  label = 'Google',
  className = '',
}) {
  const { showToast } = useToastStore();
  const navigate = useNavigate();
  const btnContainerRef = useRef(null);
  const [gsiLoaded, setGsiLoaded] = useState(false);

  useEffect(() => {
    // Check if gsi is loaded, otherwise poll briefly
    const checkGsi = () => {
      if (window.google?.accounts?.id) {
        setGsiLoaded(true);
      } else {
        setTimeout(checkGsi, 100);
      }
    };
    checkGsi();
  }, []);

  useEffect(() => {
    if (!gsiLoaded) return;

    const handleCredentialResponse = async (response) => {
      try {
        const tokenId = response.credential;
        await authService.loginGoogle(tokenId);
        showToast('Successfully logged in with Google!', 'success');
        navigate('/discover', { replace: true });
      } catch (err) {
        const friendlyErr = normalizeError(err);
        showToast(friendlyErr, 'error');
      }
    };


    try {
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '933905768861-fsnoj7i1rjgfoji3nkelqdcco0v4fmr1.apps.googleusercontent.com';
      window.google.accounts.id.initialize({
        client_id: clientId.trim(),
        callback: handleCredentialResponse,
        auto_select: false,
        cancel_on_tap_outside: true,
      });

      if (variant === 'minimal') return;
      if (!btnContainerRef.current) return;

      window.google.accounts.id.renderButton(btnContainerRef.current, {
        theme,
        size: 'large',
        shape,
        width: btnContainerRef.current.offsetWidth || 320,
        text,
      });
    } catch (e) {
      console.error('Failed to initialize Google Identity Services:', e);
    }
  }, [colorScheme, gsiLoaded, height, navigate, shape, showToast, text, theme, variant]);

  if (variant === 'minimal') {
    return (
      <button
        type="button"
        disabled={!gsiLoaded}
        onClick={() => window.google?.accounts?.id?.prompt()}
        className={`w-full h-[52px] border border-[#c7c4d7]/60 bg-white rounded-xl text-[#0d1c2e] flex items-center justify-center gap-3 hover:bg-[#eff4ff] transition-all active:scale-[0.98] disabled:opacity-60 ${className}`}
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
        </svg>
        <span className="text-sm font-medium tracking-normal">{label}</span>
      </button>
    );
  }

  return (
    <div className="w-full flex justify-center">
      <div 
        ref={btnContainerRef} 
        id="google-signin-btn" 
        className="w-full min-w-[200px]"
        style={{ colorScheme, height }}
      />
    </div>
  );
}
