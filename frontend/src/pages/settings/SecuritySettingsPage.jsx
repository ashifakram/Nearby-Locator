import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useAuthStore } from '../../store/useAuthStore';
import { useToastStore } from '../../store/useToastStore';
import { userSettingsService } from '../../services/userSettingsService';
import {
  SettingsCard,
  SettingsSection,
  SettingsRow,
  SettingsSwitch
} from '../../components/settings/SettingsCard';

export default function SecuritySettingsPage() {
  const { user } = useAuthStore();
  const { showToast } = useToastStore();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  const passwordMutation = useMutation({
    mutationFn: () => userSettingsService.changePassword(currentPassword, newPassword),
    onSuccess: () => {
      showToast('Password changed successfully!', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    },
    onError: (err) => {
      showToast(err?.message || 'Failed to change password.', 'error');
    }
  });

  const getPasswordStrength = (pwd) => {
    if (!pwd) return { score: 0, label: 'None', color: 'bg-slate-200' };
    if (pwd.length < 6) return { score: 1, label: 'Weak', color: 'bg-rose-500' };
    if (pwd.length < 10) return { score: 2, label: 'Medium', color: 'bg-amber-500' };
    return { score: 3, label: 'Strong', color: 'bg-emerald-500' };
  };

  const strength = getPasswordStrength(newPassword);

  const handleChangePassword = (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      showToast('Please enter both current and new password.', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('New passwords do not match.', 'error');
      return;
    }
    passwordMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200/80 dark:border-slate-800 pb-4">
        <h2 className="text-xl font-heading font-bold text-slate-900 dark:text-slate-100">
          Security & Authentication
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Manage your password, two-factor authentication, and security credentials.
        </p>
      </div>

      {/* Password Form */}
      <SettingsCard>
        <SettingsSection title="Change Password" description="Update your account password. Use a strong combination of letters and numbers.">
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Current Password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full max-w-md px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>

            {/* Password Strength Meter */}
            {newPassword && (
              <div className="space-y-1 max-w-md pt-1">
                <div className="flex justify-between items-center text-[10px] font-mono">
                  <span className="text-slate-400">Strength:</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">{strength.label}</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${strength.color}`}
                    style={{ width: `${(strength.score / 3) * 100}%` }}
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={passwordMutation.isPending}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors cursor-pointer shadow-xs"
            >
              {passwordMutation.isPending ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </SettingsSection>
      </SettingsCard>

      {/* Two-Factor Authentication */}
      <SettingsCard>
        <SettingsSection title="Two-Factor Authentication (2FA)" description="Add an extra layer of security to your account using TOTP authenticator apps.">
          <SettingsRow label="Authenticator App (TOTP)" description="Use apps like Google Authenticator or 1Password to generate codes.">
            <SettingsSwitch
              checked={twoFactorEnabled}
              onChange={(val) => {
                setTwoFactorEnabled(val);
                showToast(`Two-Factor Authentication ${val ? 'enabled' : 'disabled'}.`, 'success');
              }}
              ariaLabel="Toggle 2FA"
            />
          </SettingsRow>
        </SettingsSection>
      </SettingsCard>
    </div>
  );
}
