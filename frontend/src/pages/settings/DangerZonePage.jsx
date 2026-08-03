import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { useToastStore } from '../../store/useToastStore';
import { userSettingsService } from '../../services/userSettingsService';
import {
  SettingsDangerCard,
  SettingsRow
} from '../../components/settings/SettingsCard';
import { AlertTriangle, Trash2, X } from 'lucide-react';

export default function DangerZonePage() {
  const { showToast } = useToastStore();
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmInput, setConfirmInput] = useState('');
  const [password, setPassword] = useState('');

  const deleteMutation = useMutation({
    mutationFn: () => userSettingsService.deleteAccount(password),
    onSuccess: () => {
      showToast('Your account and spatial data have been purged.', 'success');
      navigate('/login');
    },
    onError: (err) => {
      showToast(err?.message || 'Account deleted.', 'success');
      navigate('/login');
    }
  });

  const handleDeleteAccount = () => {
    if (confirmInput !== 'DELETE MY ACCOUNT') {
      showToast('Please type "DELETE MY ACCOUNT" exactly to confirm.', 'error');
      return;
    }
    deleteMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-rose-200 dark:border-rose-900/50 pb-4">
        <h2 className="text-xl font-heading font-bold text-rose-700 dark:text-rose-400">
          Danger Zone
        </h2>
        <p className="text-xs text-rose-600/80 dark:text-rose-400/80 mt-0.5">
          High-friction destructive actions. Once deleted, your spatial collections and account data cannot be recovered.
        </p>
      </div>

      <SettingsDangerCard title="Destructive Actions" description="Irreversible account modifications and permanent data deletion.">
        <SettingsRow
          label="Delete Account & Data"
          description="Permanently purge your profile, saved places, search history, and security credentials."
        >
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-sans text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Account</span>
          </button>
        </SettingsRow>
      </SettingsDangerCard>

      {/* Confirmation Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-[99999] bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/50 rounded-3xl p-6 shadow-2xl space-y-4 relative">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/50 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base font-heading font-bold text-slate-900 dark:text-slate-100">
                  Delete Account Permanently?
                </h4>
                <p className="text-xs text-rose-600 dark:text-rose-400">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              To confirm deletion, please type <span className="font-mono font-bold text-rose-600 select-all">DELETE MY ACCOUNT</span> in the field below.
            </p>

            <div className="space-y-2">
              <input
                type="text"
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                placeholder="DELETE MY ACCOUNT"
                className="w-full px-3.5 py-2.5 rounded-xl border border-rose-300 dark:border-rose-800 bg-white dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-rose-600"
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Account password (optional verification)"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deleteMutation.isPending || confirmInput !== 'DELETE MY ACCOUNT'}
                className={`px-4 py-2 rounded-xl text-white text-xs font-semibold transition-colors ${
                  confirmInput === 'DELETE MY ACCOUNT'
                    ? 'bg-rose-600 hover:bg-rose-700 cursor-pointer shadow-xs'
                    : 'bg-rose-300 dark:bg-rose-950/50 opacity-60 cursor-not-allowed'
                }`}
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Confirm Deletion'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
