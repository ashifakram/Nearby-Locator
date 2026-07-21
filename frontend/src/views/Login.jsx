import React from 'react';

// Cyberpunk‑styled static placeholder for the Login view.
// Uses TailwindCSS utilities for a neon gradient background and centered content.

export default function Login() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-indigo-900 to-black p-4">
      <div className="bg-gray-900 bg-opacity-80 backdrop-filter backdrop-blur-lg border border-purple-500 rounded-xl shadow-2xl p-8 max-w-md w-full text-center">
        <h1 className="text-4xl font-bold text-purple-400 mb-4">🔐 Login</h1>
        <p className="text-gray-300 mb-6">
          This page is a placeholder. The actual login flow will be implemented soon.
        </p>
        <div className="flex flex-col space-y-3">
          <input
            type="text"
            placeholder="Username"
            className="px-4 py-2 rounded bg-gray-800 text-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
            disabled
          />
          <input
            type="password"
            placeholder="Password"
            className="px-4 py-2 rounded bg-gray-800 text-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
            disabled
          />
          <button
            disabled
            className="mt-4 px-6 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition"
          >
            Sign In (Coming Soon)
          </button>
        </div>
        <p className="text-sm text-gray-500 mt-6">
          © 2026 Nearby Locator – All rights reserved.
        </p>
      </div>
    </div>
  );
}
