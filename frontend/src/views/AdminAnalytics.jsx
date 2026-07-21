import React from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';

// Placeholder data – in a real app this would be fetched from the backend analytics endpoint.
const data = [
  { time: '00:00', sessions: 5 },
  { time: '01:00', sessions: 8 },
  { time: '02:00', sessions: 6 },
  { time: '03:00', sessions: 12 },
  { time: '04:00', sessions: 9 },
];

export default function AdminAnalytics() {
  return (
    <section className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 text-white p-6">
      <h1 className="text-3xl font-bold mb-6">Analytics Dashboard</h1>
      <div className="w-full max-w-4xl h-96 bg-white/5 backdrop-blur-xl rounded-xl p-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#444" />
            <XAxis dataKey="time" stroke="#aaa" />
            <YAxis stroke="#aaa" />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="sessions" stroke="#06b6d4" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
