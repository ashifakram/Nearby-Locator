import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import AuthCard from '../../components/auth/AuthCard';
import StatusCard from '../../components/auth/StatusCard';

/**
 * EmailDeliveryFailedPage
 *
 * Triggered when:
 *   - authService.resendVerification() catches a delivery error (e.g. 502 from SendGrid/Resend)
 *   - Any email dispatch API call receives { code: 'EMAIL_DELIVERY_FAILED' } in the error body
 *
 * Navigation: navigate('/email-delivery-failed', { state: { email, context } })
 *   - context: 'verification' | 'password-reset' | 'welcome'
 */
export default function EmailDeliveryFailedPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email || 'your registered email address';
  const context = location.state?.context || 'verification';

  const contextLabels = {
    verification: 'email verification code',
    'password-reset': 'password reset code',
    welcome: 'welcome email',
  };
  const label = contextLabels[context] || 'email';

  return (
    <AuthCard>
      <StatusCard
        type="error"
        title="Email Delivery Failed"
        description={`We were unable to deliver your ${label} to ${email}. This is a temporary issue with our email provider.`}
        details={
          <div className="space-y-2.5 text-slate-600">
            <p>
              <strong className="text-slate-800">Possible causes:</strong> Email provider outage, spam filtering, or an invalid email address.
            </p>
            <p>
              Check your spam or junk folder. If the issue persists, contact support and we'll verify your account manually.
            </p>
            <div className="border-t border-slate-200 pt-2.5 text-xs text-slate-500">
              <span className="font-semibold text-slate-700">Delivery target:</span> {email}
            </div>
          </div>
        }
        primaryActionLabel="Try Again"
        onPrimaryAction={() => navigate(-1)}
        secondaryActionLabel="Contact Support"
        onSecondaryAction={() => window.open('mailto:support@nearbylocator.com?subject=Email Delivery Failed', '_blank')}
      />
    </AuthCard>
  );
}
