import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUIStore } from '../../store/useUIStore';
import { authService } from '../../services/auth';
import {
  Search,
  Compass,
  Bookmark,
  History,
  User,
  Settings,
  Shield,
  Bell,
  Sun,
  Moon,
  Laptop,
  Lock,
  LogOut,
  Sparkles
} from 'lucide-react';

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useUIStore();

  // Listen for ⌘K or Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const commands = [
    { id: 'c-map', label: 'Explore Discovery Map', icon: Compass, action: () => navigate('/discover'), category: 'Navigation' },
    { id: 'c-saved', label: 'View Saved Places', icon: Bookmark, action: () => navigate('/saved'), category: 'Navigation' },
    { id: 'c-history', label: 'Review Search History', icon: History, action: () => navigate('/history'), category: 'Navigation' },
    { id: 'c-profile', label: 'Edit Profile Settings', icon: User, action: () => navigate('/settings/profile'), category: 'Settings' },
    { id: 'c-account', label: 'Account Preferences', icon: Settings, action: () => navigate('/settings/account'), category: 'Settings' },
    { id: 'c-security', label: 'Security & 2FA Status', icon: Lock, action: () => navigate('/settings/security'), category: 'Settings' },
    { id: 'c-notifications', label: 'Notification Alerts', icon: Bell, action: () => navigate('/settings/notifications'), category: 'Settings' },
    { id: 'c-appearance', label: 'Appearance & Themes', icon: Sun, action: () => navigate('/settings/appearance'), category: 'Settings' },
    { id: 'c-sessions', label: 'Active Sessions', icon: Laptop, action: () => navigate('/settings/sessions'), category: 'Settings' },
    { id: 'c-privacy', label: 'Privacy & Data Export', icon: Shield, action: () => navigate('/settings/privacy'), category: 'Settings' },
    { id: 'c-theme', label: `Toggle Theme (${isDark ? 'Light' : 'Dark'})`, icon: isDark ? Sun : Moon, action: () => toggleTheme(), category: 'Actions' },
    {
      id: 'c-logout',
      label: 'Log Out of Platform',
      icon: LogOut,
      action: async () => {
        await authService.logout();
        navigate('/login');
      },
      category: 'Actions',
      destructive: true
    }
  ];

  const filtered = commands.filter((item) =>
    item.label.toLowerCase().includes(query.toLowerCase()) ||
    item.category.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setOpen(false);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (filtered.length ? (prev + 1) % filtered.length : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (filtered.length ? (prev <= 0 ? filtered.length - 1 : prev - 1) : 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filtered[selectedIndex]) {
          filtered[selectedIndex].action();
          setOpen(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, filtered, selectedIndex]);

  if (!open) return null;

  return (
    <div
      onClick={() => setOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-label="Command Palette Search"
      className="fixed inset-0 z-[99999] bg-slate-950/60 backdrop-blur-xs flex items-start justify-center pt-16 sm:pt-24 p-4 animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden space-y-0"
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 h-14 border-b border-slate-100 dark:border-slate-800">
          <Search className="w-5 h-5 text-slate-400 mr-3 shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or search..."
            className="w-full bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 font-sans outline-none"
          />
          <kbd className="hidden sm:inline-block text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 shrink-0">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filtered.length > 0 ? (
            filtered.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    item.action();
                    setOpen(false);
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    isSelected
                      ? item.destructive
                        ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400'
                        : 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 shrink-0 opacity-75" />
                    <span>{item.label}</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    {item.category}
                  </span>
                </button>
              );
            })
          ) : (
            <div className="py-8 text-center text-xs text-slate-400 dark:text-slate-500 space-y-1">
              <Sparkles className="w-5 h-5 mx-auto text-slate-400 opacity-60" />
              <p>No matching commands found.</p>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-[10px] font-mono text-slate-400">
          <span>Navigate with ↑ ↓ • Select with ↵</span>
          <span>Nearby Locator Command Palette</span>
        </div>
      </div>
    </div>
  );
}
