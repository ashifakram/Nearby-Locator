import React from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function AnnouncementBar() {
  const navigate = useNavigate();

  return (
    <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 text-white text-xs sm:text-sm py-2 px-4 text-center font-medium relative z-50 flex items-center justify-center gap-2 shadow-2xs">
      <span className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-sm px-2.5 py-0.5 rounded-full text-[11px] font-semibold text-white tracking-wide uppercase">
        <Sparkles className="w-3 h-3 text-amber-300 animate-pulse" /> New
      </span>
      <span className="truncate">
        AI-powered location discovery is now smarter than ever.
      </span>
      <button
        onClick={() => {
          const el = document.getElementById('ai-showcase');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
          else navigate('/discover');
        }}
        className="inline-flex items-center gap-1 font-semibold underline underline-offset-4 hover:text-blue-100 transition-colors ml-1 cursor-pointer shrink-0"
      >
        Learn More <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
