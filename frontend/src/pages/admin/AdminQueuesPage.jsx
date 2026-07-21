import React from 'react';

export default function AdminQueuesPage() {
  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-1">
        <h2 className="text-2xl font-bold">Moderation Activity Console</h2>
        <p className="text-sm text-gray-400">Review flagged spots, reports, appeals, and system spam metrics.</p>
      </header>

      {/* Stats Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700/50">
          <p className="text-xs font-semibold uppercase text-red-400">Flagged Listings</p>
          <p className="text-3xl font-extrabold mt-1">12</p>
        </div>
        <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700/50">
          <p className="text-xs font-semibold uppercase text-yellow-400">Unresolved Reports</p>
          <p className="text-3xl font-extrabold mt-1">4</p>
        </div>
        <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700/50">
          <p className="text-xs font-semibold uppercase text-emerald-400">Processed Appeals</p>
          <p className="text-3xl font-extrabold mt-1">148</p>
        </div>
      </div>

      {/* Moderation Queue List */}
      <div className="p-6 rounded-3xl bg-slate-800/30 border border-slate-700/40">
        <h3 className="text-lg font-bold mb-4">Pending Flagged Reviews</h3>
        <div className="text-sm text-gray-400 py-8 text-center">
          ☕ All moderation queues are clear! There are no pending reviews.
        </div>
      </div>
    </div>
  );
}
