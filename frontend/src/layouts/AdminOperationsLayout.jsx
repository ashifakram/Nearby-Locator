import React from 'react';
import { Outlet, NavLink, useOutletContext } from 'react-router-dom';
import { Activity } from 'lucide-react';

export default function AdminOperationsLayout() {
  const adminContext = useOutletContext();
  const navItems = [
    { label: 'Overview', path: '/admin/operations', exact: true },
    { label: 'Audit Logs', path: '/admin/operations/audit-logs' },
    { label: 'Auth Events', path: '/admin/operations/auth-events' },
    { label: 'Active Sessions', path: '/admin/operations/sessions' },
    { label: 'System Errors', path: '/admin/operations/system-errors' },
  ];

  return (
    <div className="flex flex-col gap-6 w-full font-sans">
      {/* ── EXECUTIVE PAGE HEADER ────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <Activity className="w-6 h-6 text-blue-600 dark:text-blue-400 shrink-0" />
            <span>Operations Center</span>
          </h1>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">
            Monitor system health metrics, analyze security events, and manage active web sessions.
          </p>
        </div>
      </div>

      <div className="sticky -top-6 lg:-top-8 bg-slate-50 dark:bg-slate-950 z-30 border-b border-slate-200 dark:border-slate-800 pt-3 -mx-6 px-6 lg:-mx-8 lg:px-8">
        <nav className="flex items-center gap-1 overflow-x-auto scrollbar-none -mb-px">
          {navItems.map((item, idx) => (
            <NavLink
              key={idx}
              to={item.path}
              end={item.exact}
              className={({ isActive }) => `
                px-4 py-2.5 text-xs font-bold transition-all border-b-2 whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
                ${isActive
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-extrabold'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700'
                }
              `}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="flex flex-col relative w-full">
        <Outlet context={adminContext} />
      </div>
    </div>
  );
}
