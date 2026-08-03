import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { getAuditLogs } from '../../services/admin';
import { useAuthStore } from '../../store/useAuthStore';
import { useToastStore } from '../../store/useToastStore';
import LoaderIcon from '../../icons/LoaderIcon';

export default function AdminProfilePage() {
  const { user } = useAuthStore();
  const { showToast } = useToastStore();
  const queryClient = useQueryClient();

  // Change password form states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);

  // Edit profile states
  const [name, setName] = useState(user?.name || '');
  const [timezone, setTimezone] = useState(user?.timezone || 'UTC');
  const [isProfileLoading, setIsProfileLoading] = useState(false);

  // Fetch own devices
  const { data: devicesData, isLoading: devicesLoading } = useQuery({
    queryKey: ['my-devices'],
    queryFn: async () => {
      const res = await api.get('/users/me/devices');
      return res.data.data.devices || [];
    }
  });

  // Fetch own activity logs
  const { data: activityData, isLoading: activityLoading } = useQuery({
    queryKey: ['my-activity', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const res = await getAuditLogs({ actorId: user.id, limit: 10 });
      return res.logs || [];
    },
    enabled: !!user?.id
  });

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Name cannot be empty.', 'error');
      return;
    }
    setIsProfileLoading(true);
    try {
      await api.put('/users/profile', { name, timezone });
      showToast('Profile details updated successfully.', 'success');
      // Update global context
      queryClient.invalidateQueries(['my-profile']);
    } catch (err) {
      showToast(err?.response?.data?.message || 'Failed to update profile.', 'error');
    } finally {
      setIsProfileLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showToast('New passwords do not match.', 'error');
      return;
    }
    if (newPassword.length < 8) {
      showToast('Password must be at least 8 characters.', 'error');
      return;
    }
    setIsPasswordLoading(true);
    try {
      await api.post('/auth/password/change', { 
        currentPassword, 
        newPassword 
      }, {
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
      });
      showToast('Password updated successfully.', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      showToast(err?.response?.data?.message || 'Failed to update password. Verify current password.', 'error');
    } finally {
      setIsPasswordLoading(false);
    }
  };

  const handleRevokeDevice = async (sessionId) => {
    if (!confirm('Are you sure you want to terminate this session?')) return;
    try {
      await api.delete(`/users/me/devices/${sessionId}`);
      showToast('Session terminated successfully.', 'success');
      queryClient.invalidateQueries(['my-devices']);
    } catch (err) {
      showToast('Failed to terminate session.', 'error');
    }
  };

  return (
    <div className="space-y-6 flex flex-col h-full w-full pb-8 pr-1">
      <header className="flex flex-col gap-1.5">
        <h2 className="text-2xl font-bold text-slate-900 font-sans">My Account Profile</h2>
        <p className="text-sm text-slate-500">Update credentials, view authenticated devices, and check safety activity logs.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Left column: Profile update / password change */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Edit profile */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-sm font-extrabold text-slate-800 mb-4 uppercase tracking-wider">General Information</h3>
            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Email Address (Read-only)</label>
                  <input
                    type="text"
                    disabled
                    value={user?.email || ''}
                    className="bg-slate-100 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-500 cursor-not-allowed"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Display Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-medium focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-500/20 text-slate-800"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Default Timezone</label>
                <select
                  value={timezone}
                  onChange={e => setTimezone(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-700 outline-none focus:ring-1 focus:ring-blue-500/20 cursor-pointer w-full md:w-1/2"
                >
                  <option value="UTC">UTC (Coordinated Universal Time)</option>
                  <option value="GMT">GMT (Greenwich Mean Time)</option>
                  <option value="EST">EST (Eastern Standard Time)</option>
                  <option value="PST">PST (Pacific Standard Time)</option>
                  <option value="IST">IST (Indian Standard Time)</option>
                </select>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isProfileLoading}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-5 py-2.5 text-xs font-bold transition-all shadow-md shadow-blue-600/20 flex items-center gap-2 cursor-pointer"
                >
                  {isProfileLoading && <LoaderIcon width={12} height={12} color="white" />}
                  Save Profile Info
                </button>
              </div>
            </form>
          </div>

          {/* Change password */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-sm font-extrabold text-slate-800 mb-4 uppercase tracking-wider">Authentication Gating Settings</h3>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Current Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-medium focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-500/20 text-slate-800 w-full md:w-2/3"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">New Password</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-medium focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-500/20 text-slate-800"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Confirm New Password</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-medium focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-500/20 text-slate-800"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isPasswordLoading || !currentPassword || !newPassword}
                  className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl px-5 py-2.5 text-xs font-bold transition-all shadow flex items-center gap-2"
                >
                  {isPasswordLoading && <LoaderIcon width={12} height={12} color="white" />}
                  Change Password
                </button>
              </div>
            </form>
          </div>

        </div>

        {/* Right column: Devices and recent activity */}
        <div className="space-y-6">
          
          {/* Active sessions */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-sm font-extrabold text-slate-800 mb-3 uppercase tracking-wider">Active Device Sessions</h3>
            {devicesLoading ? (
              <div className="py-8 flex justify-center"><LoaderIcon width={24} height={24} color="#4f46e5" /></div>
            ) : devicesData?.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 font-semibold text-center">No other sessions active.</p>
            ) : (
              <div className="space-y-3 mt-4">
                {devicesData?.map(device => (
                  <div key={device.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-bold text-slate-850 font-mono text-[10px] break-all">{device.ip_address}</span>
                      <span className="text-[10px] text-slate-450 font-semibold truncate max-w-[140px]" title={device.user_agent}>{device.user_agent}</span>
                      <span className="text-[9px] text-blue-600 font-bold uppercase tracking-wider">
                        {device.id === localStorage.getItem('sessionId') ? 'Current Session' : 'Active'}
                      </span>
                    </div>
                    {device.id !== localStorage.getItem('sessionId') && (
                      <button
                        onClick={() => handleRevokeDevice(device.id)}
                        className="text-red-600 hover:text-red-700 font-bold text-[10px] hover:bg-red-50 px-2 py-1 rounded-md transition-colors"
                      >
                        Revoke
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Activity summary */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-sm font-extrabold text-slate-800 mb-3 uppercase tracking-wider">Recent Activity Logs</h3>
            {activityLoading ? (
              <div className="py-8 flex justify-center"><LoaderIcon width={24} height={24} color="#4f46e5" /></div>
            ) : activityData?.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 font-semibold text-center">No recent security logs.</p>
            ) : (
              <div className="space-y-2.5 mt-4">
                {activityData?.slice(0, 5).map(log => (
                  <div key={log.id} className="text-xs border-b border-slate-100 pb-2.5 last:border-0 last:pb-0">
                    <div className="flex justify-between items-center">
                      <span className="font-mono font-bold text-blue-700 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded text-[10px]">{log.action}</span>
                      <span className="text-[10px] text-slate-400 font-semibold">{new Date(log.occurred_at).toLocaleDateString()}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium mt-1">IP: {log.ip_address}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
