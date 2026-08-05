import React from 'react';

export default function AdminApiDocsPage() {
  const backendBaseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');
  const swaggerUrl = `${backendBaseUrl}/api-docs/v1/`;

  return (
    <div className="space-y-6 flex flex-col h-full w-full pb-8 pr-1">
      <header className="flex flex-col gap-1.5 shrink-0">
        <h2 className="text-2xl font-bold text-slate-900 font-sans">Interactive API Documentation</h2>
        <p className="text-sm text-slate-500">Explore, test, and validate available REST endpoints for the Nearby Locator platform.</p>
      </header>

      {/* Info strip */}
      <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm flex flex-wrap gap-6 text-xs font-semibold shrink-0">
        <div className="flex gap-1.5">
          <span className="text-slate-450">API Version:</span>
          <span className="text-slate-800 font-mono">1.0.0</span>
        </div>
        <div className="flex gap-1.5">
          <span className="text-slate-450">OpenAPI Version:</span>
          <span className="text-slate-800 font-mono">3.0.3</span>
        </div>
        <div className="flex gap-1.5">
          <span className="text-slate-450">Specs Build Date:</span>
          <span className="text-slate-800">July 2026</span>
        </div>
        <div className="flex gap-1.5 ml-auto">
          <a
            href={swaggerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-700 underline font-bold"
          >
            Open in New Tab ↗
          </a>
        </div>
      </div>

      {/* Embed Swagger UI iframe */}
      <div className="flex-grow min-h-[600px] bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden relative">
        <iframe
          src={swaggerUrl}
          title="Swagger API Documentation"
          className="absolute inset-0 w-full h-full border-0"
        />
      </div>
    </div>
  );
}
