import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';

export default function AdminOperationsLayout() {
  const navItems = [
    { label: 'Overview', path: '/admin/operations', exact: true },
    { label: 'Audit Logs', path: '/admin/operations/audit-logs' },
    { label: 'Auth Events', path: '/admin/operations/auth-events' },
    { label: 'Active Sessions', path: '/admin/operations/sessions' },
    { label: 'System Errors', path: '/admin/operations/system-errors' },
  ];

  return (
    <div className="flex flex-col gap-6 h-full w-full font-sans">
      <header className="flex flex-col gap-1">
        <h2 className="text-2xl font-bold font-heading text-slate-900 dark:text-white tracking-tight">
          Operations Center
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Monitor system health metrics, analyze security events, and manage active web sessions.
        </p>
      </header>

      <div className="flex gap-1.5 pb-0.5 border-b border-slate-200 dark:border-slate-800 overflow-x-auto w-full">
        {navItems.map((item, idx) => (
          <NavLink
            key={idx}
            to={item.path}
            end={item.exact}
            className={({ isActive }) => `
              px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all border-b-2 whitespace-nowrap cursor-pointer
              ${
                isActive
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/40 font-bold'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100/60 dark:hover:bg-slate-800/40'
              }
            `}
          >
            {item.label}
          </NavLink>
        ))}
      </div>

      <div className="flex-grow flex flex-col relative min-h-[500px] w-full">
        <Outlet />
      </div>
    </div>
  );
}
