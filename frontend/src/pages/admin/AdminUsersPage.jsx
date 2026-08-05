import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { 
  Users, 
  Activity, 
  Clock, 
  Lock, 
  ShieldCheck, 
  Key, 
  RefreshCw, 
  MoreVertical, 
  UserCheck, 
  ShieldAlert, 
  ChevronRight,
  Send,
  UserX,
  Unlock,
  Trash2,
  RotateCcw,
  LogOut,
  User,
  ExternalLink,
  Shield,
  FileText,
  AlertTriangle,
  CheckSquare,
  Square,
  X
} from 'lucide-react';
import { 
  getAdminUsers, 
  suspendUser, 
  unsuspendUser,
  disableUser,
  enableUser,
  softDeleteUser,
  restoreUser,
  verifyUserEmail,
  resendUserVerification,
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

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatRelativeTime(raw) {
  if (!raw) return 'Never';
  try {
    const d = new Date(raw);
    if (isNaN(d.getTime())) return 'Never';
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
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch (_) { return 'Never'; }
}

function getUserDisplayName(name, email) {
  if (name && name.trim()) return name.trim();
  if (email && email.includes('@')) {
    const handle = email.split('@')[0];
    return handle.charAt(0).toUpperCase() + handle.slice(1);
  }
  return 'User Profile';
}

function getUserInitials(name, email) {
  const str = (name && name.trim()) ? name : (email || 'User');
  const parts = str.trim().split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return str.slice(0, 2).toUpperCase();
}

// ─── Floating User Action Menu Component (using Portal for z-[99999] Stacking Immunity) ───
function UserActionMenuCell({
  row,
  activeMenuUserId,
  setActiveMenuUserId,
  setSelectedUser,
  handleImpersonate,
  handleVerifyEmail,
  handleResendVerification,
  handleUnsuspendUser,
  handleEnableUser,
  handleUnlockUser,
  handleRestoreUser,
  handleDisableUser,
  handleSoftDeleteUser,
  handleForceLogout,
  setActionState,
  navigate
}) {
  const buttonRef = useRef(null);
  const [coords, setCoords] = useState(null);
  const isMenuOpen = activeMenuUserId === row.id;

  const updateCoords = useCallback(() => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const opensUpward = spaceBelow < 360;

      setCoords({
        opensUpward,
        top: opensUpward ? 'auto' : `${rect.bottom + 4}px`,
        bottom: opensUpward ? `${window.innerHeight - rect.top + 4}px` : 'auto',
        right: `${Math.max(12, window.innerWidth - rect.right)}px`
      });
    }
  }, []);

  const toggleMenu = (e) => {
    e.stopPropagation();
    if (isMenuOpen) {
      setActiveMenuUserId(null);
    } else {
      updateCoords();
      setActiveMenuUserId(row.id);
    }
  };

  useEffect(() => {
    if (!isMenuOpen) return;
    const handleScroll = () => updateCoords();
    const handleClickOutside = () => setActiveMenuUserId(null);

    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleScroll);
    window.addEventListener('click', handleClickOutside);

    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleScroll);
      window.removeEventListener('click', handleClickOutside);
    };
  }, [isMenuOpen, updateCoords, setActiveMenuUserId]);

  const statusUpper = (row.status || '').toUpperCase();
  const isPending = statusUpper === 'PENDING_VERIFICATION' || statusUpper === 'UNVERIFIED';
  const isSuspended = statusUpper === 'BANNED' || statusUpper === 'SUSPENDED';
  const isDisabled = statusUpper === 'DISABLED';
  const isLocked = statusUpper === 'LOCKED' || (row.failed_login_count || 0) > 0;
  const isSoftDeleted = statusUpper === 'SOFT_DELETED';
  const isActive = statusUpper === 'ACTIVE';

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <button
        ref={buttonRef}
        type="button"
        aria-label="User Actions Menu"
        onClick={toggleMenu}
        className={`p-1.5 rounded-lg transition-all cursor-pointer focus:ring-2 focus:ring-blue-500/20 ${
          isMenuOpen 
            ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 ring-2 ring-blue-500/30' 
            : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
        }`}
        title="User Actions Menu"
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {isMenuOpen && coords && createPortal(
        <div
          style={{ 
            top: coords.top, 
            bottom: coords.bottom, 
            right: coords.right,
            maxHeight: 'calc(100vh - 24px)'
          }}
          className="fixed z-[99999] w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl p-1 flex flex-col gap-0.5 text-xs animate-scale-in overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => {
              setSelectedUser(row);
              setActiveMenuUserId(null);
            }}
            className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold flex items-center justify-between cursor-pointer"
          >
            <span>Inspect & Edit Profile</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          </button>

          <button
            type="button"
            onClick={() => {
              handleImpersonate(row);
              setActiveMenuUserId(null);
            }}
            className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-bold cursor-pointer flex items-center gap-2"
          >
            <User className="w-3.5 h-3.5" />
            <span>Impersonate Session</span>
          </button>

          <div className="h-px bg-slate-200 dark:bg-slate-800 my-0.5" />

          {/* CONTEXTUAL SECURITY LINKS */}
          <button
            type="button"
            onClick={() => {
              navigate(`/admin/operations/audit-logs?search=${encodeURIComponent(row.email)}`);
              setActiveMenuUserId(null);
            }}
            className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer flex items-center gap-2"
          >
            <FileText className="w-3.5 h-3.5 text-blue-500" />
            <span>View Audit History</span>
          </button>

          <button
            type="button"
            onClick={() => {
              navigate(`/admin/operations/auth-events?search=${encodeURIComponent(row.email)}`);
              setActiveMenuUserId(null);
            }}
            className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer flex items-center gap-2"
          >
            <Shield className="w-3.5 h-3.5 text-indigo-500" />
            <span>Authentication Events</span>
          </button>

          <button
            type="button"
            onClick={() => {
              navigate(`/admin/operations/active-sessions?search=${encodeURIComponent(row.email)}`);
              setActiveMenuUserId(null);
            }}
            className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer flex items-center gap-2"
          >
            <Activity className="w-3.5 h-3.5 text-emerald-500" />
            <span>Active Sessions</span>
          </button>

          <div className="h-px bg-slate-200 dark:bg-slate-800 my-0.5" />

          {/* STATE-DRIVEN LIFECYCLE ACTIONS */}
          {isPending && (
            <>
              <button
                type="button"
                onClick={() => {
                  handleVerifyEmail(row.id);
                  setActiveMenuUserId(null);
                }}
                className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-bold cursor-pointer flex items-center gap-2"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Verify Email Address</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  handleResendVerification(row.id);
                  setActiveMenuUserId(null);
                }}
                className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/40 text-amber-600 dark:text-amber-400 font-bold cursor-pointer flex items-center gap-2"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Resend Verification</span>
              </button>
            </>
          )}

          {isSuspended && (
            <button
              type="button"
              onClick={() => {
                handleUnsuspendUser(row.id);
                setActiveMenuUserId(null);
              }}
              className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-bold cursor-pointer flex items-center gap-2"
            >
              <Unlock className="w-3.5 h-3.5" />
              <span>Unsuspend Profile</span>
            </button>
          )}

          {isDisabled && (
            <button
              type="button"
              onClick={() => {
                handleEnableUser(row.id);
                setActiveMenuUserId(null);
              }}
              className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-bold cursor-pointer flex items-center gap-2"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Enable Profile</span>
            </button>
          )}

          {isLocked && (
            <button
              type="button"
              onClick={() => {
                handleUnlockUser(row.id);
                setActiveMenuUserId(null);
              }}
              className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-bold cursor-pointer flex items-center gap-2"
            >
              <Unlock className="w-3.5 h-3.5" />
              <span>Unlock Account</span>
            </button>
          )}

          {isSoftDeleted && (
            <button
              type="button"
              onClick={() => {
                handleRestoreUser(row.id);
                setActiveMenuUserId(null);
              }}
              className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-bold cursor-pointer flex items-center gap-2"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restore User Profile</span>
            </button>
          )}

          {isActive && (
            <>
              <button
                type="button"
                onClick={() => {
                  handleDisableUser(row.id);
                  setActiveMenuUserId(null);
                }}
                className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/40 text-amber-600 dark:text-amber-400 font-bold cursor-pointer flex items-center gap-2"
              >
                <UserX className="w-3.5 h-3.5" />
                <span>Disable Account</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedUser(row);
                  setActionState({ isOpen: true, type: 'suspend', reason: '' });
                  setActiveMenuUserId(null);
                }}
                className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-bold cursor-pointer flex items-center gap-2"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Suspend Account</span>
              </button>
            </>
          )}

          <div className="h-px bg-slate-200 dark:bg-slate-800 my-0.5" />

          <button
            type="button"
            onClick={() => {
              handleForceLogout(row);
              setActiveMenuUserId(null);
            }}
            className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold cursor-pointer flex items-center gap-2"
          >
            <LogOut className="w-3.5 h-3.5 text-slate-500" />
            <span>Force Sign Out</span>
          </button>

          {!isSoftDeleted && (
            <button
              type="button"
              onClick={() => {
                handleSoftDeleteUser(row.id);
                setActiveMenuUserId(null);
              }}
              className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-bold cursor-pointer flex items-center gap-2"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Soft Delete</span>
            </button>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}

export default function AdminUsersPage() {
  const { triggerSudo } = useOutletContext();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [providerFilter, setProviderFilter] = useState('');
  const [sortField, setSortField] = useState('created_at');
  const [sortDirection, setSortDirection] = useState('desc');
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [isExporting, setIsExporting] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [copiedField, setCopiedField] = useState(null);
  const [activeMenuUserId, setActiveMenuUserId] = useState(null);
  
  const queryClient = useQueryClient();
  const { showToast } = useToastStore();

  const [actionState, setActionState] = useState({ isOpen: false, type: null, reason: '' });

  // Escape Key Handler for Accessibility
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (actionState.isOpen) {
          setActionState({ isOpen: false, type: null, reason: '' });
        } else if (activeMenuUserId) {
          setActiveMenuUserId(null);
        } else if (selectedUser) {
          setSelectedUser(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [actionState.isOpen, activeMenuUserId, selectedUser]);

  // Queries
  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: ['admin-users', { page, limit, search, status: statusFilter, provider: providerFilter, sort: sortField, order: sortDirection }],
    queryFn: () => getAdminUsers({ page, limit, search, status: statusFilter, provider: providerFilter, sort: sortField, order: sortDirection }),
    keepPreviousData: true
  });

  const { data: roles } = useQuery({
    queryKey: ['admin-roles'],
    queryFn: listRoles
  });

  // Action Executions
  const handleVerifyEmail = useCallback(async (userId) => {
    setIsActionLoading(true);
    try {
      await verifyUserEmail(userId);
      showToast('User email address verified successfully.', 'success');
      queryClient.invalidateQueries(['admin-users']);
      if (selectedUser?.id === userId) setSelectedUser(prev => ({ ...prev, status: 'ACTIVE' }));
    } catch (err) {
      showToast(err?.response?.data?.message || 'Failed to verify email.', 'error');
    } finally {
      setIsActionLoading(false);
    }
  }, [queryClient, selectedUser, showToast]);

  const handleResendVerification = useCallback(async (userId) => {
    setIsActionLoading(true);
    try {
      await resendUserVerification(userId);
      showToast('Verification email dispatched successfully.', 'success');
    } catch (err) {
      showToast(err?.response?.data?.message || 'Failed to resend verification email.', 'error');
    } finally {
      setIsActionLoading(false);
    }
  }, [showToast]);

  const handleEnableUser = useCallback(async (userId) => {
    setIsActionLoading(true);
    try {
      await enableUser(userId);
      showToast('User account enabled successfully.', 'success');
      queryClient.invalidateQueries(['admin-users']);
      if (selectedUser?.id === userId) setSelectedUser(prev => ({ ...prev, status: 'ACTIVE' }));
    } catch (err) {
      showToast(err?.response?.data?.message || 'Failed to enable user.', 'error');
    } finally {
      setIsActionLoading(false);
    }
  }, [queryClient, selectedUser, showToast]);

  const handleDisableUser = useCallback(async (userId) => {
    setIsActionLoading(true);
    try {
      await disableUser(userId, 'Disabled by administrator');
      showToast('User account disabled successfully.', 'success');
      queryClient.invalidateQueries(['admin-users']);
      if (selectedUser?.id === userId) setSelectedUser(prev => ({ ...prev, status: 'DISABLED' }));
    } catch (err) {
      showToast(err?.response?.data?.message || 'Failed to disable user.', 'error');
    } finally {
      setIsActionLoading(false);
    }
  }, [queryClient, selectedUser, showToast]);

  const handleSuspendUser = useCallback(async (userId, reason) => {
    setIsActionLoading(true);
    try {
      await suspendUser(userId, reason);
      showToast('User account suspended successfully.', 'success');
      queryClient.invalidateQueries(['admin-users']);
      if (selectedUser?.id === userId) setSelectedUser(prev => ({ ...prev, status: 'BANNED' }));
    } catch (err) {
      showToast(err?.response?.data?.message || 'Failed to suspend user.', 'error');
    } finally {
      setIsActionLoading(false);
    }
  }, [queryClient, selectedUser, showToast]);

  const handleUnsuspendUser = useCallback(async (userId) => {
    setIsActionLoading(true);
    try {
      await unsuspendUser(userId);
      showToast('User account unsuspended successfully.', 'success');
      queryClient.invalidateQueries(['admin-users']);
      if (selectedUser?.id === userId) setSelectedUser(prev => ({ ...prev, status: 'ACTIVE' }));
    } catch (err) {
      showToast(err?.response?.data?.message || 'Failed to unsuspend user.', 'error');
    } finally {
      setIsActionLoading(false);
    }
  }, [queryClient, selectedUser, showToast]);

  const handleUnlockUser = useCallback(async (userId) => {
    setIsActionLoading(true);
    try {
      await unlockUser(userId);
      showToast('User account unlocked successfully.', 'success');
      queryClient.invalidateQueries(['admin-users']);
      if (selectedUser?.id === userId) setSelectedUser(prev => ({ ...prev, status: 'ACTIVE', failed_login_count: 0 }));
    } catch (err) {
      showToast(err?.response?.data?.message || 'Failed to unlock user.', 'error');
    } finally {
      setIsActionLoading(false);
    }
  }, [queryClient, selectedUser, showToast]);

  const handleSoftDeleteUser = useCallback(async (userId) => {
    setIsActionLoading(true);
    try {
      await softDeleteUser(userId);
      showToast('User profile soft-deleted successfully.', 'success');
      queryClient.invalidateQueries(['admin-users']);
      if (selectedUser?.id === userId) setSelectedUser(prev => ({ ...prev, status: 'SOFT_DELETED' }));
    } catch (err) {
      showToast(err?.response?.data?.message || 'Failed to soft delete user.', 'error');
    } finally {
      setIsActionLoading(false);
    }
  }, [queryClient, selectedUser, showToast]);

  const handleRestoreUser = useCallback(async (userId) => {
    setIsActionLoading(true);
    try {
      await restoreUser(userId);
      showToast('User profile restored successfully.', 'success');
      queryClient.invalidateQueries(['admin-users']);
      if (selectedUser?.id === userId) setSelectedUser(prev => ({ ...prev, status: 'ACTIVE' }));
    } catch (err) {
      showToast(err?.response?.data?.message || 'Failed to restore user.', 'error');
    } finally {
      setIsActionLoading(false);
    }
  }, [queryClient, selectedUser, showToast]);

  const handleForceLogout = useCallback(async (userTarget) => {
    const target = userTarget || selectedUser;
    if (!target) return;
    setIsActionLoading(true);
    try {
      await forceLogoutUser(target.id);
      showToast('User sessions revoked successfully.', 'success');
      queryClient.invalidateQueries(['admin-users']);
    } catch (err) {
      showToast('Failed to force logout user.', 'error');
    } finally {
      setIsActionLoading(false);
    }
  }, [queryClient, selectedUser, showToast]);

  const handleImpersonate = useCallback((userTarget) => {
    const target = userTarget || selectedUser;
    if (!target) return;
    triggerSudo(async () => {
      setIsActionLoading(true);
      try {
        const res = await initiateImpersonation(target.id);
        const payload = res.data;
        if (payload?.accessToken) {
          showToast(`Impersonation session started for ${target.email}`, 'success');
          localStorage.setItem('isImpersonated', 'true');
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
  }, [selectedUser, showToast, triggerSudo]);

  const handleRoleChange = useCallback((roleId) => {
    if (!roleId) return;
    triggerSudo(async () => {
      setIsActionLoading(true);
      try {
        await updateUserRole(selectedUser.id, roleId);
        showToast('User role updated successfully.', 'success');
        queryClient.invalidateQueries(['admin-users']);
        setSelectedUser(prev => ({ ...prev, role_id: roleId }));
      } catch (err) {
        showToast(err?.response?.data?.message || 'Failed to update user role.', 'error');
      } finally {
        setIsActionLoading(false);
      }
    });
  }, [queryClient, selectedUser, showToast, triggerSudo]);

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    try {
      await downloadCSV('/admin/users', 'admin_users', { search, status: statusFilter, provider: providerFilter, sort: sortField, order: sortDirection });
      showToast('Users exported successfully.', 'success');
    } catch (err) {
      showToast('Failed to export CSV.', 'error');
    } finally {
      setIsExporting(false);
    }
  }, [providerFilter, search, sortDirection, sortField, statusFilter, showToast]);

  const handleCopyText = useCallback((text, fieldName) => {
    if (!text) return;
    navigator.clipboard.writeText(String(text));
    setCopiedField(fieldName);
    showToast(`${fieldName} copied to clipboard.`, 'success');
    setTimeout(() => setCopiedField(null), 2000);
  }, [showToast]);

  // Bulk Actions Handlers
  const handleToggleSelectAll = useCallback(() => {
    const currentUsers = data?.users || [];
    if (selectedUserIds.length === currentUsers.length && currentUsers.length > 0) {
      setSelectedUserIds([]);
    } else {
      setSelectedUserIds(currentUsers.map(u => u.id));
    }
  }, [data?.users, selectedUserIds.length]);

  const handleToggleSelectRow = useCallback((id) => {
    setSelectedUserIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  }, []);

  const handleBulkOperation = useCallback(async (operationType) => {
    if (selectedUserIds.length === 0) return;
    setIsActionLoading(true);
    try {
      if (operationType === 'suspend') {
        await Promise.allSettled(selectedUserIds.map(id => suspendUser(id, 'Bulk administrative action')));
        showToast(`Bulk suspend completed for ${selectedUserIds.length} users.`, 'success');
      } else if (operationType === 'enable') {
        await Promise.allSettled(selectedUserIds.map(id => enableUser(id)));
        showToast(`Bulk enable completed for ${selectedUserIds.length} users.`, 'success');
      } else if (operationType === 'disable') {
        await Promise.allSettled(selectedUserIds.map(id => disableUser(id, 'Bulk administrative action')));
        showToast(`Bulk disable completed for ${selectedUserIds.length} users.`, 'success');
      } else if (operationType === 'logout') {
        await Promise.allSettled(selectedUserIds.map(id => forceLogoutUser(id)));
        showToast(`Bulk force logout completed for ${selectedUserIds.length} users.`, 'success');
      }
      queryClient.invalidateQueries(['admin-users']);
      setSelectedUserIds([]);
    } catch (err) {
      showToast('Some bulk operations failed.', 'error');
    } finally {
      setIsActionLoading(false);
    }
  }, [queryClient, selectedUserIds, showToast]);

  const getRoleName = useCallback((roleId) => {
    if (!roleId) return 'Unassigned';
    const found = roles?.find(r => String(r.id) === String(roleId));
    return found ? found.name : 'Unassigned';
  }, [roles]);

  // Quick Filter Chips definition
  const quickFilters = useMemo(() => [
    { label: 'All Users', status: '', provider: '' },
    { label: 'Active', status: 'ACTIVE', provider: '' },
    { label: 'Pending Verification', status: 'PENDING_VERIFICATION', provider: '' },
    { label: 'Banned / Locked', status: 'BANNED', provider: '' },
    { label: 'Google OAuth', status: '', provider: 'google' },
    { label: 'Password Auth', status: '', provider: 'local' },
  ], []);

  // System summary stats
  const summary = data?.summary;
  const totalCount = summary?.total ?? 0;
  const activeCount = summary?.active ?? 0;
  const pendingCount = summary?.pending ?? 0;
  const bannedCount = summary?.banned ?? 0;
  const adminCount = summary?.admins ?? 0;
  const googleCount = summary?.google ?? 0;

  const currentUsers = data?.users || [];
  const isAllSelected = currentUsers.length > 0 && selectedUserIds.length === currentUsers.length;

  const columns = useMemo(() => [
    {
      header: (
        <input
          type="checkbox"
          aria-label="Select all users on this page"
          checked={isAllSelected}
          onChange={handleToggleSelectAll}
          onClick={(e) => e.stopPropagation()}
          className="w-3.5 h-3.5 rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-2 focus:ring-blue-500/20 cursor-pointer transition-all"
        />
      ),
      accessor: 'select',
      render: (row) => (
        <input
          type="checkbox"
          aria-label={`Select user ${row.email}`}
          checked={selectedUserIds.includes(row.id)}
          onChange={() => handleToggleSelectRow(row.id)}
          onClick={(e) => e.stopPropagation()}
          className="w-3.5 h-3.5 rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-2 focus:ring-blue-500/20 cursor-pointer transition-all"
        />
      )
    },
    {
      header: 'User Identity',
      accessor: 'email',
      sortable: true,
      render: (row) => {
        const initials = getUserInitials(row.name, row.email);
        return (
          <div className="flex items-center gap-3 py-0.5 group">
            {row.avatar_url ? (
              <img 
                src={row.avatar_url} 
                alt={row.name || 'User avatar'} 
                className="w-8 h-8 rounded-full object-cover shrink-0 border border-slate-200 dark:border-slate-700 shadow-xs" 
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-extrabold text-[10px] flex items-center justify-center shrink-0 shadow-xs border border-blue-400/30">
                {initials}
              </div>
            )}
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-slate-900 dark:text-white text-xs truncate max-w-[200px] leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {getUserDisplayName(row.name, row.email)}
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate max-w-[200px]">
                {row.email}
              </span>
              <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500 truncate max-w-[180px]">
                {row.id}
              </span>
            </div>
          </div>
        );
      }
    },
    {
      header: 'Assigned Role',
      accessor: 'role_id',
      render: (row) => {
        const roleName = getRoleName(row.role_id);
        const isSuper = roleName === 'Super Admin';
        const isAdmin = roleName === 'Admin';
        const isUnassigned = roleName === 'Unassigned' || !row.role_id;

        const style = isSuper 
          ? 'text-purple-700 bg-purple-50 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/80'
          : isAdmin 
          ? 'text-indigo-700 bg-indigo-50 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800/80'
          : isUnassigned
          ? 'text-slate-600 bg-slate-100 border-slate-200 dark:text-slate-400 dark:bg-slate-800/80 dark:border-slate-700'
          : 'text-slate-700 bg-slate-100 border-slate-200 dark:text-slate-300 dark:bg-slate-800 dark:border-slate-700';

        return (
          <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider border shadow-2xs ${style}`}>
            {roleName}
          </span>
        );
      }
    },
    {
      header: 'Account Status',
      accessor: 'status',
      sortable: true,
      render: (row) => {
        const statusUpper = (row.status || '').toUpperCase();
        const isActive = statusUpper === 'ACTIVE';
        const isBanned = statusUpper === 'BANNED' || statusUpper === 'DISABLED' || statusUpper === 'LOCKED';
        const isSoftDeleted = statusUpper === 'SOFT_DELETED';
        
        const displayLabel = isActive 
          ? 'Active' 
          : isSoftDeleted
          ? 'Deleted'
          : isBanned 
          ? 'Locked' 
          : (statusUpper === 'PENDING_VERIFICATION' ? 'Pending Verification' : (row.status || 'Unknown'));
        
        const style = isActive 
          ? 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/80' 
          : isBanned 
          ? 'text-rose-700 bg-rose-50 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800/80' 
          : 'text-amber-700 bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/80';

        return (
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold border uppercase tracking-wider shadow-2xs ${style}`}>
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isActive ? 'bg-emerald-500 animate-pulse' : isBanned ? 'bg-rose-500' : 'bg-amber-500'}`} />
            {displayLabel}
          </span>
        );
      }
    },
    {
      header: 'Auth Provider',
      accessor: 'provider',
      render: (row) => {
        const providerName = (row.provider || 'password').toLowerCase();
        const isGoogle = providerName === 'google';
        return (
          <span className={`inline-flex items-center gap-1 text-[9px] font-extrabold px-2 py-0.5 rounded border shadow-2xs ${
            isGoogle 
              ? 'text-blue-700 bg-blue-50 border-blue-200 dark:text-blue-300 dark:bg-blue-950/40 dark:border-blue-800/80' 
              : 'text-slate-700 bg-slate-100 border-slate-200 dark:text-slate-300 dark:bg-slate-800 dark:border-slate-700'
          }`}>
            <Key className="w-2.5 h-2.5 shrink-0" />
            {isGoogle ? 'Google OAuth' : 'Password Auth'}
          </span>
        );
      }
    },
    {
      header: 'Registered At',
      accessor: 'created_at',
      sortable: true,
      render: (row) => {
        const exactTime = row.created_at ? new Date(row.created_at).toLocaleString() : 'Unknown';
        return (
          <div className="flex flex-col" title={`Exact Registration Time: ${exactTime}`}>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              {formatRelativeTime(row.created_at)}
            </span>
            <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 font-semibold">
              {row.created_at ? new Date(row.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
            </span>
          </div>
        );
      }
    },
    {
      header: 'Last Activity',
      accessor: 'updated_at',
      sortable: true,
      render: (row) => {
        const targetTime = row.last_login_at || row.updated_at || row.created_at;
        const exactTime = targetTime ? new Date(targetTime).toLocaleString() : 'Never';
        return (
          <div className="flex flex-col" title={`Last Activity: ${exactTime}`}>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              {formatRelativeTime(targetTime)}
            </span>
            <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 font-semibold">
              {targetTime ? new Date(targetTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
            </span>
          </div>
        );
      }
    },
    {
      header: 'Actions',
      accessor: 'id',
      render: (row) => (
        <UserActionMenuCell
          row={row}
          activeMenuUserId={activeMenuUserId}
          setActiveMenuUserId={setActiveMenuUserId}
          setSelectedUser={setSelectedUser}
          handleImpersonate={handleImpersonate}
          handleVerifyEmail={handleVerifyEmail}
          handleResendVerification={handleResendVerification}
          handleUnsuspendUser={handleUnsuspendUser}
          handleEnableUser={handleEnableUser}
          handleUnlockUser={handleUnlockUser}
          handleRestoreUser={handleRestoreUser}
          handleDisableUser={handleDisableUser}
          handleSoftDeleteUser={handleSoftDeleteUser}
          handleForceLogout={handleForceLogout}
          setActionState={setActionState}
          navigate={navigate}
        />
      )
    }
  ], [activeMenuUserId, getRoleName, handleDisableUser, handleEnableUser, handleForceLogout, handleImpersonate, handleResendVerification, handleRestoreUser, handleSoftDeleteUser, handleToggleSelectAll, handleToggleSelectRow, handleUnsuspendUser, handleVerifyEmail, handleUnlockUser, isAllSelected, navigate, selectedUserIds]);

  return (
    <div className="space-y-5 relative h-full flex flex-col font-sans pb-12">
      
      {/* ── 1. EXECUTIVE PAGE HEADER ────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <Users className="w-6 h-6 text-blue-600 dark:text-blue-400 shrink-0" />
            <span>User Management</span>
          </h1>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">
            Manage platform user identities, administrative role escalations, account security states, and active user profiles.
          </p>
        </div>
      </div>

      {/* ── 2. 6 PREMIUM ENTERPRISE KPI SUMMARY CARDS ───────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Card 1: Total Users */}
        <div 
          onClick={() => { setStatusFilter(''); setProviderFilter(''); setSearch(''); setPage(1); }}
          className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs hover:shadow-xl hover:-translate-y-1 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 ease-out cursor-pointer flex flex-col justify-between gap-2 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-600 dark:text-slate-300">
              Total Users
            </span>
            <Users className="w-4 h-4 text-slate-400 group-hover:text-blue-500 transition-colors" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-900 dark:text-white font-mono tracking-tight">{totalCount}</span>
            <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700">
              All
            </span>
          </div>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold truncate">Registered Accounts</span>
        </div>

        {/* Card 2: Active Users */}
        <div 
          onClick={() => { setStatusFilter('ACTIVE'); setProviderFilter(''); setSearch(''); setPage(1); }}
          className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs hover:shadow-xl hover:-translate-y-1 hover:scale-[1.01] active:scale-[0.99] hover:border-emerald-400/50 hover:bg-emerald-50/20 dark:hover:bg-slate-800/80 transition-all duration-200 ease-out cursor-pointer flex flex-col justify-between gap-2 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
              Active Users
            </span>
            <Activity className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono tracking-tight">{activeCount}</span>
            <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              Operational
            </span>
          </div>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold truncate">Enabled Profiles</span>
        </div>

        {/* Card 3: Pending Verification */}
        <div 
          onClick={() => { setStatusFilter('PENDING_VERIFICATION'); setProviderFilter(''); setSearch(''); setPage(1); }}
          className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs hover:shadow-xl hover:-translate-y-1 hover:scale-[1.01] active:scale-[0.99] hover:border-amber-400/50 hover:bg-amber-50/20 dark:hover:bg-slate-800/80 transition-all duration-200 ease-out cursor-pointer flex flex-col justify-between gap-2 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-600 dark:text-amber-400">
              Pending Verify
            </span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono tracking-tight">{pendingCount}</span>
            <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              Action Required
            </span>
          </div>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold truncate">Awaiting Email OTP</span>
        </div>

        {/* Card 4: Locked Accounts */}
        <div 
          onClick={() => { setStatusFilter('BANNED'); setProviderFilter(''); setSearch(''); setPage(1); }}
          className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs hover:shadow-xl hover:-translate-y-1 hover:scale-[1.01] active:scale-[0.99] hover:border-rose-400/50 hover:bg-rose-50/20 dark:hover:bg-slate-800/80 transition-all duration-200 ease-out cursor-pointer flex flex-col justify-between gap-2 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-rose-600 dark:text-rose-400">
              Locked Accounts
            </span>
            <Lock className="w-4 h-4 text-rose-500" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-rose-600 dark:text-rose-400 font-mono tracking-tight">{bannedCount}</span>
            <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
              Restricted
            </span>
          </div>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold truncate">Suspended / Banned</span>
        </div>

        {/* Card 5: Administrators */}
        <div 
          onClick={() => { setSearch('Admin'); setStatusFilter(''); setProviderFilter(''); setPage(1); }}
          className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs hover:shadow-xl hover:-translate-y-1 hover:scale-[1.01] active:scale-[0.99] hover:border-purple-400/50 hover:bg-purple-50/20 dark:hover:bg-slate-800/80 transition-all duration-200 ease-out cursor-pointer flex flex-col justify-between gap-2 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-purple-600 dark:text-purple-400">
              Administrators
            </span>
            <ShieldCheck className="w-4 h-4 text-purple-500" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-purple-600 dark:text-purple-400 font-mono tracking-tight">{adminCount}</span>
            <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
              Privileged
            </span>
          </div>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold truncate">Admin Roles</span>
        </div>

        {/* Card 6: Google OAuth */}
        <div 
          onClick={() => { setProviderFilter('google'); setStatusFilter(''); setSearch(''); setPage(1); }}
          className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs hover:shadow-xl hover:-translate-y-1 hover:scale-[1.01] active:scale-[0.99] hover:border-blue-400/50 hover:bg-blue-50/20 dark:hover:bg-slate-800/80 transition-all duration-200 ease-out cursor-pointer flex flex-col justify-between gap-2 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-blue-600 dark:text-blue-400">
              Google OAuth
            </span>
            <Key className="w-4 h-4 text-blue-500" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-blue-600 dark:text-blue-400 font-mono tracking-tight">{googleCount}</span>
            <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              SSO Provider
            </span>
          </div>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold truncate">Federated Auth</span>
        </div>
      </div>

      {/* ── 3. CONTROLS HEADER BAR (FILTER, SEARCH, REFRESH, EXPORT) ───────── */}
      <div className="flex flex-col gap-3">
        <AdminFilterBar 
          searchValue={search}
          onSearchChange={(val) => { setSearch(val); setPage(1); }}
          statusValue={statusFilter}
          onStatusChange={(val) => { setStatusFilter(val); setPage(1); }}
          onExport={handleExport}
          isExporting={isExporting}
        />

        {/* QUICK FILTER CHIPS & REFRESH BUTTON ROW */}
        <div className="flex items-center justify-between gap-2 flex-wrap pt-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">
              Quick Filter:
            </span>
            {quickFilters.map((chip, idx) => {
              const isActive = statusFilter === chip.status && providerFilter === chip.provider;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setStatusFilter(chip.status);
                    setProviderFilter(chip.provider);
                    setPage(1);
                  }}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer border shadow-2xs focus:ring-2 focus:ring-blue-500/20 ${
                    isActive 
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm' 
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 hover:shadow-xs'
                  }`}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => {
              queryClient.invalidateQueries(['admin-users']);
              showToast('User list refreshed.', 'info');
            }}
            disabled={isFetching}
            className="px-3.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-blue-500 hover:shadow-md active:scale-95 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 transition-all cursor-pointer flex items-center gap-2 shrink-0 shadow-2xs focus:ring-2 focus:ring-blue-500/20"
            title="Refresh user data"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isFetching ? 'animate-spin text-blue-600' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ── 4. ENTERPRISE BULK SELECTION TOOLBAR ────────────────────────────── */}
      {selectedUserIds.length > 0 && (
        <div className="sticky top-2 z-30 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white p-2.5 sm:p-3 rounded-2xl border border-blue-500/30 shadow-xl flex items-center justify-between gap-4 animate-scale-in">
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 bg-white/20 backdrop-blur-md rounded-lg text-xs font-black font-mono text-white border border-white/30">
              {selectedUserIds.length} Selected
            </span>
            <span className="text-xs text-blue-100 font-medium hidden sm:inline">
              Select supported bulk operation to execute in batch:
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => handleBulkOperation('enable')}
              disabled={isActionLoading}
              className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95 border border-emerald-400/30"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Bulk Enable</span>
            </button>

            <button
              type="button"
              onClick={() => handleBulkOperation('disable')}
              disabled={isActionLoading}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95 border border-amber-400/30"
            >
              <UserX className="w-3.5 h-3.5" />
              <span>Bulk Disable</span>
            </button>

            <button
              type="button"
              onClick={() => handleBulkOperation('suspend')}
              disabled={isActionLoading}
              className="px-3 py-1.5 bg-rose-500 hover:bg-rose-400 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95 border border-rose-400/30"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Bulk Suspend</span>
            </button>

            <button
              type="button"
              onClick={() => handleBulkOperation('logout')}
              disabled={isActionLoading}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95 border border-white/20 backdrop-blur-md"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Bulk Force Logout</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedUserIds([])}
              className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer ml-1"
              title="Clear selection"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
      
      {/* ── 5. RICH ENTERPRISE DATA TABLE ─────────────────────────────────── */}
      <div className="flex-grow min-h-0">
        <AdminDataTable 
          columns={columns}
          data={currentUsers}
          total={data?.total || 0}
          page={page}
          limit={limit}
          onPageChange={setPage}
          onLimitChange={(l) => { setLimit(l); setPage(1); }}
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

      {/* ── 6. STRUCTURED 8-SECTION INSPECTION & CONTROL DRAWER ───────────── */}
      <AdminDetailDrawer 
        isOpen={!!selectedUser && !actionState.isOpen}
        onClose={() => setSelectedUser(null)}
        title="User Account Inspection & Controls"
      >
        {selectedUser && (() => {
          const statusUpper = (selectedUser.status || '').toUpperCase();
          const isActive = statusUpper === 'ACTIVE';
          const isSuspended = statusUpper === 'BANNED' || statusUpper === 'SUSPENDED';
          const isBanned = isSuspended;
          const isDisabled = statusUpper === 'DISABLED';
          const isPending = statusUpper === 'PENDING_VERIFICATION';
          const isSoftDeleted = statusUpper === 'SOFT_DELETED';
          const isLocked = statusUpper === 'LOCKED' || (selectedUser.failed_login_count || 0) > 0;
          const displayLabel = isActive 
            ? 'Active' 
            : isSoftDeleted
            ? 'Deleted'
            : isBanned 
            ? 'Locked' 
            : (isPending ? 'Pending Verification' : (selectedUser.status || 'Unknown'));

          return (
            <div className="space-y-6 text-xs font-sans">
              
              {/* SECTION 1: PROFILE IDENTITY */}
              <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs">
                <div className="flex items-center gap-3">
                  {selectedUser.avatar_url ? (
                    <img src={selectedUser.avatar_url} alt="User avatar" className="w-10 h-10 rounded-full object-cover shrink-0 border border-slate-200 dark:border-slate-700 shadow-xs" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-extrabold text-xs flex items-center justify-center shrink-0 shadow-xs border border-blue-400/30">
                      {getUserInitials(selectedUser.name, selectedUser.email)}
                    </div>
                  )}
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Profile Identity</span>
                    <h3 className="font-bold text-base text-slate-900 dark:text-white leading-tight truncate">{getUserDisplayName(selectedUser.name, selectedUser.email)}</h3>
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 font-mono truncate">{selectedUser.email}</p>
                  </div>
                </div>

                {/* Primary & Secondary Action Hierarchy */}
                <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex-wrap">
                  <button
                    type="button"
                    onClick={() => handleCopyText(selectedUser.id, 'User ID')}
                    className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-blue-500 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 transition-all cursor-pointer shadow-2xs active:scale-95 focus:ring-2 focus:ring-blue-500/20"
                  >
                    {copiedField === 'User ID' ? '✓ User ID Copied' : 'Copy User ID'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCopyText(selectedUser.email, 'User Email')}
                    className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-blue-500 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 transition-all cursor-pointer shadow-2xs active:scale-95 focus:ring-2 focus:ring-blue-500/20"
                  >
                    {copiedField === 'User Email' ? '✓ Email Copied' : 'Copy Email'}
                  </button>
                  
                  {/* Primary Action Button (Filled Blue) */}
                  <button
                    type="button"
                    onClick={() => handleImpersonate(selectedUser)}
                    disabled={isActionLoading}
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95 flex items-center gap-1.5 ml-auto focus:ring-2 focus:ring-blue-500/20"
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>Impersonate</span>
                  </button>
                </div>
              </div>

              {/* SECTION 2: ACCOUNT STATUS & STATE-DRIVEN LIFECYCLE ACTIONS */}
              <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Account Lifecycle Status</span>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold border uppercase tracking-wider shadow-2xs ${
                    isActive 
                      ? 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/80' 
                      : isBanned 
                      ? 'text-rose-700 bg-rose-50 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800/80' 
                      : 'text-amber-700 bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/80'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isActive ? 'bg-emerald-500 animate-pulse' : isBanned ? 'bg-rose-500' : 'bg-amber-500'}`} />
                    {displayLabel}
                  </span>
                </div>

                {/* State-Driven Action Triggers */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  {isPending && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleVerifyEmail(selectedUser.id)}
                        disabled={isActionLoading}
                        className="px-3 py-2 bg-emerald-600 text-white hover:bg-emerald-500 rounded-xl font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        Verify Email
                      </button>
                      <button
                        type="button"
                        onClick={() => handleResendVerification(selectedUser.id)}
                        disabled={isActionLoading}
                        className="px-3 py-2 bg-amber-600 text-white hover:bg-amber-500 rounded-xl font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                      >
                        <Send className="w-3.5 h-3.5" />
                        Resend Verify Token
                      </button>
                    </>
                  )}

                  {isSuspended && (
                    <button
                      type="button"
                      onClick={() => handleUnsuspendUser(selectedUser.id)}
                      disabled={isActionLoading}
                      className="col-span-2 px-3 py-2 bg-emerald-600 text-white hover:bg-emerald-500 rounded-xl font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                    >
                      <Unlock className="w-3.5 h-3.5" />
                      Unsuspend Profile
                    </button>
                  )}

                  {isDisabled && (
                    <button
                      type="button"
                      onClick={() => handleEnableUser(selectedUser.id)}
                      disabled={isActionLoading}
                      className="col-span-2 px-3 py-2 bg-emerald-600 text-white hover:bg-emerald-500 rounded-xl font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      Enable Profile
                    </button>
                  )}

                  {isLocked && (
                    <button
                      type="button"
                      onClick={() => handleUnlockUser(selectedUser.id)}
                      disabled={isActionLoading}
                      className="col-span-2 px-3 py-2 bg-emerald-600 text-white hover:bg-emerald-500 rounded-xl font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                    >
                      <Unlock className="w-3.5 h-3.5" />
                      Unlock Account
                    </button>
                  )}

                  {isActive && (
                    <>
                      {/* Secondary Action */}
                      <button
                        type="button"
                        onClick={() => handleDisableUser(selectedUser.id)}
                        disabled={isActionLoading}
                        className="px-3 py-2 bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800 hover:bg-amber-100 rounded-xl font-bold transition-all shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                      >
                        <UserX className="w-3.5 h-3.5" />
                        Disable Account
                      </button>
                      {/* Destructive Action (Red Outline) */}
                      <button
                        type="button"
                        onClick={() => setActionState({ isOpen: true, type: 'suspend', reason: '' })}
                        disabled={isActionLoading}
                        className="px-3 py-2 bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800 hover:bg-rose-100 rounded-xl font-bold transition-all shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                      >
                        <ShieldAlert className="w-3.5 h-3.5" />
                        Suspend Account
                      </button>
                    </>
                  )}

                  {isSoftDeleted && (
                    <button
                      type="button"
                      onClick={() => handleRestoreUser(selectedUser.id)}
                      disabled={isActionLoading}
                      className="col-span-2 px-3 py-2 bg-emerald-600 text-white hover:bg-emerald-500 rounded-xl font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Restore Soft-Deleted Account
                    </button>
                  )}
                </div>
              </div>

              {/* SECTION 3: AUTHENTICATION METADATA */}
              <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Authentication Metadata</span>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Provider</span>
                    <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 capitalize flex items-center gap-1">
                      <Key className="w-3 h-3 text-blue-500" />
                      {selectedUser.provider === 'google' ? 'Google OAuth' : 'Password Auth'}
                    </p>
                  </div>
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Email Verified</span>
                    <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 flex items-center gap-1">
                      {!isPending ? (
                        <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5" /> Verified</span>
                      ) : (
                        <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> Unverified</span>
                      )}
                    </p>
                  </div>
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-800 col-span-2 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Failed Login Attempts</span>
                      <p className="font-mono font-bold text-slate-800 dark:text-slate-200 mt-0.5">{selectedUser.failed_login_count || 0} Attempts</p>
                    </div>
                    {(selectedUser.failed_login_count || 0) > 0 && (
                      <button
                        type="button"
                        onClick={() => handleUnlockUser(selectedUser.id)}
                        disabled={isActionLoading}
                        className="px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-[10px] font-bold hover:bg-amber-100 transition-all cursor-pointer shadow-2xs"
                      >
                        Reset Counter
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* SECTION 4: SESSIONS */}
              <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Session Management</span>
                  <button
                    type="button"
                    onClick={() => navigate(`/admin/operations/active-sessions?search=${encodeURIComponent(selectedUser.email)}`)}
                    className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5"
                  >
                    <span>View Sessions Tab</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>

                <button 
                  type="button"
                  onClick={() => handleForceLogout(selectedUser)}
                  disabled={isActionLoading}
                  className="w-full px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 rounded-xl transition-all shadow-2xs cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 focus:ring-2 focus:ring-blue-500/20"
                >
                  {isActionLoading ? <LoaderIcon width={12} height={12} color="#475569" /> : <LogOut className="w-3.5 h-3.5 text-slate-500" />}
                  <span>Force Sign Out All Active Sessions</span>
                </button>
              </div>

              {/* SECTION 5: ROLES & ASSIGNMENT */}
              <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Role Assignment & Escalation</span>
                <select
                  aria-label="Assign Role to User"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer shadow-2xs"
                  value={selectedUser.role_id || ''}
                  onChange={(e) => handleRoleChange(e.target.value)}
                  disabled={isActionLoading}
                >
                  <option value="">Unassigned (No Role)</option>
                  {Array.from(
                    (roles || []).reduce((map, r) => {
                      const key = (r.name || '').trim().toLowerCase();
                      if (!map.has(key) || (r.name && r.name[0] === r.name[0].toUpperCase())) {
                        map.set(key, r);
                      }
                      return map;
                    }, new Map()).values()
                  ).map(r => (
                    <option key={r.id} value={r.id}>{r.name.charAt(0).toUpperCase() + r.name.slice(1)}</option>
                  ))}
                </select>
              </div>

              {/* SECTION 6: SECURITY & QUICK LINKS */}
              <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Security & Operations Quick Links</span>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => navigate(`/admin/operations/audit-logs?search=${encodeURIComponent(selectedUser.email)}`)}
                    className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-500 rounded-xl text-center font-bold text-[10px] text-slate-700 dark:text-slate-300 transition-all cursor-pointer shadow-2xs flex flex-col items-center gap-1 hover:-translate-y-0.5 focus:ring-2 focus:ring-blue-500/20"
                  >
                    <FileText className="w-4 h-4 text-blue-500" />
                    <span>Audit Logs</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate(`/admin/operations/auth-events?search=${encodeURIComponent(selectedUser.email)}`)}
                    className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-500 rounded-xl text-center font-bold text-[10px] text-slate-700 dark:text-slate-300 transition-all cursor-pointer shadow-2xs flex flex-col items-center gap-1 hover:-translate-y-0.5 focus:ring-2 focus:ring-blue-500/20"
                  >
                    <Shield className="w-4 h-4 text-indigo-500" />
                    <span>Auth Events</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate(`/admin/operations/active-sessions?search=${encodeURIComponent(selectedUser.email)}`)}
                    className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-500 rounded-xl text-center font-bold text-[10px] text-slate-700 dark:text-slate-300 transition-all cursor-pointer shadow-2xs flex flex-col items-center gap-1 hover:-translate-y-0.5 focus:ring-2 focus:ring-blue-500/20"
                  >
                    <Activity className="w-4 h-4 text-emerald-500" />
                    <span>Sessions Tab</span>
                  </button>
                </div>
              </div>

              {/* SECTION 7: METADATA */}
              <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">System Metadata</span>
                <div className="grid grid-cols-2 gap-3 font-mono">
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-800">
                    <span className="text-[9px] font-sans font-bold text-slate-400 uppercase">Created At</span>
                    <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">{selectedUser.created_at ? new Date(selectedUser.created_at).toLocaleDateString() : '—'}</p>
                  </div>

                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-800">
                    <span className="text-[9px] font-sans font-bold text-slate-400 uppercase">Last Login</span>
                    <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">{selectedUser.last_login_at ? formatRelativeTime(selectedUser.last_login_at) : 'Never'}</p>
                  </div>

                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-800">
                    <span className="text-[9px] font-sans font-bold text-slate-400 uppercase">Updated At</span>
                    <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">{selectedUser.updated_at ? formatRelativeTime(selectedUser.updated_at) : '—'}</p>
                  </div>

                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-800">
                    <span className="text-[9px] font-sans font-bold text-slate-400 uppercase">Timezone</span>
                    <p className="font-sans font-bold text-slate-800 dark:text-slate-200 mt-0.5 truncate">{selectedUser.timezone || 'UTC'}</p>
                  </div>
                </div>
              </div>

              {/* SECTION 8: DANGER ZONE (Strong Red Filled) */}
              <div className="p-4 bg-rose-50/60 dark:bg-rose-950/30 rounded-2xl border border-rose-200 dark:border-rose-900/60 space-y-3">
                <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-widest block">Danger Zone</span>
                {!isSoftDeleted ? (
                  <button 
                    type="button"
                    onClick={() => handleSoftDeleteUser(selectedUser.id)}
                    disabled={isActionLoading}
                    className="w-full px-4 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl transition-all shadow-sm cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 focus:ring-2 focus:ring-rose-500/20"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-white" />
                    <span>Soft-Delete User Profile</span>
                  </button>
                ) : (
                  <button 
                    type="button"
                    onClick={() => handleRestoreUser(selectedUser.id)}
                    disabled={isActionLoading}
                    className="w-full px-4 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-all shadow-sm cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-white" />
                    <span>Restore Soft-Deleted Profile</span>
                  </button>
                )}
              </div>

            </div>
          );
        })()}
      </AdminDetailDrawer>

      {/* Action Reason Input Modal */}
      {actionState.isOpen && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl w-full max-w-md shadow-2xl animate-scale-in">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1.5">
              {actionState.type === 'suspend' ? 'Suspend User Profile' : 'Unlock User Profile'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
              You are about to {actionState.type} <strong>{selectedUser?.email}</strong>. 
              Please provide an administrative reason (minimum 10 characters).
            </p>
            <form onSubmit={(e) => {
              e.preventDefault();
              if (actionState.reason.length < 10) {
                showToast('Reason must be at least 10 characters.', 'error');
                return;
              }
              if (actionState.type === 'suspend') {
                handleSuspendUser(selectedUser.id, actionState.reason);
              }
              setActionState({ isOpen: false, type: null, reason: '' });
            }} className="flex flex-col gap-4">
              <input 
                type="text" 
                autoFocus
                placeholder="Administrative reasoning statement…" 
                value={actionState.reason}
                onChange={e => setActionState(s => ({ ...s, reason: e.target.value }))}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-medium focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-slate-900 dark:text-white"
              />
              <div className="flex justify-end gap-3 mt-1.5">
                <button 
                  type="button" 
                  onClick={() => setActionState({ isOpen: false, type: null, reason: '' })}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={actionState.reason.length < 10}
                  className={`px-4 py-2 rounded-xl text-xs font-bold text-white transition-all disabled:opacity-50 cursor-pointer ${
                    actionState.type === 'suspend' 
                      ? 'bg-rose-600 hover:bg-rose-500' 
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
