import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { listRoles, listPermissions, updateRolePermissions, downloadCSV } from '../../services/admin';
import { useToastStore } from '../../store/useToastStore';
import AdminDataTable from '../../components/admin/AdminDataTable';
import AdminDetailDrawer from '../../components/admin/AdminDetailDrawer';
import LoaderIcon from '../../icons/LoaderIcon';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Key, 
  Lock, 
  Users, 
  RefreshCw, 
  Download, 
  Search, 
  MoreVertical, 
  ChevronRight, 
  ChevronDown,
  FileText, 
  Shield, 
  Activity, 
  Sliders, 
  Database, 
  BarChart3, 
  MapPin, 
  CheckSquare, 
  Square,
  AlertTriangle,
  Info,
  X,
  Crown,
  Sparkles,
  Calendar,
  Clock
} from 'lucide-react';

// ─── DOMAIN CATEGORY DEFINITIONS ──────────────────────────────────────────────
const PERMISSION_DOMAINS = [
  { id: 'users', label: 'User Management', icon: Users, prefix: 'users' },
  { id: 'roles', label: 'Roles & Governance', icon: ShieldCheck, prefix: ['roles', 'permissions'] },
  { id: 'audit', label: 'Audit & Security', icon: Shield, prefix: ['audit', 'logs', 'oauth'] },
  { id: 'system', label: 'System Operations', icon: Database, prefix: ['system', 'ops'] },
  { id: 'settings', label: 'Settings & Config', icon: Sliders, prefix: ['settings', 'smtp'] },
  { id: 'metrics', label: 'Metrics & Analytics', icon: BarChart3, prefix: ['metrics', 'reports'] },
  { id: 'places', label: 'Places & Resources', icon: MapPin, prefix: 'places' },
  { id: 'other', label: 'Other Scope Gates', icon: Info, prefix: [] }
];

function getPermissionCategory(permName) {
  const resource = (permName || '').split('.')[0];
  const matched = PERMISSION_DOMAINS.find(d => {
    if (Array.isArray(d.prefix)) return d.prefix.includes(resource);
    return d.prefix === resource;
  });
  return matched ? matched.id : 'other';
}

// ─── FLOATING ACTION MENU COMPONENT ───────────────────────────────────────────
function RoleActionMenuCell({ role, onInspect, navigate }) {
  const buttonRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState(null);

  const updateCoords = useCallback(() => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const opensUpward = spaceBelow < 220;

      setCoords({
        top: opensUpward ? 'auto' : `${rect.bottom + 4}px`,
        bottom: opensUpward ? `${window.innerHeight - rect.top + 4}px` : 'auto',
        right: `${Math.max(12, window.innerWidth - rect.right)}px`
      });
    }
  }, []);

  const toggleMenu = (e) => {
    e.stopPropagation();
    if (isOpen) {
      setIsOpen(false);
    } else {
      updateCoords();
      setIsOpen(true);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleScroll = () => updateCoords();
    const handleClickOutside = () => setIsOpen(false);

    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleScroll);
    window.addEventListener('click', handleClickOutside);

    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleScroll);
      window.removeEventListener('click', handleClickOutside);
    };
  }, [isOpen, updateCoords]);

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <button
        ref={buttonRef}
        type="button"
        aria-label="Role Actions Menu"
        onClick={toggleMenu}
        className={`p-1.5 rounded-xl transition-all duration-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-500/40 outline-none ${
          isOpen 
            ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 ring-2 ring-blue-500/30 shadow-xs' 
            : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80'
        }`}
        title="Role Actions Menu"
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {isOpen && coords && createPortal(
        <div
          style={{ 
            top: coords.top, 
            bottom: coords.bottom, 
            right: coords.right,
            maxHeight: 'calc(100vh - 24px)'
          }}
          className="fixed z-[99999] w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-1.5 flex flex-col gap-0.5 text-xs animate-scale-in overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => {
              onInspect(role);
              setIsOpen(false);
            }}
            className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-800 dark:text-slate-200 font-bold flex items-center justify-between transition-colors cursor-pointer"
          >
            <span>Inspect Permissions Matrix</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          </button>

          <div className="h-px bg-slate-200/80 dark:bg-slate-800 my-1" />

          <button
            type="button"
            onClick={() => {
              navigate('/admin/operations/audit-logs?search=ROLE_PERMISSIONS_UPDATED');
              setIsOpen(false);
            }}
            className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer flex items-center gap-2 transition-colors"
          >
            <FileText className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            <span>Role Audit History</span>
          </button>
        </div>,
        document.body
      )}
    </div>
  );
}

// ─── MAIN ROLES & PERMISSIONS PAGE ────────────────────────────────────────────
export default function AdminRolesPage() {
  const { triggerSudo } = useOutletContext();
  const navigate = useNavigate();
  const { showToast } = useToastStore();
  const queryClient = useQueryClient();

  const [selectedRole, setSelectedRole] = useState(null);
  const [selectedPermissionIds, setSelectedPermissionIds] = useState([]);
  const [permSearch, setPermSearch] = useState('');
  const [roleSearch, setRoleSearch] = useState('');
  const [roleTypeFilter, setRoleTypeFilter] = useState('all'); // all | system | custom
  const [collapsedCategories, setCollapsedCategories] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Queries
  const { data: rolesData, isLoading: rolesLoading, isFetching: rolesFetching, error: rolesError } = useQuery({
    queryKey: ['admin-roles-list'],
    queryFn: listRoles
  });

  const { data: permissionsData, isLoading: permissionsLoading } = useQuery({
    queryKey: ['admin-permissions-list'],
    queryFn: listPermissions
  });

  // Mutator
  const saveRolePermissionsMutation = useMutation({
    mutationFn: ({ roleId, permissionNames }) => updateRolePermissions(roleId, permissionNames),
    onSuccess: () => {
      showToast('Role permissions successfully synchronized.', 'success');
      queryClient.invalidateQueries(['admin-roles-list']);
      setSelectedRole(null);
    },
    onError: (err) => {
      showToast(err?.response?.data?.message || 'Failed to update role permissions.', 'error');
    }
  });

  // Normalize Data Arrays
  const roleList = useMemo(() => {
    if (Array.isArray(rolesData)) return rolesData;
    return rolesData?.roles || [];
  }, [rolesData]);

  const permissionList = useMemo(() => {
    if (Array.isArray(permissionsData)) return permissionsData;
    return permissionsData?.permissions || [];
  }, [permissionsData]);

  // Derived KPI Metrics
  const metrics = useMemo(() => {
    const total = roleList.length;
    const system = roleList.filter(r => r.is_system).length;
    const custom = roleList.filter(r => !r.is_system).length;
    const totalPermissions = permissionList.length;
    return { total, system, custom, totalPermissions };
  }, [roleList, permissionList]);

  // Filtered Roles List
  const filteredRoles = useMemo(() => {
    return roleList.filter(r => {
      const nameMatch = (r.name || '').toLowerCase().includes(roleSearch.toLowerCase()) ||
                        (r.description || '').toLowerCase().includes(roleSearch.toLowerCase());
      if (!nameMatch) return false;
      if (roleTypeFilter === 'system') return r.is_system;
      if (roleTypeFilter === 'custom') return !r.is_system;
      return true;
    });
  }, [roleList, roleSearch, roleTypeFilter]);

  // Handle Row Selection
  const handleRowClick = useCallback((role) => {
    setSelectedRole(role);
    const activePermIds = role.permissions?.map(p => p.id) || [];
    setSelectedPermissionIds(activePermIds);
    setPermSearch('');
    setCollapsedCategories({});
  }, []);

  const handlePermissionToggle = (permId) => {
    if (selectedRole?.is_system) return; // Prevent mutation on system protected roles
    setSelectedPermissionIds(prev => 
      prev.includes(permId) ? prev.filter(id => id !== permId) : [...prev, permId]
    );
  };

  const handleSavePermissionsSubmit = (e) => {
    e.preventDefault();
    if (!selectedRole || selectedRole.is_system) return;

    // Convert permission UUIDs to permission names for backend endpoint
    const permissionNames = permissionList
      .filter(p => selectedPermissionIds.includes(p.id))
      .map(p => p.name);

    triggerSudo(() => {
      setIsSaving(true);
      saveRolePermissionsMutation.mutate({
        roleId: selectedRole.id,
        permissionNames
      }, {
        onSettled: () => {
          setIsSaving(false);
        }
      });
    });
  };

  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      await downloadCSV('/admin/roles', 'roles_export');
      showToast('Roles exported successfully.', 'success');
    } catch (err) {
      showToast('Exporting current roles snapshot...', 'info');
      const headers = ['Role ID', 'Role Name', 'Priority', 'Type', 'Description', 'Active Permissions'];
      const rows = filteredRoles.map(r => [
        `"${r.id}"`,
        `"${r.name}"`,
        r.priority,
        r.is_system ? 'System Protected' : 'Custom Scope',
        `"${r.description}"`,
        r.permissions?.length || 0
      ]);
      const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `roles_matrix_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setIsExporting(false);
    }
  };

  // Keyboard accessibility
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && selectedRole) {
        setSelectedRole(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedRole]);

  // Categorized Permission Groups inside Drawer
  const groupedPermissions = useMemo(() => {
    const groups = {};
    PERMISSION_DOMAINS.forEach(d => { groups[d.id] = []; });

    permissionList.forEach(perm => {
      const catId = getPermissionCategory(perm.name);
      if (!groups[catId]) groups[catId] = [];
      
      const searchMatch = !permSearch || 
        perm.name.toLowerCase().includes(permSearch.toLowerCase()) || 
        (perm.description || '').toLowerCase().includes(permSearch.toLowerCase());
      
      if (searchMatch) {
        groups[catId].push(perm);
      }
    });

    return groups;
  }, [permissionList, permSearch]);

  const totalFilteredPermsCount = useMemo(() => {
    return Object.values(groupedPermissions).reduce((acc, list) => acc + list.length, 0);
  }, [groupedPermissions]);

  const toggleCategoryCollapse = (catId) => {
    setCollapsedCategories(prev => ({ ...prev, [catId]: !prev[catId] }));
  };

  const handleSelectCategory = (catId, select) => {
    if (selectedRole?.is_system) return;
    const categoryPermIds = (groupedPermissions[catId] || []).map(p => p.id);
    setSelectedPermissionIds(prev => {
      if (select) {
        return Array.from(new Set([...prev, ...categoryPermIds]));
      } else {
        return prev.filter(id => !categoryPermIds.includes(id));
      }
    });
  };

  // Table Columns Setup
  const columns = useMemo(() => [
    {
      header: 'Role Identity & Scope',
      accessor: 'name',
      sortable: true,
      render: (row) => {
        const isSuperAdmin = (row.name || '').toLowerCase() === 'super admin' || row.priority >= 100;

        return (
          <div className="flex items-center gap-3.5 py-1 group">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border transition-transform duration-200 group-hover:scale-105 shadow-2xs ${
              isSuperAdmin
                ? 'bg-gradient-to-br from-amber-500/10 to-purple-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                : row.is_system
                ? 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950/60 dark:text-blue-400 dark:border-blue-800'
                : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
            }`}>
              {isSuperAdmin ? <Crown className="w-5 h-5" /> : row.is_system ? <ShieldCheck className="w-5 h-5" /> : <Key className="w-5 h-5" />}
            </div>
            <div className="flex flex-col gap-0.5 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-slate-900 dark:text-white text-xs group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {row.name}
                </span>
                {row.is_system && (
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800 uppercase tracking-wide">
                    Protected
                  </span>
                )}
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate max-w-md">
                {row.description}
              </span>
            </div>
          </div>
        );
      }
    },
    {
      header: 'Priority Rank',
      accessor: 'priority',
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-1.5 font-mono">
          <span className={`px-2.5 py-1 rounded-xl text-xs font-black border shadow-2xs ${
            row.priority >= 100
              ? 'bg-gradient-to-r from-purple-50 to-indigo-50 text-purple-700 border-purple-200 dark:from-purple-950/40 dark:to-indigo-950/40 dark:text-purple-300 dark:border-purple-800'
              : row.priority >= 50
              ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
              : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
          }`}>
            Level {row.priority}
          </span>
        </div>
      )
    },
    {
      header: 'Role Type',
      accessor: 'is_system',
      sortable: true,
      render: (row) => (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider border shadow-2xs ${
          row.is_system 
            ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800' 
            : 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800'
        }`}>
          {row.is_system ? <Lock className="w-3 h-3" /> : <Sparkles className="w-3 h-3" />}
          {row.is_system ? 'System Role' : 'Custom Scope'}
        </span>
      )
    },
    {
      header: 'Active Permissions',
      accessor: 'permissions',
      render: (row) => {
        const count = row.permissions?.length || 0;
        const total = permissionList.length || count;
        return (
          <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-xl border shadow-2xs ${
            count > 0 
              ? 'text-indigo-700 bg-indigo-50 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800/80' 
              : 'text-slate-500 bg-slate-100 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
          }`}>
            <Shield className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            <span className="font-mono">{count} / {total}</span>
          </span>
        );
      }
    },
    {
      header: 'Actions',
      accessor: 'actions',
      render: (row) => (
        <RoleActionMenuCell
          role={row}
          onInspect={handleRowClick}
          navigate={navigate}
        />
      )
    }
  ], [handleRowClick, navigate, permissionList.length]);

  if (rolesError) {
    return (
      <div className="p-6 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-2xl dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-400 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0" />
          <span>Failed to load roles: {rolesError.message || 'Unknown error'}</span>
        </div>
        <button
          type="button"
          onClick={() => queryClient.invalidateQueries(['admin-roles-list'])}
          className="px-3 py-1.5 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-500 transition-all cursor-pointer"
        >
          Retry Load
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 relative w-full pb-16 font-sans">
      {/* ── 1. EXECUTIVE PAGE HEADER ────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <ShieldCheck className="w-6 h-6 text-blue-600 dark:text-blue-400 shrink-0" />
            <span>Roles & Permissions Governance</span>
          </h1>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">
            Manage platform system roles, configure granular permission scope gates, and enforce least-privilege security policy.
          </p>
        </div>
      </div>

      {/* ── 2. ENTERPRISE KPI CARDS (COMPACT SLEEK PROPORTIONS) ───────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Card 1: Total Roles */}
        <div 
          onClick={() => { setRoleTypeFilter('all'); setRoleSearch(''); }}
          className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:shadow-lg hover:-translate-y-0.5 hover:border-blue-400/50 hover:bg-blue-50/10 dark:hover:bg-slate-800/80 transition-all duration-200 ease-out cursor-pointer flex flex-col justify-between gap-1.5 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Roles
            </span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-black text-slate-900 dark:text-white font-mono tracking-tight">{metrics.total}</span>
            <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800 uppercase">
              All Roles
            </span>
          </div>
          <span className="text-[9.5px] text-slate-500 dark:text-slate-400 font-medium truncate">Cataloged Roles</span>
        </div>

        {/* Card 2: System Protected */}
        <div 
          onClick={() => { setRoleTypeFilter('system'); setRoleSearch(''); }}
          className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:shadow-lg hover:-translate-y-0.5 hover:border-purple-400/50 hover:bg-purple-50/10 dark:hover:bg-slate-800/80 transition-all duration-200 ease-out cursor-pointer flex flex-col justify-between gap-1.5 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-600 dark:text-purple-400">
              System Protected
            </span>
            <div className="w-7 h-7 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Lock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-black text-purple-600 dark:text-purple-400 font-mono tracking-tight">{metrics.system}</span>
            <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-md bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800 uppercase">
              Immutable
            </span>
          </div>
          <span className="text-[9.5px] text-slate-500 dark:text-slate-400 font-medium truncate">Control Plane Core</span>
        </div>

        {/* Card 3: Custom Scopes */}
        <div 
          onClick={() => { setRoleTypeFilter('custom'); setRoleSearch(''); }}
          className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:shadow-lg hover:-translate-y-0.5 hover:border-emerald-400/50 hover:bg-emerald-50/10 dark:hover:bg-slate-800/80 transition-all duration-200 ease-out cursor-pointer flex flex-col justify-between gap-1.5 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Custom Scopes
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Key className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono tracking-tight">{metrics.custom}</span>
            <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 uppercase">
              Configurable
            </span>
          </div>
          <span className="text-[9.5px] text-slate-500 dark:text-slate-400 font-medium truncate">Custom Application Scopes</span>
        </div>

        {/* Card 4: Scope Gates */}
        <div 
          className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:shadow-lg hover:-translate-y-0.5 hover:border-indigo-400/50 hover:bg-indigo-50/10 dark:hover:bg-slate-800/80 transition-all duration-200 ease-out cursor-pointer flex flex-col justify-between gap-1.5 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Scope Gates
            </span>
            <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Sliders className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-black text-indigo-600 dark:text-indigo-400 font-mono tracking-tight">{metrics.totalPermissions}</span>
            <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 uppercase">
              Registered
            </span>
          </div>
          <span className="text-[9.5px] text-slate-500 dark:text-slate-400 font-medium truncate">Fine-Grained RBAC</span>
        </div>
      </div>

      {/* ── 3. FILTER & SEARCH TOOLBAR ──────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
        <div className="flex items-center gap-3 w-full sm:w-auto flex-grow max-w-md">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search roles by name or description…"
              value={roleSearch}
              onChange={(e) => setRoleSearch(e.target.value)}
              aria-label="Search roles"
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-8 py-2 text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 focus-visible:border-blue-500 transition-all"
            />
            {roleSearch && (
              <button
                type="button"
                onClick={() => setRoleSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end overflow-x-auto">
          {/* Role Type Filter Pills */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setRoleTypeFilter('all')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                roleTypeFilter === 'all'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All Roles ({roleList.length})
            </button>
            <button
              type="button"
              onClick={() => setRoleTypeFilter('system')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                roleTypeFilter === 'system'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              System Protected ({metrics.system})
            </button>
            <button
              type="button"
              onClick={() => setRoleTypeFilter('custom')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                roleTypeFilter === 'custom'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Custom Scopes ({metrics.custom})
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              queryClient.invalidateQueries(['admin-roles-list']);
              showToast('Roles catalog refreshed.', 'info');
            }}
            disabled={rolesFetching}
            className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-500 rounded-xl text-slate-700 dark:text-slate-300 transition-all cursor-pointer shadow-2xs shrink-0 focus-visible:ring-2 focus-visible:ring-blue-500/20"
            title="Refresh Roles"
          >
            <RefreshCw className={`w-4 h-4 ${rolesFetching ? 'animate-spin text-blue-600' : ''}`} />
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            disabled={isExporting}
            className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-500 rounded-xl text-slate-700 dark:text-slate-300 transition-all cursor-pointer shadow-2xs shrink-0 focus-visible:ring-2 focus-visible:ring-blue-500/20"
            title="Export CSV"
          >
            <Download className="w-4 h-4 text-emerald-500" />
          </button>
        </div>
      </div>

      {/* ── 4. ROLES DATA TABLE ────────────────────────────────────────────────── */}
      <div className="w-full">
        <AdminDataTable
          columns={columns}
          data={filteredRoles}
          isLoading={rolesLoading}
          onRowClick={handleRowClick}
          emptyMessage={roleSearch ? `No roles matched search "${roleSearch}"` : 'No roles cataloged'}
        />
      </div>

      {/* ── 5. ROLE INSPECTION & PERMISSION GOVERNANCE DRAWER ──────────────────── */}
      <AdminDetailDrawer
        isOpen={!!selectedRole}
        onClose={() => setSelectedRole(null)}
        title={`Role Inspection & Scope Gates: ${selectedRole?.name}`}
      >
        {selectedRole && (
          <form onSubmit={handleSavePermissionsSubmit} className="space-y-4 flex flex-col h-full text-xs">
            <div className="flex-grow space-y-4 min-h-0 flex flex-col overflow-y-auto pr-1">
              
              {/* Role Header Banner — Primary Visual Focus on Role Name */}
              <div className="bg-slate-50 dark:bg-slate-800/80 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700 space-y-2.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="font-black text-base text-slate-900 dark:text-white truncate">{selectedRole.name}</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase border shrink-0 ${
                      selectedRole.is_system
                        ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300'
                    }`}>
                      {selectedRole.is_system ? 'System Protected' : 'Custom Scope'}
                    </span>
                  </div>
                  <span className="font-mono text-[11px] font-bold text-slate-500 dark:text-slate-400 shrink-0">
                    Priority Level {selectedRole.priority}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                  {selectedRole.description}
                </p>

                {/* Real Metadata Section (Only Backend Exposed Fields) */}
                <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  {selectedRole.created_at && (
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      <span>Created: {new Date(selectedRole.created_at).toLocaleDateString()}</span>
                    </div>
                  )}
                  {selectedRole.updated_at && (
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>Updated: {new Date(selectedRole.updated_at).toLocaleDateString()}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1 font-mono">
                    <Shield className="w-3 h-3 text-indigo-500" />
                    <span>Configured Scope: {selectedPermissionIds.length} / {permissionList.length}</span>
                  </div>
                </div>
              </div>

              {/* SYSTEM ROLE PROTECTION WARNING BANNER */}
              {selectedRole.is_system && (
                <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 rounded-2xl text-amber-800 dark:text-amber-300 flex items-start gap-3 shadow-2xs">
                  <Lock className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div className="flex flex-col gap-0.5">
                    <span className="font-bold text-xs">System Protected Role Policy</span>
                    <span className="text-[11px] leading-relaxed font-medium opacity-95">
                      Standard system roles are immutable to preserve control plane safety. Permission scope gates for system roles cannot be modified directly in the UI.
                    </span>
                  </div>
                </div>
              )}

              {/* PERMISSION SEARCH & TOOLBAR */}
              <div className="space-y-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search permission scope gates by name or resource..."
                    value={permSearch}
                    onChange={e => setPermSearch(e.target.value)}
                    aria-label="Search permission scope gates"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-8 pr-3 py-2 text-xs font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 text-slate-900 dark:text-white placeholder-slate-400"
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">
                  <span>
                    Scope Gates ({selectedPermissionIds.length} / {permissionList.length} Active)
                  </span>
                  {!selectedRole.is_system && (
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedPermissionIds.length === permissionList.length) setSelectedPermissionIds([]);
                        else setSelectedPermissionIds(permissionList.map(p => p.id));
                      }}
                      className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer flex items-center gap-1 font-bold"
                    >
                      {selectedPermissionIds.length === permissionList.length ? (
                        <>
                          <Square className="w-3 h-3" />
                          <span>Deselect All</span>
                        </>
                      ) : (
                        <>
                          <CheckSquare className="w-3 h-3" />
                          <span>Select All</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* CATEGORIZED DOMAIN ACCORDIONS */}
              {permissionsLoading ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2">
                  <LoaderIcon width={28} height={28} color="#3b82f6" />
                  <span className="text-xs font-semibold text-slate-400">Loading permission scope gates...</span>
                </div>
              ) : totalFilteredPermsCount === 0 ? (
                <div className="py-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">No matching permissions found.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {PERMISSION_DOMAINS.map(domain => {
                    const categoryPerms = groupedPermissions[domain.id] || [];
                    if (categoryPerms.length === 0) return null;

                    const IconComp = domain.icon;
                    const isCollapsed = collapsedCategories[domain.id];
                    const activeInCategory = categoryPerms.filter(p => selectedPermissionIds.includes(p.id)).length;
                    const isAllSelected = categoryPerms.length > 0 && activeInCategory === categoryPerms.length;

                    return (
                      <div 
                        key={domain.id}
                        className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900 transition-all duration-200 shadow-2xs"
                      >
                        {/* Category Header */}
                        <div 
                          onClick={() => toggleCategoryCollapse(domain.id)}
                          className="px-4 py-3 bg-slate-50/90 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between cursor-pointer border-b border-slate-200/60 dark:border-slate-800 select-none transition-colors"
                        >
                          <div className="flex items-center gap-2.5">
                            <IconComp className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                            <span className="font-bold text-xs text-slate-800 dark:text-slate-200">{domain.label}</span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-extrabold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                              {activeInCategory} / {categoryPerms.length}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            {!selectedRole.is_system && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSelectCategory(domain.id, !isAllSelected);
                                }}
                                className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline px-2 py-0.5 rounded hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
                              >
                                {isAllSelected ? 'Clear' : 'Select'}
                              </button>
                            )}
                            {isCollapsed ? (
                              <ChevronRight className="w-4 h-4 text-slate-400" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-slate-400" />
                            )}
                          </div>
                        </div>

                        {/* Category Items */}
                        {!isCollapsed && (
                          <div className="p-2.5 space-y-2 bg-white dark:bg-slate-900">
                            {categoryPerms.map(perm => {
                              const isChecked = selectedPermissionIds.includes(perm.id);
                              return (
                                <label 
                                  key={perm.id} 
                                  className={`flex items-start gap-3 p-3 rounded-xl border transition-all duration-150 ${
                                    selectedRole.is_system
                                      ? 'opacity-85 bg-slate-50 dark:bg-slate-800/30 border-slate-200/60 dark:border-slate-800 cursor-not-allowed'
                                      : isChecked
                                      ? 'bg-blue-50/70 border-blue-200 dark:bg-blue-950/40 dark:border-blue-800/80 cursor-pointer shadow-2xs'
                                      : 'bg-slate-50/40 dark:bg-slate-800/20 hover:bg-slate-100 dark:hover:bg-slate-800/60 border-slate-200/60 dark:border-slate-800 cursor-pointer'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => handlePermissionToggle(perm.id)}
                                    disabled={selectedRole.is_system}
                                    aria-label={`Toggle permission ${perm.name}`}
                                    className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer disabled:cursor-not-allowed"
                                  />
                                  <div className="flex flex-col gap-0.5 min-w-0">
                                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 font-mono tracking-tight">{perm.name}</span>
                                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-normal">{perm.description}</span>
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* STICKY FOOTER ACTIONS */}
            <div className="border-t border-slate-200 dark:border-slate-800 pt-3 flex items-center justify-between mt-auto">
              <button
                type="button"
                onClick={() => setSelectedRole(null)}
                className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSaving || selectedRole.is_system}
                className={`px-5 py-2.5 text-xs font-bold text-white rounded-xl transition-all shadow-md flex items-center gap-2 ${
                  selectedRole.is_system
                    ? 'bg-slate-400 dark:bg-slate-800 cursor-not-allowed opacity-60'
                    : 'bg-blue-600 hover:bg-blue-500 cursor-pointer active:scale-95'
                }`}
              >
                {isSaving && <LoaderIcon width={12} height={12} color="white" />}
                <span>{selectedRole.is_system ? 'System Protected (Read-Only)' : 'Apply Permissions Matrix (Sudo Gated)'}</span>
              </button>
            </div>
          </form>
        )}
      </AdminDetailDrawer>
    </div>
  );
}
