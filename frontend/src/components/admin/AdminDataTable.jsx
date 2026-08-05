import React from 'react';
import ChevronLeftIcon from '../../icons/ChevronLeftIcon';
import ChevronRightIcon from '../../icons/ChevronRightIcon';
import LoaderIcon from '../../icons/LoaderIcon';

export default function AdminDataTable({
  columns,
  data = [],
  isLoading,
  error,
  page,
  limit = 10,
  total,
  onPageChange,
  onLimitChange,
  onRowClick,
  sortField,
  sortDirection,
  onSort,
  emptyMessage = "No records found."
}) {
  if (error) {
    return (
      <div className="p-6 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 flex flex-col items-center justify-center min-h-[300px] font-sans">
        <svg className="w-10 h-10 text-rose-500 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <h3 className="text-sm font-bold text-rose-800 dark:text-rose-300 mb-1">Failed to load data</h3>
        <p className="text-xs font-medium text-rose-600 dark:text-rose-400 text-center max-w-sm">{error.message || 'An unknown error occurred.'}</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden flex flex-col font-sans">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
          <thead className="bg-slate-50/90 dark:bg-slate-800/90 text-[11px] uppercase tracking-wider text-slate-400 dark:text-slate-400 font-bold border-b border-slate-200/80 dark:border-slate-800">
            <tr>
              {columns.map((col, idx) => {
                const isActions = col.header === 'Actions' || col.accessor === 'actions';
                return (
                  <th 
                    key={idx} 
                    className={`px-4 py-3 sm:px-5 sm:py-3.5 ${col.align === 'right' || isActions ? 'text-right' : ''} ${col.sortable ? 'cursor-pointer select-none hover:text-blue-600 hover:bg-slate-100/50 dark:hover:bg-slate-800 transition-colors' : ''} ${isActions ? 'sticky right-0 bg-slate-50/90 dark:bg-slate-800/90 shadow-[-8px_0_12px_-4px_rgba(0,0,0,0.06)] z-20' : ''}`}
                    onClick={() => {
                      if (col.sortable && onSort) {
                        const newDir = sortField === col.accessor && sortDirection === 'desc' ? 'asc' : 'desc';
                        onSort(col.accessor, newDir);
                      }
                    }}
                  >
                    <div className={`flex items-center gap-1.5 ${col.align === 'right' || isActions ? 'justify-end' : ''}`}>
                      {col.header}
                      {col.sortable && (
                        <span className="flex flex-col text-[8px] opacity-60">
                          <span className={sortField === col.accessor && sortDirection === 'asc' ? 'text-blue-600 font-black' : 'text-slate-300'}>▲</span>
                          <span className={sortField === col.accessor && sortDirection === 'desc' ? 'text-blue-600 font-black -mt-1' : 'text-slate-300 -mt-1'}>▼</span>
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {isLoading ? (
              Array.from({ length: Math.min(limit || 5, 8) }).map((_, idx) => (
                <tr key={idx} className="animate-pulse">
                  {columns.map((_, colIdx) => (
                    <td key={colIdx} className="px-4 py-3.5">
                      <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-md w-3/4"></div>
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-20 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800/60 rounded-full flex items-center justify-center mb-4">
                      <svg className="w-8 h-8 text-slate-300 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                      </svg>
                    </div>
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{emptyMessage}</span>
                    <span className="text-xs font-medium text-slate-400 mt-1">Try adjusting your filters or creating a new record.</span>
                  </div>
                </td>
              </tr>
            ) : (
              data.map((row, rowIdx) => (
                <tr 
                  key={row.id || rowIdx} 
                  onClick={() => onRowClick && onRowClick(row)}
                  className={`group transition-colors ${onRowClick ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60' : 'hover:bg-slate-50/40 dark:hover:bg-slate-800/30'}`}
                >
                  {columns.map((col, colIdx) => {
                    const isActions = col.header === 'Actions' || col.accessor === 'actions';
                    return (
                      <td 
                        key={colIdx} 
                        className={`px-4 py-3 sm:px-5 sm:py-3.5 whitespace-nowrap align-middle text-slate-700 dark:text-slate-300 ${col.align === 'right' || isActions ? 'text-right' : ''} ${isActions ? 'sticky right-0 bg-white group-hover:bg-slate-50 dark:bg-slate-900 dark:group-hover:bg-slate-800/60 shadow-[-8px_0_12px_-4px_rgba(0,0,0,0.06)] z-10' : ''}`}
                      >
                        {col.render ? col.render(row) : row[col.accessor]}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {!isLoading && onPageChange && total > 0 && (
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row gap-3 items-center justify-between bg-slate-50/80 dark:bg-slate-800/50 mt-auto font-sans">
          <div className="flex items-center gap-4">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Showing <span className="font-bold text-slate-700 dark:text-slate-200">{Math.min(((page - 1) * limit) + 1, total)}</span> to <span className="font-bold text-slate-700 dark:text-slate-200">{Math.min(page * limit, total)}</span> of <span className="font-bold text-slate-700 dark:text-slate-200">{total}</span>
            </span>
            
            {onLimitChange && (
              <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold">
                <span>Per page:</span>
                <select
                  value={limit}
                  onChange={(e) => onLimitChange(Number(e.target.value))}
                  className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1 text-xs font-bold text-slate-700 dark:text-slate-200 outline-none cursor-pointer focus:border-blue-600"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-400">
              Page <span className="text-slate-700 dark:text-slate-200 font-extrabold">{page}</span> of <span className="text-slate-700 dark:text-slate-200 font-extrabold">{Math.max(1, Math.ceil(total / limit))}</span>
            </span>
            <div className="flex items-center gap-1.5">
              <button 
                onClick={() => onPageChange(Math.max(1, page - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none transition-all shadow-2xs cursor-pointer"
                title="Previous Page"
              >
                <ChevronLeftIcon width={16} height={16} />
              </button>
              <button 
                onClick={() => onPageChange(Math.min(Math.ceil(total / limit), page + 1))}
                disabled={page >= Math.ceil(total / limit)}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none transition-all shadow-2xs cursor-pointer"
                title="Next Page"
              >
                <ChevronRightIcon width={16} height={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
