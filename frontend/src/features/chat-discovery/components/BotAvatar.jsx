import React from 'react';

export default function BotAvatar({ isDark }) {
  return (
    <div className={`w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 via-blue-500 to-indigo-600 flex items-center justify-center shadow-lg flex-shrink-0 ring-2 ${isDark ? 'ring-cyan-400/50' : 'ring-cyan-300/50'}`}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2C10.3431 2 9 3.34315 9 5V6H7C5.89543 6 5 6.89543 5 8V18C5 19.1046 5.89543 20 7 20H17C18.1046 20 19 19.1046 19 18V8C19 6.89543 18.1046 6 17 6H15V5C15 3.34315 13.6569 2 12 2Z" fill="white" />
        <circle cx="9" cy="11" r="1" fill="white" />
        <circle cx="15" cy="11" r="1" fill="white" />
        <path d="M9 14C9 14 10 16 12 16C14 16 15 14 15 14" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </div>
  );
}
