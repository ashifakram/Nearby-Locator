import React from 'react';
import AnnouncementBar from './components/AnnouncementBar';
import StickyNavbar from './components/StickyNavbar';
import HeroSection from './components/HeroSection';
import FeaturesSection from './components/FeaturesSection';
import HowItWorksSection from './components/HowItWorksSection';
import AIShowcaseSection from './components/AIShowcaseSection';
import ProductPreviewTabs from './components/ProductPreviewTabs';
import PersonalizationSection from './components/PersonalizationSection';
import SecuritySection from './components/SecuritySection';
import TestimonialsSection from './components/TestimonialsSection';
import FAQSection from './components/FAQSection';
import FinalCTASection from './components/FinalCTASection';
import LandingFooter from './components/LandingFooter';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-blue-600 selection:text-white flex flex-col justify-between overflow-x-hidden antialiased">
      {/* 1. Announcement Bar */}
      <AnnouncementBar />

      {/* 2. Sticky Header Navigation */}
      <StickyNavbar />

      {/* Main Sections Stack */}
      <main className="flex-grow">
        {/* 3. Hero Section */}
        <HeroSection />

        {/* 4. Features Section (6 Cards) */}
        <FeaturesSection />

        {/* 5. How It Works Section (6-Step Workflow Timeline) */}
        <HowItWorksSection />

        {/* 6. AI Showcase Section (Query & Reasoning Demo) */}
        <AIShowcaseSection />

        {/* 7. Product Preview Tabs (Search, Map, Saved, History, Profile, Settings) */}
        <ProductPreviewTabs />

        {/* 8. Personalization Section */}
        <PersonalizationSection />

        {/* 9. Security & Privacy Section */}
        <SecuritySection />

        {/* 10. Testimonials Section */}
        <TestimonialsSection />

        {/* 11. FAQ Section (10 Accordions) */}
        <FAQSection />

        {/* 12. Final Call to Action */}
        <FinalCTASection />
      </main>

      {/* 13. Footer Section */}
      <LandingFooter />
    </div>
  );
}
