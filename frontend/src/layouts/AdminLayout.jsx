import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { useToastStore } from '../store/useToastStore';
import { useUIStore } from '../store/useUIStore';
import { usePermissions } from '../contexts/PermissionContext';
import { sudoConfirm } from '../services/admin';
import {
  ShieldCheck,
  Activity,
  Download,
  Users,
  Key,
  Cpu,
  Settings,
  FileCode,
  ArrowLeft,
  Lock,
  Sun,
  Moon,
  LogOut,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';

export default function AdminLayout() {
  const { user } = useAuthStore();
  const { showToast } = useToastStore();
  const { isDark, toggleTheme } = useUIStore();
  const { hasPermission } = usePermissions();
  const navigate = useNavigate();
  const location = useLocation();

  const [isSudoModalOpen, setIsSudoModalOpen] = useState(false);
  const [sudoPassword, setSudoPassword] = useState('');
  const [isSudoLoading, setIsSudoLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);

  const isImpersonating = user?.impersonated || localStorage.getItem('isImpersonated') === 'true';

  const handleStopImpersonating = () => {
    localStorage.removeItem('isImpersonated');
    showToast('Stopping impersonation session...', 'info');
    window.location.href = '/admin/users';
  };

  const triggerSudo = (onSuccess) => {
    setPendingAction(() => onSuccess);
    setIsSudoModalOpen(true);
  };

  const handleSudoSubmit = async (e) => {
    e.preventDefault();
    if (!sudoPassword) return;
    setIsSudoLoading(true);
    try {
      await sudoConfirm(sudoPassword);
      showToast('Step-up verification successful.', 'success');
      setIsSudoModalOpen(false);
      setSudoPassword('');
      if (pendingAction) {
        pendingAction();
      }
    } catch (err) {
      showToast(err?.response?.data?.message || 'Verification failed. Please check your password.', 'error');
    } finally {
      setIsSudoLoading(false);
    }
  };

  const navGroups = [
    {
      title: 'Platform',
      items: [
        {
          label: 'Moderation Queue',
          path: '/admin/queues',
          active: location.pathname === '/admin/queues' || location.pathname === '/admin',
          icon: ShieldCheck,
        },
        {
          label: 'Operations Center',
          path: '/admin/operations',
          active: location.pathname.startsWith('/admin/operations'),
          permission: 'audit.read',
          icon: Activity,
        },
        {
          label: 'Data Exports',
          path: '/admin/exports',
          active: location.pathname === '/admin/exports',
          icon: Download,
        },
      ],
    },
    {
      title: 'Access Control',
      items: [
        {
          label: 'User Management',
          path: '/admin/users',
          active: location.pathname === '/admin/users',
          permission: 'users.read',
          icon: Users,
        },
        {
          label: 'Roles & Permissions',
          path: '/admin/roles',
          active: location.pathname === '/admin/roles',
          permission: 'roles.read',
          icon: Key,
        },
      ],
    },
    {
      title: 'System',
      items: [
        {
          label: 'System Diagnostics',
          path: '/admin/system',
          active: location.pathname === '/admin/system',
          permission: 'metrics.read',
          icon: Cpu,
        },
        {
          label: 'Platform Settings',
          path: '/admin/settings',
          active: location.pathname === '/admin/settings',
          icon: Settings,
        },
        {
          label: 'API Documentation',
          path: '/admin/docs',
          active: location.pathname === '/admin/docs',
          icon: FileCode,
        },
      ],
    },
  ];

  return (
    <div
      className={`h-screen overflow-hidden flex flex-col font-sans selection:bg-blue-600 selection:text-white transition-colors duration-200 ${
        isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
      }`}
    >
      {/* Impersonation Warning Banner */}
      {isImpersonating && (
        <div className="bg-amber-500 text-amber-950 px-6 py-2 flex items-center justify-between text-xs font-bold shadow-xs z-50 shrink-0">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 animate-pulse shrink-0" />
            <span>YOU ARE IMPERSONATING A USER SESSION. All actions logged as administrative impersonation.</span>
          </div>
          <button
            type="button"
            onClick={handleStopImpersonating}
            className="bg-amber-950 text-white hover:bg-amber-900 px-3 py-1 rounded-lg text-[10px] uppercase tracking-wider font-semibold transition-colors shadow-xs cursor-pointer"
          >
            Exit Impersonation
          </button>
        </div>
      )}

      <div className="flex-grow flex w-full h-full overflow-hidden">
        {/* Sticky 100vh Sidebar Navigation */}
        <aside
          className={`w-64 border-r flex flex-col justify-between shrink-0 h-full transition-colors z-30 ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/80 shadow-xs'
          }`}
        >
          <div className="flex flex-col h-full overflow-hidden">
            {/* Logo Header */}
            <div className="p-5 border-b border-slate-200/80 dark:border-slate-800 flex items-center gap-3 shrink-0">
              <Link to="/admin" className="flex items-center gap-2.5 group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-xl">
                <img
                  src="/nearby_locator_standalone_icon.png"
                  alt="Nearby Locator"
                  className="w-8 h-8 object-contain rounded-xl shadow-xs group-hover:scale-105 transition-transform"
                />
                <div className="flex flex-col">
                  <span className="font-bold text-sm font-heading tracking-tight leading-none">
                    Nearby <span className="text-blue-600">Admin</span>
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1">
                    Control Center
                  </span>
                </div>
              </Link>
            </div>

            {/* Nav Groups */}
            <div className="p-3 flex flex-col gap-5 overflow-y-auto flex-grow scrollbar-thin">
              {navGroups.map((group, gIdx) => {
                const visibleItems = group.items.filter(
                  (item) => !item.permission || hasPermission(item.permission) || hasPermission('admin.access')
                );

                if (visibleItems.length === 0) return null;

                return (
                  <div key={gIdx} className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 mb-1">
                      {group.title}
                    </span>
                    {visibleItems.map((item, idx) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => navigate(item.path)}
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                            item.active
                              ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 shadow-2xs font-bold'
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/80 dark:hover:bg-slate-800/60'
                          }`}
                        >
                          <Icon className={`w-4 h-4 shrink-0 ${item.active ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`} />
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>

          {/* User Profile & Theme Footer */}
          <div className="p-3 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-2 shrink-0">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold text-xs flex items-center justify-center shrink-0">
                  {user?.name?.charAt(0) || 'A'}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-bold truncate">{user?.name}</span>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase truncate">{user?.role}</span>
                </div>
              </div>

              {/* Light/Dark Toggle */}
              <button
                type="button"
                onClick={toggleTheme}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                title="Toggle Theme"
              >
                {isDark ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5" />}
              </button>
            </div>

            <button
              type="button"
              onClick={() => navigate('/discover')}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Exit to App Console</span>
            </button>
          </div>
        </aside>

        {/* Dedicated Content Viewport — Only This Scrolls */}
        <main className="flex-grow overflow-y-auto h-full relative flex flex-col p-6 lg:p-8 max-w-7xl mx-auto w-full">
          <Outlet context={{ triggerSudo }} />
        </main>
      </div>

      {/* Sudo Password Step-Up Modal */}
      {isSudoModalOpen && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-8 rounded-2xl w-full max-w-md shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-100 dark:border-blue-900">
              <Lock className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-xl font-bold font-heading text-slate-900 dark:text-white">Administrative Step-Up</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                You are attempting a high-risk operation. Please enter your administrator password to confirm your identity.
              </p>
            </div>

            <form onSubmit={handleSudoSubmit} className="space-y-4" noValidate>
              <div>
                <label htmlFor="sudo-password" className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                  Confirm Password
                </label>
                <input
                  id="sudo-password"
                  type="password"
                  autoFocus
                  placeholder="••••••••"
                  value={sudoPassword}
                  onChange={(e) => setSudoPassword(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:border-blue-600 dark:focus:border-blue-500 text-slate-900 dark:text-white"
                  disabled={isSudoLoading}
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsSudoModalOpen(false);
                    setSudoPassword('');
                    setPendingAction(null);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  disabled={isSudoLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSudoLoading || !sudoPassword}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 transition-all disabled:opacity-50 shadow-sm cursor-pointer"
                >
                  {isSudoLoading && <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  <span>Verify Identity</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
