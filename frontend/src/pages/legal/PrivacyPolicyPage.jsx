import React from 'react';
import { Shield, Lock, Eye, Server, UserCheck, Mail } from 'lucide-react';
import { Badge } from '../../components/ui';

export default function PrivacyPolicyPage() {
  return (
    <div className="space-y-8 font-sans text-slate-700">
      {/* Header */}
      <div className="border-b border-slate-200 pb-6">
        <div className="flex items-center gap-2 mb-3">
          <Badge variant="blue">Legal & Trust</Badge>
          <span className="text-xs text-slate-400">Effective Date: July 31, 2026</span>
        </div>
        <h1 className="text-3xl font-bold font-heading text-slate-900 tracking-tight flex items-center gap-3">
          <Shield className="w-8 h-8 text-blue-600 shrink-0" />
          Privacy Policy
        </h1>
        <p className="mt-2 text-sm text-slate-600 leading-relaxed max-w-3xl">
          At Nearby Locator, we take data privacy and spatial data protection seriously. This policy details how we collect, process, store, and safeguard your personal data and location queries.
        </p>
      </div>

      {/* Highlights Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-100 space-y-1.5">
          <div className="flex items-center gap-2 text-blue-700 font-bold text-sm">
            <Lock className="w-4 h-4" /> Zero Query Selling
          </div>
          <p className="text-xs text-slate-600">We never sell your natural language search prompts or location histories to third-party data brokers.</p>
        </div>
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
            <Eye className="w-4 h-4 text-blue-600" /> Ephemeral Geolocation
          </div>
          <p className="text-xs text-slate-600">Your device coordinates are processed in-memory for spatial distance calculations and never permanently logged.</p>
        </div>
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
            <Server className="w-4 h-4 text-blue-600" /> Encrypted Storage
          </div>
          <p className="text-xs text-slate-600">All data in transit is encrypted using TLS 1.3 and at rest using AES-256 standards.</p>
        </div>
      </div>

      {/* Document Sections */}
      <div className="space-y-6 text-sm leading-relaxed">
        <section className="space-y-3">
          <h2 className="text-xl font-bold font-heading text-slate-900">1. Information We Collect</h2>
          <p>We collect information to provide intelligent, contextual location discovery services:</p>
          <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
            <li><strong>Account Data:</strong> Name, email address, hashed password, and authentication provider identifiers (e.g. Google OAuth tokens).</li>
            <li><strong>Spatial Search Queries:</strong> Natural language prompts you input (e.g., "Cozy coffee shop with fast Wi-Fi near central park").</li>
            <li><strong>Geographical Telemetry:</strong> Latitude, longitude, and accuracy radius sent via browser geolocation APIs when explicit consent is granted.</li>
            <li><strong>Usage & Device Metrics:</strong> Anonymized browser type, IP address (for regional rate-limiting), request timestamps, and performance telemetry.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold font-heading text-slate-900">2. How We Process Data with Google Gemini AI</h2>
          <p>
            Nearby Locator integrates Google Gemini AI for semantic search parsing and contextual reasoning. When you perform a search, your text query and approximate coordinates are transmitted to our secure backend pipeline before invoking the Gemini AI API.
          </p>
          <p className="text-slate-600">
            Personal identifying information (such as your email address, name, or account ID) is strictly stripped prior to AI execution.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold font-heading text-slate-900">3. Data Sharing & Subprocessors</h2>
          <p>We do not rent or trade personal information. Data is shared strictly with trusted infrastructure partners:</p>
          <div className="rounded-xl border border-slate-200 overflow-hidden text-xs">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3">Partner / Service</th>
                  <th className="p-3">Purpose</th>
                  <th className="p-3">Location</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600">
                <tr>
                  <td className="p-3 font-medium text-slate-900">Google Cloud / Gemini AI</td>
                  <td className="p-3">Natural language understanding & spatial ranking</td>
                  <td className="p-3">United States</td>
                </tr>
                <tr>
                  <td className="p-3 font-medium text-slate-900">PostgreSQL Cloud DB</td>
                  <td className="p-3">Encrypted database storage for user profiles & saved places</td>
                  <td className="p-3">United States / EU</td>
                </tr>
                <tr>
                  <td className="p-3 font-medium text-slate-900">Redis Cache</td>
                  <td className="p-3">Transient query response caching & rate-limiting</td>
                  <td className="p-3">In-Memory Cluster</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold font-heading text-slate-900">4. Your Data Control Rights</h2>
          <p>Under global privacy frameworks (including GDPR and CCPA), you hold the following rights:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <span className="font-semibold text-slate-900 block mb-1">Right to Access & Export</span>
              <span className="text-xs text-slate-600">Export your saved places, collection lists, and search history anytime from Settings.</span>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <span className="font-semibold text-slate-900 block mb-1">Right to Erasure</span>
              <span className="text-xs text-slate-600">Permanently delete your account and all associated personal records instantly.</span>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold font-heading text-slate-900">5. Contact Our Data Protection Officer</h2>
          <p className="text-slate-600">
            If you have questions regarding this Privacy Policy or wish to exercise your privacy rights, contact our privacy team:
          </p>
          <div className="flex items-center gap-2 p-3.5 rounded-xl bg-blue-50/80 border border-blue-200 text-blue-900 text-xs font-semibold">
            <Mail className="w-4 h-4 text-blue-600" />
            <span>Email: privacy@nearbylocator.com &nbsp;|&nbsp; Direct response guaranteed within 24 hours.</span>
          </div>
        </section>
      </div>
    </div>
  );
}
