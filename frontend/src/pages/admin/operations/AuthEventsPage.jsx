import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useToastStore } from '../../../store/useToastStore';
import { getAuthEvents, downloadCSV } from '../../../services/admin';
import AdminDataTable from '../../../components/admin/AdminDataTable';
import AdminFilterBar from '../../../components/admin/AdminFilterBar';
import AdminDetailDrawer from '../../../components/admin/AdminDetailDrawer';

export default function AuthEventsPage() {
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [search, setSearch] = useState('');
  const [eventCategory, setEventCategory] = useState('');
  const [eventType, setEventType] = useState('');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  
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

  const columns = [
    {
      header: 'Occurred At',
      accessor: 'created_at',
      render: (row) => <span className="text-xs font-semibold text-slate-500">{new Date(row.created_at).toLocaleString()}</span>
    },
    {
      header: 'User Profile ID',
      accessor: 'user_id',
      render: (row) => <span className="text-xs font-mono font-semibold text-slate-650 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded">{row.user_id}</span>
    },
    {
      header: 'Category',
      accessor: 'event_category',
      render: (row) => <span className="text-xs font-bold text-slate-700 uppercase">{row.event_category}</span>
    },
    {
      header: 'Event type',
      accessor: 'event_type',
      render: (row) => {
        const isSuspicious = row.event_type.includes('FAILED') || row.event_type.includes('SUSPICIOUS') || row.event_type.includes('BLOCKED') || row.event_type.includes('REVOKED');
        return (
          <span className={`text-xs font-bold uppercase ${isSuspicious ? 'text-red-600 bg-red-50 border border-red-150 px-2 py-0.5 rounded' : 'text-emerald-700 bg-emerald-50 border border-emerald-150 px-2 py-0.5 rounded'}`}>
            {row.event_type}
          </span>
        );
      }
    }
  ];

  return (
    <div className="flex flex-col h-full space-y-4 w-full">
      <AdminFilterBar 
        searchPlaceholder="Search by User ID or IP..."
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
              { label: 'Login', value: 'LOGIN' },
              { label: 'Logout', value: 'LOGOUT' },
              { label: 'Token', value: 'TOKEN' },
              { label: 'Security', value: 'SECURITY' }
            ]
          }
        ]}
      />
      
      <AdminDataTable 
        columns={columns}
        data={data?.events || []}
        total={data?.total || 0}
        page={page}
        limit={limit}
        onPageChange={setPage}
        isLoading={isLoading}
        error={error}
        emptyMessage="No authentication events match your criteria."
        onRowClick={(row) => setSelectedEvent(row)}
      />

      <AdminDetailDrawer 
        isOpen={!!selectedEvent} 
        onClose={() => setSelectedEvent(null)}
        title="Authentication Event Details"
      >
        {selectedEvent && (
          <div className="space-y-4">
            <div>
              <h4 className="text-[11px] font-bold text-slate-450 uppercase tracking-wider">Event Name</h4>
              <p className={`text-slate-800 mt-1 font-bold text-sm ${selectedEvent.event_type.includes('FAILED') ? 'text-red-655' : ''}`}>
                {selectedEvent.event_type}
              </p>
            </div>
            <div>
              <h4 className="text-[11px] font-bold text-slate-450 uppercase tracking-wider">Occurred At</h4>
              <p className="text-slate-700 mt-1 font-semibold text-xs">{new Date(selectedEvent.created_at).toLocaleString()}</p>
            </div>
            <div>
              <h4 className="text-[11px] font-bold text-slate-450 uppercase tracking-wider">User Profile ID</h4>
              <p className="text-slate-800 mt-1 font-mono text-xs font-semibold bg-slate-50 border border-slate-200 p-2 rounded">{selectedEvent.user_id}</p>
            </div>
            <div>
              <h4 className="text-[11px] font-bold text-slate-450 uppercase tracking-wider">Event Metadata Payload</h4>
              <pre className="bg-slate-950 p-4 rounded-xl text-[10px] text-blue-300 font-mono mt-1.5 overflow-x-auto whitespace-pre-wrap shadow-inner leading-relaxed">
                {JSON.stringify(selectedEvent.metadata, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </AdminDetailDrawer>
    </div>
  );
}
