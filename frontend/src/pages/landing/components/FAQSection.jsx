import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, HelpCircle } from 'lucide-react';

export default function FAQSection() {
  const [openIdx, setOpenIdx] = useState(0);

  const faqs = [
    {
      q: 'How is Nearby Locator different from standard Google Maps?',
      a: 'Standard maps rely on rigid keyword and category matching. Nearby Locator uses Google Gemini AI to parse long-form natural human intent (e.g. "quiet place to read with green tea & power sockets") and evaluates venue atmosphere, crowd density, and live constraints.',
    },
    {
      q: 'Is Nearby Locator completely free to use?',
      a: 'Yes, basic intent search and discovery are free. We also offer premium features for advanced team collection sharing and extended search history.',
    },
    {
      q: 'How does Nearby Locator protect my location privacy?',
      a: 'We process location data strictly to fulfill active search requests. Your data is encrypted in transit and at rest, and we never sell your location telemetry to ad networks.',
    },
    {
      q: 'What AI model powers Nearby Locator?',
      a: 'Nearby Locator is powered by Google Gemini AI, leveraging its state-of-the-art multimodal reasoning and natural language processing capabilities.',
    },
    {
      q: 'Can I save and share my favorite discovered places?',
      a: 'Absolutely. You can organize your favorite spots into custom collections and share public or private links with friends or colleagues.',
    },
    {
      q: 'How accurate are walk and drive time estimates?',
      a: 'Walk and drive estimates cross-reference real-time spatial traffic and route APIs to ensure precise travel calculations.',
    },
    {
      q: 'Does it work globally or only in specific cities?',
      a: 'Nearby Locator works anywhere in the world where venue spatial data is available.',
    },
    {
      q: 'Can I filter by specific amenities like Wi-Fi or outdoor seating?',
      a: 'Yes! You can either type amenity preferences directly into natural search queries or use our smart filter toggles.',
    },
    {
      q: 'How are recommendations ranked?',
      a: 'Recommendations are ranked purely by intent confidence match, distance, and atmospheric quality. We do not accept paid placements or sponsored ad boosts.',
    },
    {
      q: 'Do I need an account?',
      a: 'You can perform basic location searches instantly. Creating a free account unlocks saved collections, search history sync, and personalized taste profile learning.',
    },
  ];

  return (
    <section id="faq" className="py-20 md:py-28 bg-slate-50 relative border-t border-slate-200/70">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Title */}
        <div className="text-center max-w-2xl mx-auto mb-14 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-bold uppercase tracking-wider">
            <HelpCircle className="w-3.5 h-3.5" /> Frequently Asked Questions
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight">
            Everything You{' '}
            <motion.span
              className="inline-block"
              animate={{
                backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
              }}
              transition={{
                duration: 10,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              style={{
                backgroundImage: 'linear-gradient(90deg, #1A73E8, #4285F4, #9B51E0, #E91E63, #FF6D00, #1A73E8)',
                backgroundSize: '300% 300%',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Need to Know
            </motion.span>
          </h2>
          <p className="text-base text-slate-600 font-normal">
            Have questions about how Nearby Locator works? We have answers.
          </p>
        </div>

        {/* 10 Accordion Items */}
        <div className="space-y-4">
          {faqs.map((faq, idx) => {
            const isOpen = openIdx === idx;
            return (
              <div
                key={faq.q}
                className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-xs transition-all"
              >
                <button
                  onClick={() => setOpenIdx(isOpen ? null : idx)}
                  className="w-full p-6 text-left font-bold text-slate-900 flex items-center justify-between gap-4 hover:text-blue-600 transition-colors cursor-pointer"
                >
                  <span className="text-base sm:text-lg">{faq.q}</span>
                  <ChevronDown
                    className={`w-5 h-5 text-slate-400 shrink-0 transition-transform duration-200 ${
                      isOpen ? 'rotate-180 text-blue-600' : ''
                    }`}
                  />
                </button>

                {isOpen && (
                  <div className="px-6 pb-6 text-slate-600 text-sm leading-relaxed font-normal border-t border-slate-100 pt-4">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
