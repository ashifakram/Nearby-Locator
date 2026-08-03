import React, { useEffect } from 'react';

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

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className="relative w-full max-w-lg bg-white shadow-2xl h-full flex flex-col transform transition-transform duration-300 animate-slide-in-right">
        <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100 bg-white">
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">{title}</h2>
          <button 
            onClick={onClose}
            className="p-2 -mr-2 rounded-full text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="p-8 overflow-y-auto flex-grow flex flex-col gap-6 text-sm text-slate-700 bg-slate-50/30">
          {children}
        </div>
      </div>
    </div>
  );
}
