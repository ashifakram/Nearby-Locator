import React, { useState } from 'react';
import { HelpCircle, Search, ChevronDown, MessageSquare, Sparkles, Compass, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Badge, Button, Card } from '../../components/ui';

const FAQS = [
  {
    category: 'Getting Started',
    question: 'How does Nearby Locator find places using natural language?',
    answer: 'Nearby Locator combines your explicit search query and browser location with Google Gemini AI reasoning. Gemini parses intent (e.g. "quiet workspace with outdoor seating"), matches spatial indices, and scores places by relevance rather than simple keyword matching.',
  },
  {
    category: 'Getting Started',
    question: 'Do I need to enable GPS or Location Services to search?',
    answer: 'Location access is recommended for automatic distance sorting, but not required. You can also search by typing specific city names or neighborhood boundaries (e.g., "Best ramen in Downtown Seattle").',
  },
  {
    category: 'AI Search Tips',
    question: 'What makes a great natural language search query?',
    answer: 'Be descriptive! Include atmosphere, amenities, dietary preferences, or specific vibes. For example: "Late night dessert spot with vegan options and dim lighting" yields far richer results than "dessert".',
  },
  {
    category: 'Account & Security',
    question: 'How do I save places or create custom collections?',
    answer: 'Click the Bookmark icon on any place card to save it to your default collection. You can organize saved places into custom lists (e.g., "Weekend Brunch Spots") from the Saved Places tab.',
  },
  {
    category: 'Account & Security',
    question: 'Is my real-time location data stored on your servers?',
    answer: 'No. Device coordinates are used ephemerally to compute distance matrices during search execution and are never permanently stored in your account history unless explicitly saved in a query.',
  },
  {
    category: 'Troubleshooting',
    question: 'Why am I seeing a "Rate Limited" or "503" error?',
    answer: 'To ensure high service quality, our API enforces rate limits on excessive rapid searches. If you encounter a 429 or 503 error, wait a few seconds and the countdown timer will automatically clear.',
  },
];

export default function HelpCenterPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [openIdx, setOpenIdx] = useState(0);

  const filteredFaqs = FAQS.filter(
    (faq) =>
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 font-sans text-slate-700">
      {/* Header */}
      <div className="border-b border-slate-200 pb-6">
        <div className="flex items-center gap-2 mb-3">
          <Badge variant="blue">Help & Support</Badge>
          <span className="text-xs text-slate-400">Knowledge Base</span>
        </div>
        <h1 className="text-3xl font-bold font-heading text-slate-900 tracking-tight flex items-center gap-3">
          <HelpCircle className="w-8 h-8 text-blue-600 shrink-0" />
          Help Center & FAQ
        </h1>
        <p className="mt-2 text-sm text-slate-600 leading-relaxed max-w-3xl">
          Search our knowledge base or browse frequently asked questions to get the most out of Nearby Locator's AI spatial search.
        </p>

        {/* Live Search Input */}
        <div className="mt-5 relative max-w-xl">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search questions (e.g. location, AI search, saved places)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 bg-slate-50/80 text-sm text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* Category Shortcut Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
          <Compass className="w-5 h-5 text-blue-600 mb-1" />
          <div className="font-bold text-slate-900 text-sm">Getting Started</div>
          <p className="text-xs text-slate-500">Learn how spatial AI discovery works.</p>
        </div>
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
          <Sparkles className="w-5 h-5 text-blue-600 mb-1" />
          <div className="font-bold text-slate-900 text-sm">AI Search Prompting</div>
          <p className="text-xs text-slate-500">Crafting natural language queries.</p>
        </div>
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
          <ShieldCheck className="w-5 h-5 text-blue-600 mb-1" />
          <div className="font-bold text-slate-900 text-sm">Privacy & Security</div>
          <p className="text-xs text-slate-500">Data protection & account safety.</p>
        </div>
      </div>

      {/* Accordion List */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold font-heading text-slate-900">Frequently Asked Questions</h2>
        {filteredFaqs.length === 0 ? (
          <p className="text-sm text-slate-500 italic">No matching questions found for "{searchQuery}". Try a different term.</p>
        ) : (
          filteredFaqs.map((faq, idx) => {
            const isOpen = openIdx === idx;
            return (
              <div
                key={idx}
                className="rounded-xl border border-slate-200 bg-white overflow-hidden transition-colors"
              >
                <button
                  type="button"
                  onClick={() => setOpenIdx(isOpen ? -1 : idx)}
                  className="w-full px-4 py-3.5 text-left flex items-center justify-between gap-4 font-semibold text-slate-900 text-sm hover:bg-slate-50 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Badge variant="ghost" className="text-[10px] uppercase font-bold shrink-0">
                      {faq.category}
                    </Badge>
                    {faq.question}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                      isOpen ? 'rotate-180 text-blue-600' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 pt-1 text-xs text-slate-600 leading-relaxed border-t border-slate-100 bg-slate-50/50">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Still need help CTA */}
      <div className="p-5 rounded-2xl bg-blue-600 text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md">
        <div className="space-y-1 text-center sm:text-left">
          <h3 className="font-bold font-heading text-base">Still need assistance?</h3>
          <p className="text-xs text-blue-100">Our support engineering team is available 24/7 to answer your questions.</p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/contact')}
          className="px-4 py-2 rounded-xl bg-white text-blue-600 font-bold text-xs hover:bg-blue-50 transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer"
        >
          <MessageSquare className="w-4 h-4" /> Contact Support Team
        </button>
      </div>
    </div>
  );
}
