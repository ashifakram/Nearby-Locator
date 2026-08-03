import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Lock, EyeOff, KeyRound, Database, CheckCircle2 } from 'lucide-react';

export default function SecuritySection() {
  const cards = [
    {
      icon: Lock,
      title: 'Encrypted Connections',
      description: 'End-to-end TLS 1.3 encryption safeguards all location requests and API transmissions.',
    },
    {
      icon: KeyRound,
      title: 'Secure Authentication',
      description: 'OAuth 2.0 and JWT token storage keep your credentials secure against unauthorized access.',
    },
    {
      icon: EyeOff,
      title: 'Privacy Controls',
      description: 'Granular location permissions. Choose precise GPS positioning or approximate zip-code search.',
    },
    {
      icon: Database,
      title: 'Protected Personal Data',
      description: 'Your saved collections and query histories are encrypted at rest with zero third-party selling.',
    },
    {
      icon: Shield,
      title: 'No Unnecessary Tracking',
      description: 'We track location only during active searches. No background telemetry or invasive ad profiles.',
    },
  ];

  return (
    <section className="py-20 md:py-28 bg-slate-50 relative border-y border-slate-200/70">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Title */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold uppercase tracking-wider">
            <Shield className="w-3.5 h-3.5" /> Trust & Security First
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight">
            Your Location Privacy Is{' '}
            <motion.span
              className="inline-block"
              animate={{
                backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
              }}
              transition={{
                duration: 10,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              style={{
                backgroundImage: 'linear-gradient(90deg, #1A73E8, #4285F4, #9B51E0, #E91E63, #FF6D00, #1A73E8)',
                backgroundSize: '300% 300%',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Non-Negotiable.
            </motion.span>
          </h2>
          <p className="text-base sm:text-lg text-slate-600 font-normal leading-relaxed">
            We built Nearby Locator with a privacy-by-design architecture. Your search history and movement patterns belong exclusively to you.
          </p>
        </div>

        {/* 5 Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cards.map((c) => {
            const Icon = c.icon;
            return (
              <div key={c.title} className="bg-white p-7 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center">
                  <Icon className="w-5 h-5" />
                </div>
                <h4 className="text-lg font-bold text-slate-900">{c.title}</h4>
                <p className="text-sm text-slate-600 leading-relaxed font-normal">{c.description}</p>
              </div>
            );
          })}

          {/* Simple Trust Banner Card */}
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-7 rounded-2xl text-white flex flex-col justify-between shadow-lg">
            <div className="space-y-3">
              <span className="px-2.5 py-1 bg-white/20 backdrop-blur-md text-[11px] font-bold uppercase tracking-wider rounded-full">
                Security Guarantee
              </span>
              <h4 className="text-xl font-bold">Zero Ad Brokerage</h4>
              <p className="text-xs text-blue-100 leading-relaxed font-medium">
                Nearby Locator is monetized through premium AI discovery plans, not by selling your location data to advertiser networks.
              </p>
            </div>
            <div className="pt-4 flex items-center gap-2 text-xs font-bold text-white">
              <CheckCircle2 className="w-4 h-4 text-emerald-300" />
              <span>SOC2 Compliant Infrastructure</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
