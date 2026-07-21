import React from 'react';
import UserAvatar from './UserAvatar';
import BotAvatar from './BotAvatar';
import { spotsService } from '../../../services/spots';

export default function Message({ text, isUser, timestamp, isDark, places, searchId }) {
  const handleMapClick = async (spotId) => {
    if (spotId && searchId) {
      await spotsService.logClick(spotId, searchId);
    }
  };

  return (
    <div
      className={`flex gap-3 mb-6 ${isUser ? 'flex-row-reverse' : 'flex-row'} animate-fade-in`}
      aria-live="polite"
    >
      {isUser ? <UserAvatar isDark={isDark} /> : <BotAvatar isDark={isDark} />}

      <div className={`flex flex-col max-w-[75%] sm:max-w-[65%] ${isUser ? 'items-end' : 'items-start'}`}>
        <div
          className={`px-5 py-3 rounded-3xl shadow-md backdrop-blur-sm transition-all duration-300 hover:shadow-lg ${isUser
            ? `bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-tr-sm`
            : `${isDark ? 'bg-slate-700 text-gray-100 border border-slate-600' : 'bg-white text-gray-800 border border-gray-200'} rounded-tl-sm`
          }`}
        >
          <p className="text-[15px] leading-relaxed whitespace-pre-line">{text}</p>

          {/* Render places with clickable map links and CTR telemetry hooks */}
          {places && places.length > 0 && (
            <div className="mt-3 space-y-3">
              {places.map((place, idx) => (
                <div key={place.id || idx} className={`p-3 rounded-xl ${isDark ? 'bg-slate-600/50' : 'bg-gray-100/50'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="font-semibold text-[15px] mb-1">
                        {idx + 1}. 📍 {place.name}
                      </p>
                      <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                        {place.address || 'Address not available'}
                      </p>
                      {place.rating && (
                        <p className={`text-sm mt-1 ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`}>
                          ⭐ {place.rating}
                        </p>
                      )}
                    </div>
                    <a
                      href={place.map_url || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => handleMapClick(place.id)}
                      className={`flex-shrink-0 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105 ${isDark
                        ? 'bg-cyan-600 hover:bg-cyan-700 text-white'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="inline mr-1">
                        <path d="M12 21C15.5 17.4 19 14.1764 19 10.2C19 6.22355 15.866 3 12 3C8.13401 3 5 6.22355 5 10.2C5 14.1764 8.5 17.4 12 21Z" fill="currentColor" />
                        <circle cx="12" cy="10" r="2.5" fill="white" />
                      </svg>
                      Map
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        {timestamp && (
          <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'} mt-1.5 px-2`}>
            {timestamp}
          </span>
        )}
      </div>
    </div>
  );
}
