import React from 'react';

export default function UserAvatar({ isDark }) {
  return (
    <div className={`w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg flex-shrink-0 ring-2 ${isDark ? 'ring-emerald-400/50' : 'ring-emerald-300/50'}`}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="8" r="4" fill="white" />
        <path d="M6 21C6 17.6863 8.68629 15 12 15C15.3137 15 18 17.6863 18 21" stroke="white" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </div>
  );
}
