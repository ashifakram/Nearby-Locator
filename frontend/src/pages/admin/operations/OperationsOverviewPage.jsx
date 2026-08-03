import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOutletContext } from 'react-router-dom';
import api from '../../../services/api';
import { 
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { retentionOverride } from '../../../services/admin';
import { useToastStore } from '../../../store/useToastStore';
import LoaderIcon from '../../../icons/LoaderIcon';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function OperationsOverviewPage() {
  const { triggerSudo } = useOutletContext();
  const { showToast } = useToastStore();
  const queryClient = useQueryClient();
  const [healthData, setHealthData] = useState(null);
  const [healthLoading, setHealthLoading] = useState(true);

  // Retention sweep form states
  const [retentionDays, setRetentionDays] = useState(3);
  const [retentionReason, setRetentionReason] = useState('');
  const [isRetentionLoading, setIsRetentionLoading] = useState(false);

  const { data: metricsData, isLoading: metricsLoading } = useQuery({
    queryKey: ['control-plane-metrics'],
    queryFn: async () => {
      const res = await api.get('/admin/control-plane-metrics');
      return res.data.data;
    }
  });

  const { data: dashboardData } = useQuery({
    queryKey: ['analytics-dashboard'],
    queryFn: async () => {
      const res = await api.get('/admin/analytics/dashboard');
      return res.data.data;
    }
  });

  const { data: authData } = useQuery({
    queryKey: ['analytics-auth'],
    queryFn: async () => {
      const res = await api.get('/admin/analytics/auth-events');
      return res.data.data;
    }
  });

  const { data: errorData } = useQuery({
    queryKey: ['analytics-errors'],
    queryFn: async () => {
      const res = await api.get('/admin/analytics/system-errors');
      return res.data.data;
    }
  });

  const { data: auditData } = useQuery({
    queryKey: ['analytics-audit'],
    queryFn: async () => {
      const res = await api.get('/admin/analytics/audit-logs');
      return res.data.data;
    }
  });

  useEffect(() => {
    let mounted = true;
    const fetchHealth = async () => {
      try {
        const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api$/, '');
        const res = await fetch(`${baseUrl}/health/ready`);
        const json = await res.json();
        if (mounted) setHealthData(json);
      } catch (err) {
        if (mounted) setHealthData({ status: 'DOWN', error: err.message });
      } finally {
        if (mounted) setHealthLoading(false);
      }
    };
    fetchHealth();
    const interval = setInterval(fetchHealth, 10000);
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  const handleRetentionPauseSubmit = (e) => {
    e.preventDefault();
    if (!retentionReason || retentionReason.length < 10) {
      showToast('Please provide a reason of at least 10 characters.', 'error');
      return;
    }
    triggerSudo(async () => {
      setIsRetentionLoading(true);
      try {
        const res = await retentionOverride({ durationDays: Number(retentionDays), reason: retentionReason });
        showToast(res.message || `Database retention sweep successfully paused.`, 'success');
        queryClient.invalidateQueries(['control-plane-metrics']);
        setRetentionReason('');
      } catch (err) {
        showToast(err?.response?.data?.message || 'Failed to pause retention sweeps.', 'error');
      } finally {
        setIsRetentionLoading(false);
      }
    });
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-slate-200 p-3.5 rounded-xl shadow-lg font-sans">
          <p className="text-slate-500 text-xs mb-2 font-bold">{new Date(label).toLocaleDateString(undefined, {month:'short', day:'numeric', year:'numeric'})}</p>
          {payload.map((entry, idx) => (
            <div key={idx} className="flex justify-between gap-4 text-xs mb-1 last:mb-0">
              <span className="font-semibold text-slate-600 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: entry.color }} />
                {entry.name}
              </span>
              <span className="text-slate-900 font-bold">{entry.value}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 flex flex-col h-full w-full pb-8 pr-1">
      {/* Emergency break glass warning */}
      {metricsData?.breakGlass?.active && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 animate-pulse flex items-center justify-between shadow-sm">
          <div>
            <h3 className="font-extrabold text-sm flex items-center gap-2">⚠️ EMERGENCY BREAK-GLASS ACTIVE</h3>
            <p className="text-xs mt-0.5 font-medium text-red-650">Bypassing standard administrative gating. Self-terminating lock-down in {metricsData.breakGlass.secondsRemaining}s.</p>
          </div>
        </div>
      )}

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
          <h4 className="text-[10px] font-bold text-slate-450 uppercase tracking-widest">Active Admin Sessions</h4>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="text-3xl font-extrabold text-slate-900">{metricsLoading ? '-' : (metricsData?.activeAdminSessionCount || 0)}</span>
            <span className="text-xs font-semibold text-slate-400">sessions</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
          <h4 className="text-[10px] font-bold text-slate-450 uppercase tracking-widest">Active Impersonations</h4>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="text-3xl font-extrabold text-blue-600">{metricsLoading ? '-' : (metricsData?.activeImpersonationCount || 0)}</span>
            <span className="text-xs font-semibold text-slate-400">sessions</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
          <h4 className="text-[10px] font-bold text-slate-450 uppercase tracking-widest">Database Server</h4>
          <div className="mt-3 flex flex-col gap-0.5">
            <span className={`text-base font-bold uppercase tracking-wider flex items-center gap-1.5 ${healthData?.checks?.database?.status === 'UP' ? 'text-emerald-600' : 'text-red-600'}`}>
              <span className={`w-2 h-2 rounded-full ${healthData?.checks?.database?.status === 'UP' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
              {healthLoading ? 'CHECKING...' : (healthData?.checks?.database?.status || 'DOWN')}
            </span>
            <span className="text-[10px] text-slate-450 font-bold font-mono">Latency: {healthData?.checks?.database?.latencyMs || 0}ms</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
          <h4 className="text-[10px] font-bold text-slate-450 uppercase tracking-widest">Redis Cache Server</h4>
          <div className="mt-3 flex flex-col gap-0.5">
            <span className={`text-base font-bold uppercase tracking-wider flex items-center gap-1.5 ${healthData?.checks?.redis?.status === 'UP' ? 'text-emerald-600' : 'text-red-600'}`}>
              <span className={`w-2 h-2 rounded-full ${healthData?.checks?.redis?.status === 'UP' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
              {healthLoading ? 'CHECKING...' : (healthData?.checks?.redis?.status || 'DOWN')}
            </span>
            <span className="text-[10px] text-slate-450 font-bold font-mono">Latency: {healthData?.checks?.redis?.latencyMs || 0}ms</span>
          </div>
        </div>
      </div>

      {/* Dynamic Action: Retention Sweep Gated Override */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
        <div className="flex flex-col gap-1 mb-4">
          <h3 className="text-sm font-extrabold text-slate-800">Pause Database Retention Sweeps</h3>
          <p className="text-xs text-slate-500">Temporarily suspend automatic backend records cleanup for compliance or audit investigations (Max 7 Days).</p>
        </div>
        <form onSubmit={handleRetentionPauseSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Override Duration</label>
            <select
              value={retentionDays}
              onChange={e => setRetentionDays(Number(e.target.value))}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-700 outline-none focus:ring-1 focus:ring-blue-500/20 cursor-pointer"
            >
              {[1, 2, 3, 4, 5, 6, 7].map(d => (
                <option key={d} value={d}>{d} Day{d > 1 ? 's' : ''}</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2 flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider font-semibold">Justification Statement</label>
            <input
              type="text"
              placeholder="Provide reason for retention suspension…"
              value={retentionReason}
              onChange={e => setRetentionReason(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-medium focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-500/20 text-slate-800"
            />
          </div>
          <button
            type="submit"
            disabled={isRetentionLoading || !retentionReason}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-xl py-2.5 text-xs font-bold transition-all shadow active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            {isRetentionLoading && <LoaderIcon width={12} height={12} color="white" />}
            Confirm Override
          </button>
        </form>
      </div>

      {/* Concurrent Logins Table */}
      {metricsData?.suspiciousConcurrentLogins?.length > 0 && (
        <div className="p-6 rounded-2xl bg-white border border-amber-200 shadow-sm shadow-amber-50/20">
          <h3 className="text-amber-700 font-extrabold text-sm mb-4">⚠️ Suspicious Concurrent Admin Sessions</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-650">
              <thead className="border-b border-slate-200 text-[10px] text-slate-450 uppercase font-bold">
                <tr>
                  <th className="pb-2.5">Email Profile</th>
                  <th className="pb-2.5">Role</th>
                  <th className="pb-2.5">Distinct IP Count</th>
                  <th className="pb-2.5">Access IP Addresses</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {metricsData.suspiciousConcurrentLogins.map(login => (
                  <tr key={login.userId}>
                    <td className="py-3 font-bold text-slate-800">{login.email}</td>
                    <td className="py-3">
                      <span className="bg-blue-50 border border-blue-100 text-blue-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase">{login.role}</span>
                    </td>
                    <td className="py-3 text-red-600 font-extrabold">{login.distinctIpCount}</td>
                    <td className="py-3 font-mono text-[11px] text-slate-500 font-bold">{login.ips.join(', ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
        {/* Auth Events Time Series */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm w-full">
          <h3 className="text-xs font-bold text-slate-800 mb-6 uppercase tracking-wider">Authentication Velocity (30 Days)</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={authData?.data || []}>
                <defs>
                  <linearGradient id="colorSuccess" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorFailed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="timestamp" stroke="#94a3b8" tickFormatter={tick => new Date(tick).toLocaleDateString(undefined, {month:'short', day:'numeric'})} fontSize={11} fontWeight={600} />
                <YAxis stroke="#94a3b8" fontSize={11} fontWeight={600} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 600, paddingTop: '15px' }} />
                <Area type="monotone" dataKey="success_count" name="Success Logins" stroke="#10b981" fillOpacity={1} fill="url(#colorSuccess)" strokeWidth={1.8} />
                <Area type="monotone" dataKey="failed_count" name="Failed Attempts" stroke="#ef4444" fillOpacity={1} fill="url(#colorFailed)" strokeWidth={1.8} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* System Errors Time Series */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm w-full">
          <h3 className="text-xs font-bold text-slate-800 mb-6 uppercase tracking-wider">System Errors Volume</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={errorData?.data || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="timestamp" stroke="#94a3b8" tickFormatter={tick => new Date(tick).toLocaleDateString(undefined, {month:'short', day:'numeric'})} fontSize={11} fontWeight={600} />
                <YAxis stroke="#94a3b8" fontSize={11} fontWeight={600} />
                <Tooltip content={<CustomTooltip />} cursor={{fill: '#f8fafc'}} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 600, paddingTop: '15px' }} />
                <Bar dataKey="critical_count" name="Critical" stackId="a" fill="#ef4444" radius={[0, 0, 0, 0]} />
                <Bar dataKey="error_count" name="Error" stackId="a" fill="#f97316" radius={[0, 0, 0, 0]} />
                <Bar dataKey="warning_count" name="Warning" stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Role Distribution Pie Chart */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm w-full">
          <h3 className="text-xs font-bold text-slate-800 mb-6 uppercase tracking-wider">User Roles Distribution</h3>
          <div className="h-64 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={dashboardData?.distributions?.user_roles || []}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="count"
                  nameKey="category"
                  stroke="none"
                >
                  {(dashboardData?.distributions?.user_roles || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-white border border-slate-200 p-2.5 rounded-xl shadow-lg text-xs font-bold font-sans">
                        <span className="text-slate-655 uppercase">{payload[0].name}: </span>
                        <span className="text-blue-600 font-bold">{payload[0].value} Users</span>
                      </div>
                    );
                  }
                  return null;
                }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 600 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Audit Logs Line Chart */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm w-full">
          <h3 className="text-xs font-bold text-slate-800 mb-6 uppercase tracking-wider">Audit Log Activity Velocity</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={auditData?.data || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="timestamp" stroke="#94a3b8" tickFormatter={tick => new Date(tick).toLocaleDateString(undefined, {month:'short', day:'numeric'})} fontSize={11} fontWeight={600} />
                <YAxis stroke="#94a3b8" fontSize={11} fontWeight={600} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 600, paddingTop: '15px' }} />
                <Line type="monotone" dataKey="count" name="Total Audit Actions" stroke="#6366f1" strokeWidth={2.2} dot={{ r: 3, fill: '#6366f1', strokeWidth: 0 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
