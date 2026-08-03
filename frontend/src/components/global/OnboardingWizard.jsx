import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { useOnboarding } from '../../hooks/useOnboarding';
import { Compass, CheckCircle2, MapPin, Sparkles, X } from 'lucide-react';

export function OnboardingWizard() {
  const { user } = useAuthStore();
  const { completed, completeOnboarding } = useOnboarding();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [displayName, setDisplayName] = useState(user?.name || '');
  const [city, setCity] = useState('San Francisco');
  const [selectedVibe, setSelectedVibe] = useState('cafe');

  useEffect(() => {
    if (!completed) {
      setOpen(true);
    }
  }, [completed]);

  const handleFinish = () => {
    completeOnboarding();
    setOpen(false);
  };


  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[99999] bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden space-y-0 relative">
        {/* Close Button */}
        <button
          type="button"
          onClick={handleFinish}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Skip onboarding"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header Progress */}
        <div className="p-6 pb-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-blue-600 dark:text-blue-400 mb-1">
            <Sparkles className="w-4 h-4" />
            <span>WELCOME TO NEARBY LOCATOR • STEP {step} OF 3</span>
          </div>
          <h3 className="text-xl font-heading font-bold text-slate-900 dark:text-slate-100">
            {step === 1 && 'Confirm Your Explorer Identity'}
            {step === 2 && 'Set Primary Spatial Location'}
            {step === 3 && 'Choose Your Preferred Vibes'}
          </h3>

          {/* Progress Bar */}
          <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-blue-600 h-full transition-all duration-300 ease-out"
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>
        </div>

        {/* Step Body */}
        <div className="p-6 space-y-4">
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Welcome to Nearby Locator! Confirm your display name so spatial searches and recommendations can be personalized.
              </p>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Display Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-sans text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-600 outline-none"
                  placeholder="e.g. Alex Rivera"
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Select your primary discovery hub city or grant GPS access for automatic spatial centering.
              </p>
              <div className="grid grid-cols-2 gap-2">
                {['San Francisco', 'New York', 'London', 'Tokyo'].map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setCity(item)}
                    className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                      city === item
                        ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 shrink-0" />
                      <span>{item}</span>
                    </div>
                    {city === item && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Pick your primary discovery vibe. Nearby Locator will prioritize matching spots on your dashboard.
              </p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'cafe', label: '☕ Quiet Cafes' },
                  { id: 'gym', label: '🏋️ Fitness Hubs' },
                  { id: 'work', label: '💻 Work Pods' },
                  { id: 'food', label: '🍽️ Top Restaurants' }
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedVibe(item.id)}
                    className={`p-3 rounded-xl border text-xs font-semibold text-left transition-all cursor-pointer ${
                      selectedVibe === item.id
                        ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 px-6 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              className="text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
            >
              ← Back
            </button>
          ) : (
            <span className="text-[10px] font-mono text-slate-400">Step 1 of 3</span>
          )}

          {step < 3 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-sans text-xs font-semibold transition-colors shadow-xs"
            >
              Continue →
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinish}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-sans text-xs font-semibold transition-colors shadow-md flex items-center gap-1.5"
            >
              <Compass className="w-4 h-4" />
              <span>Launch Dashboard</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
