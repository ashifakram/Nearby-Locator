import React from 'react';
import { Link } from 'react-router-dom';

export default function AuthFooter({ className = '' }) {
  const footerLinks = [
    { label: 'Privacy Policy', path: '/privacy' },
    { label: 'Terms of Service', path: '/terms' },
    { label: 'Help Center', path: '/help' },
  ];

  return (
    <footer className={`mt-auto pb-4 text-center font-sans lg:mt-6 ${className}`}>
      <div className="mb-2 flex justify-center gap-5">
        {footerLinks.map((item) => (
          <Link
            key={item.label}
            to={item.path}
            className="text-xs font-medium text-slate-500 hover:text-blue-600 transition-colors"
          >
            {item.label}
          </Link>
        ))}
      </div>
      <p className="text-[11px] font-medium text-slate-400">
        Nearby Locator Inc. — AI-Powered Location Discovery
      </p>
    </footer>
  );
}
