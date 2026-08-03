import React from 'react';
import { motion } from 'framer-motion';
import { Star, Quote } from 'lucide-react';

export default function TestimonialsSection() {
  const testimonials = [
    {
      name: 'Elena Rostova',
      occupation: 'Digital Nomad & Traveler',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
      review:
        'Nearby Locator found hidden coastal cafes in Lisbon that Google Maps completely missed, simply because it understood "quiet work spot with a sea view and reliable power sockets".',
      stars: 5,
    },
    {
      name: 'Marcus Chen',
      occupation: 'Computer Science Student',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
      review:
        'I can type "late night study spot near campus with outlet sockets open past 11 PM" and get exact recommendations with walk times. It is an indispensable tool for finals week.',
      stars: 5,
    },
    {
      name: 'Sarah Jenkins',
      occupation: 'Remote Product Strategist',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
      review:
        'Building saved collections for my business trips has saved me hours. The AI rationale tells me exactly WHY a place fits my day before I waste a 20-minute Uber ride.',
      stars: 5,
    },
  ];

  return (
    <section className="py-20 md:py-28 bg-white relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Title */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <span className="px-3.5 py-1 rounded-full bg-blue-100/70 text-blue-700 text-xs sm:text-sm font-bold uppercase tracking-wider">
            User Stories
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight">
            Loved by{' '}
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
              Travelers, Students & Remote Workers
            </motion.span>
          </h2>
          <p className="text-base sm:text-lg text-slate-600 font-normal">
            Here is how real people are using AI intent discovery to explore places around the world.
          </p>
        </div>

        {/* 3 Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((t) => (
            <div
              key={t.name}
              className="bg-slate-50 p-8 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow relative"
            >
              <Quote className="w-10 h-10 text-blue-200 absolute top-6 right-6 pointer-events-none opacity-60" />

              <div className="space-y-4 relative z-10">
                <div className="flex items-center gap-1 text-amber-400">
                  {[...Array(t.stars)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400" />
                  ))}
                </div>
                <p className="text-slate-700 text-sm leading-relaxed font-medium italic">
                  "{t.review}"
                </p>
              </div>

              <div className="flex items-center gap-3 pt-6 mt-6 border-t border-slate-200/60 relative z-10">
                <img
                  src={t.avatar}
                  alt={t.name}
                  className="w-11 h-11 rounded-full object-cover border-2 border-white shadow-xs"
                />
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{t.name}</h4>
                  <p className="text-xs text-slate-500 font-medium">{t.occupation}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
