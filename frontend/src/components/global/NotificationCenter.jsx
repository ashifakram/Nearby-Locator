import React, { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent
} from '../ui/DropdownMenu';
import { Bell, Shield, Sparkles, MapPin, CheckCheck } from 'lucide-react';

const MOCK_NOTIFICATIONS = [
  {
    id: 'n-1',
    type: 'security',
    title: 'New Login Session Detected',
    message: 'Chrome on Windows logged into your account.',
    time: '10 mins ago',
    isRead: false,
    icon: Shield
  },
  {
    id: 'n-2',
    type: 'discovery',
    title: '3 New Top Rated Spots',
    message: 'New verified cafes added near SF Bryant district.',
    time: '2 hours ago',
    isRead: false,
    icon: MapPin
  },
  {
    id: 'n-3',
    type: 'product',
    title: 'Discover Viewport Search Live',
    message: 'Pan the map and trigger Search This Area seamlessly.',
    time: '1 day ago',
    isRead: true,
    icon: Sparkles
  }
];

export function NotificationCenter({ isDark = false }) {
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);
  const [filter, setFilter] = useState('all');

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const handleItemClick = (id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'all') return true;
    return n.type === filter;
  });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <div
          className={`relative p-2 rounded-xl border transition-all cursor-pointer ${
            isDark
              ? 'bg-slate-800/60 border-slate-700 text-slate-300 hover:text-white'
              : 'bg-slate-100/80 border-slate-200/80 text-slate-600 hover:text-slate-900'
          }`}
          title="Notifications"
          aria-label="Notifications Center"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-600 rounded-full ring-2 ring-white dark:ring-slate-900" />
          )}
        </div>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="right" className="w-80 md:w-96 p-3 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5 px-1">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-heading font-bold text-slate-900 dark:text-slate-100">
              Notifications
            </h4>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 text-[10px] font-mono font-bold">
                {unreadCount} new
              </span>
            )}
          </div>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Mark all read</span>
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex gap-1 overflow-x-auto scrollbar-none pb-1">
          {['all', 'security', 'discovery', 'product'].map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setFilter(tab)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-semibold uppercase tracking-wider transition-colors ${
                filter === tab
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1">
          {filteredNotifications.length > 0 ? (
            filteredNotifications.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.id}
                  onClick={() => handleItemClick(item.id)}
                  className={`p-2.5 rounded-xl border text-xs transition-all cursor-pointer flex gap-3 ${
                    item.isRead
                      ? 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800/60 opacity-70'
                      : 'bg-blue-50/40 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900/40'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      item.type === 'security'
                        ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400'
                        : item.type === 'discovery'
                        ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400'
                        : 'bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>

                  <div className="flex-1 space-y-0.5 min-w-0">
                    <div className="flex justify-between items-start gap-2">
                      <h5 className="font-heading font-bold text-slate-900 dark:text-slate-100 truncate">
                        {item.title}
                      </h5>
                      {!item.isRead && (
                        <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0 mt-1" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {item.message}
                    </p>
                    <span className="text-[9.5px] font-mono text-slate-400 dark:text-slate-500 block pt-0.5">
                      {item.time}
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-8 text-center text-xs text-slate-400 dark:text-slate-500 space-y-1">
              <span className="text-lg block">🔔</span>
              <p className="font-semibold text-slate-700 dark:text-slate-300">All caught up!</p>
              <p>No notifications in this filter.</p>
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
