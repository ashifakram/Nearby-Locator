import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOutletContext } from 'react-router-dom';
import { 
  getAdminUsers, 
  suspendUser, 
  unlockUser, 
  forceLogoutUser,
  updateUserRole,
  initiateImpersonation,
  listRoles,
  downloadCSV
} from '../../services/admin';
import { useToastStore } from '../../store/useToastStore';
import LoaderIcon from '../../icons/LoaderIcon';
import AdminDataTable from '../../components/admin/AdminDataTable';
import AdminFilterBar from '../../components/admin/AdminFilterBar';
import AdminDetailDrawer from '../../components/admin/AdminDetailDrawer';

export default function AdminUsersPage() {
  const { triggerSudo } = useOutletContext();
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState('created_at');
  const [sortDirection, setSortDirection] = useState('desc');
  const [selectedUser, setSelectedUser] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  
  const queryClient = useQueryClient();
  const { showToast } = useToastStore();

  const [actionState, setActionState] = useState({ isOpen: false, type: null, reason: '' });

  // Queries
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-users', { page, limit, search, sort: sortField, order: sortDirection }],
    queryFn: () => getAdminUsers({ page, limit, search, sort: sortField, order: sortDirection }),
    keepPreviousData: true
  });

  const { data: roles } = useQuery({
    queryKey: ['admin-roles'],
    queryFn: listRoles
  });

  // Mutations
  const suspendMutation = useMutation({
    mutationFn: ({ userId, reason }) => suspendUser(userId, reason),
    onSuccess: () => {
      showToast('User suspended successfully.', 'success');
      queryClient.invalidateQueries(['admin-users']);
      setActionState({ isOpen: false, type: null, reason: '' });
      setSelectedUser(null);
    },
    onError: (err) => {
      showToast(err?.response?.data?.message || 'Failed to suspend user.', 'error');
    }
  });

  const unlockMutation = useMutation({
    mutationFn: ({ userId, reason }) => unlockUser(userId, reason),
    onSuccess: () => {
      showToast('User unlocked successfully.', 'success');
      queryClient.invalidateQueries(['admin-users']);
      setActionState({ isOpen: false, type: null, reason: '' });
      setSelectedUser(null);
    },
    onError: (err) => {
      showToast(err?.response?.data?.message || 'Failed to unlock user.', 'error');
    }
  });

  const handleActionSubmit = (e) => {
    e.preventDefault();
    if (!actionState.reason || actionState.reason.length < 10) {
      showToast('Reason must be at least 10 characters.', 'error');
      return;
    }
    if (actionState.type === 'suspend') {
      suspendMutation.mutate({ userId: selectedUser.id, reason: actionState.reason });
    } else if (actionState.type === 'unlock') {
      unlockMutation.mutate({ userId: selectedUser.id, reason: actionState.reason });
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await downloadCSV('/api/admin/users', 'admin_users', { search, sort: sortField, order: sortDirection });
      showToast('CSV exported successfully.', 'success');
    } catch (err) {
      showToast('Failed to export CSV.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleRoleChange = (roleId) => {
    if (!roleId) return;
    triggerSudo(async () => {
      setIsActionLoading(true);
      try {
        await updateUserRole(selectedUser.id, roleId);
        showToast('User role updated successfully.', 'success');
        queryClient.invalidateQueries(['admin-users']);
        setSelectedUser(null);
      } catch (err) {
        showToast(err?.response?.data?.message || 'Failed to update user role.', 'error');
      } finally {
        setIsActionLoading(false);
      }
    });
  };

  const handleImpersonate = () => {
    triggerSudo(async () => {
      setIsActionLoading(true);
      try {
        const res = await initiateImpersonation(selectedUser.id);
        const payload = res.data;
        if (payload?.accessToken) {
          showToast(`Impersonating session initiated for ${selectedUser.email}`, 'success');
          // Write credentials and session markers
          localStorage.setItem('isImpersonated', 'true');
          // Hard reload page to bootstrap inMemoryAccessToken and layout updates
          window.location.href = '/discover';
        } else {
          showToast('Failed to retrieve impersonation token.', 'error');
        }
      } catch (err) {
        showToast(err?.response?.data?.message || 'Failed to start impersonation.', 'error');
      } finally {
        setIsActionLoading(false);
      }
    });
  };

  const handleForceLogout = async () => {
    setIsActionLoading(true);
    try {
      await forceLogoutUser(selectedUser.id);
      showToast('Force user logout successfully triggered.', 'success');
      queryClient.invalidateQueries(['admin-users']);
      setSelectedUser(null);
    } catch (err) {
      showToast('Failed to force logout user.', 'error');
    } finally {
      setIsActionLoading(false);
    }
  };

  const getRoleName = (roleId) => {
    const found = roles?.find(r => r.id === roleId);
    return found ? found.name : `ID: ${roleId}`;
  };

  const columns = [
    {
      header: 'User Profile',
      accessor: 'email',
      sortable: true,
      render: (row) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-semibold text-slate-800 text-sm">{row.name || 'Anonymous User'}</span>
          <span className="text-xs text-slate-450 font-medium">{row.email}</span>
        </div>
      )
    },
    {
      header: 'Assigned Role',
      accessor: 'role_id',
      render: (row) => (
        <span className="px-2 py-0.5 rounded-md bg-blue-50 border border-blue-100 text-xs font-bold text-blue-700 tracking-wide">
          {getRoleName(row.role_id)}
        </span>
      )
    },
    {
      header: 'Status',
      accessor: 'status',
      sortable: true,
      render: (row) => {
        const color = row.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                      row.status === 'BANNED' || row.status === 'DISABLED' || row.status === 'LOCKED' ? 'bg-red-50 text-red-750 border border-red-150' :
                      'bg-amber-50 text-amber-700 border border-amber-100';
        return <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${color}`}>{row.status}</span>;
      }
    },
    {
      header: 'Created At',
      accessor: 'created_at',
      sortable: true,
      render: (row) => <span className="text-xs font-semibold text-slate-500">{new Date(row.created_at).toLocaleDateString()}</span>
    }
  ];

  return (
    <div className="space-y-6 relative h-full flex flex-col">
      <header className="flex flex-col gap-1.5">
        <h2 className="text-2xl font-bold text-slate-900">User Administration</h2>
        <p className="text-sm text-slate-500">Manage user accounts, enforce moderation, and review statuses.</p>
      </header>

      <AdminFilterBar 
        searchPlaceholder="Search users by email, name, or ID..."
        searchValue={search}
        onSearchChange={(val) => { setSearch(val); setPage(1); }}
        onExport={handleExport}
        isExporting={isExporting}
      />
      
      <div className="flex-grow min-h-0">
        <AdminDataTable 
          columns={columns}
          data={data?.users || []}
          total={data?.total || 0}
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
          onRowClick={(row) => setSelectedUser(row)}
        />
      </div>

      <AdminDetailDrawer 
        isOpen={!!selectedUser && !actionState.isOpen}
        onClose={() => setSelectedUser(null)}
        title="User Profile Details"
      >
        {selectedUser && (
          <div className="space-y-5">
            <div>
              <h4 className="text-[11px] font-bold text-slate-450 uppercase tracking-wider">User ID</h4>
              <p className="text-slate-800 mt-1 font-mono text-xs font-semibold bg-slate-50 p-2 rounded border border-slate-200">{selectedUser.id}</p>
            </div>
            <div>
              <h4 className="text-[11px] font-bold text-slate-450 uppercase tracking-wider">Email Address</h4>
              <p className="text-slate-800 mt-1 font-semibold text-sm">{selectedUser.email}</p>
            </div>
            <div>
              <h4 className="text-[11px] font-bold text-slate-450 uppercase tracking-wider">Display Name</h4>
              <p className="text-slate-800 mt-1 font-medium">{selectedUser.name || 'Anonymous'}</p>
            </div>
            <div>
              <h4 className="text-[11px] font-bold text-slate-450 uppercase tracking-wider">OAuth Provider</h4>
              <p className="text-slate-850 mt-1 font-semibold capitalize text-xs bg-slate-50 border border-slate-200 px-2 py-0.5 rounded w-fit">{selectedUser.provider}</p>
            </div>

            <div>
              <h4 className="text-[11px] font-bold text-slate-450 uppercase tracking-wider mb-2">Escalate / Modify Role</h4>
              <select
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
                value={selectedUser.role_id}
                onChange={(e) => handleRoleChange(e.target.value)}
                disabled={isActionLoading}
              >
                {roles?.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>

            <div className="pt-4 border-t border-slate-100 flex flex-col gap-2">
              <h4 className="text-[11px] font-bold text-slate-455 uppercase tracking-wider mb-1">Session & Account Controls</h4>
              
              <button 
                onClick={handleImpersonate}
                disabled={isActionLoading}
                className="w-full px-4 py-2 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100/70 rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5"
              >
                {isActionLoading && <LoaderIcon width={12} height={12} color="#1d4ed8" />}
                Impersonate Session (Sudo)
              </button>

              <button 
                onClick={handleForceLogout}
                disabled={isActionLoading}
                className="w-full px-4 py-2 text-xs font-bold text-slate-655 bg-slate-50 border border-slate-250 hover:bg-slate-100 rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5"
              >
                {isActionLoading && <LoaderIcon width={12} height={12} color="#475569" />}
                Force Sign Out Everywhere
              </button>

              {(selectedUser.status === 'ACTIVE' || selectedUser.status === 'PENDING_VERIFICATION') ? (
                <button 
                  onClick={() => setActionState({ isOpen: true, type: 'suspend', reason: '' })}
                  disabled={isActionLoading}
                  className="w-full px-4 py-2 text-xs font-bold text-red-750 bg-red-50 border border-red-200 hover:bg-red-100/70 rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5"
                >
                  Suspend User Profile
                </button>
              ) : (
                <button 
                  onClick={() => setActionState({ isOpen: true, type: 'unlock', reason: '' })}
                  disabled={isActionLoading}
                  className="w-full px-4 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100/70 rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5"
                >
                  Unlock User Profile
                </button>
              )}
            </div>
          </div>
        )}
      </AdminDetailDrawer>

      {/* Action Reason Input Modal */}
      {actionState.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 p-6 rounded-2xl w-full max-w-md shadow-2xl animate-scale-in">
            <h3 className="text-base font-bold text-slate-900 mb-1.5">
              {actionState.type === 'suspend' ? 'Suspend User Profile' : 'Unlock User Profile'}
            </h3>
            <p className="text-xs text-slate-500 mb-5">
              You are about to {actionState.type} <strong>{selectedUser?.email}</strong>. 
              Please provide an administrative reason (minimum 10 characters).
            </p>
            <form onSubmit={handleActionSubmit} className="flex flex-col gap-4">
              <input 
                type="text" 
                autoFocus
                placeholder="Administrative reasoning statement…" 
                value={actionState.reason}
                onChange={e => setActionState(s => ({ ...s, reason: e.target.value }))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-medium focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-900"
              />
              <div className="flex justify-end gap-3 mt-1.5">
                <button 
                  type="button" 
                  onClick={() => setActionState({ isOpen: false, type: null, reason: '' })}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={actionState.reason.length < 10}
                  className={`px-4 py-2 rounded-xl text-xs font-bold text-white transition-all disabled:opacity-50 ${
                    actionState.type === 'suspend' 
                      ? 'bg-red-600 hover:bg-red-500' 
                      : 'bg-emerald-600 hover:bg-emerald-500'
                  }`}
                >
                  Confirm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
