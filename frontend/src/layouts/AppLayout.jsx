import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { useUIStore } from '../store/useUIStore';
import { authService } from '../services/auth';
import Can from '../components/auth/Can';
import ConnectionLostOverlay from '../components/global/ConnectionLostOverlay';
import { NotificationCenter } from '../components/global/NotificationCenter';
import { CommandPalette } from '../components/global/CommandPalette';
import { ToastContainer } from '../components/global/ToastContainer';

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuHeader,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from '../components/ui/DropdownMenu';
import {
  Compass,
  Bookmark,
  History,
  User,
  LogOut,
  Sun,
  Moon,
  Shield,
  Menu,
  X,
  Settings,
  Lock,
  Bell,
  Laptop,
  HelpCircle,
  MessageSquare,
  ChevronDown,
  LayoutDashboard
} from 'lucide-react';

export default function AppLayout() {
  const { user } = useAuthStore();
  const { isDark, toggleTheme } = useUIStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await authService.logout();
    navigate('/login');
  };

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Explore Map', path: '/discover', icon: Compass },
    { label: 'Saved Places', path: '/saved', icon: Bookmark },
    { label: 'Search History', path: '/history', icon: History },
  ];


  return (
    <div
      className={`min-h-screen font-sans selection:bg-blue-600 selection:text-white flex flex-col justify-between transition-colors duration-200 ${
        isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50/70 text-slate-900'
      }`}
    >
      {/* Global connection-lost overlay, Command Palette (⌘K) & Toast Notifications */}
      <ConnectionLostOverlay />
      <CommandPalette />
      <ToastContainer />


      {/* Primary Application Header Shell */}
      <header
        className={`sticky top-0 z-40 w-full backdrop-blur-md border-b transition-all duration-200 ${
          isDark
            ? 'bg-slate-900/90 border-slate-800/80 shadow-md'
            : 'bg-white/80 border-slate-200/80 shadow-xs'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Brand Logo & Title */}
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2.5 group cursor-pointer">
              <img
                src="/nearby_locator_standalone_icon.png"
                alt="Nearby Locator"
                className="w-9 h-9 object-contain rounded-xl shadow-xs group-hover:scale-105 transition-transform"
              />
              <span className="font-bold text-xl font-heading tracking-tight">
                Nearby <span className="text-blue-600">Locator</span>
              </span>
            </Link>

            {user && (
              <span
                className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse hidden sm:inline-block"
                title="Session active"
              />
            )}

            {/* Desktop Center Navigation */}
            {user && (
              <nav className="hidden md:flex items-center gap-1 ml-6 pl-6 border-l border-slate-200 dark:border-slate-800">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    location.pathname === item.path ||
                    (item.path === '/discover' && location.pathname === '/');
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                        isActive
                          ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 shadow-2xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/80 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            )}
          </div>

          {/* Right Action Bar */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Notification Center */}
            {user && <NotificationCenter isDark={isDark} />}

            {/* Light / Dark Mode Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className={`p-2 rounded-xl border transition-all cursor-pointer ${
                isDark
                  ? 'bg-slate-800/60 border-slate-700 text-amber-400 hover:bg-slate-700'
                  : 'bg-slate-100/80 border-slate-200/80 text-slate-700 hover:bg-slate-200'
              }`}
              aria-label="Toggle Theme"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Admin Console Trigger */}
            {user && (
              <Can I="admin.access">
                <button
                  type="button"
                  onClick={() => navigate('/admin')}
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 transition-all cursor-pointer"
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>Admin</span>
                </button>
              </Can>
            )}

            {/* User Avatar Dropdown (Commercial SaaS Standard) */}
            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger>
                  <div className="flex items-center gap-2 p-1 pr-2.5 rounded-full border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer shadow-xs">
                    {user?.avatar_url || user?.avatar || user?.picture || user?.profile?.avatar_url ? (
                      <img
                        src={user?.avatar_url || user?.avatar || user?.picture || user?.profile?.avatar_url}
                        alt={user.name}
                        className="w-7 h-7 rounded-full object-cover"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-mono font-bold text-xs flex items-center justify-center">
                        {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                      </div>
                    )}
                    <span className="hidden sm:inline text-xs font-semibold text-slate-800 dark:text-slate-200 max-w-[100px] truncate">
                      {user.name}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="right" className="w-64">
                  <DropdownMenuHeader>
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-mono font-bold text-sm flex items-center justify-center shrink-0 shadow-xs overflow-hidden">
                        {user?.avatar_url || user?.avatar || user?.picture || user?.profile?.avatar_url ? (
                          <img
                            src={user?.avatar_url || user?.avatar || user?.picture || user?.profile?.avatar_url}
                            alt={user.name}
                            className="w-full h-full object-cover"
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                          />
                        ) : (
                          <span>{user.name ? user.name.charAt(0).toUpperCase() : 'U'}</span>
                        )}
                      </div>

                      <div className="min-w-0 flex-1 space-y-0.5">
                        <p className="text-xs font-heading font-bold text-slate-900 dark:text-slate-100 truncate">
                          {user.name}
                        </p>
                        <p className="text-[11px] font-sans text-slate-400 dark:text-slate-500 truncate">
                          {user.email}
                        </p>
                      </div>
                    </div>
                    <div className="pt-1.5 flex items-center justify-between">
                      {user.plan || user.subscription_tier ? (
                        <span className="px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 text-[10px] font-mono font-bold border border-blue-200/80 dark:border-blue-900/50">
                          {user.plan || user.subscription_tier}
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono text-slate-400">Authenticated Session</span>
                      )}
                      <span className="text-[10px] font-mono text-slate-400 uppercase">
                        {user.role || 'USER'}
                      </span>
                    </div>

                  </DropdownMenuHeader>

                  <DropdownMenuLabel>Account & Settings</DropdownMenuLabel>
                  <DropdownMenuItem icon={User} onClick={() => navigate('/settings/profile')}>
                    View Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem icon={Settings} onClick={() => navigate('/settings/account')}>
                    Account Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem icon={Lock} onClick={() => navigate('/settings/security')}>
                    Security & 2FA
                  </DropdownMenuItem>
                  <DropdownMenuItem icon={Bell} onClick={() => navigate('/settings/notifications')}>
                    Notifications
                  </DropdownMenuItem>
                  <DropdownMenuItem icon={Sun} onClick={() => navigate('/settings/appearance')}>
                    Appearance
                  </DropdownMenuItem>
                  <DropdownMenuItem icon={Shield} onClick={() => navigate('/settings/privacy')}>
                    Privacy Controls
                  </DropdownMenuItem>
                  <DropdownMenuItem icon={Laptop} onClick={() => navigate('/settings/sessions')}>
                    Active Sessions
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Resources</DropdownMenuLabel>
                  <DropdownMenuItem icon={HelpCircle} onClick={() => navigate('/help')}>
                    Help Center
                  </DropdownMenuItem>
                  <DropdownMenuItem icon={MessageSquare} onClick={() => navigate('/contact')}>
                    Feedback
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    icon={LogOut}
                    destructive
                    shortcut="⇧⌘Q"
                    onClick={handleLogout}
                  >
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Mobile Drawer Toggle */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 cursor-pointer"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 pt-3 pb-6 space-y-3 shadow-xl">
            <nav className="flex flex-col space-y-1.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                      isActive
                        ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <Can I="admin.access">
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    navigate('/admin');
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800"
                >
                  <Shield className="w-4 h-4" />
                  <span>Admin Console</span>
                </button>
              </div>
            </Can>
          </div>
        )}
      </header>

      {/* Main Page Viewport */}
      <main className="flex-1 relative h-[calc(100vh-64px)] overflow-hidden flex flex-col">
        <Outlet />
      </main>

      {/* Mobile Quick Bottom Action Bar (lg:hidden) */}
      {user && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/90 dark:bg-slate-900/90 border-t border-slate-200 dark:border-slate-800 backdrop-blur-md h-14 flex items-center justify-around px-2 shadow-lg">
          <Link
            to="/discover"
            className={`flex flex-col items-center gap-0.5 text-[10px] font-semibold ${
              location.pathname === '/discover' || location.pathname === '/'
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>Map</span>
          </Link>
          <Link
            to="/saved"
            className={`flex flex-col items-center gap-0.5 text-[10px] font-semibold ${
              location.pathname === '/saved'
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <Bookmark className="w-4 h-4" />
            <span>Saved</span>
          </Link>
          <Link
            to="/history"
            className={`flex flex-col items-center gap-0.5 text-[10px] font-semibold ${
              location.pathname === '/history'
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <History className="w-4 h-4" />
            <span>History</span>
          </Link>
          <Link
            to="/settings/profile"
            className={`flex flex-col items-center gap-0.5 text-[10px] font-semibold ${
              location.pathname.startsWith('/settings')
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Profile</span>
          </Link>
        </div>
      )}
    </div>
  );
}

