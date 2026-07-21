import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Landing page with a neon hero and a simple CSS carousel placeholder.
 */
export default function LandingPage() {
  const features = [
    'Futuristic glass‑morphic UI',
    'Instant nearby place discovery',
    'Real‑time analytics dashboard',
    'Secure JWT‑based auth',
  ];

  return (
    <section className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 text-white p-6">
      <h1 className="text-5xl font-bold text-center mb-8 bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-fuchsia-500">
        Nearby Locator
      </h1>
      <p className="text-lg text-center max-w-2xl mb-10">
        Discover places around you with a sleek, glass‑morphic interface and lightning‑fast AI chat.
      </p>
      <Link
        to="/dashboard"
        className="bg-cyan-600 hover:bg-cyan-700 text-white font-semibold py-3 px-6 rounded-xl transition"
      >
        Go to Dashboard
      </Link>

      {/* Simple carousel using overflow‑x‑auto and snap‑center */}
      <div className="mt-12 w-full max-w-4xl overflow-x-auto snap-x snap-mandatory flex space-x-4">
        {features.map((f, i) => (
          <div
            key={i}
            className="snap-center flex-shrink-0 w-80 bg-white/10 backdrop-blur-xl rounded-xl p-6 text-center"
          >
            <h2 className="text-xl font-medium mb-2 text-cyan-300">{f}</h2>
            <p className="text-sm text-gray-300">Feature description placeholder.</p>
          </div>
        ))}
      </div>
    </section>
  );
};
