import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-white text-center">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl animate-fade-in">
        <span className="text-5xl block mb-4">🛸</span>
        <h2 className="text-2xl font-bold mb-2">404 - Page Not Found</h2>
        <p className="text-gray-400 text-sm mb-6 leading-relaxed">
          The coordinates or path you entered does not map to any existing visual quadrant.
        </p>
        <button
          onClick={() => navigate('/')}
          className="w-full py-3 rounded-2xl font-semibold bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white shadow-lg transition-all duration-200 hover:scale-[1.02]"
        >
          Return Home
        </button>
      </div>
    </div>
  );
}
