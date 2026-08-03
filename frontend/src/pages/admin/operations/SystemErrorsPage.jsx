import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useToastStore } from '../../../store/useToastStore';
import { getSystemErrors, downloadCSV } from '../../../services/admin';
import AdminDataTable from '../../../components/admin/AdminDataTable';
import AdminFilterBar from '../../../components/admin/AdminFilterBar';
import AdminDetailDrawer from '../../../components/admin/AdminDetailDrawer';

export default function SystemErrorsPage() {
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [search, setSearch] = useState('');
  const [severity, setSeverity] = useState('');
  const [statusCode, setStatusCode] = useState('');
  const [selectedError, setSelectedError] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  
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

  const columns = [
    {
      header: 'Occurred At',
      accessor: 'occurred_at',
      render: (row) => <span className="text-xs font-semibold text-slate-500">{new Date(row.occurred_at).toLocaleString()}</span>
    },
    {
      header: 'Status Code',
      accessor: 'status_code',
      render: (row) => (
        <span className={`text-xs font-bold ${row.status_code >= 500 ? 'text-red-600 bg-red-50 border border-red-150 px-2 py-0.5 rounded' : 'text-amber-700 bg-amber-50 border border-amber-150 px-2 py-0.5 rounded'}`}>
          {row.status_code}
        </span>
      )
    },
    {
      header: 'Message',
      accessor: 'message',
      render: (row) => (
        <div className="max-w-xs truncate text-xs font-semibold text-slate-700" title={row.message}>
          {row.message}
        </div>
      )
    },
    {
      header: 'Correlation ID',
      accessor: 'correlation_id',
      render: (row) => <span className="text-[10px] font-mono text-slate-500 font-bold">{row.correlation_id || '-'}</span>
    }
  ];

  return (
    <div className="flex flex-col h-full space-y-4 w-full">
      <AdminFilterBar 
        searchPlaceholder="Search by Correlation ID, Request ID, or URL..."
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
          }
        ]}
      />
      
      <AdminDataTable 
        columns={columns}
        data={data?.errors || []}
        total={data?.total || 0}
        page={page}
        limit={limit}
        onPageChange={setPage}
        isLoading={isLoading}
        error={error}
        emptyMessage="No system errors match your criteria."
        onRowClick={(row) => setSelectedError(row)}
      />

      <AdminDetailDrawer 
        isOpen={!!selectedError} 
        onClose={() => setSelectedError(null)}
        title="System Error Details"
      >
        {selectedError && (
          <div className="space-y-4">
            <div className="p-3.5 bg-red-50 border border-red-150 rounded-xl">
              <h4 className="text-[11px] font-bold text-red-750 uppercase tracking-wider">Error Message</h4>
              <p className="text-red-900 mt-1 font-mono text-xs font-semibold">{selectedError.message}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-[11px] font-bold text-slate-450 uppercase tracking-wider">Status Code</h4>
                <p className="text-slate-800 mt-1 font-mono font-bold text-xs">{selectedError.status_code}</p>
              </div>
              <div>
                <h4 className="text-[11px] font-bold text-slate-450 uppercase tracking-wider">Severity</h4>
                <p className="text-slate-800 mt-1 font-bold text-xs uppercase">{selectedError.severity}</p>
              </div>
            </div>

            <div>
              <h4 className="text-[11px] font-bold text-slate-450 uppercase tracking-wider">Target Endpoint URL</h4>
              <p className="text-slate-800 mt-1 text-xs break-all font-mono font-semibold bg-slate-50 border border-slate-200 p-2 rounded">{selectedError.url || 'N/A'}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-[11px] font-bold text-slate-450 uppercase tracking-wider">Request ID</h4>
                <p className="text-slate-800 mt-1 text-xs font-mono font-bold">{selectedError.request_id || '-'}</p>
              </div>
              <div>
                <h4 className="text-[11px] font-bold text-slate-450 uppercase tracking-wider">Correlation ID</h4>
                <p className="text-slate-800 mt-1 text-xs font-mono font-bold">{selectedError.correlation_id || '-'}</p>
              </div>
            </div>

            {selectedError.stack_trace && (
              <div>
                <h4 className="text-[11px] font-bold text-slate-450 uppercase tracking-wider">Stack Trace Output</h4>
                <pre className="bg-slate-950 p-4 rounded-xl text-[10px] text-red-400 font-mono mt-1.5 overflow-x-auto whitespace-pre-wrap shadow-inner leading-relaxed">
                  {selectedError.stack_trace}
                </pre>
              </div>
            )}
            
            {selectedError.context && (
              <div>
                <h4 className="text-[11px] font-bold text-slate-450 uppercase tracking-wider">Variables Context Payload</h4>
                <pre className="bg-slate-950 p-4 rounded-xl text-[10px] text-blue-300 font-mono mt-1.5 overflow-x-auto whitespace-pre-wrap shadow-inner leading-relaxed">
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
