import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import AnnouncementBar from '../pages/landing/components/AnnouncementBar';
import StickyNavbar from '../pages/landing/components/StickyNavbar';
import LandingFooter from '../pages/landing/components/LandingFooter';
import { Shield, FileText, Cookie, HelpCircle } from 'lucide-react';
import { Container, Section } from '../components/ui';

/**
 * Shared LegalLayout providing a sidebar + document layout shell for Legal & Policy pages.
 */
export default function LegalLayout() {
  const legalNavLinks = [
    { name: 'Privacy Policy', path: '/privacy', icon: Shield },
    { name: 'Terms of Service', path: '/terms', icon: FileText },
    { name: 'Cookie Preferences', path: '/cookies', icon: Cookie },
    { name: 'Help Center & Support', path: '/help', icon: HelpCircle },
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-blue-600 selection:text-white flex flex-col justify-between overflow-x-hidden antialiased">
      <AnnouncementBar />
      <StickyNavbar />

      <main className="flex-grow bg-slate-50/60 py-12 md:py-16">
        <Container size="7xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            {/* Left Legal Sidebar Navigation */}
            <aside className="lg:col-span-3">
              <div className="sticky top-24 bg-white/80 backdrop-blur-md border border-slate-200/80 rounded-2xl p-4 shadow-xs space-y-1">
                <h4 className="px-3 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Legal & Trust Center
                </h4>
                {legalNavLinks.map((link) => {
                  const Icon = link.icon;
                  return (
                    <NavLink
                      key={link.path}
                      to={link.path}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                          isActive
                            ? 'bg-blue-50 text-blue-600 shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                        }`
                      }
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{link.name}</span>
                    </NavLink>
                  );
                })}
              </div>
            </aside>

            {/* Right Document Content Area */}
            <article className="lg:col-span-9 bg-white/90 backdrop-blur-md border border-slate-200/80 rounded-2xl p-6 sm:p-10 shadow-xs">
              <Outlet />
            </article>
          </div>
        </Container>
      </main>

      <LandingFooter />
    </div>
  );
}
