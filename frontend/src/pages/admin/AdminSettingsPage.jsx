import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOutletContext } from 'react-router-dom';
import { getSystemSettings, updateSystemSettings } from '../../services/admin';
import { useToastStore } from '../../store/useToastStore';
import LoaderIcon from '../../icons/LoaderIcon';

export default function AdminSettingsPage() {
  const { triggerSudo } = useOutletContext();
  const { showToast } = useToastStore();
  const queryClient = useQueryClient();

  const [activeCategory, setActiveCategory] = useState('general');
  const [formData, setFormData] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  // Categories list mapped to user-friendly titles
  const categoryMeta = {
    general: { title: 'General Settings', desc: 'Core application descriptors, contact emails, and time settings.' },
    security: { title: 'Security Policies', desc: 'Password configurations, elevation timeouts, and lockout constraints.' },
    authentication: { title: 'Authentication Logic', desc: 'Toggle OAuth logins, verify processes, and restrict concurrent sessions.' },
    notifications: { title: 'Notifications & Webhooks', desc: 'Outbound dispatch permissions and delivery guidelines.' },
    retention: { title: 'Data Retention sweeps', desc: 'Configure automatic cleanup sweep durations in days.' },
    branding: { title: 'Branding & Identity', desc: 'Alter tenant branding names, colors, and logos.' }
  };

  const { data: settingsData, isLoading, error } = useQuery({
    queryKey: ['system-settings'],
    queryFn: getSystemSettings
  });

  // Populate form states when data loads
  useEffect(() => {
    if (settingsData) {
      const flatData = {};
      Object.keys(settingsData).forEach(cat => {
        settingsData[cat].forEach(item => {
          flatData[item.key] = item.value;
        });
      });
      setFormData(flatData);
    }
  }, [settingsData]);

  const handleInputChange = (key, val) => {
    setFormData(prev => ({
      ...prev,
      [key]: val
    }));
  };

  const handleSaveSettings = (e) => {
    e.preventDefault();
    
    // Build array of updated objects
    const currentCategorySettings = settingsData[activeCategory] || [];
    const settingsPayload = currentCategorySettings.map(item => ({
      key: item.key,
      value: formData[item.key]
    }));

    // Trigger step-up elevation
    triggerSudo(async () => {
      setIsSaving(true);
      try {
        await updateSystemSettings(settingsPayload);
        showToast('Settings category successfully updated.', 'success');
        queryClient.invalidateQueries(['system-settings']);
      } catch (err) {
        showToast(err?.response?.data?.message || 'Failed to save settings.', 'error');
      } finally {
        setIsSaving(false);
      }
    });
  };

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 text-red-750 text-xs font-semibold rounded-xl">
        Failed to load settings: {error.message || 'Unknown error'}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-12 flex justify-center items-center">
        <LoaderIcon width={32} height={32} color="#4f46e5" />
      </div>
    );
  }

  const activeSettings = settingsData[activeCategory] || [];

  return (
    <div className="space-y-6 flex flex-col h-full w-full pb-8 pr-1">
      <header className="flex flex-col gap-1.5">
        <h2 className="text-2xl font-bold text-slate-900 font-sans">Global System Settings</h2>
        <p className="text-sm text-slate-500">Configure global parameters, security restrictions, branding guidelines, and email transactional integrations.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        
        {/* Navigation Sidebar of Settings */}
        <div className="flex flex-col gap-1 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm lg:col-span-1">
          {Object.keys(categoryMeta).map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                activeCategory === cat
                  ? 'bg-blue-50 border-blue-200 text-blue-800 shadow-2xs'
                  : 'border-transparent text-slate-600 hover:text-slate-950 hover:bg-slate-50'
              }`}
            >
              {categoryMeta[cat].title}
            </button>
          ))}
        </div>

        {/* Action Form for Configuration Settings */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm lg:col-span-3">
          <div className="mb-5 pb-4 border-b border-slate-100">
            <h3 className="text-base font-extrabold text-slate-900">{categoryMeta[activeCategory].title}</h3>
            <p className="text-xs text-slate-500 mt-1">{categoryMeta[activeCategory].desc}</p>
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-4">
            {activeSettings.map(item => {
              const currentValue = formData[item.key] ?? '';
              
              return (
                <div key={item.key} className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">{item.key.replace(/_/g, ' ')}</label>
                  
                  {/* Custom fields inputs matching datatype */}
                  {item.key.endsWith('_enabled') || item.key.endsWith('_required') ? (
                    <select
                      value={currentValue}
                      onChange={e => handleInputChange(item.key, e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-700 outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer w-full md:w-1/2"
                    >
                      <option value="true">Enabled</option>
                      <option value="false">Disabled</option>
                    </select>
                  ) : item.key.endsWith('_color') ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={currentValue || '#ffffff'}
                        onChange={e => handleInputChange(item.key, e.target.value)}
                        className="w-10 h-10 border border-slate-200 rounded-xl p-1 cursor-pointer bg-slate-50"
                      />
                      <input
                        type="text"
                        value={currentValue}
                        onChange={e => handleInputChange(item.key, e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-500 w-32"
                      />
                    </div>
                  ) : (
                    <input
                      type={item.key.includes('timeout') || item.key.includes('retention') || item.key.includes('attempts') || item.key.includes('length') || item.key.includes('retries') || item.key.includes('sessions') ? 'number' : 'text'}
                      value={currentValue}
                      onChange={e => handleInputChange(item.key, e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-medium focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-800 w-full"
                    />
                  )}
                  
                  <span className="text-[10px] text-slate-400 font-semibold leading-normal">{item.description}</span>
                </div>
              );
            })}

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                disabled={isSaving || activeSettings.length === 0}
                className="bg-blue-600 hover:bg-blue-500 text-white rounded-xl px-5 py-2.5 text-xs font-bold transition-all shadow shadow-blue-100 flex items-center gap-2"
              >
                {isSaving && <LoaderIcon width={12} height={12} color="white" />}
                Apply Configuration (Sudo Gated)
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
}
