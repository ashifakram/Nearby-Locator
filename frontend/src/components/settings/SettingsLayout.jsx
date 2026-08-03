import React from 'react';
import { Outlet } from 'react-router-dom';
import { SettingsSidebar } from './SettingsSidebar';

export function SettingsLayout() {
  return (
    <div className="flex-1 overflow-y-auto bg-slate-50/70 dark:bg-slate-950 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        <SettingsSidebar />
        <main className="flex-1 w-full min-w-0 space-y-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default SettingsLayout;
