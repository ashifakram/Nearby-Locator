import React from 'react';
import HeaderSection from './components/HeaderSection';
import HeroSection from './components/HeroSection';
import LiveSimulation from './components/LiveSimulation';
import TrustShowcase from './components/TrustShowcase';
import MobilePreview from './components/MobilePreview';
import FooterSection from './components/FooterSection';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#070A12] text-slate-100 flex flex-col justify-between overflow-x-hidden selection:bg-cyan-500/20 selection:text-cyan-300">
      {/* 1. Spatial Sticky Floating Header */}
      <HeaderSection />

      {/* 2. Core Sections Stack */}
      <main className="flex-grow">
        {/* A. Cinematic Spatial Hero Section */}
        <HeroSection />

        {/* B. Live Autocomplete typing simulation */}
        <LiveSimulation />

        {/* C. Verified Suggestion Trigrams & token systems trust panel */}
        <TrustShowcase />

        {/* D. Collapsible Bottom Sheet Mockup phone container */}
        <MobilePreview />
      </main>

      {/* 3. Futuristic telemetry Footer */}
      <FooterSection />
    </div>
  );
}
