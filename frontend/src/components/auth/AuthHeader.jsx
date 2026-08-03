import React from 'react';
import { motion } from 'framer-motion';
import GeminiSparkleIcon from '../../icons/GeminiSparkleIcon';

export default function AuthHeader({ className = '' }) {
  return (
    <div className={`login-fade-up mb-8 flex flex-col items-center lg:hidden ${className}`}>
      {/* Brand Logo & Title matching Landing Page */}
      <div className="mb-3 flex items-center gap-2.5">
        <img 
          src="/nearby_locator_standalone_icon.png" 
          alt="Nearby Locator" 
          className="w-8 h-8 object-contain rounded-xl shadow-xs" 
        />
        <span className="font-bold text-2xl text-slate-900 tracking-tight">
          Nearby <span className="text-blue-600">Locator</span>
        </span>
      </div>

      {/* Powered by Gemini AI Badge with Rotating Multi-Color Conic Border Beam */}
      <div className="relative inline-flex items-center rounded-full p-[2px] shadow-sm overflow-hidden">
        {/* Rotating Conic Gradient Beam */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{
            duration: 3.5,
            repeat: Infinity,
            ease: 'linear',
          }}
          className="absolute -inset-[150%] rounded-full opacity-100"
          style={{
            background: 'conic-gradient(from 0deg at 50% 50%, transparent 0deg, #1A73E8 60deg, #4285F4 120deg, #9B51E0 180deg, #E91E63 240deg, #FF6D00 300deg, transparent 360deg)',
          }}
        />

        {/* Inner Content Pill */}
        <div className="relative z-10 flex items-center gap-1.5 rounded-full bg-white px-3 py-1">
          <motion.div
            animate={{ rotate: [0, 360, 360] }}
            transition={{
              duration: 10,
              times: [0, 0.12, 1],
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="shrink-0"
          >
            <GeminiSparkleIcon className="w-3.5 h-3.5 shrink-0" />
          </motion.div>
          <span className="text-[9px] font-bold tracking-normal text-[#464554] uppercase whitespace-nowrap">POWERED BY GEMINI AI</span>
        </div>
      </div>
    </div>
  );
}
