import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useToastStore } from '../../../store/useToastStore';
import { getAuthEvents, downloadCSV } from '../../../services/admin';
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
  if (!actionStr) return 'Auth Event';
  return actionStr
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function parseUserAgent(uaString, fallbackProvider) {
  if (fallbackProvider && fallbackProvider !== 'Password Auth') {
    return fallbackProvider;
  }
  if (!uaString) return 'Web Client';
  let browser = 'Browser';
  let os = '';

  if (uaString.includes('Chrome') && !uaString.includes('Edg')) browser = 'Chrome';
  else if (uaString.includes('Edg')) browser = 'Edge';
  else if (uaString.includes('Firefox')) browser = 'Firefox';
  else if (uaString.includes('Safari') && !uaString.includes('Chrome')) browser = 'Safari';

  if (uaString.includes('Windows')) os = 'Windows';
  else if (uaString.includes('Macintosh') || uaString.includes('Mac OS')) os = 'macOS';
  else if (uaString.includes('Linux')) os = 'Linux';
  else if (uaString.includes('Android')) os = 'Android';
  else if (uaString.includes('iPhone') || uaString.includes('iPad')) os = 'iOS';

  return os ? `${os} ${browser}` : browser;
}

export default function AuthEventsPage() {
  const [searchParams] = useSearchParams();
  const initialSearch = searchParams.get('search') || '';

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState(initialSearch);
  const [eventCategory, setEventCategory] = useState('');
  const [eventType, setEventType] = useState('');
  const [selectedEvent, setSelectedEvent] = useState(null);
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
    queryKey: ['auth-events', { page, limit, search, eventCategory, eventType }],
    queryFn: () => getAuthEvents({ page, limit, search, eventCategory, eventType }),
    keepPreviousData: true
  });

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await downloadCSV('/api/admin/auth-events', 'auth_events', { search, eventCategory, eventType });
      showToast('Authentication events exported successfully.', 'success');
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
    { label: 'All', cat: '', type: '', keyword: '' },
    { label: 'Successful', cat: '', type: 'success', keyword: '' },
    { label: 'Failed', cat: '', type: 'failure', keyword: '' },
    { label: 'Email Verification', cat: 'email_verification', type: '', keyword: '' },
    { label: 'Password Reset', cat: 'password_reset', type: '', keyword: '' },
    { label: 'Google OAuth', cat: '', type: '', keyword: 'GOOGLE' },
    { label: 'Account Locked', cat: '', type: '', keyword: 'LOCKED' },
    { label: 'Registration', cat: '', type: '', keyword: 'REGISTER' },
  ];

  const columns = [
    {
      header: 'Occurred Time',
      accessor: 'created_at',
      render: (row) => {
        const rawDate = row.created_at || row.occurred_at;
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
      header: 'User',
      accessor: 'user_id',
      render: (row) => {
        const email = row.user_email || row.user_name || 'Anonymous User';
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
      header: 'Authentication Method',
      accessor: 'provider',
      render: (row) => {
        const prov = (row.metadata?.provider || row.metadata?.authMethod || '').toUpperCase();
        const cat = (row.event_category || '').toUpperCase();
        
        let label = 'Password';
        let style = 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';

        if (prov.includes('GOOGLE') || prov.includes('OAUTH')) {
          label = 'Google OAuth';
          style = 'bg-blue-500/10 text-blue-700 border-blue-500/20 dark:text-blue-400';
        } else if (cat.includes('EMAIL') || prov.includes('EMAIL')) {
          label = 'Email Verification';
          style = 'bg-indigo-500/10 text-indigo-700 border-indigo-500/20 dark:text-indigo-400';
        } else if (cat.includes('RESET') || prov.includes('RESET')) {
          label = 'Password Reset';
          style = 'bg-purple-500/10 text-purple-700 border-purple-500/20 dark:text-purple-400';
        } else if (prov.includes('REFRESH')) {
          label = 'Refresh Token';
          style = 'bg-cyan-500/10 text-cyan-700 border-cyan-500/20 dark:text-cyan-400';
        }

        return (
          <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md border tracking-wide ${style}`}>
            {label}
          </span>
        );
      }
    },
    {
      header: 'Device & OS',
      accessor: 'metadata',
      render: (row) => {
        const clientText = parseUserAgent(row.metadata?.userAgent, row.metadata?.provider);
        return (
          <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 px-2 py-0.5 rounded-md shadow-2xs">
            {clientText}
          </span>
        );
      }
    },
    {
      header: 'Location & IP',
      accessor: 'ip_address',
      render: (row) => {
        const ip = row.metadata?.ipAddress || row.ip_address || '127.0.0.1';
        const country = row.metadata?.country || row.metadata?.location || 'Unknown';
        return (
          <div className="flex flex-col">
            <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">{ip}</span>
            <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">{country}</span>
          </div>
        );
      }
    },
    {
      header: 'Status / Outcome',
      accessor: 'event_type',
      render: (row) => {
        const typeStr = (row.event_type || 'SUCCESS').toUpperCase();
        const isFailure = typeStr.includes('FAILED') || typeStr.includes('FAILURE') || typeStr.includes('BLOCKED') || typeStr.includes('SUSPICIOUS') || typeStr.includes('LOCKED');
        const isWarning = typeStr.includes('PENDING') || typeStr.includes('EXPIRED') || typeStr.includes('RATE');
        
        let badgeStyle = 'text-emerald-700 bg-emerald-500/10 border-emerald-500/20 dark:text-emerald-400';
        if (isFailure) {
          badgeStyle = 'text-rose-700 bg-rose-500/10 border-rose-500/20 dark:text-rose-400';
        } else if (isWarning) {
          badgeStyle = 'text-amber-700 bg-amber-500/10 border-amber-500/20 dark:text-amber-400';
        }

        return (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border uppercase tracking-wider ${badgeStyle}`}>
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isFailure ? 'bg-rose-500 animate-pulse' : 'bg-current'}`} />
            {typeStr}
          </span>
        );
      }
    }
  ];

  return (
    <div className="flex flex-col space-y-4 w-full font-sans pb-8">
      
      {/* ── FILTER BAR ────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        <AdminFilterBar 
          searchPlaceholder="Search by user email, event type, or IP address..."
          searchValue={search}
          onSearchChange={(val) => { setSearch(val); setPage(1); }}
          onExport={handleExport}
          isExporting={isExporting}
          filters={[
            {
              label: 'All Categories',
              value: eventCategory,
              onChange: (val) => { setEventCategory(val); setPage(1); },
              options: [
                { label: 'Login & Auth', value: 'login' },
                { label: 'Password Reset', value: 'password_reset' },
                { label: 'Email Verification', value: 'email_verification' }
              ]
            },
            {
              label: 'All Statuses',
              value: eventType,
              onChange: (val) => { setEventType(val); setPage(1); },
              options: [
                { label: 'Success', value: 'success' },
                { label: 'Failed / Failure', value: 'failure' },
                { label: 'User Registered', value: 'USER_REGISTERED' },
                { label: 'Verification Success', value: 'verification_success' },
                { label: 'Password Reset Completed', value: 'PASSWORD_RESET_COMPLETED' }
              ]
            }
          ]}
        />

        {/* Quick Filter Chips */}
        <div className="flex items-center gap-1.5 flex-wrap text-xs">
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mr-1">Quick Filters:</span>
          {quickFilters.map((q) => {
            const isActive = q.cat !== '' ? eventCategory === q.cat :
                             q.type !== '' ? eventType === q.type :
                             q.keyword !== '' ? search === q.keyword :
                             (!eventCategory && !eventType && !search);
            return (
              <button
                key={q.label}
                type="button"
                onClick={() => {
                  setEventCategory(q.cat);
                  setEventType(q.type);
                  setSearch(q.keyword);
                  setPage(1);
                }}
                className={`px-3 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer border ${
                  isActive
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                {q.label}
              </button>
            );
          })}
        </div>
      </div>
      
      {/* ── DATA TABLE ────────────────────────────────────────────────────── */}
      <AdminDataTable 
        columns={columns}
        data={data?.events || []}
        total={data?.total || 0}
        page={page}
        limit={limit}
        onPageChange={setPage}
        onLimitChange={(l) => { setLimit(l); setPage(1); }}
        isLoading={isLoading}
        error={error}
        emptyMessage="No authentication events match your criteria."
        onRowClick={(row) => setSelectedEvent(row)}
      />

      {/* ── DETAIL DRAWER: AUTHENTICATION INSPECTION ───────────────────────── */}
      <AdminDetailDrawer 
        isOpen={!!selectedEvent} 
        onClose={() => setSelectedEvent(null)}
        title="Authentication Event Inspection"
      >
        {selectedEvent && (
          <div className="space-y-5 text-xs">
            
            {/* Summary Box */}
            <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/80 space-y-2.5 shadow-2xs overflow-hidden">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse shrink-0" />
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest truncate">{selectedEvent.event_category || 'AUTHENTICATION'}</span>
                </div>
                <span className={`px-2.5 py-0.5 text-[9px] font-black rounded-full border uppercase tracking-wider shrink-0 ${
                  selectedEvent.event_type?.includes('FAILED') || selectedEvent.event_type?.includes('failure') 
                    ? 'text-rose-600 bg-rose-50 border-rose-200 dark:text-rose-400 dark:bg-rose-950/40' 
                    : 'text-emerald-600 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-950/40'
                }`}>
                  {selectedEvent.event_type}
                </span>
              </div>

              <h3 className="font-mono font-bold text-xs text-slate-900 dark:text-white break-all">{selectedEvent.user_email || 'Anonymous User'}</h3>
              
              {/* Quick Filter Actions */}
              <div className="pt-2 border-t border-slate-200/80 dark:border-slate-700/80 flex items-center gap-2 flex-wrap">
                {selectedEvent.user_email && (
                  <button
                    type="button"
                    onClick={() => { setSearch(selectedEvent.user_email); setSelectedEvent(null); setPage(1); }}
                    className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-blue-500 rounded-lg text-[10px] font-bold text-blue-600 dark:text-blue-400 transition-all cursor-pointer shadow-2xs flex items-center gap-1"
                    title={`Filter auth events for ${selectedEvent.user_email}`}
                  >
                    <span>👤</span> Filter by This User
                  </button>
                )}
                {(selectedEvent.metadata?.ipAddress || selectedEvent.ip_address) && (
                  <button
                    type="button"
                    onClick={() => {
                      const targetIp = selectedEvent.metadata?.ipAddress || selectedEvent.ip_address;
                      setSearch(targetIp);
                      setSelectedEvent(null);
                      setPage(1);
                    }}
                    className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-purple-500 rounded-lg text-[10px] font-bold text-purple-600 dark:text-purple-400 transition-all cursor-pointer shadow-2xs flex items-center gap-1"
                    title={`Filter auth events for IP ${selectedEvent.metadata?.ipAddress || selectedEvent.ip_address}`}
                  >
                    <span>🌐</span> Filter by IP ({selectedEvent.metadata?.ipAddress || selectedEvent.ip_address})
                  </button>
                )}
              </div>
            </div>

            {/* Quick Copy Buttons Row */}
            <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-2xl border border-slate-200/60 dark:border-slate-800 space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Copy Identifiers</span>
              <div className="flex items-center gap-2 flex-wrap">
                {selectedEvent.user_email && (
                  <button
                    type="button"
                    onClick={() => handleCopyText(selectedEvent.user_email, 'Email')}
                    className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-blue-500 rounded-lg text-[10px] font-bold text-slate-700 dark:text-slate-300 transition-all cursor-pointer"
                  >
                    {copiedField === 'Email' ? '✓ Email Copied' : 'Copy Email'}
                  </button>
                )}
                {selectedEvent.user_id && (
                  <button
                    type="button"
                    onClick={() => handleCopyText(selectedEvent.user_id, 'User ID')}
                    className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-blue-500 rounded-lg text-[10px] font-bold text-slate-700 dark:text-slate-300 transition-all cursor-pointer"
                  >
                    {copiedField === 'User ID' ? '✓ User ID Copied' : 'Copy User ID'}
                  </button>
                )}
                {(selectedEvent.metadata?.sessionId || selectedEvent.metadata?.sid) && (
                  <button
                    type="button"
                    onClick={() => handleCopyText(selectedEvent.metadata?.sessionId || selectedEvent.metadata?.sid, 'Session ID')}
                    className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-blue-500 rounded-lg text-[10px] font-bold text-slate-700 dark:text-slate-300 transition-all cursor-pointer"
                  >
                    {copiedField === 'Session ID' ? '✓ Session ID Copied' : 'Copy Session ID'}
                  </button>
                )}
                {(selectedEvent.metadata?.ipAddress || selectedEvent.ip_address) && (
                  <button
                    type="button"
                    onClick={() => handleCopyText(selectedEvent.metadata?.ipAddress || selectedEvent.ip_address, 'IP Address')}
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
                <h4 className="text-[10px] font-bold text-slate-400 uppercase">Occurred Time</h4>
                <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                  {new Date(selectedEvent.created_at).toLocaleString()}
                </p>
                <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
                  {formatRelativeTime(selectedEvent.created_at)}
                </span>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-800">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase">IP & Location</h4>
                <p className="font-mono font-bold text-slate-800 dark:text-slate-200 mt-0.5">{selectedEvent.metadata?.ipAddress || selectedEvent.ip_address || '127.0.0.1'}</p>
                <span className="text-[10px] font-semibold text-slate-400 block mt-0.5">
                  {selectedEvent.metadata?.country || 'Unknown Location'}
                </span>
              </div>
            </div>

            <div>
              <h4 className="text-[10px] font-bold text-slate-400 uppercase mb-1">User Email / ID</h4>
              <p className="font-mono text-xs font-semibold bg-slate-50 dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200">
                {selectedEvent.user_email || selectedEvent.user_id || 'Anonymous User'}
              </p>
            </div>

            <div>
              <h4 className="text-[10px] font-bold text-slate-400 uppercase mb-1">Client User Agent</h4>
              <p className="font-mono text-[10px] leading-relaxed bg-slate-50 dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 break-all">
                {selectedEvent.metadata?.userAgent || 'Web Session'}
              </p>
            </div>

            {/* JSON Metadata Payload Viewer */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase">Event Metadata Payload</h4>
                <button
                  type="button"
                  onClick={() => handleCopyText(JSON.stringify(selectedEvent.metadata || {}, null, 2), 'Metadata JSON')}
                  className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  {copiedField === 'Metadata JSON' ? '✓ Copied' : 'Copy JSON'}
                </button>
              </div>
              <pre className="bg-slate-900 text-slate-100 p-4 rounded-2xl text-[10px] font-mono overflow-x-auto leading-relaxed border border-slate-800 shadow-inner">
                {JSON.stringify(selectedEvent.metadata || {}, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </AdminDetailDrawer>
    </div>
  );
}
