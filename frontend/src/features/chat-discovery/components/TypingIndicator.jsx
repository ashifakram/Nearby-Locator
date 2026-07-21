import React from 'react';

export default function TypingIndicator({ isDark }) {
  return (
    <div className="flex gap-1.5 items-center px-4 py-3">
      <div className={`w-2.5 h-2.5 ${isDark ? 'bg-gray-500' : 'bg-gray-400'} rounded-full animate-bounce`} style={{ animationDelay: '0ms' }}></div>
      <div className={`w-2.5 h-2.5 ${isDark ? 'bg-gray-500' : 'bg-gray-400'} rounded-full animate-bounce`} style={{ animationDelay: '150ms' }}></div>
      <div className={`w-2.5 h-2.5 ${isDark ? 'bg-gray-500' : 'bg-gray-400'} rounded-full animate-bounce`} style={{ animationDelay: '300ms' }}></div>
    </div>
  );
}
