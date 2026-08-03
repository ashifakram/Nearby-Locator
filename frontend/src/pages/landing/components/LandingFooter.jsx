import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Check } from 'lucide-react';
import { useToastStore } from '../../../store/useToastStore';

export default function LandingFooter() {
  const navigate = useNavigate();
  const { showToast } = useToastStore();
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      showToast('Please enter a valid email address.', 'error');
      return;
    }
    setSubscribed(true);
    showToast('Subscribed to Nearby Locator newsletter!', 'success');
  };

  return (
    <footer className="bg-slate-900 text-slate-400 text-sm py-16 border-t border-slate-800 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-12 border-b border-slate-800">
          {/* Brand Column (4 Cols) */}
          <div className="md:col-span-4 space-y-4">
            <Link
              to="/"
              className="flex items-center gap-2.5 group w-fit"
            >
              <img 
                src="/nearby_locator_standalone_icon.png" 
                alt="Nearby Locator" 
                className="w-9 h-9 object-contain rounded-xl shadow-xs group-hover:scale-105 transition-transform" 
              />
              <span className="font-bold text-xl text-white tracking-tight">
                Nearby <span className="text-blue-400">Locator</span>
              </span>
            </Link>
            <p className="text-xs text-slate-400 leading-relaxed font-normal max-w-sm">
              The Google Gemini AI-powered location discovery platform. Search naturally, uncover personalized recommendations, and save your favorite places effortlessly.
            </p>
            <div className="flex items-center gap-3 pt-2">
              {[
                {
                  name: 'X',
                  href: 'https://twitter.com',
                  icon: (
                    <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                  )
                },
                {
                  name: 'GitHub',
                  href: 'https://github.com',
                  icon: (
                    <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24">
                      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
                    </svg>
                  )
                },
                {
                  name: 'LinkedIn',
                  href: 'https://linkedin.com',
                  icon: (
                    <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24">
                      <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                    </svg>
                  )
                }
              ].map((social) => (
                <motion.a
                  key={social.name}
                  href={social.href}
                  target="_blank"
                  rel="noreferrer"
                  whileHover={{ scale: 1.12, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  style={{
                    backgroundImage: 'linear-gradient(135deg, #1A73E8, #4285F4, #9B51E0, #E91E63, #FF6D00, #1A73E8)',
                    backgroundSize: '300% 300%',
                  }}
                  className="w-9 h-9 rounded-xl shadow-md flex items-center justify-center cursor-pointer text-white hover:shadow-lg hover:shadow-purple-500/30 transition-all"
                >
                  {social.icon}
                </motion.a>
              ))}
            </div>
          </div>

          {/* Product Links (2 Cols) */}
          <div className="md:col-span-2 space-y-3">
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Product</h4>
            <ul className="space-y-2 text-xs">
              <li><a href="/#features" className="hover:text-white transition-colors">Features</a></li>
              <li><a href="/#how-it-works" className="hover:text-white transition-colors">How It Works</a></li>
              <li><a href="/#ai-showcase" className="hover:text-white transition-colors">AI Search</a></li>
              <li><Link to="/about" className="hover:text-white transition-colors">About Us</Link></li>
            </ul>
          </div>

          {/* Resources & Support (2 Cols) */}
          <div className="md:col-span-2 space-y-3">
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Resources</h4>
            <ul className="space-y-2 text-xs">
              <li><Link to="/help" className="hover:text-white transition-colors">Help Center & FAQ</Link></li>
              <li><Link to="/contact" className="hover:text-white transition-colors">Contact Support</Link></li>
              <li><Link to="/discover" className="hover:text-white transition-colors">Discover App</Link></li>
              <li><Link to="/login" className="hover:text-white transition-colors">Login</Link></li>
              <li><Link to="/signup" className="hover:text-white transition-colors">Sign Up</Link></li>
            </ul>
          </div>

          {/* Legal (2 Cols) */}
          <div className="md:col-span-2 space-y-3">
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Legal</h4>
            <ul className="space-y-2 text-xs">
              <li><Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link to="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
              <li><Link to="/cookies" className="hover:text-white transition-colors">Cookie Preferences</Link></li>
              <li>
                <span className="inline-flex items-center gap-1.5 text-emerald-400 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> All Systems Operational
                </span>
              </li>
            </ul>
          </div>

          {/* Newsletter Column (2 Cols) */}
          <div className="md:col-span-2 space-y-3">
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Stay Updated</h4>
            <p className="text-xs text-slate-400">Subscribe to product updates and spatial AI insights.</p>
            {subscribed ? (
              <div className="p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-800/80 text-emerald-400 text-xs font-semibold flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0" /> Subscribed!
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="space-y-2">
                <input
                  type="email"
                  placeholder="enter email..."
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                />
                <button
                  type="submit"
                  className="w-full py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1"
                >
                  Subscribe <ArrowRight className="w-3 h-3" />
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Bottom Copyright Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© {new Date().getFullYear()} Nearby Locator Inc. All rights reserved.</p>
          <p className="font-medium text-slate-400">AI-Powered Location Discovery</p>
        </div>
      </div>
    </footer>
  );
}
