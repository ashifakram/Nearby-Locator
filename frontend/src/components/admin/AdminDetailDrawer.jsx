import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

export default function AdminDetailDrawer({ isOpen, onClose, title, children }) {
  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex justify-end">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm transition-opacity duration-300 cursor-pointer" 
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Drawer */}
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 border-l border-slate-200/80 dark:border-slate-800 shadow-2xl h-full flex flex-col transform transition-transform duration-300 animate-slide-in-right z-10">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">{title}</h2>
          <button 
            type="button"
            onClick={onClose}
            className="p-2 -mr-2 rounded-full text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close detail drawer"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-grow flex flex-col gap-5 text-sm text-slate-700 dark:text-slate-300 bg-slate-50/50 dark:bg-slate-950/50">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
