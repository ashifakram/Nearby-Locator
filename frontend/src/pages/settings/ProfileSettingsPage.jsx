import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store/useAuthStore';
import { useToastStore } from '../../store/useToastStore';
import { userSettingsService } from '../../services/userSettingsService';
import { queryKeys } from '../../lib/queryKeys';
import {
  SettingsCard,
  SettingsSection
} from '../../components/settings/SettingsCard';
import { Camera, Save, CheckCircle2, Mail } from 'lucide-react';

export default function ProfileSettingsPage() {
  const { user } = useAuthStore();
  const { showToast } = useToastStore();
  const queryClient = useQueryClient();

  const [name, setName] = useState(user?.name || '');
  const [username, setUsername] = useState(user?.username || (user?.email ? user.email.split('@')[0] : 'explorer'));
  const [bio, setBio] = useState(user?.bio || '');
  const [location, setLocation] = useState(user?.location || '');
  const [website, setWebsite] = useState(user?.website || '');
  const [company, setCompany] = useState(user?.company || '');
  const [jobTitle, setJobTitle] = useState(user?.job_title || '');
  const [phone, setPhone] = useState(user?.phone || '');

  // Fetch enriched profile from API
  const { data: profileData } = useQuery({
    queryKey: queryKeys.settings.profile(),
    queryFn: () => userSettingsService.getProfile(),
    staleTime: 5 * 60 * 1000
  });

  useEffect(() => {
    if (profileData) {
      if (profileData.name) setName(profileData.name);
      if (profileData.profile?.username) setUsername(profileData.profile.username);
      if (profileData.profile?.bio) setBio(profileData.profile.bio);
      if (profileData.profile?.city || profileData.profile?.location) setLocation(profileData.profile.city || profileData.profile.location);
      if (profileData.profile?.website) setWebsite(profileData.profile.website);
      if (profileData.profile?.company) setCompany(profileData.profile.company);
      if (profileData.profile?.job_title) setJobTitle(profileData.profile.job_title);
      if (profileData.profile?.phone) setPhone(profileData.profile.phone);
    }
  }, [profileData]);

  // Profile Update Mutation
  const updateMutation = useMutation({
    mutationFn: (payload) => userSettingsService.updateProfile(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.profile() });
      showToast('Profile updated successfully!', 'success');
    },
    onError: (err) => {
      showToast(err?.message || 'Failed to update profile.', 'error');
    }
  });

  // Avatar Upload Mutation
  const avatarMutation = useMutation({
    mutationFn: (file) => userSettingsService.uploadAvatar(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.profile() });
      showToast('Avatar updated successfully!', 'success');
    },
    onError: (err) => {
      showToast(err?.message || 'Avatar upload failed.', 'error');
    }
  });

  const handleAvatarFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      avatarMutation.mutate(file);
    }
  };

  const handleSave = (e) => {
    e.preventDefault();
    updateMutation.mutate({
      name,
      username,
      bio,
      location,
      website,
      company,
      job_title: jobTitle,
      phone
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200/80 dark:border-slate-800 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-heading font-bold text-slate-900 dark:text-slate-100">
            My Profile
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage your personal profile, public identity, and contact details.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {updateMutation.isSuccess && (
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 animate-in fade-in duration-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Saved successfully!</span>
            </span>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-sans text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer shrink-0"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{updateMutation.isPending ? 'Saving...' : 'Save Changes'}</span>
          </button>
        </div>
      </div>


      {/* Card 1: Avatar Header */}
      <SettingsCard>
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="relative group">
            <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white font-mono font-bold text-xl flex items-center justify-center shadow-md overflow-hidden">
              {user?.avatar_url || user?.avatar || user?.picture || profileData?.avatar_url || profileData?.avatar || profileData?.picture ? (
                <img
                  src={user?.avatar_url || user?.avatar || user?.picture || profileData?.avatar_url || profileData?.avatar || profileData?.picture}
                  alt={name}
                  className="w-full h-full object-cover"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              ) : (
                <span>{name ? name.charAt(0).toUpperCase() : 'U'}</span>
              )}
            </div>

            <label className="absolute -bottom-1 -right-1 p-1.5 rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-sm cursor-pointer">
              <Camera className="w-3.5 h-3.5" />
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatarFileChange} />
            </label>
          </div>

          <div className="space-y-1">
            <h3 className="text-base font-heading font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>{name || 'Explorer'}</span>
              <span className="px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 text-[10px] font-mono font-bold border border-blue-200/80 dark:border-blue-900/50">
                @{username}
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <Mail className="w-3.5 h-3.5" />
              <span>{user?.email}</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" title="Verified Email" />
            </p>
          </div>
        </div>
      </SettingsCard>

      {/* Card 2: Public Profile Information */}
      <SettingsCard>
        <SettingsSection title="Public Information" description="Information displayed on your spatial discovery profile.">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Display Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          <div className="space-y-1.5 pt-2">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Bio</label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-600 leading-relaxed"
            />
          </div>
        </SettingsSection>
      </SettingsCard>

      {/* Card 3: Professional & Contact Details */}
      <SettingsCard>
        <SettingsSection title="Professional Details" description="Your company, job title, and location metadata.">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Company</label>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Job Title</label>
              <input
                type="text"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Location</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Website</label>
              <input
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>
        </SettingsSection>
      </SettingsCard>
    </div>
  );
}
