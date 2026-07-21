import React, { useState } from 'react';

export default function QuickActions({ onAction, disabled, isDark }) {
  const [showDropdown, setShowDropdown] = useState(false);

  const primaryActions = [
    { label: '🍽️ Restaurants', category: 'restaurant' },
    { label: '🏥 Hospitals', category: 'hospital' },
    { label: '🏧 ATMs', category: 'atm' },
    { label: '⛽ Gas Stations', category: 'gas_station' }
  ];

  const dropdownActions = [
    { label: '🏫 Schools', category: 'school' },
    { label: '🏬 Malls', category: 'shopping_mall' },
    { label: '💊 Pharmacy', category: 'pharmacy' },
    { label: '🏦 Banks', category: 'bank' },
    { label: '☕ Cafes', category: 'cafe' },
    { label: '🏨 Hotels', category: 'lodging' }
  ];

  return (
    <div className="mb-4 px-4">
      <div className="flex flex-wrap gap-2 relative z-40">
        {primaryActions.map((action, idx) => (
          <button
            key={idx}
            onClick={() => onAction(action.category)}
            disabled={disabled}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-2 ${isDark
              ? 'bg-slate-700 hover:bg-slate-600 text-white border border-slate-600'
              : 'bg-slate-800/80 hover:bg-slate-800 text-white border border-slate-700'
            }`}
          >
            {action.label}
          </button>
        ))}

        {/* More Options Dropdown */}
        <div className="relative z-50">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            disabled={disabled}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-1 ${isDark
              ? 'bg-slate-700 hover:bg-slate-600 text-white border border-slate-600'
              : 'bg-slate-800/80 hover:bg-slate-800 text-white border border-slate-700'
            }`}
          >
            <span>More</span>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              className={`transition-transform duration-300 ${showDropdown ? 'rotate-180' : ''}`}
            >
              <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {showDropdown && (
            <div className={`absolute bottom-full mb-2 left-0 rounded-2xl shadow-2xl border animate-fade-in ${isDark
              ? 'bg-slate-800 border-slate-700'
              : 'bg-white border-gray-200'
            }`} style={{ minWidth: '200px' }}>
              {dropdownActions.map((action, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    onAction(action.category);
                    setShowDropdown(false);
                  }}
                  disabled={disabled}
                  className={`w-full px-4 py-3 text-left text-sm font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 ${isDark
                    ? 'text-white hover:bg-slate-700 border-b border-slate-700 last:border-b-0'
                    : 'text-gray-900 hover:bg-gray-100 border-b border-gray-200 last:border-b-0'
                  }`}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
