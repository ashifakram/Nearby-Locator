import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import AuthCard from '../../components/auth/AuthCard';
import StatusCard from '../../components/auth/StatusCard';

/**
 * OtpDeliveryFailedPage
 *
 * Triggered when:
 *   - authService.sendOtp() or resendOtp() catches a delivery error (SMS/email gateway)
 *   - API returns { code: 'OTP_DELIVERY_FAILED' } in the response body
 *
 * Navigation: navigate('/otp-delivery-failed', { state: { email, channel } })
 *   - channel: 'email' | 'sms'
 */
export default function OtpDeliveryFailedPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email || 'your registered contact';
  const channel = location.state?.channel || 'email';

  const channelLabel = channel === 'sms' ? 'SMS message' : 'email';

  return (
    <AuthCard>
      <StatusCard
        type="error"
        title="OTP Delivery Failed"
        description={`We could not send your one-time code via ${channelLabel} to ${email}. Please try again or use an alternative method.`}
        details={
          <div className="space-y-2.5 text-slate-600">
            <p>
              <strong className="text-slate-800">Delivery channel:</strong>{' '}
              {channel === 'sms' ? 'SMS (text message)' : 'Email'}
            </p>
            <p>
              OTP codes expire in 10 minutes. Requesting a new code will invalidate any previously sent codes.
            </p>
            <p>
              {channel === 'sms'
                ? 'Check that your phone number is correct and that SMS is not blocked by your carrier.'
                : 'Check your spam folder. If the issue persists, contact our support team.'}
            </p>
          </div>
        }
        primaryActionLabel="Request New Code"
        onPrimaryAction={() => navigate(-1)}
        secondaryActionLabel="Contact Support"
        onSecondaryAction={() => window.open('mailto:support@nearbylocator.com?subject=OTP Delivery Failed', '_blank')}
      />
    </AuthCard>
  );
}
