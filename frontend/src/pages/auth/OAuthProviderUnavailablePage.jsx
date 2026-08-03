import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import AuthCard from '../../components/auth/AuthCard';
import StatusCard from '../../components/auth/StatusCard';

/**
 * OAuthProviderUnavailablePage
 *
 * Triggered when:
 *   - Google OAuth callback returns error=provider_unavailable or error=access_denied
 *   - authService.googleLogin() throws a network error contacting Google's token endpoint
 *   - API returns { code: 'OAUTH_PROVIDER_UNAVAILABLE' }
 *
 * Navigation: navigate('/oauth-unavailable', { state: { provider, reason } })
 *   - provider: 'google' | 'github' | 'apple'
 *   - reason: 'unavailable' | 'access_denied' | 'token_error' | 'account_conflict'
 */
export default function OAuthProviderUnavailablePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const provider = location.state?.provider || 'Google';
  const reason = location.state?.reason || 'unavailable';

  const providerLabel = typeof provider === 'string'
    ? provider.charAt(0).toUpperCase() + provider.slice(1)
    : 'OAuth Provider';

  const reasonMessages = {
    unavailable: `${providerLabel}'s authentication service is currently unreachable. This is a temporary outage.`,
    access_denied: `You denied access to your ${providerLabel} account. You must grant permission to sign in.`,
    token_error: `${providerLabel} returned an invalid token. Your session could not be established.`,
    account_conflict: `A different account is already linked to your ${providerLabel} identity. Please use email & password login.`,
  };

  const description = reasonMessages[reason] || `${providerLabel} authentication is temporarily unavailable.`;

  return (
    <AuthCard>
      <StatusCard
        type="error"
        title={`${providerLabel} Login Unavailable`}
        description={description}
        details={
          <div className="space-y-2.5 text-slate-600">
            <p>
              <strong className="text-slate-800">Provider:</strong> {providerLabel}&nbsp;·&nbsp;
              <strong className="text-slate-800">Reason:</strong> {reason.replace(/_/g, ' ')}
            </p>
            <p>
              {reason === 'account_conflict'
                ? 'Use the email and password you set during registration, or reset your password below.'
                : `Try signing in with email and password instead, or retry ${providerLabel} login after a few minutes.`}
            </p>
          </div>
        }
        primaryActionLabel="Sign In With Email Instead"
        primaryActionTo="/login"
        secondaryActionLabel={reason === 'unavailable' ? `Retry ${providerLabel} Login` : 'Contact Support'}
        onSecondaryAction={
          reason === 'unavailable'
            ? () => navigate(-1)
            : () => window.open('mailto:support@nearbylocator.com?subject=OAuth Login Issue', '_blank')
        }
      />
    </AuthCard>
  );
}
