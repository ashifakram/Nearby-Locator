import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  User,
  Settings,
  Lock,
  Bell,
  Sun,
  Shield,
  Laptop,
  AlertTriangle
} from 'lucide-react';

const SETTINGS_NAV_ITEMS = [
  { id: 'profile', label: 'My Profile', path: '/settings/profile', icon: User },
  { id: 'account', label: 'Account', path: '/settings/account', icon: Settings },
  { id: 'security', label: 'Security & 2FA', path: '/settings/security', icon: Lock },
  { id: 'notifications', label: 'Notifications', path: '/settings/notifications', icon: Bell },
  { id: 'appearance', label: 'Appearance', path: '/settings/appearance', icon: Sun },
  { id: 'privacy', label: 'Privacy & Data', path: '/settings/privacy', icon: Shield },
  { id: 'sessions', label: 'Active Sessions', path: '/settings/sessions', icon: Laptop },
  { id: 'danger', label: 'Danger Zone', path: '/settings/danger-zone', icon: AlertTriangle, destructive: true }
];

export function SettingsSidebar() {
  const location = useLocation();

  return (
    <aside className="w-full lg:w-64 shrink-0 space-y-1">
      <div className="px-3 py-2 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
        Settings Menu
      </div>
      <nav className="flex flex-row lg:flex-col gap-1 overflow-x-auto scrollbar-none pb-2 lg:pb-0">
        {SETTINGS_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.id}
              to={item.path}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                isActive
                  ? item.destructive
                    ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 shadow-2xs font-bold'
                    : 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 shadow-2xs font-bold'
                  : item.destructive
                  ? 'text-rose-600 dark:text-rose-400 hover:bg-rose-50/50 dark:hover:bg-rose-950/30'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/80 dark:hover:bg-slate-800/60'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0 opacity-80" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
