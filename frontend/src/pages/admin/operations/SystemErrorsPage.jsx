import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useToastStore } from '../../../store/useToastStore';
import { getSystemErrors, downloadCSV } from '../../../services/admin';
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

export default function SystemErrorsPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [severity, setSeverity] = useState('');
  const [statusCode, setStatusCode] = useState('');
  const [selectedError, setSelectedError] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [copiedField, setCopiedField] = useState(null);
  
  const { showToast } = useToastStore();

  const { data, isLoading, error } = useQuery({
    queryKey: ['system-errors', { page, limit, search, severity, statusCode }],
    queryFn: () => getSystemErrors({ page, limit, search, severity, statusCode }),
    keepPreviousData: true
  });

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await downloadCSV('/api/admin/system-errors', 'system_errors', { search, severity, statusCode });
      showToast('System errors exported successfully.', 'success');
    } catch (err) {
      showToast('Failed to export CSV.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyText = (text, fieldName) => {
    if (!text) return;
    navigator.clipboard.writeText(typeof text === 'object' ? JSON.stringify(text, null, 2) : String(text));
    setCopiedField(fieldName);
    showToast(`${fieldName} copied to clipboard.`, 'success');
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Quick Filter Chips definition matching backend severity & status code parameters
  const quickFilters = [
    { label: 'All Errors', sev: '', code: '' },
    { label: 'Critical', sev: 'CRITICAL', code: '' },
    { label: 'Error', sev: 'ERROR', code: '' },
    { label: 'Warning', sev: 'WARNING', code: '' },
    { label: '500 Server Error', sev: '', code: '500' },
    { label: '400 Bad Request', sev: '', code: '400' },
    { label: '401 Unauthorized', sev: '', code: '401' },
    { label: '403 Forbidden', sev: '', code: '403' },
    { label: '404 Not Found', sev: '', code: '404' },
  ];

  const columns = [
    {
      header: 'Occurred At',
      accessor: 'occurred_at',
      render: (row) => {
        const rawDate = row.occurred_at || row.created_at;
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
      header: 'Severity',
      accessor: 'severity',
      render: (row) => {
        const sev = (row.severity || 'ERROR').toUpperCase();
        const isCrit = sev === 'CRITICAL' || sev === 'ERROR';
        const color = isCrit 
          ? 'text-rose-700 bg-rose-500/10 border-rose-500/20 dark:text-rose-400' 
          : 'text-amber-700 bg-amber-500/10 border-amber-500/20 dark:text-amber-400';
        return (
          <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase border tracking-wider flex items-center gap-1 w-fit ${color}`}>
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isCrit ? 'bg-rose-500 animate-pulse' : 'bg-amber-500'}`} />
            {sev}
          </span>
        );
      }
    },
    {
      header: 'Status Code',
      accessor: 'status_code',
      render: (row) => {
        const code = row.status_code || 500;
        const is5xx = code >= 500;
        return (
          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border font-mono ${
            is5xx 
              ? 'text-rose-700 bg-rose-50 border-rose-200 dark:text-rose-400 dark:bg-rose-950/40' 
              : 'text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-950/40'
          }`}>
            {code}
          </span>
        );
      }
    },
    {
      header: 'Error Exception Message',
      accessor: 'message',
      render: (row) => {
        const msg = row.message || '';
        return (
          <div className="max-w-[220px] xl:max-w-[260px] truncate text-xs font-bold text-slate-800 dark:text-slate-200 font-mono" title={msg}>
            {msg}
          </div>
        );
      }
    },
    {
      header: 'Endpoint URL',
      accessor: 'url',
      render: (row) => (
        <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300 max-w-xs truncate block" title={row.url}>
          {row.url || 'Internal Service'}
        </span>
      )
    },
    {
      header: 'Correlation / Request ID',
      accessor: 'correlation_id',
      render: (row) => {
        const idVal = row.correlation_id || row.request_id || (row.id ? `ERR-${row.id.slice(0, 8)}` : 'N/A');
        const isCorr = !!row.correlation_id;
        return (
          <div className="flex flex-col">
            <span className="text-[11px] font-mono font-bold text-slate-800 dark:text-slate-200">{idVal}</span>
            <span className="text-[9px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wide">{isCorr ? 'Correlation ID' : (row.request_id ? 'Request ID' : 'Error Ref')}</span>
          </div>
        );
      }
    }
  ];

  return (
    <div className="flex flex-col space-y-4 w-full font-sans pb-8">
      
      {/* ── FILTER BAR ────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        <AdminFilterBar 
          searchPlaceholder="Search system errors by Correlation ID, Request ID, message, or URL..."
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
                { label: 'Warning', value: 'WARNING' },
                { label: 'Error', value: 'ERROR' },
                { label: 'Critical', value: 'CRITICAL' }
              ]
            },
            {
              label: 'All Status Codes',
              value: statusCode,
              onChange: (val) => { setStatusCode(val); setPage(1); },
              options: [
                { label: '500 Server Error', value: '500' },
                { label: '400 Bad Request', value: '400' },
                { label: '401 Unauthorized', value: '401' },
                { label: '403 Forbidden', value: '403' },
                { label: '404 Not Found', value: '404' }
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
            const isActive = (chip.sev && severity === chip.sev) || (chip.code && statusCode === chip.code) || (!chip.sev && !chip.code && !severity && !statusCode);
            return (
              <button
                key={chip.label}
                type="button"
                onClick={() => {
                  setSeverity(chip.sev);
                  setStatusCode(chip.code);
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
        data={data?.errors || []}
        total={data?.total || 0}
        page={page}
        limit={limit}
        onPageChange={setPage}
        onLimitChange={(l) => { setLimit(l); setPage(1); }}
        isLoading={isLoading}
        error={error}
        emptyMessage="No system errors match your filter criteria."
        onRowClick={(row) => setSelectedError(row)}
      />

      {/* ── DETAIL DRAWER: ERROR DIAGNOSTICS ────────────────────────────── */}
      <AdminDetailDrawer 
        isOpen={!!selectedError} 
        onClose={() => setSelectedError(null)}
        title="System Error Diagnostics & Stack Trace"
      >
        {selectedError && (
          <div className="space-y-5 text-xs">
            
            {/* Summary Box */}
            <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/80 space-y-2.5 shadow-2xs overflow-hidden">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse shrink-0" />
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest truncate">SYSTEM EXCEPTION</span>
                </div>
                <span className="px-2.5 py-0.5 text-[9px] font-black rounded-full border uppercase tracking-wider shrink-0 text-rose-700 bg-rose-500/10 border-rose-500/20 dark:text-rose-400">
                  {selectedError.status_code || 500} — {selectedError.severity || 'ERROR'}
                </span>
              </div>

              <h3 className="font-mono font-bold text-xs text-rose-950 dark:text-rose-200 break-all leading-snug">{selectedError.message}</h3>

              {/* Quick Filter Actions */}
              <div className="pt-2 border-t border-slate-200/80 dark:border-slate-700/80 flex items-center gap-2 flex-wrap">
                {selectedError.correlation_id && (
                  <button
                    type="button"
                    onClick={() => { setSearch(selectedError.correlation_id); setSelectedError(null); setPage(1); }}
                    className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-purple-500 rounded-lg text-[10px] font-bold text-purple-600 dark:text-purple-400 transition-all cursor-pointer shadow-2xs flex items-center gap-1"
                    title={`Filter errors by Correlation ID ${selectedError.correlation_id}`}
                  >
                    <span>🔍</span> Filter by Correlation ID
                  </button>
                )}
                {selectedError.url && (
                  <button
                    type="button"
                    onClick={() => { setSearch(selectedError.url); setSelectedError(null); setPage(1); }}
                    className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-blue-500 rounded-lg text-[10px] font-bold text-blue-600 dark:text-blue-400 transition-all cursor-pointer shadow-2xs flex items-center gap-1"
                    title={`Filter errors by URL ${selectedError.url}`}
                  >
                    <span>🔗</span> Filter by Endpoint URL
                  </button>
                )}
              </div>
            </div>

            {/* Quick Copy Buttons Row */}
            <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800 space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Copy Identifiers</span>
              <div className="flex items-center gap-2 flex-wrap">
                {selectedError.id && (
                  <button
                    type="button"
                    onClick={() => handleCopyText(selectedError.id, 'Error ID')}
                    className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-blue-500 rounded-lg text-[10px] font-bold text-slate-700 dark:text-slate-300 transition-all cursor-pointer"
                  >
                    {copiedField === 'Error ID' ? '✓ Error ID Copied' : 'Copy Error ID'}
                  </button>
                )}
                {selectedError.correlation_id && (
                  <button
                    type="button"
                    onClick={() => handleCopyText(selectedError.correlation_id, 'Correlation ID')}
                    className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-blue-500 rounded-lg text-[10px] font-bold text-slate-700 dark:text-slate-300 transition-all cursor-pointer"
                  >
                    {copiedField === 'Correlation ID' ? '✓ Correlation ID Copied' : 'Copy Correlation ID'}
                  </button>
                )}
                {selectedError.request_id && (
                  <button
                    type="button"
                    onClick={() => handleCopyText(selectedError.request_id, 'Request ID')}
                    className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-blue-500 rounded-lg text-[10px] font-bold text-slate-700 dark:text-slate-300 transition-all cursor-pointer"
                  >
                    {copiedField === 'Request ID' ? '✓ Request ID Copied' : 'Copy Request ID'}
                  </button>
                )}
                {selectedError.url && (
                  <button
                    type="button"
                    onClick={() => handleCopyText(selectedError.url, 'Endpoint URL')}
                    className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-blue-500 rounded-lg text-[10px] font-bold text-slate-700 dark:text-slate-300 transition-all cursor-pointer"
                  >
                    {copiedField === 'Endpoint URL' ? '✓ Endpoint Copied' : 'Copy Endpoint'}
                  </button>
                )}
                {selectedError.stack_trace && (
                  <button
                    type="button"
                    onClick={() => handleCopyText(selectedError.stack_trace, 'Stack Trace')}
                    className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-blue-500 rounded-lg text-[10px] font-bold text-slate-700 dark:text-slate-300 transition-all cursor-pointer"
                  >
                    {copiedField === 'Stack Trace' ? '✓ Stack Trace Copied' : 'Copy Stack Trace'}
                  </button>
                )}
              </div>
            </div>

            {/* Grid of Key Fields */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-800">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase">HTTP Status Code</h4>
                <p className="font-mono font-extrabold text-slate-800 dark:text-slate-200 mt-0.5 text-xs">{selectedError.status_code || 500}</p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-800">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase">Occurred At</h4>
                <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 text-xs">{new Date(selectedError.occurred_at || selectedError.created_at).toLocaleString()}</p>
                <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
                  {formatRelativeTime(selectedError.occurred_at || selectedError.created_at)}
                </span>
              </div>
            </div>

            <div>
              <h4 className="text-[10px] font-bold text-slate-400 uppercase mb-1">Target Endpoint URL</h4>
              <p className="text-slate-900 dark:text-slate-100 text-[10px] break-all font-mono font-semibold bg-slate-50 dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                {selectedError.url || 'Internal Service'}
              </p>
            </div>

            {/* Stack Trace Output Section */}
            {selectedError.stack_trace && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase">Stack Trace Output</h4>
                  <button
                    type="button"
                    onClick={() => handleCopyText(selectedError.stack_trace, 'Stack Trace')}
                    className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                  >
                    {copiedField === 'Stack Trace' ? '✓ Copied' : 'Copy Output'}
                  </button>
                </div>
                <pre className="bg-slate-900 text-rose-400 p-3.5 rounded-xl text-[10px] font-mono overflow-x-auto leading-relaxed border border-slate-800 shadow-inner max-h-60">
                  {selectedError.stack_trace}
                </pre>
              </div>
            )}
            
            {/* Variables Context Payload Section */}
            {selectedError.context && Object.keys(selectedError.context).length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase">Variables Context Payload</h4>
                  <button
                    type="button"
                    onClick={() => handleCopyText(selectedError.context, 'Context JSON')}
                    className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                  >
                    {copiedField === 'Context JSON' ? '✓ Copied' : 'Copy JSON'}
                  </button>
                </div>
                <pre className="bg-slate-900 text-slate-100 p-3.5 rounded-xl text-[10px] font-mono overflow-x-auto leading-relaxed border border-slate-800 shadow-inner max-h-60">
                  {JSON.stringify(selectedError.context, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </AdminDetailDrawer>
    </div>
  );
}
