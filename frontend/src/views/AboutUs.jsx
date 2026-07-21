import React from 'react';

/**
 * AboutUs – mission control style page describing the tech stack.
 */
export default function AboutUs() {
  return (
    <section className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 text-white p-6">
      <h1 className="text-4xl font-bold mb-6">About Nearby Locator</h1>
      <div className="max-w-3xl space-y-4 text-center">
        <p>This application is built with a modern stack:</p>
        <ul className="list-disc list-inside space-y-2">
          <li>React 19 (frontend) with TailwindCSS for glass‑morphic UI.</li>
          <li>Node.js/Express backend powered by PostgreSQL 17 and Redis.</li>
          <li>JWT authentication, Google Places API integration.</li>
          <li>Realtime analytics visualized with Recharts.</li>
        </ul>
      </div>
    </section>
  );
};
