import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuthStore } from '../../../store/useAuthStore';
import { Menu, X, ArrowRight, Sparkles } from 'lucide-react';

export default function StickyNavbar() {
  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isLandingPage = location.pathname === '/';

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Features', href: '/#features', sectionId: 'features' },
    { name: 'How It Works', href: '/#how-it-works', sectionId: 'how-it-works' },
    { name: 'AI Search', href: '/#ai-showcase', sectionId: 'ai-showcase' },
    { name: 'About', href: '/about' },
    { name: 'Help', href: '/help' },
    { name: 'Contact', href: '/contact' },
  ];

  const handleNavClick = (e, link) => {
    setMobileMenuOpen(false);
    if (link.sectionId) {
      if (isLandingPage) {
        e.preventDefault();
        const element = document.getElementById(link.sectionId);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      } else {
        // Let normal navigation to /#section happen
      }
    }
  };

  return (
    <header
      className={`sticky top-0 z-40 w-full transition-all duration-300 font-sans ${
        isScrolled
          ? 'bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-xs py-3'
          : 'bg-white border-b border-slate-100 py-4'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Brand Logo & Title */}
        <Link
          to="/"
          className="flex items-center gap-2.5 group cursor-pointer"
        >
          <img 
            src="/nearby_locator_standalone_icon.png" 
            alt="Nearby Locator" 
            className="w-9 h-9 object-contain rounded-xl shadow-xs group-hover:scale-105 transition-transform" 
          />
          <span className="font-bold text-xl text-slate-900 tracking-tight">
            Nearby <span className="text-blue-600">Locator</span>
          </span>
        </Link>

        {/* Desktop Nav Center Links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              to={link.href}
              onClick={(e) => handleNavClick(e, link)}
              className="hover:text-blue-600 transition-colors cursor-pointer"
            >
              {link.name}
            </Link>
          ))}
        </nav>

        {/* Right Desktop CTA Action Buttons */}
        <div className="hidden md:flex items-center gap-3">
          {isAuthenticated ? (
            <button
              type="button"
              onClick={() => navigate('/discover')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-xs cursor-pointer"
            >
              <Sparkles className="w-4 h-4" /> Go to Console
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="px-4 py-2 rounded-xl text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-all cursor-pointer"
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => navigate('/signup')}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-600/20 hover:shadow-lg transition-all cursor-pointer"
              >
                Start Free <ArrowRight className="w-4 h-4" />
              </button>
            </>
          )}
        </div>

        {/* Mobile Toggle Button */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 border border-slate-200 cursor-pointer"
          aria-label="Toggle Navigation Menu"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-slate-200 px-4 pt-3 pb-6 space-y-3 shadow-xl">
          <nav className="flex flex-col space-y-2">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.href}
                onClick={(e) => handleNavClick(e, link)}
                className="px-3 py-2 rounded-lg text-base font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
              >
                {link.name}
              </Link>
            ))}
          </nav>

          <div className="pt-3 border-t border-slate-100 flex flex-col gap-2.5">
            {isAuthenticated ? (
              <button
                type="button"
                onClick={() => navigate('/discover')}
                className="w-full py-2.5 rounded-xl text-center text-sm font-semibold bg-blue-600 text-white shadow-md cursor-pointer"
              >
                Go to Console
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="w-full py-2.5 rounded-xl text-center text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 cursor-pointer"
                >
                  Login
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/signup')}
                  className="w-full py-2.5 rounded-xl text-center text-sm font-semibold bg-blue-600 text-white shadow-md cursor-pointer"
                >
                  Start Free
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
