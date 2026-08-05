import React, { useState } from 'react';
import SearchIcon from '../../icons/SearchIcon';

export default function AdminFilterBar({
  searchPlaceholder = "Search...",
  searchValue,
  onSearchChange,
  dateRange,
  onDateRangeChange,
  filters = [],
  onExport,
  isExporting
}) {
  const [debouncedSearch, setDebouncedSearch] = useState(searchValue || '');

  React.useEffect(() => {
    setDebouncedSearch(searchValue || '');
  }, [searchValue]);

  const handleSearch = (e) => {
    const val = e.target.value;
    setDebouncedSearch(val);
    if (onSearchChange) {
      onSearchChange(val);
    }
  };

  const handleClear = () => {
    setDebouncedSearch('');
    if (onSearchChange) {
      onSearchChange('');
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs w-full font-sans">
      <div className="flex flex-wrap items-center gap-3 flex-grow max-w-4xl w-full">
        <div className="relative flex-grow max-w-md w-full">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <SearchIcon width={14} height={14} />
          </div>
          <input
            type="text"
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm rounded-xl pl-9 pr-8 py-2 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/10 transition-all font-medium"
            placeholder={searchPlaceholder}
            value={debouncedSearch}
            onChange={handleSearch}
          />
          {debouncedSearch && (
            <button
              onClick={handleClear}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer text-xs font-bold"
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>
        
        {/* Dynamic Filters */}
        {filters.map((filter, idx) => (
          <select
            key={idx}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm rounded-xl px-3 py-2 text-slate-700 dark:text-slate-200 font-semibold focus:outline-none focus:border-blue-600 transition-all cursor-pointer"
            value={filter.value || ''}
            onChange={(e) => filter.onChange(e.target.value)}
          >
            <option value="">{filter.label}</option>
            {filter.options.map((opt, oIdx) => (
              <option key={oIdx} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        ))}
        
        {/* Date Range Picker */}
        {dateRange && onDateRangeChange && (
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-sm font-semibold text-slate-600 dark:text-slate-300">
            <input 
              type="date" 
              className="bg-transparent text-slate-900 dark:text-white outline-none text-xs font-bold cursor-pointer"
              value={dateRange.start || ''}
              onChange={e => onDateRangeChange({ ...dateRange, start: e.target.value })}
            />
            <span className="text-slate-400 font-normal">to</span>
            <input 
              type="date" 
              className="bg-transparent text-slate-900 dark:text-white outline-none text-xs font-bold cursor-pointer"
              value={dateRange.end || ''}
              onChange={e => onDateRangeChange({ ...dateRange, end: e.target.value })}
            />
          </div>
        )}
      </div>

      {onExport && (
        <button
          onClick={onExport}
          disabled={isExporting}
          className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-2xs cursor-pointer disabled:opacity-50"
        >
          {isExporting ? 'Exporting...' : 'Export CSV'}
        </button>
      )}
    </div>
  );
}
