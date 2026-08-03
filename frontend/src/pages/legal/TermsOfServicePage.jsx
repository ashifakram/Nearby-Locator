import React from 'react';
import { FileText, AlertCircle, CheckCircle2, ShieldAlert, Scale } from 'lucide-react';
import { Badge } from '../../components/ui';

export default function TermsOfServicePage() {
  return (
    <div className="space-y-8 font-sans text-slate-700">
      {/* Header */}
      <div className="border-b border-slate-200 pb-6">
        <div className="flex items-center gap-2 mb-3">
          <Badge variant="blue">Legal Agreement</Badge>
          <span className="text-xs text-slate-400">Effective Date: July 31, 2026</span>
        </div>
        <h1 className="text-3xl font-bold font-heading text-slate-900 tracking-tight flex items-center gap-3">
          <FileText className="w-8 h-8 text-blue-600 shrink-0" />
          Terms of Service
        </h1>
        <p className="mt-2 text-sm text-slate-600 leading-relaxed max-w-3xl">
          Please read these Terms of Service carefully before using the Nearby Locator AI spatial search application. By accessing or using our platform, you agree to be bound by these legal terms.
        </p>
      </div>

      {/* Highlights */}
      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
        <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
          <Scale className="w-4 h-4 text-blue-600" /> Key Terms Summary
        </div>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-slate-600">
          <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> Personal non-commercial & commercial usage allowed</li>
          <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> AI recommendations provided "as-is" with verification guidance</li>
          <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> Automated scraping and reverse engineering strictly prohibited</li>
          <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> Account credentials must be kept confidential</li>
        </ul>
      </div>

      {/* Content */}
      <div className="space-y-6 text-sm leading-relaxed">
        <section className="space-y-3">
          <h2 className="text-xl font-bold font-heading text-slate-900">1. Acceptance & Eligibility</h2>
          <p>
            By creating an account or using Nearby Locator, you confirm that you are at least 18 years of age (or the legal age of majority in your jurisdiction) and possess the legal authority to enter into this agreement.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold font-heading text-slate-900">2. Service Usage & AI Recommendations</h2>
          <p>
            Nearby Locator uses advanced AI models to synthesize location recommendations from spatial indices. While we strive for maximum accuracy:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
            <li>Operating hours, phone numbers, and place amenities are subject to real-world changes.</li>
            <li>AI responses are designed for informational convenience and should not serve as safety-critical routing.</li>
            <li>Users remain responsible for verifying business details prior to travel.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold font-heading text-slate-900">3. Prohibited Conduct</h2>
          <p>To protect system availability and user safety, you agree NOT to:</p>
          <div className="p-3.5 rounded-xl bg-rose-50/70 border border-rose-200 space-y-2 text-xs text-rose-900">
            <div className="flex items-center gap-2 font-bold text-rose-700">
              <ShieldAlert className="w-4 h-4" /> Strictly Forbidden Actions
            </div>
            <ul className="list-disc pl-4 space-y-1 text-rose-800">
              <li>Deploy automated bots, scrapers, or crawlers to extract system data or place indices.</li>
              <li>Attempt to bypass rate limits (`429 Rate Limited`) or security authentication mechanisms.</li>
              <li>Submit abusive, unlawful, or deceptive prompts to the AI engine.</li>
              <li>Reverse engineer or attempt to derive backend source code or API keys.</li>
            </ul>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold font-heading text-slate-900">4. Account Security & Termination</h2>
          <p>
            You are responsible for maintaining the confidentiality of your account credentials. Nearby Locator reserves the right to suspend or terminate accounts that violate system policies, trigger repeated API abuse, or engage in unauthorized access.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold font-heading text-slate-900">5. Limitation of Liability</h2>
          <p className="text-slate-600">
            To the maximum extent permitted by law, Nearby Locator Inc. shall not be liable for any indirect, incidental, or consequential damages resulting from your reliance on AI-generated recommendations, third-party place inaccuracies, or temporary service outages.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold font-heading text-slate-900">6. Governing Law</h2>
          <p className="text-slate-600">
            These terms are governed by and construed in accordance with the laws of Delaware, USA, without regard to conflict of law principles.
          </p>
        </section>
      </div>
    </div>
  );
}
