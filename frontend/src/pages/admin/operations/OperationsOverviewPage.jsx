import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useOutletContext, useNavigate } from 'react-router-dom';
import api from '../../../services/api';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { retentionOverride, getAuditLogs, getAdminUsers } from '../../../services/admin';
import { useToastStore } from '../../../store/useToastStore';
import LoaderIcon from '../../../icons/LoaderIcon';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatUptime(seconds) {
  if (!seconds && seconds !== 0) return '0m';
  const num = Number(seconds);
  if (isNaN(num) || num <= 0) return '0m';
  const d = Math.floor(num / 86400);
  const h = Math.floor((num % 86400) / 3600);
  const m = Math.floor((num % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function getIntervalDates(interval) {
  const now = new Date();
  const end = now.toISOString();
  let start;
  if (interval === 'hour') {
    start = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  } else if (interval === 'week') {
    start = new Date(now.getTime() - 84 * 24 * 60 * 60 * 1000).toISOString();
  } else {
    start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  }
  return { start, end };
}

function safeDateFormat(raw, opts) {
  try {
    const d = new Date(raw);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString(undefined, opts);
  } catch (_) { return String(raw); }
}

function formatRelativeTime(raw) {
  if (!raw) return 'Unknown';
  try {
    const d = new Date(raw);
    if (isNaN(d.getTime())) return 'Unknown';
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const isToday = d.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = d.toDateString() === yesterday.toDateString();
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin} min ago`;
    if (isToday) return `Today ${d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
    if (isYesterday) return `Yesterday ${d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) + ' ' + d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  } catch (_) { return 'Unknown'; }
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 p-3 rounded-2xl shadow-xl text-xs font-sans">
        <p className="text-slate-500 dark:text-slate-400 text-[10px] mb-2 font-bold uppercase tracking-wider">
          {safeDateFormat(label, { month: 'short', day: 'numeric', year: 'numeric' })}
        </p>
        {payload.map((entry, idx) => (
          <div key={idx} className="flex justify-between gap-4 text-xs mb-1 last:mb-0">
            <span className="font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full inline-block shrink-0" style={{ backgroundColor: entry.color }} />
              {entry.name}
            </span>
            <span className="text-slate-900 dark:text-white font-bold font-mono">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

// ─── Status Chip ──────────────────────────────────────────────────────────────
const STATUS_LABELS = { UP: 'Healthy', DOWN: 'Offline', STANDBY: 'Standby', ALERT: 'Degraded' };

const StatusChip = ({ status, latencyMs }) => {
  const isUp = status === 'UP';
  const isStandby = status === 'STANDBY';
  const displayLabel = STATUS_LABELS[status] || status || 'Offline';
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border transition-colors duration-150 ${isUp
        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
        : isStandby
          ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20'
          : 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20'
      }`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isUp ? 'bg-emerald-500 animate-pulse' : isStandby ? 'bg-amber-500' : 'bg-rose-500'}`} />
      {displayLabel}
      {latencyMs !== undefined && latencyMs !== null && <span className="font-mono opacity-60 ml-0.5">{latencyMs}ms</span>}
    </span>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function OperationsOverviewPage() {
  const { triggerSudo } = useOutletContext();
  const { showToast } = useToastStore();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [interval, setInterval_] = useState('day');
  const [healthData, setHealthData] = useState(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [isRetentionOpen, setIsRetentionOpen] = useState(false);
  const [refreshState, setRefreshState] = useState('idle'); // idle | refreshing | done

  // Retention form state
  const [retentionDays, setRetentionDays] = useState(3);
  const [retentionReason, setRetentionReason] = useState('');
  const [isRetentionLoading, setIsRetentionLoading] = useState(false);

  // ─── Queries ────────────────────────────────────────────────────────────────
  const { data: metricsData, isLoading: metricsLoading, isError: metricsError } = useQuery({
    queryKey: ['control-plane-metrics'],
    queryFn: async () => {
      const res = await api.get('/admin/control-plane-metrics');
      return res.data.data;
    },
    staleTime: 30000,
  });

  const { data: usersTotalData, isLoading: usersLoading, isError: usersError } = useQuery({
    queryKey: ['admin-users-total'],
    queryFn: () => getAdminUsers({ limit: 1, page: 1 }),
    staleTime: 60000,
  });

  const { data: dashboardData, isLoading: dashboardLoading, isError: dashboardError, refetch: refetchDashboard } = useQuery({
    queryKey: ['analytics-dashboard'],
    queryFn: async () => {
      const res = await api.get('/admin/analytics/dashboard');
      return res.data.data;
    },
    staleTime: 60000,
  });

  const intervalDates = useMemo(() => getIntervalDates(interval), [interval]);

  const { data: authData, isLoading: authLoading, isError: authError, refetch: refetchAuth } = useQuery({
    queryKey: ['analytics-auth', interval],
    queryFn: async () => {
      const res = await api.get(`/admin/analytics/auth-events?interval=${interval}&start=${intervalDates.start}&end=${intervalDates.end}`);
      return res.data.data;
    },
    staleTime: 30000,
  });

  const { data: errorData, isLoading: errorLoading, isError: errorError, refetch: refetchError } = useQuery({
    queryKey: ['analytics-errors', interval],
    queryFn: async () => {
      const res = await api.get(`/admin/analytics/system-errors?interval=${interval}&start=${intervalDates.start}&end=${intervalDates.end}`);
      return res.data.data;
    },
    staleTime: 30000,
  });

  const { data: auditData, isLoading: auditLoading, isError: auditError, refetch: refetchAudit } = useQuery({
    queryKey: ['analytics-audit', interval],
    queryFn: async () => {
      const res = await api.get(`/admin/analytics/audit-logs?interval=${interval}&start=${intervalDates.start}&end=${intervalDates.end}`);
      return res.data.data;
    },
    staleTime: 30000,
  });

  const { data: recentLogsData, isLoading: recentLogsLoading, isError: recentLogsError, refetch: refetchRecentLogs } = useQuery({
    queryKey: ['recent-audit-logs'],
    queryFn: () => getAuditLogs({ limit: 5, page: 1 }),
    staleTime: 30000,
  });

  // ─── Health Poll ────────────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    const fetchHealth = async () => {
      try {
        const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api$/, '');
        const [readyRes, liveRes] = await Promise.allSettled([
          fetch(`${baseUrl}/health/ready`),
          fetch(`${baseUrl}/health/live`),
        ]);

        let readyJson = {};
        let liveJson = {};

        if (readyRes.status === 'fulfilled' && readyRes.value) {
          try { readyJson = await readyRes.value.json(); } catch (_) { }
        }
        if (liveRes.status === 'fulfilled' && liveRes.value) {
          try { liveJson = await liveRes.value.json(); } catch (_) { }
        }

        const merged = {
          ...readyJson,
          uptimeSeconds: liveJson.uptimeSeconds || readyJson.uptimeSeconds || readyJson.uptime || 0,
          uptime: liveJson.uptimeSeconds || readyJson.uptimeSeconds || readyJson.uptime || 0,
          environment: liveJson.environment || readyJson.environment || 'development',
        };

        if (mounted) {
          setHealthData(merged);
          setLastUpdated(new Date());
        }
      } catch (err) {
        if (mounted) setHealthData({ status: 'DOWN', error: err.message });
      } finally {
        if (mounted) setHealthLoading(false);
      }
    };
    fetchHealth();
    const timer = window.setInterval(fetchHealth, 15000);
    return () => { mounted = false; window.clearInterval(timer); };
  }, []);

  // ─── Manual Refresh ─────────────────────────────────────────────────────────
  const handleRefresh = useCallback(() => {
    if (refreshState === 'refreshing') return;
    setRefreshState('refreshing');
    queryClient.invalidateQueries({ queryKey: ['control-plane-metrics'] });
    queryClient.invalidateQueries({ queryKey: ['analytics-dashboard'] });
    queryClient.invalidateQueries({ queryKey: ['analytics-auth'] });
    queryClient.invalidateQueries({ queryKey: ['analytics-errors'] });
    queryClient.invalidateQueries({ queryKey: ['analytics-audit'] });
    queryClient.invalidateQueries({ queryKey: ['recent-audit-logs'] });
    queryClient.invalidateQueries({ queryKey: ['admin-users-total'] });
    setLastUpdated(new Date());
    setTimeout(() => {
      setRefreshState('done');
      setTimeout(() => setRefreshState('idle'), 2000);
    }, 1200);
  }, [queryClient, refreshState]);

  // ─── Retention Handler ──────────────────────────────────────────────────────
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
        showToast(res.message || 'Database retention sweep successfully paused.', 'success');
        queryClient.invalidateQueries({ queryKey: ['control-plane-metrics'] });
        setRetentionReason('');
      } catch (err) {
        showToast(err?.response?.data?.message || 'Failed to pause retention sweeps.', 'error');
      } finally {
        setIsRetentionLoading(false);
      }
    });
  };

  // ─── Computed Chart Data ────────────────────────────────────────────────────
  const authSeries = useMemo(() => {
    const raw = authData?.data || authData || [];
    return Array.isArray(raw) ? raw : [];
  }, [authData]);

  const errorSeries = useMemo(() => {
    const raw = errorData?.data || errorData || [];
    return Array.isArray(raw) ? raw : [];
  }, [errorData]);

  const auditSeries = useMemo(() => {
    const raw = auditData?.data || auditData || [];
    return Array.isArray(raw) ? raw : [];
  }, [auditData]);

  const roleDist = useMemo(() => dashboardData?.distributions?.user_roles || [], [dashboardData]);
  const totalUsersInRoles = useMemo(() => roleDist.reduce((s, r) => s + (r.count || 0), 0), [roleDist]);

  const totalAuthAttempts = useMemo(() => authSeries.reduce((s, r) => s + (r.success_count || 0) + (r.failed_count || 0), 0), [authSeries]);
  const totalAuthSuccess = useMemo(() => authSeries.reduce((s, r) => s + (r.success_count || 0), 0), [authSeries]);
  const totalAuthFailed = useMemo(() => authSeries.reduce((s, r) => s + (r.failed_count || 0), 0), [authSeries]);
  const authSuccessRate = totalAuthAttempts > 0 ? ((totalAuthSuccess / totalAuthAttempts) * 100).toFixed(1) : '0.0';

  const totalSystemErrors = useMemo(() => errorSeries.reduce((s, r) => s + (r.critical_count || 0) + (r.error_count || 0) + (r.warning_count || 0), 0), [errorSeries]);
  const totalCriticalErrors = useMemo(() => errorSeries.reduce((s, r) => s + (r.critical_count || 0), 0), [errorSeries]);
  const totalWarningErrors = useMemo(() => errorSeries.reduce((s, r) => s + (r.warning_count || 0), 0), [errorSeries]);

  const totalAuditActions = useMemo(() => auditSeries.reduce((s, r) => s + (r.count || 0), 0), [auditSeries]);

  const tickFormatter = useCallback((tick) => safeDateFormat(tick, { month: 'short', day: 'numeric' }), []);

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-5 w-full pb-8">

      {/* ── BREAK GLASS ALERT ────────────────────────────────────────────── */}
      {metricsData?.breakGlass?.active && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-400 flex items-center justify-between shadow-sm">
          <div>
            <h3 className="font-extrabold text-sm flex items-center gap-2">⚠️ EMERGENCY BREAK-GLASS ACTIVE</h3>
            <p className="text-xs mt-0.5 font-medium">Bypassing standard administrative gating. Self-terminating in {metricsData.breakGlass.secondsRemaining}s.</p>
          </div>
        </div>
      )}

      {/* ── HEADER: Operations Control Plane ─────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">Operations Control Plane</h1>
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-widest bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live Telemetry
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 font-mono whitespace-nowrap">
            Last Updated: {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            100% Synced
          </span>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshState === 'refreshing'}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all shadow-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-wait ${refreshState === 'done'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-900 dark:bg-slate-800 hover:bg-slate-700 dark:hover:bg-slate-700 text-white active:scale-95'
              }`}
            aria-label="Refresh telemetry data"
          >
            {refreshState === 'refreshing' ? (
              <><LoaderIcon width={12} height={12} color="white" /> Refreshing…</>
            ) : refreshState === 'done' ? (
              <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg> Updated</>
            ) : (
              <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg> Refresh</>
            )}
          </button>
          <div className="flex items-center rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-slate-50 dark:bg-slate-800/60 text-[10px] font-bold">
            {['hour', 'day', 'week'].map((iv) => (
              <button
                key={iv}
                type="button"
                onClick={() => setInterval_(iv)}
                className={`px-3 py-1.5 uppercase tracking-wider transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${interval === iv
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                aria-pressed={interval === iv}
                aria-label={`Set interval to ${iv}`}
              >
                {iv}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── 6 KPI CARDS ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">

        {/* Card 1: Platform Users */}
        <div
          role="button" tabIndex={0}
          onClick={() => navigate('/admin/users')}
          onKeyDown={(e) => e.key === 'Enter' && navigate('/admin/users')}
          aria-label="Navigate to User Management"
          className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-800 hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <div className="flex items-center justify-between">
            <h4 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Platform Users</h4>
            <span className="text-xs text-slate-300 dark:text-slate-600 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">↗</span>
          </div>
          {usersLoading ? (
            <div className="py-3 flex justify-center"><LoaderIcon width={18} height={18} color="#6366f1" /></div>
          ) : usersError ? (
            <span className="text-xs text-rose-500 font-semibold mt-2">Error loading</span>
          ) : (
            <div className="mt-2 flex flex-col">
              <div className="flex items-baseline justify-between">
                <span className="text-[28px] font-black text-slate-900 dark:text-white tabular-nums leading-none">{usersTotalData?.total ?? 0}</span>
                <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-md">Total</span>
              </div>
              <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 mt-1">Registered Accounts</span>
            </div>
          )}
        </div>

        {/* Card 2: Active Admin Sessions */}
        <div
          role="button" tabIndex={0}
          onClick={() => navigate('/admin/operations/sessions')}
          onKeyDown={(e) => e.key === 'Enter' && navigate('/admin/operations/sessions')}
          aria-label="Navigate to Active Sessions"
          className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md hover:border-emerald-300 dark:hover:border-emerald-800 hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <div className="flex items-center justify-between">
            <h4 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Admin Sessions</h4>
            <span className="text-xs text-slate-300 dark:text-slate-600 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">↗</span>
          </div>
          {metricsLoading ? (
            <div className="py-3 flex justify-center"><LoaderIcon width={18} height={18} color="#10b981" /></div>
          ) : metricsError ? (
            <span className="text-xs text-rose-500 font-semibold mt-2">Error loading</span>
          ) : (
            <div className="mt-2 flex flex-col">
              <div className="flex items-baseline justify-between">
                <span className="text-[28px] font-black text-slate-900 dark:text-white tabular-nums leading-none">{metricsData?.activeAdminSessionCount || 0}</span>
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">Live</span>
              </div>
              <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 mt-1">Active Sessions</span>
            </div>
          )}
        </div>

        {/* Card 3: Active Impersonations */}
        <div
          role="button" tabIndex={0}
          onClick={() => navigate('/admin/operations/auth-events')}
          onKeyDown={(e) => e.key === 'Enter' && navigate('/admin/operations/auth-events')}
          aria-label="Navigate to Auth Events"
          className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md hover:border-blue-300 dark:hover:border-blue-800 hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <div className="flex items-center justify-between">
            <h4 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Impersonations</h4>
            <span className="text-xs text-slate-300 dark:text-slate-600 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">↗</span>
          </div>
          {metricsLoading ? (
            <div className="py-3 flex justify-center"><LoaderIcon width={18} height={18} color="#3b82f6" /></div>
          ) : metricsError ? (
            <span className="text-xs text-rose-500 font-semibold mt-2">Error loading</span>
          ) : (
            <div className="mt-2 flex flex-col">
              <div className="flex items-baseline justify-between">
                <span className="text-[28px] font-black text-blue-600 dark:text-blue-400 tabular-nums leading-none">{metricsData?.activeImpersonationCount || 0}</span>
                <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md">Audited</span>
              </div>
              <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 mt-1">Step-Up Gated</span>
            </div>
          )}
        </div>

        {/* Card 4: Database Node */}
        <div
          role="button" tabIndex={0}
          onClick={() => navigate('/admin/system')}
          onKeyDown={(e) => e.key === 'Enter' && navigate('/admin/system')}
          aria-label="Navigate to System Diagnostics"
          className={`p-4 rounded-2xl bg-white dark:bg-slate-900 border shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${(healthData?.checks?.database?.status || 'DOWN') === 'UP'
              ? 'border-emerald-300 dark:border-emerald-800'
              : 'border-slate-200/80 dark:border-slate-800'
            }`}
        >
          <div className="flex items-center justify-between">
            <h4 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Database Node</h4>
            <span className="text-xs text-slate-300 dark:text-slate-600 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">↗</span>
          </div>
          {healthLoading ? (
            <div className="py-3 flex justify-center"><LoaderIcon width={18} height={18} color="#10b981" /></div>
          ) : (
            <div className="mt-2 flex flex-col">
              <div className="flex items-center justify-between">
                <span className={`flex items-center gap-1.5 text-sm font-extrabold uppercase ${(healthData?.checks?.database?.status || 'DOWN') === 'UP'
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-slate-500 dark:text-slate-400'
                  }`}>
                  <span className={`w-2 h-2 rounded-full ${(healthData?.checks?.database?.status || 'DOWN') === 'UP'
                      ? 'bg-emerald-500 animate-pulse'
                      : 'bg-slate-400'
                    }`} />
                  {healthData?.checks?.database?.status || 'DOWN'}
                </span>
                <span className="text-[11px] font-mono text-slate-400 font-bold">
                  {healthData?.checks?.database?.latencyMs ?? 0}ms
                </span>
              </div>
              <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 mt-1">PostgreSQL Cluster</span>
            </div>
          )}
        </div>

        {/* Card 5: Redis Cache */}
        <div
          role="button" tabIndex={0}
          onClick={() => navigate('/admin/system')}
          onKeyDown={(e) => e.key === 'Enter' && navigate('/admin/system')}
          aria-label="Navigate to System Diagnostics"
          className={`p-4 rounded-2xl bg-white dark:bg-slate-900 border shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${(healthData?.checks?.redis?.status || 'DOWN') === 'UP'
              ? 'border-emerald-300 dark:border-emerald-800'
              : 'border-slate-200/80 dark:border-slate-800'
            }`}
        >
          <div className="flex items-center justify-between">
            <h4 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Redis Cache</h4>
            <span className="text-xs text-slate-300 dark:text-slate-600 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">↗</span>
          </div>
          {healthLoading ? (
            <div className="py-3 flex justify-center"><LoaderIcon width={18} height={18} color="#f59e0b" /></div>
          ) : (
            <div className="mt-2 flex flex-col">
              <div className="flex items-center justify-between">
                <span className={`flex items-center gap-1.5 text-sm font-extrabold uppercase ${(healthData?.checks?.redis?.status || 'DOWN') === 'UP'
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-slate-500 dark:text-slate-400'
                  }`}>
                  <span className={`w-2 h-2 rounded-full ${(healthData?.checks?.redis?.status || 'DOWN') === 'UP'
                      ? 'bg-emerald-500 animate-pulse'
                      : 'bg-slate-400'
                    }`} />
                  {healthData?.checks?.redis?.status || 'DOWN'}
                </span>
                <span className="text-[11px] font-mono text-slate-400 font-bold">
                  {healthData?.checks?.redis?.latencyMs ?? 0}ms
                </span>
              </div>
              <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 mt-1">In-Memory Store</span>
            </div>
          )}
        </div>

        {/* Card 6: System Uptime */}
        <div
          role="button" tabIndex={0}
          onClick={() => navigate('/admin/system')}
          onKeyDown={(e) => e.key === 'Enter' && navigate('/admin/system')}
          aria-label="Navigate to System Diagnostics"
          className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md hover:border-purple-300 dark:hover:border-purple-800 hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <div className="flex items-center justify-between">
            <h4 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">System Uptime</h4>
            <span className="text-xs text-slate-300 dark:text-slate-600 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">↗</span>
          </div>
          {healthLoading ? (
            <div className="py-3 flex justify-center"><LoaderIcon width={18} height={18} color="#8b5cf6" /></div>
          ) : (
            <div className="mt-2 flex flex-col">
              <div className="flex items-center justify-between">
                <span className="text-sm font-mono font-black text-slate-900 dark:text-white tabular-nums leading-none">{formatUptime(healthData?.uptime)}</span>
                <span className="text-[10px] font-bold text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-950/40 px-2.5 py-0.5 rounded-full">Reliability</span>
              </div>
              <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 mt-1 capitalize">
                {(healthData?.environment || 'development') === 'development' ? 'Development Env' : `${healthData?.environment} Env`}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── RECENT ACTIVITY + SYSTEM HEALTH PANELS ───────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Recent Audit Trail Activity */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Recent Audit Trail Activity</h3>
              <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">Real-Time Feed</span>
            </div>
            <button
              type="button"
              onClick={() => navigate('/admin/operations/audit-logs')}
              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
            >
              <span>View All Logs</span><span>→</span>
            </button>
          </div>

          {recentLogsLoading ? (
            <div className="py-10 flex justify-center"><LoaderIcon width={24} height={24} color="#6366f1" /></div>
          ) : recentLogsError ? (
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-400 text-xs font-semibold">
              Failed to load recent activity.{' '}
              <button onClick={() => refetchRecentLogs()} className="underline font-bold cursor-pointer">Retry</button>
            </div>
          ) : !recentLogsData?.logs?.length ? (
            <div className="py-8 text-center text-xs font-semibold text-slate-400 dark:text-slate-500">No recent audit activity recorded.</div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {recentLogsData.logs.slice(0, 5).map((log) => (
                <button
                  key={log.id}
                  type="button"
                  onClick={() => navigate('/admin/operations/audit-logs')}
                  className="w-full py-2.5 flex items-center justify-between text-xs gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg px-2 -mx-2 transition-colors cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="px-2 py-0.5 rounded text-[9px] font-extrabold uppercase font-mono bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shrink-0">
                      {log.action || 'AUDIT'}
                    </span>
                    <div className="flex flex-col min-w-0">
                      <span className="font-bold text-slate-900 dark:text-slate-100 truncate">{log.actor_email || 'System Process'}</span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono truncate">{log.target || log.details || 'System Record'}</span>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold whitespace-nowrap shrink-0">
                    {formatRelativeTime(log.created_at || log.timestamp)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* System Health & Infrastructure */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">SYSTEM HEALTH & INFRASTRUCTURE</h3>
            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${(healthData?.checks?.database?.status || 'UP') === 'UP'
                ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400'
                : 'bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400'
              }`}>
              {(healthData?.checks?.database?.status || 'UP') === 'UP' ? 'Operational' : 'Degraded'}
            </span>
          </div>

          <div className="space-y-2 text-xs">
            {[
              { label: 'Database Engine', status: healthData?.checks?.database?.status || (healthLoading ? '…' : 'DOWN'), latencyMs: healthData?.checks?.database?.latencyMs },
              { label: 'Redis Cache Probe', status: healthData?.checks?.redis?.status || (healthLoading ? '…' : 'DOWN'), latencyMs: healthData?.checks?.redis?.latencyMs },
              { label: 'API Gateway Router', status: 'UP', badge: '200 OK' },
              { label: 'Security & Sudo Controls', status: metricsData?.breakGlass?.active ? 'ALERT' : 'UP', badge: metricsData?.breakGlass?.active ? 'Break-Glass Active' : 'Enforced' },
            ].map(({ label, status, latencyMs, badge }) => (
              <div key={label} className="p-2.5 px-3.5 rounded-2xl bg-slate-50/60 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${badge === 'Enforced' ? 'bg-blue-500'
                      : status === 'UP' ? 'bg-emerald-500 animate-pulse'
                        : status === 'STANDBY' ? 'bg-amber-500'
                          : status === 'ALERT' ? 'bg-rose-500 animate-pulse'
                            : status === '…' ? 'bg-slate-300 dark:bg-slate-600'
                              : 'bg-slate-400'
                    }`} />
                  <span className="font-bold text-slate-800 dark:text-slate-200">{label}</span>
                </div>
                <div className="flex items-center gap-1.5 font-mono text-[11px]">
                  {badge ? (
                    <span className={`font-extrabold ${status === 'ALERT' ? 'text-rose-600 dark:text-rose-400'
                        : badge === 'Enforced' ? 'text-blue-600 dark:text-blue-400'
                          : 'text-emerald-600 dark:text-emerald-400'
                      }`}>{badge}</span>
                  ) : (
                    <div className="flex items-center gap-1">
                      <span className={`font-extrabold uppercase ${status === 'UP' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'
                        }`}>{status}</span>
                      {latencyMs !== undefined && latencyMs !== null && latencyMs > 0 && (
                        <span className="text-slate-400 font-normal">({latencyMs}ms)</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── SUSPICIOUS CONCURRENT LOGINS (conditional) ───────────────────── */}
      {metricsData?.suspiciousConcurrentLogins?.length > 0 && (
        <div className="p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50 shadow-xs">
          <h3 className="text-amber-700 dark:text-amber-400 font-extrabold text-xs uppercase tracking-wider mb-4 flex items-center gap-2">
            ⚠️ Suspicious Concurrent Admin Sessions
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
              <thead className="border-b border-amber-200 dark:border-amber-800/50 text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold">
                <tr>
                  <th className="pb-2.5 pr-4">Email</th>
                  <th className="pb-2.5 pr-4">Role</th>
                  <th className="pb-2.5 pr-4">Distinct IPs</th>
                  <th className="pb-2.5">IP Addresses</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-100 dark:divide-amber-900/30">
                {metricsData.suspiciousConcurrentLogins.map((login) => (
                  <tr key={login.userId}>
                    <td className="py-2.5 pr-4 font-bold text-slate-900 dark:text-white">{login.email}</td>
                    <td className="py-2.5 pr-4">
                      <span className="bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded text-[10px] font-bold uppercase">{login.role}</span>
                    </td>
                    <td className="py-2.5 pr-4 text-rose-600 dark:text-rose-400 font-extrabold">{login.distinctIpCount}</td>
                    <td className="py-2.5 font-mono text-[11px] text-slate-500 dark:text-slate-400 font-bold">{login.ips?.join(', ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── 4 CHARTS GRID ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Chart 1: Authentication Velocity */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md transition-shadow duration-200 flex flex-col">
          <div className="flex flex-col gap-3 mb-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Authentication Velocity</h3>
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 uppercase tracking-wider capitalize">{interval}ly Trend</span>
            </div>
            <div className="grid grid-cols-3 gap-2 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Total</span>
                <p className="text-sm font-black text-slate-900 dark:text-white font-mono tabular-nums mt-0.5">{totalAuthAttempts}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">Success Rate</span>
                <p className="text-sm font-black text-emerald-600 dark:text-emerald-400 font-mono tabular-nums mt-0.5">{authSuccessRate}%</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-rose-500 dark:text-rose-400 uppercase">Failed</span>
                <p className="text-sm font-black text-rose-600 dark:text-rose-400 font-mono tabular-nums mt-0.5">{totalAuthFailed}</p>
              </div>
            </div>
          </div>
          {authLoading ? (
            <div className="h-48 flex items-center justify-center"><LoaderIcon width={28} height={28} color="#10b981" /></div>
          ) : authError ? (
            <div className="h-48 flex items-center justify-center text-xs font-semibold text-rose-500">
              Failed to load data. <button onClick={() => refetchAuth()} className="underline font-bold ml-1 cursor-pointer">Retry</button>
            </div>
          ) : authSeries.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-xs text-slate-400">No authentication data for this period.</div>
          ) : (
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={authSeries}>
                  <defs>
                    <linearGradient id="colorSuccess" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorFailed" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.12} vertical={false} />
                  <XAxis dataKey="timestamp" stroke="#94a3b8" tickFormatter={tickFormatter} fontSize={11} fontWeight={600} />
                  <YAxis stroke="#94a3b8" fontSize={11} fontWeight={600} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 600, paddingTop: '8px' }} />
                  <Area type="monotone" dataKey="success_count" name="Success Logins" stroke="#10b981" fillOpacity={1} fill="url(#colorSuccess)" strokeWidth={2.5} animationDuration={800} activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff' }} />
                  <Area type="monotone" dataKey="failed_count" name="Failed Attempts" stroke="#ef4444" fillOpacity={1} fill="url(#colorFailed)" strokeWidth={2.5} animationDuration={800} activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff' }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Chart 2: System Errors Volume */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md transition-shadow duration-200 flex flex-col">
          <div className="flex flex-col gap-3 mb-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">System Errors Volume</h3>
              <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 bg-purple-500/10 px-2.5 py-1 rounded-full border border-purple-500/20 uppercase tracking-wider capitalize">{interval}ly Telemetry</span>
            </div>
            <div className="grid grid-cols-3 gap-2 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Total Errors</span>
                <p className="text-sm font-black text-slate-900 dark:text-white font-mono tabular-nums mt-0.5">{totalSystemErrors}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase">Critical</span>
                <p className="text-sm font-black text-rose-600 dark:text-rose-400 font-mono tabular-nums mt-0.5">{totalCriticalErrors}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-amber-500 dark:text-amber-400 uppercase">Warnings</span>
                <p className="text-sm font-black text-amber-600 dark:text-amber-400 font-mono tabular-nums mt-0.5">{totalWarningErrors}</p>
              </div>
            </div>
          </div>
          {errorLoading ? (
            <div className="h-48 flex items-center justify-center"><LoaderIcon width={28} height={28} color="#8b5cf6" /></div>
          ) : errorError ? (
            <div className="h-48 flex items-center justify-center text-xs font-semibold text-rose-500">
              Failed to load data. <button onClick={() => refetchError()} className="underline font-bold ml-1 cursor-pointer">Retry</button>
            </div>
          ) : errorSeries.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-xs text-slate-400">No error data for this period.</div>
          ) : (
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={errorSeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.12} vertical={false} />
                  <XAxis dataKey="timestamp" stroke="#94a3b8" tickFormatter={tickFormatter} fontSize={11} fontWeight={600} />
                  <YAxis stroke="#94a3b8" fontSize={11} fontWeight={600} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(148, 163, 184, 0.08)' }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 600, paddingTop: '8px' }} />
                  <Bar dataKey="critical_count" name="Critical" stackId="a" fill="#dc2626" radius={[0, 0, 0, 0]} animationDuration={800} />
                  <Bar dataKey="error_count" name="Error" stackId="a" fill="#8b5cf6" radius={[0, 0, 0, 0]} animationDuration={800} />
                  <Bar dataKey="warning_count" name="Warning" stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} animationDuration={800} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Chart 3: User Roles Distribution (Donut + Count Table) */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md transition-shadow duration-200 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">User Roles Distribution</h3>
            <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-full border border-indigo-500/20">
              {totalUsersInRoles} Users Total
            </span>
          </div>
          {dashboardLoading ? (
            <div className="h-48 flex items-center justify-center"><LoaderIcon width={28} height={28} color="#6366f1" /></div>
          ) : dashboardError ? (
            <div className="h-48 flex items-center justify-center text-xs font-semibold text-rose-500">
              Failed to load data. <button onClick={() => refetchDashboard()} className="underline font-bold ml-1 cursor-pointer">Retry</button>
            </div>
          ) : roleDist.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-xs text-slate-400">No role distribution data available.</div>
          ) : (
            <div className="h-48 w-full flex flex-col sm:flex-row items-center gap-3">
              <div className="w-full sm:w-1/2 h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={roleDist} cx="50%" cy="50%" innerRadius={50} outerRadius={72} paddingAngle={4} dataKey="count" nameKey="category" stroke="none" animationDuration={800}>
                      {roleDist.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 p-2.5 rounded-xl shadow-xl text-xs font-bold font-sans">
                            <span className="text-slate-500 dark:text-slate-400 uppercase">{payload[0].name}: </span>
                            <span className="text-indigo-600 dark:text-indigo-400 font-extrabold font-mono ml-1">{payload[0].value} Users</span>
                          </div>
                        );
                      }
                      return null;
                    }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-full sm:w-1/2 overflow-y-auto max-h-44 pr-1 space-y-1.5 text-xs">
                {roleDist.map((entry, idx) => {
                  const pct = totalUsersInRoles > 0 ? ((entry.count / totalUsersInRoles) * 100).toFixed(1) : '0.0';
                  return (
                    <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                        <span className="font-bold text-slate-800 dark:text-slate-200 truncate">{entry.category}</span>
                      </div>
                      <div className="flex items-center gap-1.5 font-mono font-bold shrink-0">
                        <span className="text-slate-900 dark:text-white">{entry.count}</span>
                        <span className="text-[10px] text-slate-400">({pct}%)</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Chart 4: Audit Log Activity Velocity */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md transition-shadow duration-200 flex flex-col">
          <div className="flex flex-col gap-3 mb-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Audit Log Activity Velocity</h3>
              <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 bg-purple-500/10 px-2.5 py-1 rounded-full border border-purple-500/20 uppercase tracking-wider capitalize">{interval}ly Audit</span>
            </div>
            <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Total Logged Actions</span>
                <p className="text-sm font-black text-purple-600 dark:text-purple-400 font-mono tabular-nums mt-0.5">{totalAuditActions}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Time Scope</span>
                <p className="text-sm font-black text-slate-900 dark:text-white font-mono tabular-nums mt-0.5 capitalize">{interval}ly</p>
              </div>
            </div>
          </div>
          {auditLoading ? (
            <div className="h-48 flex items-center justify-center"><LoaderIcon width={28} height={28} color="#8b5cf6" /></div>
          ) : auditError ? (
            <div className="h-48 flex items-center justify-center text-xs font-semibold text-rose-500">
              Failed to load data. <button onClick={() => refetchAudit()} className="underline font-bold ml-1 cursor-pointer">Retry</button>
            </div>
          ) : auditSeries.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-xs text-slate-400">No audit data for this period.</div>
          ) : (
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={auditSeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.12} vertical={false} />
                  <XAxis dataKey="timestamp" stroke="#94a3b8" tickFormatter={tickFormatter} fontSize={11} fontWeight={600} />
                  <YAxis stroke="#94a3b8" fontSize={11} fontWeight={600} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 600, paddingTop: '12px' }} />
                  <Line type="monotone" dataKey="count" name="Total Audit Actions" stroke="#8b5cf6" strokeWidth={2.8} dot={{ r: 3.5, fill: '#8b5cf6', strokeWidth: 0 }} activeDot={{ r: 7, stroke: '#fff', strokeWidth: 2 }} animationDuration={800} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* ── COLLAPSIBLE RETENTION OVERRIDE ────────────────────────────────── */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <button
          type="button"
          onClick={() => setIsRetentionOpen((p) => !p)}
          className="w-full flex items-center justify-between text-left cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-xl"
          aria-expanded={isRetentionOpen}
          aria-label="Toggle Database Retention Override controls"
        >
          <div>
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              Database Retention Sweep Override
              <span className="ml-2 text-[10px] font-bold text-slate-400 dark:text-slate-500 normal-case">— Infrequent Administrative Action</span>
            </h3>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
              Temporarily suspend automatic backend records cleanup for compliance or audit investigations (Max 7 Days).
            </p>
          </div>
          <span className="text-xs font-bold text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors ml-4 shrink-0">
            {isRetentionOpen ? '▲ Collapse' : '▼ Expand'}
          </span>
        </button>

        {isRetentionOpen && (
          <form onSubmit={handleRetentionPauseSubmit} className="mt-4 pt-4 border-t border-slate-200/60 dark:border-slate-800 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="retention-duration" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Override Duration</label>
              <select
                id="retention-duration"
                value={retentionDays}
                onChange={(e) => setRetentionDays(Number(e.target.value))}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
              >
                {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                  <option key={d} value={d}>{d} Day{d > 1 ? 's' : ''}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2 flex flex-col gap-1.5">
              <label htmlFor="retention-reason" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Justification Statement</label>
              <input
                id="retention-reason"
                type="text"
                placeholder="Provide reason for retention suspension…"
                value={retentionReason}
                onChange={(e) => setRetentionReason(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-medium focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 text-slate-900 dark:text-white placeholder-slate-400"
              />
            </div>
            <button
              type="submit"
              disabled={isRetentionLoading || !retentionReason}
              className="w-full bg-slate-900 dark:bg-slate-800 hover:bg-slate-700 dark:hover:bg-slate-700 text-white rounded-xl py-2.5 text-xs font-bold transition-all shadow-xs active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              {isRetentionLoading && <LoaderIcon width={12} height={12} color="white" />}
              Confirm Override
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
