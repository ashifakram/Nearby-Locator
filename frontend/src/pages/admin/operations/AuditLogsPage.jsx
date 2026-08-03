import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useToastStore } from '../../../store/useToastStore';
import { getAuditLogs, downloadCSV } from '../../../services/admin';
import AdminDataTable from '../../../components/admin/AdminDataTable';
import AdminFilterBar from '../../../components/admin/AdminFilterBar';
import AdminDetailDrawer from '../../../components/admin/AdminDetailDrawer';

export default function AuditLogsPage() {
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [search, setSearch] = useState('');
  const [severity, setSeverity] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [selectedLog, setSelectedLog] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  
  const { showToast } = useToastStore();

  const { data, isLoading, error } = useQuery({
    queryKey: ['audit-logs', { page, limit, search, severity, actionFilter }],
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

  const columns = [
    {
      header: 'Occurred At',
      accessor: 'occurred_at',
      render: (row) => <span className="text-xs font-semibold text-slate-500">{new Date(row.occurred_at).toLocaleString()}</span>
    },
    {
      header: 'Action / Event',
      accessor: 'action',
      render: (row) => <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded">{row.action}</span>
    },
    {
      header: 'Actor Profile ID',
      accessor: 'actor_id',
      render: (row) => <span className="text-xs font-mono font-semibold text-slate-600">{row.actor_id || 'SYSTEM PROCESS'}</span>
    },
    {
      header: 'Severity',
      accessor: 'severity',
      render: (row) => {
        const color = row.severity === 'CRITICAL' ? 'text-red-700 bg-red-50 border-red-200' : 
                      row.severity === 'WARNING' ? 'text-amber-700 bg-amber-50 border-amber-200' : 
                      'text-emerald-700 bg-emerald-50 border-emerald-250';
        return (
          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${color}`}>
            {row.severity}
          </span>
        );
      }
    },
    {
      header: 'IP Address',
      accessor: 'ip_address',
      render: (row) => <span className="text-xs text-slate-450 font-bold font-mono">{row.ip_address}</span>
    }
  ];

  return (
    <div className="flex flex-col h-full space-y-4 w-full">
      <AdminFilterBar 
        searchPlaceholder="Search by Correlation ID..."
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
      
      <AdminDataTable 
        columns={columns}
        data={data?.logs || []}
        total={data?.total || 0}
        page={page}
        limit={limit}
        onPageChange={setPage}
        isLoading={isLoading}
        error={error}
        emptyMessage="No audit logs match your criteria."
        onRowClick={(row) => setSelectedLog(row)}
      />

      <AdminDetailDrawer 
        isOpen={!!selectedLog} 
        onClose={() => setSelectedLog(null)}
        title="Audit Log Details"
      >
        {selectedLog && (
          <div className="space-y-4">
            <div>
              <h4 className="text-[11px] font-bold text-slate-450 uppercase tracking-wider">Action Name</h4>
              <p className="text-slate-800 mt-1 font-bold text-sm">{selectedLog.action}</p>
            </div>
            <div>
              <h4 className="text-[11px] font-bold text-slate-450 uppercase tracking-wider">Occurred At</h4>
              <p className="text-slate-700 mt-1 font-semibold text-xs">{new Date(selectedLog.occurred_at).toLocaleString()}</p>
            </div>
            <div>
              <h4 className="text-[11px] font-bold text-slate-450 uppercase tracking-wider">Actor User ID</h4>
              <p className="text-slate-800 mt-1 font-mono text-xs font-semibold bg-slate-50 border border-slate-200 p-2 rounded">{selectedLog.actor_id || 'System / Unauthenticated'}</p>
            </div>
            {selectedLog.target_user_id && (
              <div>
                <h4 className="text-[11px] font-bold text-slate-450 uppercase tracking-wider">Target User ID</h4>
                <p className="text-slate-800 mt-1 font-mono text-xs font-semibold bg-slate-50 border border-slate-200 p-2 rounded">{selectedLog.target_user_id}</p>
              </div>
            )}
            <div>
              <h4 className="text-[11px] font-bold text-slate-450 uppercase tracking-wider">Event Metadata Payload</h4>
              <pre className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-[10px] text-slate-800 font-mono mt-1.5 overflow-x-auto shadow-inner leading-relaxed">
                {JSON.stringify(selectedLog.metadata, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </AdminDetailDrawer>
    </div>
  );
}
