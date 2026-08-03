import React, { useState } from 'react';
import { Cookie, Check, Settings, Info } from 'lucide-react';
import { Badge, Button } from '../../components/ui';
import { useToastStore } from '../../store/useToastStore';

export default function CookiePolicyPage() {
  const { showToast } = useToastStore();
  const [preferences, setPreferences] = useState({
    essential: true, // Always required
    functional: true,
    analytics: true,
  });

  const handleSave = () => {
    showToast('Cookie preferences saved successfully!', 'success');
  };

  return (
    <div className="space-y-8 font-sans text-slate-700">
      {/* Header */}
      <div className="border-b border-slate-200 pb-6">
        <div className="flex items-center gap-2 mb-3">
          <Badge variant="blue">Privacy Control</Badge>
          <span className="text-xs text-slate-400">Updated: July 2026</span>
        </div>
        <h1 className="text-3xl font-bold font-heading text-slate-900 tracking-tight flex items-center gap-3">
          <Cookie className="w-8 h-8 text-blue-600 shrink-0" />
          Cookie & Preference Policy
        </h1>
        <p className="mt-2 text-sm text-slate-600 leading-relaxed max-w-3xl">
          We use cookies and local storage technology to authenticate your session, remember your preferences, and maintain high system security. You can customize your cookie consent settings below.
        </p>
      </div>

      {/* Interactive Cookie Preference Center */}
      <div className="p-5 rounded-2xl bg-blue-50/50 border border-blue-200 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold font-heading text-slate-900 flex items-center gap-2">
            <Settings className="w-4 h-4 text-blue-600" /> Preference Center
          </h2>
          <span className="text-xs text-blue-700 font-semibold bg-blue-100/80 px-2.5 py-1 rounded-full">
            Active Consent Session
          </span>
        </div>

        <div className="space-y-3">
          {/* Essential */}
          <div className="p-3.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between">
            <div>
              <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                Essential Session Cookies
                <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">Required</span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">Used for login tokens, CSRF protection, and security rate-limiting.</p>
            </div>
            <input type="checkbox" checked disabled className="w-4 h-4 text-blue-600 rounded opacity-60 cursor-not-allowed" />
          </div>

          {/* Functional */}
          <div className="p-3.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between">
            <div>
              <div className="font-bold text-slate-900 text-sm">Functional & Storage Preferences</div>
              <p className="text-xs text-slate-500 mt-0.5">Saves active map views, category filters, and saved collection state in browser LocalStorage.</p>
            </div>
            <input
              type="checkbox"
              checked={preferences.functional}
              onChange={(e) => setPreferences((p) => ({ ...p, functional: e.target.checked }))}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500/20 cursor-pointer"
            />
          </div>

          {/* Analytics */}
          <div className="p-3.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between">
            <div>
              <div className="font-bold text-slate-900 text-sm">Anonymized Performance Analytics</div>
              <p className="text-xs text-slate-500 mt-0.5">Helps us monitor query latency and optimize location search speeds.</p>
            </div>
            <input
              type="checkbox"
              checked={preferences.analytics}
              onChange={(e) => setPreferences((p) => ({ ...p, analytics: e.target.checked }))}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500/20 cursor-pointer"
            />
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <Button variant="primary" size="sm" onClick={handleSave}>
            <Check className="w-4 h-4 mr-1" /> Save Preferences
          </Button>
        </div>
      </div>

      {/* Policy Details */}
      <div className="space-y-6 text-sm leading-relaxed">
        <section className="space-y-3">
          <h2 className="text-xl font-bold font-heading text-slate-900">What Are Cookies?</h2>
          <p className="text-slate-600">
            Cookies are small text files placed on your device by websites you visit. LocalStorage is a web storage mechanism that lets web applications save data locally in your browser with no expiration date. Nearby Locator utilizes both mechanisms to deliver a seamless spatial discovery experience.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold font-heading text-slate-900">How to Manage Cookies via Browser</h2>
          <p className="text-slate-600">
            In addition to our Preference Center above, you can restrict or block cookies through your web browser settings. Note that disabling essential cookies will impact your ability to log in or save favorite locations.
          </p>
        </section>
      </div>
    </div>
  );
}
