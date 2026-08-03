import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToastStore } from '../../../store/useToastStore';
import { getSessions, revokeSession, revokeAllUserSessions, downloadCSV } from '../../../services/admin';
import AdminDataTable from '../../../components/admin/AdminDataTable';
import AdminFilterBar from '../../../components/admin/AdminFilterBar';
import AdminDetailDrawer from '../../../components/admin/AdminDetailDrawer';

export default function ActiveSessionsPage() {
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [search, setSearch] = useState('');
  const [selectedSession, setSelectedSession] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  
  const { showToast } = useToastStore();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['active-sessions', { page, limit, search }],
    queryFn: () => getSessions({ page, limit, search }),
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

  const columns = [
    {
      header: 'Last Active',
      accessor: 'updated_at',
      render: (row) => <span className="text-xs font-semibold text-slate-500">{new Date(row.updated_at || row.created_at).toLocaleString()}</span>
    },
    {
      header: 'Email Profile',
      accessor: 'email',
      render: (row) => <span className="text-xs font-semibold text-slate-700">{row.email}</span>
    },
    {
      header: 'Role',
      accessor: 'role',
      render: (row) => <span className="px-2 py-0.5 rounded bg-blue-50 border border-blue-100 text-[10px] font-bold text-blue-700 uppercase tracking-wide">{row.role}</span>
    },
    {
      header: 'IP Address',
      accessor: 'ip_address',
      render: (row) => <span className="text-[11px] font-mono text-slate-500 font-bold">{row.ip_address}</span>
    }
  ];

  return (
    <div className="flex flex-col h-full space-y-4 w-full">
      <AdminFilterBar 
        searchPlaceholder="Search by Email or IP Address..."
        searchValue={search}
        onSearchChange={(val) => { setSearch(val); setPage(1); }}
        onExport={handleExport}
        isExporting={isExporting}
      />
      
      <AdminDataTable 
        columns={columns}
        data={data?.sessions || []}
        total={data?.total || 0}
        page={page}
        limit={limit}
        onPageChange={setPage}
        isLoading={isLoading}
        error={error}
        emptyMessage="No active sessions found."
        onRowClick={(row) => setSelectedSession(row)}
      />

      <AdminDetailDrawer 
        isOpen={!!selectedSession} 
        onClose={() => setSelectedSession(null)}
        title="Session Details & Controls"
      >
        {selectedSession && (
          <div className="space-y-6 flex flex-col h-full">
            <div className="space-y-4 flex-grow">
              <div>
                <h4 className="text-[11px] font-bold text-slate-455 uppercase tracking-wider">User Identity</h4>
                <p className="text-slate-800 mt-1 font-semibold text-sm">{selectedSession.email} ({selectedSession.role})</p>
                <p className="text-[10px] font-mono text-slate-450 font-semibold mt-0.5">User ID: {selectedSession.user_id}</p>
              </div>
              
              <div>
                <h4 className="text-[11px] font-bold text-slate-455 uppercase tracking-wider">Session Timings</h4>
                <p className="text-slate-655 mt-1 text-xs font-semibold">Created At: {new Date(selectedSession.created_at).toLocaleString()}</p>
                <p className="text-slate-655 text-xs font-semibold">Last Active: {new Date(selectedSession.updated_at || selectedSession.created_at).toLocaleString()}</p>
              </div>

              <div>
                <h4 className="text-[11px] font-bold text-slate-455 uppercase tracking-wider">Network Connection</h4>
                <p className="text-slate-800 mt-1 font-mono text-xs font-bold">IP Address: {selectedSession.ip_address}</p>
                <p className="text-slate-500 mt-2 text-xs leading-relaxed font-semibold bg-slate-50 p-2.5 rounded border border-slate-200 break-all">{selectedSession.user_agent}</p>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-5 space-y-2">
              <h4 className="text-[11px] font-bold text-red-550 uppercase tracking-wider mb-2">Danger Zone Controls</h4>
              
              <button 
                onClick={() => {
                  if (confirm('Are you sure you want to revoke this specific session? The user will be immediately logged out of this device.')) {
                    revokeSessionMutation.mutate(selectedSession.id);
                  }
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-red-50 text-red-700 font-bold text-xs border border-red-200 hover:bg-red-100/70 transition-all shadow-sm flex justify-center items-center"
              >
                Revoke This Session
              </button>

              <button 
                onClick={() => {
                  if (confirm(`Are you sure you want to revoke ALL active sessions for ${selectedSession.email}? This will log them out of all devices.`)) {
                    revokeUserSessionsMutation.mutate(selectedSession.user_id);
                  }
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-red-600 text-white font-bold text-xs hover:bg-red-500 transition-all shadow flex justify-center items-center"
              >
                Revoke All User Sessions
              </button>
            </div>
          </div>
        )}
      </AdminDetailDrawer>
    </div>
  );
}
