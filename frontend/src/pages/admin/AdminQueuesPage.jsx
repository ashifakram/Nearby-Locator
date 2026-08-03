import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminDataTable from '../../components/admin/AdminDataTable';
import AdminDetailDrawer from '../../components/admin/AdminDetailDrawer';
import { useToastStore } from '../../store/useToastStore';
import { api } from '../../services/api';

export default function AdminQueuesPage() {
  const [activeTab, setActiveTab] = useState('flagged_spots');
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [sortField, setSortField] = useState('created_at');
  const [sortDirection, setSortDirection] = useState('desc');
  const [selectedItem, setSelectedItem] = useState(null);

  const queryClient = useQueryClient();
  const { showToast } = useToastStore();

  const fetchQueueData = async () => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      sort: sortField,
      order: sortDirection,
      status: 'PENDING'
    });
    
    let endpoint = '';
    if (activeTab === 'flagged_spots') endpoint = '/moderation/admin/queue';
    else if (activeTab === 'reports') endpoint = '/moderation/admin/reports';
    else if (activeTab === 'appeals') endpoint = '/moderation/admin/appeals';
    
    const res = await api.get(`${endpoint}?${params.toString()}`);
    return res.data.data;
  };

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-queues', activeTab, { page, limit, sort: sortField, order: sortDirection }],
    queryFn: fetchQueueData,
    keepPreviousData: true
  });

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setPage(1);
    setSelectedItem(null);
  };

  const actionMutation = useMutation({
    mutationFn: async ({ action, reason, notes }) => {
      let endpoint = '';
      if (activeTab === 'flagged_spots') endpoint = `/moderation/admin/spots/${selectedItem.id}/action`;
      else if (activeTab === 'reports') endpoint = `/moderation/admin/reports/${selectedItem.id}/resolve`;
      else if (activeTab === 'appeals') endpoint = `/moderation/admin/appeals/${selectedItem.id}/resolve`;

      const res = await api.post(endpoint, { action, reason, notes });
      return res.data;
    },
    onSuccess: (res) => {
      showToast(res.message || 'Action completed successfully.', 'success');
      queryClient.invalidateQueries(['admin-queues']);
      setSelectedItem(null);
    },
    onError: (err) => {
      showToast(err?.response?.data?.message || err.message || 'Failed to complete action.', 'error');
    }
  });

  const getColumns = () => {
    if (activeTab === 'flagged_spots') {
      return [
        { header: 'Spot ID', accessor: 'id', sortable: false, render: row => <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded">{row.id}</span> },
        { header: 'Title', accessor: 'title', sortable: false, render: row => <span className="font-semibold text-slate-800">{row.title}</span> },
        { header: 'Score', accessor: 'priority_score', sortable: true, render: row => <span className="font-bold text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded text-xs">{row.priority_score.toFixed(1)}</span> },
        { header: 'Status', accessor: 'moderation_status', sortable: false, render: row => <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-100 text-[11px] font-bold uppercase">{row.moderation_status}</span> },
        { header: 'Created', accessor: 'created_at', sortable: true, render: row => <span className="text-xs font-semibold text-slate-500">{new Date(row.created_at).toLocaleDateString()}</span> }
      ];
    } else if (activeTab === 'reports') {
      return [
        { header: 'ID', accessor: 'id', sortable: false, render: row => <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded">{row.id}</span> },
        { header: 'Category', accessor: 'category', sortable: true, render: row => <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-55 text-amber-700 border border-amber-200">{row.category}</span> },
        { header: 'Spot', accessor: 'spot_title', sortable: false, render: row => <span className="font-semibold text-slate-800">{row.spot_title}</span> },
        { header: 'Reporter', accessor: 'reporter_email', sortable: false, render: row => <span className="text-xs text-slate-500 font-semibold">{row.reporter_email}</span> },
        { header: 'Reported At', accessor: 'created_at', sortable: true, render: row => <span className="text-xs font-semibold text-slate-500">{new Date(row.created_at).toLocaleDateString()}</span> }
      ];
    } else {
      return [
        { header: 'ID', accessor: 'id', sortable: false, render: row => <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded">{row.id}</span> },
        { header: 'Spot', accessor: 'spot_title', sortable: false, render: row => <span className="font-semibold text-slate-800">{row.spot_title}</span> },
        { header: 'Appellant', accessor: 'appellant_email', sortable: false, render: row => <span className="text-xs text-slate-500 font-semibold">{row.appellant_email}</span> },
        { header: 'Appealed At', accessor: 'created_at', sortable: true, render: row => <span className="text-xs font-semibold text-slate-500">{new Date(row.created_at).toLocaleDateString()}</span> }
      ];
    }
  };

  const getListData = () => {
    if (!data) return [];
    if (activeTab === 'flagged_spots') return data.queue || [];
    if (activeTab === 'reports') return data.reports || [];
    if (activeTab === 'appeals') return data.appeals || [];
    return [];
  };

  return (
    <div className="space-y-6 relative h-full flex flex-col">
      <header className="flex flex-col gap-1.5">
        <h2 className="text-2xl font-bold text-slate-900">Moderation Activity Console</h2>
        <p className="text-sm text-slate-500">Review flagged spots, reports, appeals, and system spam metrics.</p>
      </header>

      <div className="flex gap-2.5 border-b border-slate-200 pb-3">
        {['flagged_spots', 'reports', 'appeals'].map(tab => (
          <button
            key={tab}
            onClick={() => handleTabChange(tab)}
            className={`px-4 py-2 text-xs font-bold capitalize transition-all rounded-xl border ${
              activeTab === tab 
                ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-2xs' 
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/80'
            }`}
          >
            {tab.replace('_', ' ')}
          </button>
        ))}
      </div>

      <div className="flex-grow min-h-0">
        <AdminDataTable 
          columns={getColumns()}
          data={getListData()}
          total={data?.total || getListData().length}
          page={page}
          limit={limit}
          onPageChange={setPage}
          isLoading={isLoading}
          error={error}
          sortField={sortField}
          sortDirection={sortDirection}
          onSort={(field, dir) => {
            setSortField(field);
            setSortDirection(dir);
            setPage(1);
          }}
          onRowClick={(row) => setSelectedItem(row)}
        />
      </div>

      <AdminDetailDrawer 
        isOpen={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        title={`${activeTab.replace('_', ' ')} Details`}
      >
        {selectedItem && (
          <div className="space-y-5">
            <div>
              <h4 className="text-[11px] font-bold text-slate-450 uppercase tracking-wider">ID</h4>
              <p className="text-slate-800 mt-1 font-mono text-xs font-semibold bg-slate-50 p-2 rounded border border-slate-200">{selectedItem.id}</p>
            </div>
            {activeTab === 'reports' && (
              <>
                <div>
                  <h4 className="text-[11px] font-bold text-slate-450 uppercase tracking-wider">Category</h4>
                  <p className="text-slate-800 mt-1 font-medium bg-amber-50 border border-amber-100 px-3 py-1 rounded w-fit text-xs text-amber-700">{selectedItem.category}</p>
                </div>
                <div>
                  <h4 className="text-[11px] font-bold text-slate-450 uppercase tracking-wider">Details</h4>
                  <p className="text-slate-700 mt-1 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs leading-relaxed">{selectedItem.details || 'None provided'}</p>
                </div>
              </>
            )}
            {activeTab === 'appeals' && (
              <div>
                <h4 className="text-[11px] font-bold text-slate-450 uppercase tracking-wider">Details</h4>
                <p className="text-slate-700 mt-1 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs leading-relaxed">{selectedItem.details}</p>
              </div>
            )}
            {activeTab === 'flagged_spots' && (
              <>
                <div>
                  <h4 className="text-[11px] font-bold text-slate-450 uppercase tracking-wider">Title</h4>
                  <p className="text-slate-850 mt-1 font-bold text-sm">{selectedItem.title}</p>
                </div>
                <div>
                  <h4 className="text-[11px] font-bold text-slate-450 uppercase tracking-wider">Description</h4>
                  <p className="text-slate-700 mt-1 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs leading-relaxed">{selectedItem.description}</p>
                </div>
              </>
            )}

            <div className="pt-5 border-t border-slate-100 flex flex-col gap-2.5">
              <h4 className="text-[11px] font-bold text-slate-450 uppercase tracking-wider mb-1">Administrative Actions</h4>
              
              {activeTab === 'flagged_spots' && (
                <div className="grid grid-cols-3 gap-2">
                  <button onClick={() => actionMutation.mutate({ action: 'APPROVE', reason: 'Manual Moderation' })} className="px-4 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-250 hover:bg-emerald-100/70 rounded-xl transition-all shadow-sm">Approve</button>
                  <button onClick={() => actionMutation.mutate({ action: 'QUARANTINE', reason: 'Manual Moderation' })} className="px-4 py-2 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-250 hover:bg-amber-100/70 rounded-xl transition-all shadow-sm">Quarantine</button>
                  <button onClick={() => actionMutation.mutate({ action: 'SUSPEND', reason: 'Manual Moderation' })} className="px-4 py-2 text-xs font-bold text-red-700 bg-red-50 border border-red-250 hover:bg-red-100/70 rounded-xl transition-all shadow-sm">Suspend</button>
                </div>
              )}
              {activeTab === 'reports' && (
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => actionMutation.mutate({ action: 'CONFIRM', reason: 'Report Confirmed' })} className="px-4 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-250 hover:bg-emerald-100/70 rounded-xl transition-all shadow-sm">Confirm Report</button>
                  <button onClick={() => actionMutation.mutate({ action: 'DISMISS', reason: 'Report Dismissed' })} className="px-4 py-2 text-xs font-bold text-slate-500 bg-slate-50 border border-slate-250 hover:bg-slate-100 rounded-xl transition-all shadow-sm">Dismiss</button>
                </div>
              )}
              {activeTab === 'appeals' && (
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => actionMutation.mutate({ action: 'APPROVED', reason: 'Appeal Approved' })} className="px-4 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-250 hover:bg-emerald-100/70 rounded-xl transition-all shadow-sm">Approve Appeal</button>
                  <button onClick={() => actionMutation.mutate({ action: 'REJECTED', reason: 'Appeal Rejected' })} className="px-4 py-2 text-xs font-bold text-red-700 bg-red-50 border border-red-250 hover:bg-red-100/70 rounded-xl transition-all shadow-sm">Reject Appeal</button>
                </div>
              )}
            </div>
          </div>
        )}
      </AdminDetailDrawer>
    </div>
  );
}
