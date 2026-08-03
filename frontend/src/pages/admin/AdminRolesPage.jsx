import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOutletContext } from 'react-router-dom';
import { listRoles, listPermissions, updateRolePermissions } from '../../services/admin';
import { useToastStore } from '../../store/useToastStore';
import AdminDataTable from '../../components/admin/AdminDataTable';
import AdminDetailDrawer from '../../components/admin/AdminDetailDrawer';
import LoaderIcon from '../../icons/LoaderIcon';

export default function AdminRolesPage() {
  const { triggerSudo } = useOutletContext();
  const { showToast } = useToastStore();
  const queryClient = useQueryClient();

  const [selectedRole, setSelectedRole] = useState(null);
  const [selectedPermissionIds, setSelectedPermissionIds] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  // Queries
  const { data: roles, isLoading: rolesLoading, error: rolesError } = useQuery({
    queryKey: ['admin-roles-list'],
    queryFn: listRoles
  });

  const { data: permissions, isLoading: permissionsLoading } = useQuery({
    queryKey: ['admin-permissions-list'],
    queryFn: listPermissions
  });

  // Mutator
  const saveRolePermissionsMutation = useMutation({
    mutationFn: ({ roleId, permissionIds }) => updateRolePermissions(roleId, permissionIds),
    onSuccess: () => {
      showToast('Role permissions successfully synchronized.', 'success');
      queryClient.invalidateQueries(['admin-roles-list']);
      setSelectedRole(null);
    },
    onError: (err) => {
      showToast(err?.response?.data?.message || 'Failed to update role permissions.', 'error');
    }
  });

  const handleRowClick = (role) => {
    setSelectedRole(role);
    // Resolve which permission IDs are active for this role
    const activePermIds = role.permissions?.map(p => p.id) || [];
    setSelectedPermissionIds(activePermIds);
  };

  const handlePermissionToggle = (permId) => {
    setSelectedPermissionIds(prev => 
      prev.includes(permId) ? prev.filter(id => id !== permId) : [...prev, permId]
    );
  };

  const handleSavePermissionsSubmit = (e) => {
    e.preventDefault();
    triggerSudo(() => {
      setIsSaving(true);
      saveRolePermissionsMutation.mutate({
        roleId: selectedRole.id,
        permissionIds: selectedPermissionIds
      }, {
        onSettled: () => {
          setIsSaving(false);
        }
      });
    });
  };

  const columns = [
    {
      header: 'Role Name',
      accessor: 'name',
      render: (row) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-bold text-slate-800 text-sm">{row.name}</span>
          <span className="text-xs text-slate-450 font-semibold">{row.description}</span>
        </div>
      )
    },
    {
      header: 'Priority Rank',
      accessor: 'priority',
      render: (row) => <span className="font-mono text-xs font-bold text-slate-500">{row.priority}</span>
    },
    {
      header: 'Type',
      accessor: 'is_system',
      render: (row) => (
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
          row.is_system 
            ? 'bg-blue-50 border-blue-100 text-blue-700' 
            : 'bg-slate-50 border-slate-200 text-slate-600'
        }`}>
          {row.is_system ? 'System Role' : 'Custom'}
        </span>
      )
    },
    {
      header: 'Permissions Mapped',
      accessor: 'permissions',
      render: (row) => (
        <span className="text-xs font-semibold text-slate-500">
          {row.permissions?.length || 0} active
        </span>
      )
    }
  ];

  if (rolesError) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 text-red-750 text-xs font-semibold rounded-xl">
        Failed to load roles: {rolesError.message || 'Unknown error'}
      </div>
    );
  }

  return (
    <div className="space-y-6 flex flex-col h-full w-full pb-8 pr-1">
      <header className="flex flex-col gap-1.5">
        <h2 className="text-2xl font-bold text-slate-900 font-sans">Roles & Permissions Management</h2>
        <p className="text-sm text-slate-500">Create system role mappings, customize scope limits, and assign permission matrices.</p>
      </header>

      <div className="flex-grow min-h-0">
        <AdminDataTable
          columns={columns}
          data={roles || []}
          isLoading={rolesLoading}
          onRowClick={handleRowClick}
        />
      </div>

      <AdminDetailDrawer
        isOpen={!!selectedRole}
        onClose={() => setSelectedRole(null)}
        title={`Edit Permissions: ${selectedRole?.name}`}
      >
        {selectedRole && (
          <form onSubmit={handleSavePermissionsSubmit} className="space-y-6 flex flex-col h-full">
            <div className="flex-grow space-y-4">
              <p className="text-xs text-slate-500">
                Check or uncheck individual system permission gates to modify scope access for this role.
              </p>
              
              {permissionsLoading ? (
                <div className="py-8 flex justify-center"><LoaderIcon width={24} height={24} color="#4f46e5" /></div>
              ) : (
                <div className="space-y-2.5 max-h-[400px] overflow-y-auto pr-1">
                  {permissions?.map(perm => (
                    <label 
                      key={perm.id} 
                      className="flex items-start gap-3 p-3 bg-slate-50 hover:bg-slate-100/50 border border-slate-200 rounded-xl cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedPermissionIds.includes(perm.id)}
                        onChange={() => handlePermissionToggle(perm.id)}
                        className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-bold text-slate-800 font-mono">{perm.name}</span>
                        <span className="text-[10px] text-slate-450 font-semibold leading-normal">{perm.description}</span>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-slate-100 pt-5 flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="bg-blue-600 hover:bg-blue-500 text-white rounded-xl px-5 py-2.5 text-xs font-bold transition-all shadow shadow-blue-100 flex items-center gap-2"
              >
                {isSaving && <LoaderIcon width={12} height={12} color="white" />}
                Apply Permissions Matrix (Sudo Gated)
              </button>
            </div>
          </form>
        )}
      </AdminDetailDrawer>
    </div>
  );
}
