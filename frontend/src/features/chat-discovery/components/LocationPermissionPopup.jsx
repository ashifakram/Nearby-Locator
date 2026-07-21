import React from 'react';

export default function LocationPermissionPopup({ isDark, onEnable, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
      <div className={`w-full max-w-md rounded-3xl p-6 border shadow-2xl transition-colors duration-300 ${isDark
        ? 'bg-slate-900 border-slate-800 text-white'
        : 'bg-white border-gray-150 text-gray-900'
      }`}>
        <h2 className="text-xl font-bold mb-3 flex items-center gap-2">
          <span>📍</span> Location Services Disabled
        </h2>
        <p className={`text-sm leading-relaxed mb-6 ${isDark ? 'text-gray-400' : 'text-gray-650'}`}>
          Nearby Locator requires location access to find spots near you. Please grant permission in your browser or enter coordinates manually.
        </p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className={`px-4 py-2 rounded-xl text-sm font-medium border ${isDark
              ? 'border-slate-700 text-gray-300 hover:bg-slate-800'
              : 'border-gray-200 text-gray-600 hover:bg-gray-100'
            }`}
          >
            Close
          </button>
          <button
            onClick={onEnable}
            className="px-4 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white shadow-lg shadow-blue-500/20"
          >
            Enable Location
          </button>
        </div>
      </div>
    </div>
  );
}
