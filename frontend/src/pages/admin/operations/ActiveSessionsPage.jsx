import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToastStore } from '../../../store/useToastStore';
import { getSessions, revokeSession, revokeAllUserSessions, downloadCSV } from '../../../services/admin';
import AdminDataTable from '../../../components/admin/AdminDataTable';
import AdminFilterBar from '../../../components/admin/AdminFilterBar';
import AdminDetailDrawer from '../../../components/admin/AdminDetailDrawer';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatRelativeTime(raw) {
  if (!raw) return 'Unknown';
  try {
    const d = new Date(raw);
    if (isNaN(d.getTime())) return 'Unknown';
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
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

function getUserInitials(nameOrEmail) {
  if (!nameOrEmail) return '??';
  if (nameOrEmail.includes('@')) {
    return nameOrEmail.substring(0, 2).toUpperCase();
  }
  const parts = nameOrEmail.trim().split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return nameOrEmail.substring(0, 2).toUpperCase();
}

function parseUserAgent(uaString) {
  if (!uaString) return 'Web Client';
  let browser = 'Browser';
  let os = '';

  if (uaString.includes('Chrome') && !uaString.includes('Edg')) browser = 'Chrome';
  else if (uaString.includes('Edg')) browser = 'Edge';
  else if (uaString.includes('Firefox')) browser = 'Firefox';
  else if (uaString.includes('Safari') && !uaString.includes('Chrome')) browser = 'Safari';

  if (uaString.includes('Windows')) os = 'Windows Desktop';
  else if (uaString.includes('Macintosh') || uaString.includes('Mac OS')) os = 'macOS Browser';
  else if (uaString.includes('Linux')) os = 'Linux Desktop';
  else if (uaString.includes('Android') || uaString.includes('iPhone') || uaString.includes('iPad')) os = 'Mobile Client';

  return os ? `${os} (${browser})` : browser;
}

export default function ActiveSessionsPage() {
  const [searchParams] = useSearchParams();
  const initialSearch = searchParams.get('search') || '';

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState(initialSearch);
  const [roleFilter, setRoleFilter] = useState('');
  const [selectedSession, setSelectedSession] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [copiedField, setCopiedField] = useState(null);
  const [confirmRevokeSingle, setConfirmRevokeSingle] = useState(false);
  const [confirmRevokeAll, setConfirmRevokeAll] = useState(false);

  useEffect(() => {
    const querySearch = searchParams.get('search');
    if (querySearch !== null) {
      setSearch(querySearch);
    }
  }, [searchParams]);
  
  const { showToast } = useToastStore();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['active-sessions', { page, limit, search, role: roleFilter }],
    queryFn: () => getSessions({ page, limit, search, role: roleFilter }),
    keepPreviousData: true
  });

  const revokeSessionMutation = useMutation({
    mutationFn: (sessionId) => revokeSession(sessionId),
    onSuccess: () => {
      showToast('Session revoked successfully.', 'success');
      queryClient.invalidateQueries(['active-sessions']);
      setSelectedSession(null);
    },
    onError: (err) => {
      showToast(err.response?.data?.message || 'Failed to revoke session.', 'error');
    }
  });

  const revokeUserSessionsMutation = useMutation({
    mutationFn: (userId) => revokeAllUserSessions(userId),
    onSuccess: () => {
      showToast('All user sessions revoked successfully.', 'success');
      queryClient.invalidateQueries(['active-sessions']);
      setSelectedSession(null);
    },
    onError: (err) => {
      showToast(err.response?.data?.message || 'Failed to revoke user sessions.', 'error');
    }
  });

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await downloadCSV('/api/admin/sessions', 'active_sessions', { search });
      showToast('Active sessions exported successfully.', 'success');
    } catch (err) {
      showToast('Failed to export CSV.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyText = (text, fieldName) => {
    if (!text) return;
    navigator.clipboard.writeText(String(text));
    setCopiedField(fieldName);
    showToast(`${fieldName} copied to clipboard.`, 'success');
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Quick Filter Chips definition based on supported backend role values
  const quickFilters = [
    { label: 'All Sessions', role: '' },
    { label: 'Super Admin', role: 'Super Admin' },
    { label: 'Admin', role: 'Admin' },
    { label: 'Support Lead', role: 'Support Lead' },
    { label: 'Support Agent', role: 'Support Agent' },
    { label: 'Compliance', role: 'Compliance' },
    { label: 'User', role: 'User' },
  ];

  const columns = [
    {
      header: 'Last Activity',
      accessor: 'updated_at',
      render: (row) => {
        const rawDate = row.updated_at || row.created_at;
        const exactTime = rawDate ? new Date(rawDate).toLocaleString() : 'Unknown';
        return (
          <div className="flex flex-col" title={`Exact Time: ${exactTime}`}>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              {formatRelativeTime(rawDate)}
            </span>
            <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 font-semibold">
              {rawDate ? new Date(rawDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—'}
            </span>
          </div>
        );
      }
    },
    {
      header: 'User Identity',
      accessor: 'email',
      render: (row) => {
        const email = row.email || 'Anonymous User';
        const initials = getUserInitials(email);
        return (
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-950/80 border border-blue-200/80 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-[10px] font-extrabold flex items-center justify-center shrink-0 shadow-2xs">
              {initials}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{email}</span>
              {row.user_id && (
                <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 font-semibold truncate max-w-[140px]" title={row.user_id}>
                  {row.user_id}
                </span>
              )}
            </div>
          </div>
        );
      }
    },
    {
      header: 'Role',
      accessor: 'role',
      render: (row) => {
        const role = row.role || 'User';
        let style = 'text-blue-700 bg-blue-500/10 border-blue-500/20 dark:text-blue-400';
        if (role.includes('Super') || role.includes('Admin')) {
          style = 'text-purple-700 bg-purple-500/10 border-purple-500/20 dark:text-purple-400';
        } else if (role.includes('Support')) {
          style = 'text-indigo-700 bg-indigo-500/10 border-indigo-500/20 dark:text-indigo-400';
        } else if (role.includes('Compliance')) {
          style = 'text-amber-700 bg-amber-500/10 border-amber-500/20 dark:text-amber-400';
        }
        return (
          <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase border tracking-wider ${style}`}>
            {role}
          </span>
        );
      }
    },
    {
      header: 'State',
      accessor: 'status',
      render: () => (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold border uppercase tracking-wider text-emerald-700 bg-emerald-500/10 border-emerald-500/20 dark:text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-emerald-500 animate-pulse" />
          ACTIVE
        </span>
      )
    },
    {
      header: 'Device & Platform',
      accessor: 'user_agent',
      render: (row) => {
        const clientLabel = parseUserAgent(row.user_agent);
        return (
          <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 px-2.5 py-0.5 rounded-md shadow-2xs">
            {clientLabel}
          </span>
        );
      }
    },
    {
      header: 'IP Address',
      accessor: 'ip_address',
      render: (row) => <span className="text-xs font-mono text-slate-700 dark:text-slate-300 font-bold">{row.ip_address || '127.0.0.1'}</span>
    },
    {
      header: 'Session Started',
      accessor: 'created_at',
      render: (row) => (
        <span className="text-[11px] font-mono font-semibold text-slate-600 dark:text-slate-400" title={row.created_at ? new Date(row.created_at).toLocaleString() : ''}>
          {formatRelativeTime(row.created_at)}
        </span>
      )
    }
  ];

  return (
    <div className="flex flex-col space-y-4 w-full font-sans pb-8">
      
      {/* ── FILTER BAR ────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        <AdminFilterBar 
          searchPlaceholder="Search active sessions by user email or IP address..."
          searchValue={search}
          onSearchChange={(val) => { setSearch(val); setPage(1); }}
          onExport={handleExport}
          isExporting={isExporting}
        />

        {/* ── QUICK FILTER CHIPS ──────────────────────────────────────────── */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mr-1.5 shrink-0">
            Quick Filter:
          </span>
          {quickFilters.map((chip) => {
            const isActive = roleFilter === chip.role;
            return (
              <button
                key={chip.label}
                type="button"
                onClick={() => {
                  setRoleFilter(chip.role);
                  setPage(1);
                }}
                className={`px-3 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer whitespace-nowrap ${
                  isActive 
                    ? 'bg-blue-600 border-blue-600 text-white shadow-xs' 
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400'
                }`}
              >
                {chip.label}
              </button>
            );
          })}
        </div>
      </div>
      
      {/* ── DATA TABLE ────────────────────────────────────────────────────── */}
      <AdminDataTable 
        columns={columns}
        data={data?.sessions || []}
        total={data?.total || 0}
        page={page}
        limit={limit}
        onPageChange={setPage}
        onLimitChange={(l) => { setLimit(l); setPage(1); }}
        isLoading={isLoading}
        error={error}
        emptyMessage="No active sessions match your filter criteria."
        onRowClick={(row) => setSelectedSession(row)}
      />

      {/* ── DETAIL DRAWER: SESSION INSPECTION & CONTROLS ───────────────────── */}
      <AdminDetailDrawer 
        isOpen={!!selectedSession} 
        onClose={() => setSelectedSession(null)}
        title="Active Session Inspection & Controls"
      >
        {selectedSession && (
          <div className="space-y-5 text-xs">
            
            {/* Summary Box */}
            <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/80 space-y-2.5 shadow-2xs overflow-hidden">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest truncate">ACTIVE SESSION</span>
                </div>
                <span className="px-2.5 py-0.5 text-[9px] font-black rounded-full border uppercase tracking-wider shrink-0 bg-blue-500/10 border-blue-500/20 text-blue-700 dark:text-blue-400">
                  {selectedSession.role || 'User'}
                </span>
              </div>

              <h3 className="font-mono font-bold text-xs text-slate-900 dark:text-white break-all">{selectedSession.email}</h3>
              
              {/* Quick Filter Actions */}
              <div className="pt-2 border-t border-slate-200/80 dark:border-slate-700/80 flex items-center gap-2 flex-wrap">
                {selectedSession.email && (
                  <button
                    type="button"
                    onClick={() => { setSearch(selectedSession.email); setSelectedSession(null); setPage(1); }}
                    className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-blue-500 rounded-lg text-[10px] font-bold text-blue-600 dark:text-blue-400 transition-all cursor-pointer shadow-2xs flex items-center gap-1"
                    title={`Filter sessions for ${selectedSession.email}`}
                  >
                    <span>👤</span> Filter by This User
                  </button>
                )}
                {selectedSession.ip_address && (
                  <button
                    type="button"
                    onClick={() => { setSearch(selectedSession.ip_address); setSelectedSession(null); setPage(1); }}
                    className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-purple-500 rounded-lg text-[10px] font-bold text-purple-600 dark:text-purple-400 transition-all cursor-pointer shadow-2xs flex items-center gap-1"
                    title={`Filter sessions for IP ${selectedSession.ip_address}`}
                  >
                    <span>🌐</span> Filter by IP ({selectedSession.ip_address})
                  </button>
                )}
              </div>
            </div>

            {/* Quick Copy Buttons Row */}
            <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800 space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Copy Identifiers</span>
              <div className="flex items-center gap-2 flex-wrap">
                {selectedSession.email && (
                  <button
                    type="button"
                    onClick={() => handleCopyText(selectedSession.email, 'Email')}
                    className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-blue-500 rounded-lg text-[10px] font-bold text-slate-700 dark:text-slate-300 transition-all cursor-pointer"
                  >
                    {copiedField === 'Email' ? '✓ Email Copied' : 'Copy Email'}
                  </button>
                )}
                {selectedSession.user_id && (
                  <button
                    type="button"
                    onClick={() => handleCopyText(selectedSession.user_id, 'User ID')}
                    className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-blue-500 rounded-lg text-[10px] font-bold text-slate-700 dark:text-slate-300 transition-all cursor-pointer"
                  >
                    {copiedField === 'User ID' ? '✓ User ID Copied' : 'Copy User ID'}
                  </button>
                )}
                {(selectedSession.id || selectedSession.sid) && (
                  <button
                    type="button"
                    onClick={() => handleCopyText(selectedSession.id || selectedSession.sid, 'Session ID')}
                    className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-blue-500 rounded-lg text-[10px] font-bold text-slate-700 dark:text-slate-300 transition-all cursor-pointer"
                  >
                    {copiedField === 'Session ID' ? '✓ Session ID Copied' : 'Copy Session ID'}
                  </button>
                )}
                {selectedSession.ip_address && (
                  <button
                    type="button"
                    onClick={() => handleCopyText(selectedSession.ip_address, 'IP Address')}
                    className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-blue-500 rounded-lg text-[10px] font-bold text-slate-700 dark:text-slate-300 transition-all cursor-pointer"
                  >
                    {copiedField === 'IP Address' ? '✓ IP Copied' : 'Copy IP Address'}
                  </button>
                )}
                {selectedSession.user_agent && (
                  <button
                    type="button"
                    onClick={() => handleCopyText(selectedSession.user_agent, 'User Agent')}
                    className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-blue-500 rounded-lg text-[10px] font-bold text-slate-700 dark:text-slate-300 transition-all cursor-pointer"
                  >
                    {copiedField === 'User Agent' ? '✓ User Agent Copied' : 'Copy Device String'}
                  </button>
                )}
              </div>
            </div>

            {/* Grid of Key Fields */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-800">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase">Session Established</h4>
                <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                  {new Date(selectedSession.created_at).toLocaleString()}
                </p>
                <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
                  {formatRelativeTime(selectedSession.created_at)}
                </span>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-800">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase">Last Activity Seen</h4>
                <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                  {new Date(selectedSession.updated_at || selectedSession.created_at).toLocaleString()}
                </p>
                <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
                  {formatRelativeTime(selectedSession.updated_at || selectedSession.created_at)}
                </span>
              </div>
            </div>

            {/* Network & Device Info */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-800">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase">Network IP Address</h4>
                <p className="font-mono font-bold text-slate-800 dark:text-slate-200 mt-0.5 text-xs">{selectedSession.ip_address || '127.0.0.1'}</p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-800">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase">Client Platform</h4>
                <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 text-xs truncate" title={parseUserAgent(selectedSession.user_agent)}>
                  {parseUserAgent(selectedSession.user_agent)}
                </p>
              </div>
            </div>

            <div>
              <h4 className="text-[10px] font-bold text-slate-400 uppercase mb-1">User Agent String</h4>
              <p className="font-mono text-[10px] leading-relaxed bg-slate-50 dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 break-all">
                {selectedSession.user_agent || 'Web Client'}
              </p>
            </div>

            {/* Revocation & Emergency Controls */}
            <div className="border-t border-slate-200 dark:border-slate-800 pt-4 space-y-2.5">
              <h4 className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">Revocation & Emergency Controls</h4>
              
              {confirmRevokeSingle ? (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl space-y-2">
                  <p className="text-[11px] font-bold text-rose-800 dark:text-rose-300">Are you sure you want to revoke this specific session? The user will be immediately logged out of this device.</p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        revokeSessionMutation.mutate(selectedSession.id);
                        setConfirmRevokeSingle(false);
                      }}
                      disabled={revokeSessionMutation.isLoading}
                      className="flex-1 py-1.5 px-3 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-all shadow-2xs cursor-pointer text-center"
                    >
                      {revokeSessionMutation.isLoading ? 'Revoking...' : 'Confirm Revoke Session'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmRevokeSingle(false)}
                      className="py-1.5 px-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button 
                  type="button"
                  onClick={() => { setConfirmRevokeSingle(true); setConfirmRevokeAll(false); }}
                  className="w-full py-2 px-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 font-bold text-xs border border-rose-200 dark:border-rose-800 hover:bg-rose-100/70 transition-all shadow-2xs cursor-pointer flex justify-center items-center"
                >
                  Revoke This Session Only
                </button>
              )}

              {confirmRevokeAll ? (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl space-y-2">
                  <p className="text-[11px] font-bold text-rose-800 dark:text-rose-300">Are you sure you want to revoke ALL active sessions for {selectedSession.email}? This will log them out of all devices.</p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        revokeUserSessionsMutation.mutate(selectedSession.user_id);
                        setConfirmRevokeAll(false);
                      }}
                      disabled={revokeUserSessionsMutation.isLoading}
                      className="flex-1 py-1.5 px-3 rounded-lg bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs transition-all shadow-2xs cursor-pointer text-center"
                    >
                      {revokeUserSessionsMutation.isLoading ? 'Revoking All...' : 'Confirm Revoke ALL Sessions'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmRevokeAll(false)}
                      className="py-1.5 px-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button 
                  type="button"
                  onClick={() => { setConfirmRevokeAll(true); setConfirmRevokeSingle(false); }}
                  className="w-full py-2 px-3 rounded-xl bg-rose-600 dark:bg-rose-500 text-white font-bold text-xs hover:bg-rose-700 transition-all shadow-md cursor-pointer flex justify-center items-center"
                >
                  Revoke ALL Sessions For {selectedSession.email}
                </button>
              )}
            </div>
          </div>
        )}
      </AdminDetailDrawer>
    </div>
  );
}
