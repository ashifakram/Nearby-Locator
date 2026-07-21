import React from 'react';

export default function DistanceSelector({ onSelect, disabled, isDark }) {
  const options = [
    { label: '🏃 1 km', value: 1 },
    { label: '🚲 2 km', value: 2 },
    { label: '🚗 5 km', value: 5 },
    { label: '🚙 10 km', value: 10 },
    { label: '🚀 20 km', value: 20 }
  ];

  return (
    <div className="mb-4 px-4">
      <div className="flex flex-wrap gap-2 relative z-40">
        {options.map((option, idx) => (
          <button
            key={idx}
            onClick={() => onSelect(option.value)}
            disabled={disabled}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-2 ${isDark
              ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white border border-cyan-500/30'
              : 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white border border-blue-400/30'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
