import React from 'react';

export default function GeminiSparkleIcon({ className = "w-10 h-10", style = {} }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12 0C12 6.627 6.627 12 0 12C6.627 12 12 17.373 12 24C12 17.373 17.373 12 24 12C17.373 12 12 6.627 12 0Z"
        fill="url(#gemini-authentic-sparkle-grad)"
      />
      <defs>
        <linearGradient id="gemini-authentic-sparkle-grad" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#EA4335" />   {/* Google Red */}
          <stop offset="32%" stopColor="#4285F4" />  {/* Google Blue */}
          <stop offset="68%" stopColor="#34A853" />  {/* Google Green */}
          <stop offset="100%" stopColor="#FBBC05" /> {/* Google Yellow */}
        </linearGradient>
      </defs>
    </svg>
  );
}
