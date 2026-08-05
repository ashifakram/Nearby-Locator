import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ShieldAlert,
  Search,
  Filter,
  RefreshCw,
  Download,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronRight,
  MoreVertical,
  Flag,
  FileText,
  MessageSquare,
  Sparkles,
  Shield,
  Layers,
  Check,
  X,
  Eye,
  AlertCircle
} from 'lucide-react';
import AdminDataTable from '../../components/admin/AdminDataTable';
import AdminDetailDrawer from '../../components/admin/AdminDetailDrawer';
import { useToastStore } from '../../store/useToastStore';
import { api } from '../../services/api';

export default function AdminQueuesPage() {
  const [activeTab, setActiveTab] = useState('flagged_spots');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [sortField, setSortField] = useState('created_at');
  const [sortDirection, setSortDirection] = useState('desc');
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedRowIds, setSelectedRowIds] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [enforcementReason, setEnforcementReason] = useState('Manual Moderation Review');
  const [enforcementNotes, setEnforcementNotes] = useState('');

  const queryClient = useQueryClient();
  const { showToast } = useToastStore();

  // ── 1. PARALLEL QUEUE DATA FETCHING FOR LIVE TAB BADGES & KPIS ────────────
  const {
    data: spotsData,
    isLoading: spotsLoading,
    error: spotsError,
    refetch: refetchSpots
  } = useQuery({
    queryKey: ['admin-queues', 'flagged_spots', { page, limit, sort: sortField, order: sortDirection, status: statusFilter }],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        sort: sortField,
        order: sortDirection,
        status: statusFilter === 'ALL' ? 'PENDING' : statusFilter
      });
      const res = await api.get(`/moderation/admin/queue?${params.toString()}`);
      return res.data.data;
    },
    keepPreviousData: true
  });

  const {
    data: reportsData,
    isLoading: reportsLoading,
    error: reportsError,
    refetch: refetchReports
  } = useQuery({
    queryKey: ['admin-queues', 'reports', { page, limit, sort: sortField, order: sortDirection, status: statusFilter }],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        sort: sortField,
        order: sortDirection,
        ...(statusFilter !== 'ALL' && { status: statusFilter })
      });
      const res = await api.get(`/moderation/admin/reports?${params.toString()}`);
      return res.data.data;
    },
    keepPreviousData: true
  });

  const {
    data: appealsData,
    isLoading: appealsLoading,
    error: appealsError,
    refetch: refetchAppeals
  } = useQuery({
    queryKey: ['admin-queues', 'appeals', { page, limit, sort: sortField, order: sortDirection, status: statusFilter }],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        sort: sortField,
        order: sortDirection,
        ...(statusFilter !== 'ALL' && { status: statusFilter })
      });
      const res = await api.get(`/moderation/admin/appeals?${params.toString()}`);
      return res.data.data;
    },
    keepPreviousData: true
  });

  // Active query status mapping based on activeTab
  const activeQuery = useMemo(() => {
    if (activeTab === 'flagged_spots') return { data: spotsData, isLoading: spotsLoading, error: spotsError, refetch: refetchSpots };
    if (activeTab === 'reports') return { data: reportsData, isLoading: reportsLoading, error: reportsError, refetch: refetchReports };
    return { data: appealsData, isLoading: appealsLoading, error: appealsError, refetch: refetchAppeals };
  }, [activeTab, spotsData, spotsLoading, spotsError, refetchSpots, reportsData, reportsLoading, reportsError, refetchReports, appealsData, appealsLoading, appealsError, refetchAppeals]);

  // Tab Badge Totals
  const spotsTotal = spotsData?.total || 0;
  const reportsTotal = reportsData?.total || 0;
  const appealsTotal = appealsData?.total || 0;
  const totalPendingReviews = spotsTotal + reportsTotal + appealsTotal;

  // High Priority Items Calculation
  const highPriorityCount = useMemo(() => {
    const spotsQueue = spotsData?.queue || [];
    const highPrioritySpots = spotsQueue.filter(s => Number(s.priority_score || 0) >= 0.6).length;
    const reportsList = reportsData?.reports || [];
    const criticalReports = reportsList.filter(r => r.category === 'SCAM_FRAUD' || r.category === 'ABUSIVE').length;
    return highPrioritySpots + criticalReports;
  }, [spotsData, reportsData]);

  // Get raw items list for active tab
  const rawList = useMemo(() => {
    if (!activeQuery.data) return [];
    if (activeTab === 'flagged_spots') return activeQuery.data.queue || [];
    if (activeTab === 'reports') return activeQuery.data.reports || [];
    if (activeTab === 'appeals') return activeQuery.data.appeals || [];
    return [];
  }, [activeQuery.data, activeTab]);

  // Client-side search & category filter applied on current page data
  const filteredList = useMemo(() => {
    return rawList.filter(item => {
      // Category filter
      if (categoryFilter !== 'ALL') {
        const itemCategory = item.category || (Number(item.priority_score || 0) >= 0.8 ? 'HIGH_RISK' : 'NORMAL');
        if (itemCategory !== categoryFilter) return false;
      }
      // Search term filter
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const titleMatch = (item.title || item.spot_title || '').toLowerCase().includes(term);
        const idMatch = (item.id || '').toLowerCase().includes(term);
        const emailMatch = (item.reporter_email || item.appellant_email || '').toLowerCase().includes(term);
        const detailsMatch = (item.details || item.description || '').toLowerCase().includes(term);
        return titleMatch || idMatch || emailMatch || detailsMatch;
      }
      return true;
    });
  }, [rawList, searchTerm, categoryFilter]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setPage(1);
    setSelectedItem(null);
    setSelectedRowIds([]);
    setSearchTerm('');
  };

  const handleRefreshAll = () => {
    refetchSpots();
    refetchReports();
    refetchAppeals();
    showToast('Moderation queues refreshed.', 'success');
  };

  // Enforcement Action Mutation
  const actionMutation = useMutation({
    mutationFn: async ({ action, reason, notes }) => {
      let endpoint = '';
      if (activeTab === 'flagged_spots') endpoint = `/moderation/admin/spots/${selectedItem.id}/action`;
      else if (activeTab === 'reports') endpoint = `/moderation/admin/reports/${selectedItem.id}/resolve`;
      else if (activeTab === 'appeals') endpoint = `/moderation/admin/appeals/${selectedItem.id}/resolve`;

      const res = await api.post(endpoint, { action, reason: reason || enforcementReason, notes: notes || enforcementNotes });
      return res.data;
    },
    onSuccess: (res) => {
      showToast(res.message || 'Moderation decision executed successfully.', 'success');
      queryClient.invalidateQueries(['admin-queues']);
      setSelectedItem(null);
      setEnforcementNotes('');
    },
    onError: (err) => {
      showToast(err?.response?.data?.message || err.message || 'Failed to execute moderation decision.', 'error');
    }
  });

  // CSV Export Handler
  const handleExportCSV = () => {
    if (!filteredList || filteredList.length === 0) {
      showToast('No moderation records available to export.', 'info');
      return;
    }
    const headers = ['ID', 'Title / Target', 'Category / Status', 'Priority Score', 'Created At'];
    const csvRows = [headers.join(',')];
    filteredList.forEach(item => {
      const row = [
        item.id,
        `"${(item.title || item.spot_title || '').replace(/"/g, '""')}"`,
        `"${(item.category || item.moderation_status || item.status || '').replace(/"/g, '""')}"`,
        item.priority_score ? Number(item.priority_score).toFixed(2) : 'N/A',
        `"${new Date(item.created_at).toISOString()}"`
      ];
      csvRows.push(row.join(','));
    });
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `moderation_${activeTab}_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Moderation queue exported as CSV.', 'success');
  };

  // Selection Checkbox Handlers
  const isAllSelected = filteredList.length > 0 && selectedRowIds.length === filteredList.length;
  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedRowIds([]);
    } else {
      setSelectedRowIds(filteredList.map(item => item.id));
    }
  };

  const handleToggleSelectRow = (id, e) => {
    e.stopPropagation();
    if (selectedRowIds.includes(id)) {
      setSelectedRowIds(selectedRowIds.filter(rowId => rowId !== id));
    } else {
      setSelectedRowIds([...selectedRowIds, id]);
    }
  };

  // Dynamic Columns Configuration
  const getColumns = () => {
    const selectColumn = {
      header: (
        <input
          type="checkbox"
          checked={isAllSelected}
          onChange={handleToggleSelectAll}
          className="rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500 cursor-pointer"
        />
      ),
      accessor: 'select',
      sortable: false,
      render: (row) => (
        <input
          type="checkbox"
          checked={selectedRowIds.includes(row.id)}
          onChange={(e) => handleToggleSelectRow(row.id, e)}
          onClick={(e) => e.stopPropagation()}
          className="rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500 cursor-pointer"
        />
      )
    };

    const actionColumn = {
      header: 'Actions',
      accessor: 'actions',
      sortable: false,
      align: 'right',
      render: (row) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setSelectedItem(row);
          }}
          className="px-2.5 py-1 text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800 rounded-lg transition-all cursor-pointer flex items-center gap-1 ml-auto"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Inspect</span>
        </button>
      )
    };

    if (activeTab === 'flagged_spots') {
      return [
        selectColumn,
        {
          header: 'Spot ID',
          accessor: 'id',
          sortable: false,
          render: row => <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">{row.id?.substring(0, 8)}…</span>
        },
        {
          header: 'Spot Title',
          accessor: 'title',
          sortable: true,
          render: row => (
            <div className="flex flex-col">
              <span className="font-bold text-slate-900 dark:text-white text-xs">{row.title}</span>
              <span className="text-[10px] text-slate-400 truncate max-w-xs">{row.description || 'No description provided'}</span>
            </div>
          )
        },
        {
          header: 'Priority Risk',
          accessor: 'priority_score',
          sortable: true,
          render: row => {
            const score = Number(row.priority_score || 0);
            const isHigh = score >= 0.8;
            const isMedium = score >= 0.4;
            return (
              <span className={`inline-flex items-center gap-1 font-extrabold border px-2.5 py-0.5 rounded-full text-[10px] uppercase font-mono ${
                isHigh
                  ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800'
                  : isMedium
                    ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800'
                    : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
              }`}>
                {isHigh && <AlertTriangle className="w-3 h-3 text-rose-500" />}
                {score.toFixed(1)} {isHigh ? 'HIGH RISK' : isMedium ? 'MEDIUM' : 'NORMAL'}
              </span>
            );
          }
        },
        {
          header: 'Status',
          accessor: 'moderation_status',
          sortable: false,
          render: row => (
            <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800 text-[10px] font-extrabold uppercase tracking-wider">
              {row.moderation_status || 'PENDING'}
            </span>
          )
        },
        {
          header: 'Flagged Date',
          accessor: 'created_at',
          sortable: true,
          render: row => <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{new Date(row.created_at).toLocaleDateString()}</span>
        },
        actionColumn
      ];
    } else if (activeTab === 'reports') {
      return [
        selectColumn,
        {
          header: 'Report ID',
          accessor: 'id',
          sortable: false,
          render: row => <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">{row.id?.substring(0, 8)}…</span>
        },
        {
          header: 'Category',
          accessor: 'category',
          sortable: true,
          render: row => (
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400">
              {row.category}
            </span>
          )
        },
        {
          header: 'Target Spot',
          accessor: 'spot_title',
          sortable: false,
          render: row => <span className="font-bold text-slate-900 dark:text-white text-xs">{row.spot_title}</span>
        },
        {
          header: 'Reporter Email',
          accessor: 'reporter_email',
          sortable: false,
          render: row => <span className="text-xs text-slate-600 dark:text-slate-300 font-semibold">{row.reporter_email}</span>
        },
        {
          header: 'Status',
          accessor: 'status',
          sortable: true,
          render: row => (
            <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800 text-[10px] font-extrabold uppercase tracking-wider">
              {row.status || 'PENDING'}
            </span>
          )
        },
        {
          header: 'Reported Date',
          accessor: 'created_at',
          sortable: true,
          render: row => <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{new Date(row.created_at).toLocaleDateString()}</span>
        },
        actionColumn
      ];
    } else {
      return [
        selectColumn,
        {
          header: 'Appeal ID',
          accessor: 'id',
          sortable: false,
          render: row => <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">{row.id?.substring(0, 8)}…</span>
        },
        {
          header: 'Target Spot',
          accessor: 'spot_title',
          sortable: false,
          render: row => <span className="font-bold text-slate-900 dark:text-white text-xs">{row.spot_title}</span>
        },
        {
          header: 'Appellant Email',
          accessor: 'appellant_email',
          sortable: false,
          render: row => <span className="text-xs text-slate-600 dark:text-slate-300 font-semibold">{row.appellant_email}</span>
        },
        {
          header: 'Status',
          accessor: 'status',
          sortable: true,
          render: row => (
            <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800 text-[10px] font-extrabold uppercase tracking-wider">
              {row.status || 'PENDING'}
            </span>
          )
        },
        {
          header: 'Appealed Date',
          accessor: 'created_at',
          sortable: true,
          render: row => <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{new Date(row.created_at).toLocaleDateString()}</span>
        },
        actionColumn
      ];
    }
  };

  // Custom Queue-Specific Empty Messages
  const getEmptyMessage = () => {
    if (activeTab === 'flagged_spots') return 'No flagged spots are currently waiting for review.';
    if (activeTab === 'reports') return 'No pending user reports requiring moderation.';
    return 'No pending appeals waiting for administrative review.';
  };

  return (
    <div className="space-y-6 relative h-full flex flex-col font-sans pb-16">
      
      {/* ── 1. EXECUTIVE PAGE HEADER ────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <ShieldAlert className="w-6 h-6 text-blue-600 dark:text-blue-400 shrink-0" />
            <span>Moderation Queue</span>
          </h1>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">
            Review flagged content, user reports, and appeals while maintaining platform quality, safety, and compliance.
          </p>
        </div>
      </div>

      {/* ── 2. ENTERPRISE KPI CARDS ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Card 1: Total Pending Reviews */}
        <div
          onClick={() => { handleTabChange('flagged_spots'); setStatusFilter('ALL'); setCategoryFilter('ALL'); }}
          className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs hover:shadow-xl hover:-translate-y-1 hover:scale-[1.01] active:scale-[0.99] hover:border-amber-400/50 hover:bg-amber-50/20 dark:hover:bg-slate-800/80 transition-all duration-200 ease-out cursor-pointer flex flex-col justify-between gap-2 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-600 dark:text-amber-400">
              Pending Reviews
            </span>
            <Clock className="w-4 h-4 text-amber-500 group-hover:scale-110 transition-transform" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono tracking-tight">
              {activeQuery.isLoading ? '—' : totalPendingReviews}
            </span>
            <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              All Queues
            </span>
          </div>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold truncate">Total Items In Queue</span>
        </div>

        {/* Card 2: High Priority Items */}
        <div
          onClick={() => setCategoryFilter('HIGH_RISK')}
          className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs hover:shadow-xl hover:-translate-y-1 hover:scale-[1.01] active:scale-[0.99] hover:border-rose-400/50 hover:bg-rose-50/20 dark:hover:bg-slate-800/80 transition-all duration-200 ease-out cursor-pointer flex flex-col justify-between gap-2 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-rose-600 dark:text-rose-400">
              High Priority
            </span>
            <AlertTriangle className="w-4 h-4 text-rose-500 group-hover:scale-110 transition-transform" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-rose-600 dark:text-rose-400 font-mono tracking-tight">
              {activeQuery.isLoading ? '—' : highPriorityCount}
            </span>
            <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
              Action Needed
            </span>
          </div>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold truncate">Critical Moderation</span>
        </div>

        {/* Card 3: Flagged Spots */}
        <div
          onClick={() => { handleTabChange('flagged_spots'); setStatusFilter('ALL'); setCategoryFilter('ALL'); }}
          className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs hover:shadow-xl hover:-translate-y-1 hover:scale-[1.01] active:scale-[0.99] hover:border-blue-400/50 hover:bg-blue-50/20 dark:hover:bg-slate-800/80 transition-all duration-200 ease-out cursor-pointer flex flex-col justify-between gap-2 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-blue-600 dark:text-blue-400">
              Flagged Spots
            </span>
            <Flag className="w-4 h-4 text-blue-500 group-hover:scale-110 transition-transform" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-blue-600 dark:text-blue-400 font-mono tracking-tight">
              {spotsLoading ? '—' : spotsTotal}
            </span>
            <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              Spot Review
            </span>
          </div>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold truncate">Location Listings</span>
        </div>

        {/* Card 4: User Reports */}
        <div
          onClick={() => { handleTabChange('reports'); setStatusFilter('ALL'); setCategoryFilter('ALL'); }}
          className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs hover:shadow-xl hover:-translate-y-1 hover:scale-[1.01] active:scale-[0.99] hover:border-indigo-400/50 hover:bg-indigo-50/20 dark:hover:bg-slate-800/80 transition-all duration-200 ease-out cursor-pointer flex flex-col justify-between gap-2 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
              User Reports
            </span>
            <FileText className="w-4 h-4 text-indigo-500 group-hover:scale-110 transition-transform" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono tracking-tight">
              {reportsLoading ? '—' : reportsTotal}
            </span>
            <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              User Flagged
            </span>
          </div>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold truncate">Community Complaints</span>
        </div>

        {/* Card 5: Appeals Waiting */}
        <div
          onClick={() => { handleTabChange('appeals'); setStatusFilter('ALL'); setCategoryFilter('ALL'); }}
          className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs hover:shadow-xl hover:-translate-y-1 hover:scale-[1.01] active:scale-[0.99] hover:border-purple-400/50 hover:bg-purple-50/20 dark:hover:bg-slate-800/80 transition-all duration-200 ease-out cursor-pointer flex flex-col justify-between gap-2 group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-purple-600 dark:text-purple-400">
              Appeals Waiting
            </span>
            <MessageSquare className="w-4 h-4 text-purple-500 group-hover:scale-110 transition-transform" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-purple-600 dark:text-purple-400 font-mono tracking-tight">
              {appealsLoading ? '—' : appealsTotal}
            </span>
            <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
              In Review
            </span>
          </div>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold truncate">User Reinstatements</span>
        </div>
      </div>

      {/* ── 3. QUEUE NAVIGATION TABS & ENTERPRISE TOOLBAR ─────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-2.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        
        {/* Navigation Tabs with Live Badges */}
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl">
          {[
            { key: 'flagged_spots', label: 'Flagged Spots', count: spotsTotal, icon: Flag },
            { key: 'reports', label: 'User Reports', count: reportsTotal, icon: FileText },
            { key: 'appeals', label: 'Appeals', count: appealsTotal, icon: MessageSquare }
          ].map(tab => {
            const IconComp = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => handleTabChange(tab.key)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <IconComp className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold font-mono ${
                  isActive
                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search Box */}
          <div className="relative flex-1 sm:flex-initial min-w-[200px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search title, ID, email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all font-medium"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold"
              >
                ×
              </button>
            )}
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 outline-none cursor-pointer focus:border-blue-600"
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="RESOLVED">Resolved / Approved</option>
            <option value="DISMISSED">Dismissed / Rejected</option>
            <option value="QUARANTINED">Quarantined</option>
          </select>

          {/* Export Action */}
          <button
            onClick={handleExportCSV}
            title="Export queue as CSV"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export</span>
          </button>

          {/* Refresh Action */}
          <button
            onClick={handleRefreshAll}
            title="Refresh moderation queues"
            className="p-1.5 rounded-xl text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${activeQuery.isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── 4. DATA TABLE & ERROR STATE HANDLING ───────────────────────────────── */}
      <div className="flex-grow min-h-0">
        {activeQuery.error ? (
          <div className="p-8 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 flex flex-col items-center justify-center min-h-[300px] text-center font-sans">
            <AlertCircle className="w-10 h-10 text-rose-500 mb-3 animate-bounce" />
            <h3 className="text-base font-extrabold text-rose-900 dark:text-rose-200 mb-1">
              Unable to load moderation data.
            </h3>
            <p className="text-xs text-rose-600 dark:text-rose-400 max-w-md mb-4 font-medium">
              An error occurred while communicating with the moderation engine. Please verify your connection or administrative permissions.
            </p>
            <button
              onClick={handleRefreshAll}
              className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Request</span>
            </button>
          </div>
        ) : (
          <AdminDataTable
            columns={getColumns()}
            data={filteredList}
            total={activeQuery.data?.total || filteredList.length}
            page={page}
            limit={limit}
            onPageChange={setPage}
            onLimitChange={(l) => { setLimit(l); setPage(1); }}
            isLoading={activeQuery.isLoading}
            error={null}
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={(field, dir) => {
              setSortField(field);
              setSortDirection(dir);
              setPage(1);
            }}
            emptyMessage={getEmptyMessage()}
            onRowClick={(row) => setSelectedItem(row)}
          />
        )}
      </div>

      {/* ── 5. ADMIN DETAIL INSPECTION DRAWER ─────────────────────────────────── */}
      <AdminDetailDrawer
        isOpen={!!selectedItem}
        onClose={() => {
          setSelectedItem(null);
          setEnforcementNotes('');
        }}
        title="Moderation Review & Enforcement"
      >
        {selectedItem && (
          <div className="space-y-5 text-xs font-sans">
            {/* Header Badge Card */}
            <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{activeTab.replace('_', ' ')}</span>
                <span className="px-2 py-0.5 text-[10px] font-black rounded-md border uppercase bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-400">
                  {selectedItem.moderation_status || selectedItem.status || 'PENDING REVIEW'}
                </span>
              </div>
              <h3 className="font-mono font-extrabold text-sm text-slate-900 dark:text-white">
                {selectedItem.title || selectedItem.spot_title || `ID: ${selectedItem.id}`}
              </h3>
            </div>

            {/* Target ID */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h4 className="text-[10px] font-bold text-slate-400 uppercase">Item ID</h4>
                <p className="font-mono font-bold text-slate-800 dark:text-slate-200 mt-0.5">{selectedItem.id}</p>
              </div>
              {selectedItem.priority_score !== undefined && (
                <div className="text-right">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase">Priority Risk</h4>
                  <p className="font-mono font-extrabold text-rose-600 dark:text-rose-400 text-xs mt-0.5">
                    {Number(selectedItem.priority_score).toFixed(2)}
                  </p>
                </div>
              )}
            </div>

            {/* Tab Specific Content */}
            {activeTab === 'reports' && (
              <>
                <div>
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase mb-1">Report Category</h4>
                  <span className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 px-3 py-1 rounded-lg text-xs font-bold text-amber-700 dark:text-amber-400 uppercase inline-block">
                    {selectedItem.category}
                  </span>
                </div>
                <div>
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase mb-1">Reporter Details</h4>
                  <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
                    <p className="text-slate-800 dark:text-slate-200 font-bold">{selectedItem.reporter_email}</p>
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed">{selectedItem.details || 'No additional details provided'}</p>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'appeals' && (
              <div>
                <h4 className="text-[10px] font-bold text-slate-400 uppercase mb-1">Appellant Justification</h4>
                <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
                  <p className="text-slate-800 dark:text-slate-200 font-bold">{selectedItem.appellant_email}</p>
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed">{selectedItem.details || 'No details provided'}</p>
                </div>
              </div>
            )}

            {activeTab === 'flagged_spots' && (
              <div>
                <h4 className="text-[10px] font-bold text-slate-400 uppercase mb-1">Spot Description</h4>
                <p className="text-slate-800 dark:text-slate-200 font-medium bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs leading-relaxed">
                  {selectedItem.description || 'No description provided for this spot.'}
                </p>
              </div>
            )}

            {/* Enforcement Reason & Notes Input */}
            <div className="space-y-3 pt-2">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Decision Reason</label>
                <select
                  value={enforcementReason}
                  onChange={(e) => setEnforcementReason(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 outline-none"
                >
                  <option value="Manual Moderation Review">Manual Moderation Review</option>
                  <option value="Violation of Community Guidelines">Violation of Community Guidelines</option>
                  <option value="Spam or Deceptive Listing">Spam or Deceptive Listing</option>
                  <option value="Verified Safe & Compliant">Verified Safe & Compliant</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Admin Enforcement Notes</label>
                <textarea
                  rows={3}
                  value={enforcementNotes}
                  onChange={(e) => setEnforcementNotes(e.target.value)}
                  placeholder="Optional audit log notes for this decision..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 outline-none resize-none"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-2.5">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Enforcement Controls</h4>

              {activeTab === 'flagged_spots' && (
                <div className="grid grid-cols-3 gap-2">
                  <button
                    disabled={actionMutation.isLoading}
                    onClick={() => actionMutation.mutate({ action: 'APPROVE', reason: enforcementReason, notes: enforcementNotes })}
                    className="px-3 py-2.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 disabled:opacity-50"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Approve</span>
                  </button>
                  <button
                    disabled={actionMutation.isLoading}
                    onClick={() => actionMutation.mutate({ action: 'QUARANTINE', reason: enforcementReason, notes: enforcementNotes })}
                    className="px-3 py-2.5 text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 disabled:opacity-50"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Quarantine</span>
                  </button>
                  <button
                    disabled={actionMutation.isLoading}
                    onClick={() => actionMutation.mutate({ action: 'SUSPEND', reason: enforcementReason, notes: enforcementNotes })}
                    className="px-3 py-2.5 text-xs font-bold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 disabled:opacity-50"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Suspend</span>
                  </button>
                </div>
              )}

              {activeTab === 'reports' && (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    disabled={actionMutation.isLoading}
                    onClick={() => actionMutation.mutate({ action: 'CONFIRM', reason: enforcementReason, notes: enforcementNotes })}
                    className="px-4 py-2.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Confirm Report</span>
                  </button>
                  <button
                    disabled={actionMutation.isLoading}
                    onClick={() => actionMutation.mutate({ action: 'DISMISS', reason: enforcementReason, notes: enforcementNotes })}
                    className="px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 disabled:opacity-50"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Dismiss Report</span>
                  </button>
                </div>
              )}

              {activeTab === 'appeals' && (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    disabled={actionMutation.isLoading}
                    onClick={() => actionMutation.mutate({ action: 'APPROVED', reason: enforcementReason, notes: enforcementNotes })}
                    className="px-4 py-2.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Approve Appeal</span>
                  </button>
                  <button
                    disabled={actionMutation.isLoading}
                    onClick={() => actionMutation.mutate({ action: 'REJECTED', reason: enforcementReason, notes: enforcementNotes })}
                    className="px-4 py-2.5 text-xs font-bold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 disabled:opacity-50"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Reject Appeal</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </AdminDetailDrawer>
    </div>
  );
}
