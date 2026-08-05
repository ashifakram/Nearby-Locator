import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useToastStore } from '../../../store/useToastStore';
import { getAuditLogs, downloadCSV } from '../../../services/admin';
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

function formatEnumLabel(actionStr) {
  if (!actionStr) return 'Audit Event';
  return actionStr
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function AuditLogsPage() {
  const [searchParams] = useSearchParams();
  const initialSearch = searchParams.get('search') || '';

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState(initialSearch);
  const [severity, setSeverity] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [selectedLog, setSelectedLog] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [copiedField, setCopiedField] = useState(null);

  useEffect(() => {
    const querySearch = searchParams.get('search');
    if (querySearch !== null) {
      setSearch(querySearch);
    }
  }, [searchParams]);

  const { showToast } = useToastStore();

  const { data, isLoading, error } = useQuery({
    queryKey: ['audit-logs', { page, limit, search, severity, action: actionFilter }],
    queryFn: () => getAuditLogs({ page, limit, search, severity, action: actionFilter }),
    keepPreviousData: true
  });

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await downloadCSV('/api/admin/audit-logs', 'audit_logs', { search, severity, action: actionFilter });
      showToast('Audit logs exported successfully.', 'success');
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

  // Quick Filter Chips definition
  const quickFilters = [
    { label: 'All Logs', keyword: '' },
    { label: 'Login', keyword: 'LOGIN' },
    { label: 'Logout', keyword: 'LOGOUT' },
    { label: 'Sessions', keyword: 'SESSION' },
    { label: 'OAuth', keyword: 'GOOGLE' },
    { label: 'Admin', keyword: 'ADMIN' },
    { label: 'Revoked', keyword: 'REVOKED' },
  ];

  const columns = [
    {
      header: 'Occurred At',
      accessor: 'occurred_at',
      render: (row) => {
        const rawDate = row.occurred_at || row.created_at || row.timestamp;
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
      header: 'Action / Event',
      accessor: 'action',
      render: (row) => {
        const act = row.action || 'AUDIT_LOG';
        let badgeStyle = 'text-slate-700 bg-slate-100 border-slate-200 dark:text-slate-300 dark:bg-slate-800 dark:border-slate-700';

        if (act.includes('LOGIN') || act.includes('SUCCESS')) {
          badgeStyle = 'text-emerald-700 bg-emerald-500/10 border-emerald-500/20 dark:text-emerald-400';
        } else if (act.includes('LOGOUT') || act.includes('REVOKED')) {
          badgeStyle = 'text-amber-700 bg-amber-500/10 border-amber-500/20 dark:text-amber-400';
        } else if (act.includes('BREAK_GLASS') || act.includes('SUSPEND') || act.includes('DELETE') || act.includes('LOCK')) {
          badgeStyle = 'text-rose-700 bg-rose-500/10 border-rose-500/20 dark:text-rose-400';
        } else if (act.includes('EXPORT') || act.includes('ROLE') || act.includes('PERMISSION')) {
          badgeStyle = 'text-purple-700 bg-purple-500/10 border-purple-500/20 dark:text-purple-400';
        } else if (act.includes('GOOGLE') || act.includes('OAUTH')) {
          badgeStyle = 'text-blue-700 bg-blue-500/10 border-blue-500/20 dark:text-blue-400';
        }

        return (
          <span className={`font-mono text-[11px] font-bold px-2.5 py-0.5 rounded-lg border uppercase tracking-wider ${badgeStyle}`} title={act}>
            {formatEnumLabel(act)}
          </span>
        );
      }
    },
    {
      header: 'Actor Profile',
      accessor: 'actor_id',
      render: (row) => {
        const nameOrEmail = row.actor_email || row.actor_name || 'System Process';
        const initials = getUserInitials(nameOrEmail);
        return (
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-950/80 border border-blue-200/80 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-[10px] font-extrabold flex items-center justify-center shrink-0 shadow-2xs">
              {initials}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{nameOrEmail}</span>
              {row.actor_id && (
                <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 font-semibold truncate max-w-[140px]" title={row.actor_id}>
                  {row.actor_id}
                </span>
              )}
            </div>
          </div>
        );
      }
    },
    {
      header: 'Target User / Resource',
      accessor: 'target_user_email',
      render: (row) => {
        if (row.target_user_email) {
          return <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{row.target_user_email}</span>;
        }
        if (row.target_user_id) {
          return <span className="text-[11px] font-mono font-semibold text-slate-600 dark:text-slate-400">{row.target_user_id}</span>;
        }
        const meta = row.metadata || {};
        if (meta.targetEmail || meta.email) {
          return <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{meta.targetEmail || meta.email}</span>;
        }
        if (meta.targetUserId) {
          return <span className="text-[11px] font-mono font-semibold text-slate-600 dark:text-slate-400">{meta.targetUserId}</span>;
        }
        if (meta.type || meta.spotId || meta.reportId) {
          const resName = meta.type || (meta.spotId ? `Spot: ${meta.spotId.slice(0, 8)}...` : `Report: ${meta.reportId.slice(0, 8)}...`);
          return <span className="text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-200 dark:text-purple-300 dark:bg-purple-950/40 px-2 py-0.5 rounded-md uppercase tracking-wide">{resName}</span>;
        }
        if (row.action && (row.action.includes('LOGIN') || row.action.includes('LOGOUT') || row.action.includes('PASSWORD') || row.action.includes('PROFILE'))) {
          return <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md uppercase tracking-wide">Self (Account)</span>;
        }
        return <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/60 px-2 py-0.5 rounded-md uppercase tracking-wide">System</span>;
      }
    },
    {
      header: 'Severity',
      accessor: 'severity',
      render: (row) => {
        const sev = (row.severity || 'INFO').toUpperCase();
        let color = 'text-emerald-700 bg-emerald-500/10 border-emerald-500/20 dark:text-emerald-400';
        if (sev === 'CRITICAL') {
          color = 'text-rose-700 bg-rose-500/10 border-rose-500/20 dark:text-rose-400';
        } else if (sev === 'WARNING' || sev === 'ERROR') {
          color = 'text-amber-700 bg-amber-500/10 border-amber-500/20 dark:text-amber-400';
        }
        return (
          <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase border tracking-wider flex items-center gap-1 w-fit ${color}`}>
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${sev === 'CRITICAL' ? 'bg-rose-500 animate-pulse' : 'bg-current'}`} />
            {sev}
          </span>
        );
      }
    },
    {
      header: 'IP Address',
      accessor: 'ip_address',
      render: (row) => (
        <span className="text-xs font-mono font-semibold text-slate-700 dark:text-slate-300">
          {row.ip_address || 'Internal'}
        </span>
      )
    }
  ];

  return (
    <div className="flex flex-col space-y-4 w-full font-sans pb-8">

      {/* ── FILTER BAR ────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        <AdminFilterBar
          searchPlaceholder="Search audit logs by actor email, action, target, or IP..."
          searchValue={search}
          onSearchChange={(val) => { setSearch(val); setPage(1); }}
          onExport={handleExport}
          isExporting={isExporting}
          filters={[
            {
              label: 'All Severities',
              value: severity,
              onChange: (val) => { setSeverity(val); setPage(1); },
              options: [
                { label: 'Info', value: 'INFO' },
                { label: 'Warning', value: 'WARNING' },
                { label: 'Critical', value: 'CRITICAL' }
              ]
            }
          ]}
        />

        {/* ── QUICK FILTER CHIPS ──────────────────────────────────────────── */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mr-1.5 shrink-0">
            Quick Filter:
          </span>
          {quickFilters.map((chip) => {
            const isActive = search === chip.keyword;
            return (
              <button
                key={chip.label}
                type="button"
                onClick={() => {
                  setSearch(chip.keyword);
                  setPage(1);
                }}
                className={`px-3 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer whitespace-nowrap ${isActive
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
        data={data?.logs || []}
        total={data?.total || 0}
        page={page}
        limit={limit}
        onPageChange={setPage}
        onLimitChange={(l) => { setLimit(l); setPage(1); }}
        isLoading={isLoading}
        error={error}
        emptyMessage="No audit log entries match your filter criteria."
        onRowClick={(row) => setSelectedLog(row)}
      />

      {/* ── DETAIL DRAWER: AUDIT LOG INSPECTION ────────────────────────────── */}
      <AdminDetailDrawer
        isOpen={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title="Audit Log Entry Inspection"
      >
        {selectedLog && (
          <div className="space-y-5 text-xs">

            {/* Action Header & Event Details */}
            <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/80 space-y-2.5 shadow-2xs overflow-hidden">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest truncate">Audit Event</span>
                </div>
                <span className={`px-2.5 py-0.5 text-[9px] font-black rounded-full border uppercase tracking-wider shrink-0 ${selectedLog.severity === 'CRITICAL' || selectedLog.severity === 'ERROR' ? 'text-rose-600 bg-rose-50 border-rose-200 dark:text-rose-400 dark:bg-rose-950/40' :
                    selectedLog.severity === 'WARNING' ? 'text-amber-600 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-950/40' :
                      'text-emerald-600 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-950/40'
                  }`}>
                  {selectedLog.severity || 'INFO'}
                </span>
              </div>

              <h3 className="font-mono font-bold text-xs text-slate-900 dark:text-white break-all">{formatEnumLabel(selectedLog.action)}</h3>

              {/* Quick Filter Buttons */}
              <div className="pt-2 border-t border-slate-200/80 dark:border-slate-700/80 flex items-center gap-2 flex-wrap">
                {selectedLog.actor_email && (
                  <button
                    type="button"
                    onClick={() => { setSearch(selectedLog.actor_email); setSelectedLog(null); setPage(1); }}
                    className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-blue-500 rounded-lg text-[10px] font-bold text-blue-600 dark:text-blue-400 transition-all cursor-pointer shadow-2xs flex items-center gap-1"
                    title={`Filter audit logs for ${selectedLog.actor_email}`}
                  >
                    <span>👤</span> Filter by This Actor
                  </button>
                )}
                {selectedLog.ip_address && (
                  <button
                    type="button"
                    onClick={() => { setSearch(selectedLog.ip_address); setSelectedLog(null); setPage(1); }}
                    className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-purple-500 rounded-lg text-[10px] font-bold text-purple-600 dark:text-purple-400 transition-all cursor-pointer shadow-2xs flex items-center gap-1"
                    title={`Filter audit logs for IP ${selectedLog.ip_address}`}
                  >
                    <span>🌐</span> Filter by IP ({selectedLog.ip_address})
                  </button>
                )}
              </div>
            </div>

            {/* Quick Copy Buttons Row */}
            <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800 space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Copy Identifiers</span>
              <div className="flex items-center gap-2 flex-wrap">
                {selectedLog.actor_id && (
                  <button
                    type="button"
                    onClick={() => handleCopyText(selectedLog.actor_id, 'User ID')}
                    className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-blue-500 rounded-lg text-[10px] font-bold text-slate-700 dark:text-slate-300 transition-all cursor-pointer"
                  >
                    {copiedField === 'User ID' ? '✓ User ID Copied' : 'Copy User ID'}
                  </button>
                )}
                {(selectedLog.correlation_id || selectedLog.metadata?.correlationId) && (
                  <button
                    type="button"
                    onClick={() => handleCopyText(selectedLog.correlation_id || selectedLog.metadata?.correlationId, 'Correlation ID')}
                    className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-blue-500 rounded-lg text-[10px] font-bold text-slate-700 dark:text-slate-300 transition-all cursor-pointer"
                  >
                    {copiedField === 'Correlation ID' ? '✓ Correlation ID Copied' : 'Copy Correlation ID'}
                  </button>
                )}
                {(selectedLog.request_id || selectedLog.metadata?.requestId) && (
                  <button
                    type="button"
                    onClick={() => handleCopyText(selectedLog.request_id || selectedLog.metadata?.requestId, 'Request ID')}
                    className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-blue-500 rounded-lg text-[10px] font-bold text-slate-700 dark:text-slate-300 transition-all cursor-pointer"
                  >
                    {copiedField === 'Request ID' ? '✓ Request ID Copied' : 'Copy Request ID'}
                  </button>
                )}
                {selectedLog.ip_address && (
                  <button
                    type="button"
                    onClick={() => handleCopyText(selectedLog.ip_address, 'IP Address')}
                    className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-blue-500 rounded-lg text-[10px] font-bold text-slate-700 dark:text-slate-300 transition-all cursor-pointer"
                  >
                    {copiedField === 'IP Address' ? '✓ IP Copied' : 'Copy IP Address'}
                  </button>
                )}
              </div>
            </div>

            {/* Grid of Key Fields */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-800">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase">Occurred At</h4>
                <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                  {new Date(selectedLog.occurred_at || selectedLog.created_at).toLocaleString()}
                </p>
                <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
                  {formatRelativeTime(selectedLog.occurred_at || selectedLog.created_at)}
                </span>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-800">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase">IP Address</h4>
                <p className="font-mono font-bold text-slate-800 dark:text-slate-200 mt-0.5">{selectedLog.ip_address || 'Internal'}</p>
              </div>
            </div>

            <div>
              <h4 className="text-[10px] font-bold text-slate-400 uppercase mb-1">Actor Email / ID</h4>
              <p className="font-mono text-xs font-semibold bg-slate-50 dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200">
                {selectedLog.actor_email || selectedLog.actor_id || 'System Process'}
              </p>
            </div>

            {(selectedLog.target_user_email || selectedLog.target_user_id) && (
              <div>
                <h4 className="text-[10px] font-bold text-slate-400 uppercase mb-1">Target User / Resource</h4>
                <p className="font-mono text-xs font-semibold bg-slate-50 dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200">
                  {selectedLog.target_user_email || selectedLog.target_user_id}
                </p>
              </div>
            )}

            {/* Metadata JSON Viewer */}
            {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase">Metadata Payload</h4>
                  <button
                    type="button"
                    onClick={() => handleCopyText(JSON.stringify(selectedLog.metadata, null, 2), 'Metadata JSON')}
                    className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                  >
                    {copiedField === 'Metadata JSON' ? '✓ Copied' : 'Copy JSON'}
                  </button>
                </div>
                <pre className="bg-slate-900 text-slate-100 p-3.5 rounded-xl text-[10px] font-mono overflow-x-auto leading-relaxed border border-slate-800 shadow-inner max-h-60">
                  {JSON.stringify(selectedLog.metadata, null, 2)}
                </pre>
              </div>
            )}

          </div>
        )}
      </AdminDetailDrawer>

    </div>
  );
}
