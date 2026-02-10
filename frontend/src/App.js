import React, { useState, useEffect, useRef } from "react";
import LocationIcon from "./icons/LocationIcon";
import LoaderIcon from "./icons/LoaderIcon";

// Bot Avatar Component
const BotAvatar = ({ isDark }) => (
  <div className={`w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 via-blue-500 to-indigo-600 flex items-center justify-center shadow-lg flex-shrink-0 ring-2 ${isDark ? 'ring-cyan-400/50' : 'ring-cyan-300/50'}`}>
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2C10.3431 2 9 3.34315 9 5V6H7C5.89543 6 5 6.89543 5 8V18C5 19.1046 5.89543 20 7 20H17C18.1046 20 19 19.1046 19 18V8C19 6.89543 18.1046 6 17 6H15V5C15 3.34315 13.6569 2 12 2Z" fill="white" />
      <circle cx="9" cy="11" r="1" fill="white" />
      <circle cx="15" cy="11" r="1" fill="white" />
      <path d="M9 14C9 14 10 16 12 16C14 16 15 14 15 14" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  </div>
);

// User Avatar Component
const UserAvatar = ({ isDark }) => (
  <div className={`w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg flex-shrink-0 ring-2 ${isDark ? 'ring-emerald-400/50' : 'ring-emerald-300/50'}`}>
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="8" r="4" fill="white" />
      <path d="M6 21C6 17.6863 8.68629 15 12 15C15.3137 15 18 17.6863 18 21" stroke="white" strokeWidth="2" strokeLinecap="round" />
    </svg>
  </div>
);

// Typing Indicator Component
const TypingIndicator = ({ isDark }) => (
  <div className="flex gap-1.5 items-center px-4 py-3">
    <div className={`w-2.5 h-2.5 ${isDark ? 'bg-gray-500' : 'bg-gray-400'} rounded-full animate-bounce`} style={{ animationDelay: '0ms' }}></div>
    <div className={`w-2.5 h-2.5 ${isDark ? 'bg-gray-500' : 'bg-gray-400'} rounded-full animate-bounce`} style={{ animationDelay: '150ms' }}></div>
    <div className={`w-2.5 h-2.5 ${isDark ? 'bg-gray-500' : 'bg-gray-400'} rounded-full animate-bounce`} style={{ animationDelay: '300ms' }}></div>
  </div>
);

// Message component with modern design
const Message = ({ text, isUser, timestamp, isDark, places }) => {
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

          {/* Render places with clickable links */}
          {places && places.length > 0 && (
            <div className="mt-3 space-y-3">
              {places.map((place, idx) => (
                <div key={idx} className={`p-3 rounded-xl ${isDark ? 'bg-slate-600/50' : 'bg-gray-100/50'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="font-semibold text-[15px] mb-1">
                        {idx + 1}. 📍 {place.name}
                      </p>
                      <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                        {place.address || "Address not available"}
                      </p>
                      {place.rating && (
                        <p className={`text-sm mt-1 ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`}>
                          ⭐ {place.rating}
                        </p>
                      )}
                    </div>
                    <a
                      href={place.map_url}
                      target="_blank"
                      rel="noopener noreferrer"
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
};

// Quick Action Buttons with Dropdown
const QuickActions = ({ onAction, disabled, isDark }) => {
  const [showDropdown, setShowDropdown] = useState(false);

  const primaryActions = [
    { label: "🍽️ Restaurants", category: "restaurant" },
    { label: "🏥 Hospitals", category: "hospital" },
    { label: "🏧 ATMs", category: "atm" },
    { label: "⛽ Gas Stations", category: "gas_station" }
  ];

  const dropdownActions = [
    { label: "🏫 Schools", category: "school" },
    { label: "🏬 Malls", category: "shopping_mall" },
    { label: "💊 Pharmacy", category: "pharmacy" },
    { label: "🏦 Banks", category: "bank" },
    { label: "☕ Cafes", category: "cafe" },
    { label: "🏨 Hotels", category: "lodging" }
  ];

  return (
    <div className="mb-4 px-4">
      <div className="flex flex-wrap gap-2 relative z-40">
        {primaryActions.map((action, idx) => (
          <button
            key={idx}
            onClick={() => onAction(action.category)}
            disabled={disabled}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-2 ${isDark
              ? 'bg-slate-700 hover:bg-slate-600 text-white border border-slate-600'
              : 'bg-slate-800/80 hover:bg-slate-800 text-white border border-slate-700'
              }`}
          >
            {action.label}
          </button>
        ))}

        {/* More Options Dropdown */}
        <div className="relative z-50">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            disabled={disabled}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-1 ${isDark
              ? 'bg-slate-700 hover:bg-slate-600 text-white border border-slate-600'
              : 'bg-slate-800/80 hover:bg-slate-800 text-white border border-slate-700'
              }`}
          >
            <span>More</span>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              className={`transition-transform duration-300 ${showDropdown ? 'rotate-180' : ''}`}
            >
              <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {showDropdown && (
            <div className={`absolute bottom-full mb-2 left-0 rounded-2xl shadow-2xl border animate-fade-in ${isDark
              ? 'bg-slate-800 border-slate-700'
              : 'bg-white border-gray-200'
              }`} style={{ minWidth: '200px' }}>
              {dropdownActions.map((action, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    onAction(action.category);
                    setShowDropdown(false);
                  }}
                  disabled={disabled}
                  className={`w-full px-4 py-3 text-left text-sm font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 ${isDark
                    ? 'text-white hover:bg-slate-700 border-b border-slate-700 last:border-b-0'
                    : 'text-gray-900 hover:bg-gray-100 border-b border-gray-200 last:border-b-0'
                    }`}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Distance Selection Component
const DistanceSelector = ({ onSelect, disabled, isDark }) => {
  const distances = ["2 km", "3 km", "5 km", "7 km", "10 km", "20 km"];

  return (
    <div className="mb-4 px-4 animate-fade-in">
      <p className={`text-sm mb-2 font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>Select search radius:</p>
      <div className="flex flex-wrap gap-2">
        {distances.map((distance, idx) => (
          <button
            key={idx}
            onClick={() => onSelect(distance)}
            disabled={disabled}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 ${isDark
              ? 'bg-slate-700 hover:bg-slate-600 text-white border border-slate-600'
              : 'bg-slate-800/80 hover:bg-slate-800 text-white border border-slate-700'
              }`}
          >
            {distance}
          </button>
        ))}
      </div>
    </div>
  );
};

// Location Permission Popup Component
const LocationPermissionPopup = ({ isDark, onEnable, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className={`rounded-3xl shadow-2xl max-w-sm w-full p-6 border transition-colors duration-300 ${isDark
        ? 'bg-slate-800 border-slate-700'
        : 'bg-white border-gray-200'
        }`}>
        <div className="flex items-center justify-center mb-4">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center ${isDark
            ? 'bg-cyan-600/20'
            : 'bg-blue-600/20'
            }`}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 21C15.5 17.4 19 14.1764 19 10.2C19 6.22355 15.866 3 12 3C8.13401 3 5 6.22355 5 10.2C5 14.1764 8.5 17.4 12 21Z" fill={isDark ? '#06B6D4' : '#0284C7'} stroke={isDark ? '#06B6D4' : '#0284C7'} strokeWidth="1.5" />
              <circle cx="12" cy="10" r="2.5" fill={isDark ? '#0E7490' : '#1E40AF'} />
            </svg>
          </div>
        </div>

        <h2 className={`text-2xl font-bold text-center mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Enable Location
        </h2>

        <p className={`text-center mb-6 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
          We need your location to find nearby places around you. This helps us provide you with accurate results for restaurants, hospitals, ATMs, and more.
        </p>

        <div className="space-y-3">
          <button
            onClick={onEnable}
            className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-semibold py-3 rounded-2xl transition-all duration-300 hover:scale-105 flex items-center justify-center gap-2"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 21C15.5 17.4 19 14.1764 19 10.2C19 6.22355 15.866 3 12 3C8.13401 3 5 6.22355 5 10.2C5 14.1764 8.5 17.4 12 21Z" fill="currentColor" />
              <circle cx="12" cy="10" r="2.5" fill="white" />
            </svg>
            Enable Location
          </button>

          <button
            onClick={onClose}
            className={`w-full py-3 rounded-2xl font-semibold transition-all duration-300 ${isDark
              ? 'bg-slate-700 hover:bg-slate-600 text-gray-300 hover:text-white'
              : 'bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-gray-900'
              }`}
          >
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  );
};

function App() {
  const [isDark] = useState(true);
  const [messages, setMessages] = useState([
    {
      text: "👋 Hi! I'm your Nearby Locator Assistant. I can help you discover amazing places around you like restaurants, hospitals, ATMs, and more.\n\nTry asking: 'Find restaurants within 2 km' or use the quick actions below!",
      isUser: false,
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef(null);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [locationCoords, setLocationCoords] = useState(null);
  const [showQuickActions, setShowQuickActions] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showDistanceSelector, setShowDistanceSelector] = useState(false);
  const [showLocationPopup, setShowLocationPopup] = useState(false);

  // Scroll chat to bottom when messages change
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isTyping]);

  // Request geolocation permission on mount
  useEffect(() => {
    if (!navigator.geolocation) {
      appendBotMessage("⚠️ Geolocation is not supported by your browser. Please use a modern browser like Chrome, Firefox, or Safari.");
      return;
    }
    navigator.permissions.query({ name: "geolocation" }).then((result) => {
      if (result.state === "granted") {
        setPermissionGranted(true);
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setLocationCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
          },
          () => {
            appendBotMessage("❌ Failed to get your location. Please check your device settings.");
          }
        );
      } else if (result.state === "prompt") {
        setShowLocationPopup(true);
      } else {
        setShowLocationPopup(true);
      }
    });
  }, []);

  const appendUserMessage = (text) => {
    const timestamp = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    setMessages((prev) => [...prev, { text, isUser: true, timestamp }]);
  };

  const appendBotMessage = (text, places = null) => {
    const timestamp = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    setMessages((prev) => [...prev, { text, isUser: false, timestamp, places }]);
  };

  // Check if message is a greeting
  const isGreeting = (message) => {
    const greetings = ["hi", "hello", "hey", "hola", "greetings", "good morning", "good afternoon", "good evening"];
    const lowerMsg = message.toLowerCase().trim();
    return greetings.some(greeting => lowerMsg === greeting || lowerMsg.startsWith(greeting + " "));
  };

  // Enhanced fuzzy string matching (Levenshtein distance)
  const fuzzyMatch = (str1, str2, threshold = 2) => {
    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();

    // Exact match
    if (s1 === s2) return true;

    // Contains match
    if (s1.includes(s2) || s2.includes(s1)) return true;

    // Levenshtein distance for typo tolerance
    const len1 = s1.length;
    const len2 = s2.length;
    const matrix = Array(len1 + 1).fill(null).map(() => Array(len2 + 1).fill(0));

    for (let i = 0; i <= len1; i++) matrix[i][0] = i;
    for (let j = 0; j <= len2; j++) matrix[0][j] = j;

    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        );
      }
    }

    return matrix[len1][len2] <= threshold;
  };

  // Parse user input for category and radius with enhanced NLP
  const parseInput = (message) => {
    const lowerMsg = message.toLowerCase();

    // Enhanced categories with more synonyms and multi-language support
    const categories = {
      "restaurant": [
        // English
        "restaurant", "restaurants", "food", "eat", "eating", "dining", "dine", "eatery", "eateries",
        "bistro", "cafe", "cafeteria", "diner", "pizzeria", "burger", "fast food", "takeout",
        // Common typos
        "resturant", "restarant", "restraunt", "restuarant",
        // Hindi/Hinglish
        "khana", "khane", "restaurant", "dhaba",
        // Spanish
        "restaurante", "comida",
        // French
        "nourriture"
      ],
      "hospital": [
        // English
        "hospital", "hospitals", "clinic", "clinics", "medical center", "medical centre",
        "health center", "health centre", "emergency", "doctor", "doctors", "healthcare",
        "urgent care", "medical", "infirmary",
        // Common typos
        "hospitel", "hospitl", "hopital",
        // Hindi/Hinglish
        "hospital", "dawakhana", "clinic",
        // Spanish
        "clínica",
        // French
        "hôpital", "clinique"
      ],
      "pharmacy": [
        // English
        "pharmacy", "pharmacies", "medicine", "medicines", "drugstore", "drug store",
        "chemist", "medical shop", "medical store", "apothecary", "pills", "medication",
        // Common typos
        "farmacy", "pharmcy", "pharmecy",
        // Hindi/Hinglish
        "medical", "dawai", "dawa", "medical shop",
        // Spanish
        "farmacia",
        // French
        "pharmacie"
      ],
      "gas_station": [
        // English
        "gas station", "gas", "petrol", "fuel", "petrol pump", "petrol station",
        "fuel station", "filling station", "gasoline", "diesel",
        // Common typos
        "petrol pump", "gas staion", "petrol pamp",
        // Hindi/Hinglish
        "petrol pump", "petrol", "fuel",
        // Spanish
        "gasolinera",
        // French
        "station-service", "essence"
      ],
      "atm": [
        // English
        "atm", "atms", "cash", "money", "cash machine", "cash point", "cashpoint",
        "automated teller", "withdraw", "withdrawal",
        // Common typos
        "atm machine", "cashpoint",
        // Hindi/Hinglish
        "atm", "cash", "paisa",
        // Spanish
        "cajero", "cajero automático",
        // French
        "distributeur", "guichet automatique"
      ],
      "school": [
        // English
        "school", "schools", "education", "college", "university", "institute",
        "academy", "learning center", "educational institution",
        // Common typos
        "skool", "scool", "shool",
        // Hindi/Hinglish
        "school", "college", "vidyalaya", "pathshala",
        // Spanish
        "escuela", "colegio",
        // French
        "école"
      ],
      "shopping_mall": [
        // English
        "mall", "malls", "shopping", "shopping center", "shopping centre",
        "shopping mall", "plaza", "market", "marketplace", "bazaar", "store", "shops",
        // Common typos
        "shoping", "shoping mall", "mal",
        // Hindi/Hinglish
        "mall", "market", "bazaar", "shopping",
        // Spanish
        "centro comercial",
        // French
        "centre commercial"
      ],
      "bank": [
        // English
        "bank", "banks", "banking", "financial", "atm", "branch",
        // Common typos
        "bnk", "banck",
        // Hindi/Hinglish
        "bank", "banking",
        // Spanish
        "banco",
        // French
        "banque"
      ],
      "cafe": [
        // English
        "cafe", "cafes", "café", "coffee", "coffee shop", "coffeehouse",
        "tea", "tea shop", "starbucks", "barista", "espresso",
        // Common typos
        "caffe", "coffe", "cofee",
        // Hindi/Hinglish
        "cafe", "coffee shop", "chai",
        // Spanish
        "cafetería",
        // French
        "café"
      ],
      "lodging": [
        // English
        "hotel", "hotels", "lodging", "accommodation", "accommodations", "motel",
        "inn", "resort", "guest house", "guesthouse", "hostel", "stay", "room",
        // Common typos
        "hotl", "accomodation", "acommodation",
        // Hindi/Hinglish
        "hotel", "guest house",
        // Spanish
        "alojamiento",
        // French
        "hôtel", "hébergement"
      ]
    };

    // Find category using fuzzy matching
    let foundCategory = null;
    let maxMatches = 0;

    for (const [category, keywords] of Object.entries(categories)) {
      let matches = 0;
      for (const keyword of keywords) {
        if (fuzzyMatch(lowerMsg, keyword, 2)) {
          matches++;
        }
      }
      if (matches > maxMatches) {
        maxMatches = matches;
        foundCategory = category;
      }
    }

    // Enhanced radius detection with multiple formats
    let radius = null;

    // Match various formats: "5 km", "5km", "5 kilometers", "5 kms", "within 5", "5 k"
    const radiusPatterns = [
      /(\d+(?:\.\d+)?)\s*(?:km|kms|kilometer|kilometers|kilometre|kilometres|k)\b/i,
      /within\s+(\d+(?:\.\d+)?)/i,
      /(\d+(?:\.\d+)?)\s*(?:km|k)\b/i,
      /around\s+(\d+(?:\.\d+)?)/i,
      /about\s+(\d+(?:\.\d+)?)/i,
      /(\d+(?:\.\d+)?)\s+(?:km|kilometer)/i
    ];

    for (const pattern of radiusPatterns) {
      const match = lowerMsg.match(pattern);
      if (match) {
        radius = match[1];
        break;
      }
    }

    // If no explicit radius but number found, assume km
    if (!radius) {
      const numberMatch = lowerMsg.match(/\b(\d+(?:\.\d+)?)\b/);
      if (numberMatch && foundCategory) {
        const num = parseFloat(numberMatch[1]);
        // Only use if reasonable (2-20 km range)
        if (num >= 2 && num <= 20) {
          radius = numberMatch[1];
        }
      }
    }

    return { category: foundCategory, radius };
  };

  const fetchPlaces = async (category, radius) => {
    if (!permissionGranted || !locationCoords) {
      setShowLocationPopup(true);
      setLoading(false);
      setIsTyping(false);
      return;
    }
    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:5000";
      const response = await fetch(`${backendUrl}/nearby`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitude: locationCoords.latitude,
          longitude: locationCoords.longitude,
          category,
          radius,
        }),
      });

      const data = await response.json();

      // Check if backend returned an error
      if (data.status === "error") {
        appendBotMessage(data.message);
      } else if (!data.results || data.results.length === 0) {
        appendBotMessage(`😕 Sorry, I couldn't find any ${category}s within ${radius} km of your location. Try increasing the search radius or searching for a different category.`);
      } else {
        // Show all results (Google Places API typically returns up to 20 results)
        const topPlaces = data.results;
        appendBotMessage(`✨ Here are ${topPlaces.length} ${category}s within ${radius} km:`, topPlaces);
      }

      // Add restart prompt after a delay
      setTimeout(() => {
        showRestartPrompt();
      }, 1500);
    } catch (error) {
      console.error("Error fetching places:", error);
      appendBotMessage("⚠️ Oops! Something went wrong while fetching nearby places. Please make sure the backend server is running and try again.");

      // Add restart prompt after error too
      setTimeout(() => {
        showRestartPrompt();
      }, 1500);
    } finally {
      setLoading(false);
      setIsTyping(false);
    }
  };

  const handleCategorySelect = (category) => {
    setSelectedCategory(category);
    setShowQuickActions(false);
    setShowDistanceSelector(true);

    // Add a bot message asking for distance
    const categoryNames = {
      "restaurant": "Restaurants",
      "hospital": "Hospitals",
      "atm": "ATMs",
      "gas_station": "Gas Stations",
      "school": "Schools",
      "shopping_mall": "Malls",
      "pharmacy": "Pharmacies",
      "bank": "Banks",
      "cafe": "Cafes",
      "lodging": "Hotels"
    };

    appendBotMessage(`Great! You selected ${categoryNames[category]}. Now, please choose your preferred search radius.`);
  };

  const handleDistanceSelect = (distance) => {
    const radius = distance.replace(" km", "");
    setShowDistanceSelector(false);
    setLoading(true);
    setIsTyping(true);

    const categoryNames = {
      "restaurant": "restaurants",
      "hospital": "hospitals",
      "atm": "ATMs",
      "gas_station": "gas stations",
      "school": "schools",
      "shopping_mall": "malls",
      "pharmacy": "pharmacies",
      "bank": "banks",
      "cafe": "cafes",
      "lodging": "hotels"
    };

    appendUserMessage(`Find ${categoryNames[selectedCategory]} within ${distance}`);

    setTimeout(() => fetchPlaces(selectedCategory, radius), 1500);
  };

  const handleEnableLocation = () => {
    setShowLocationPopup(false);
    if (!navigator.geolocation) {
      appendBotMessage("⚠️ Geolocation is not supported by your browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPermissionGranted(true);
        setLocationCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        appendBotMessage("✅ Location enabled! You can now search for nearby places.");
      },
      (error) => {
        appendBotMessage("❌ Failed to get your location. Please check your device settings and try again.");
      }
    );
  };

  const handleClosLocationPopup = () => {
    setShowLocationPopup(false);
    appendBotMessage("📍 Location permission is required to find nearby places. Please enable location access to use this feature.\n\nWithout location, I cannot help you find nearby restaurants, hospitals, ATMs, and other places around you.");

    // Add restart prompt
    setTimeout(() => {
      showRestartPrompt();
    }, 1500);
  };

  const handleSend = (messageText = null) => {
    const textToSend = messageText || input.trim();
    if (!textToSend) return;

    // Check if it's a greeting
    if (isGreeting(textToSend)) {
      appendUserMessage(textToSend);
      setInput("");
      setIsTyping(true);

      setTimeout(() => {
        appendBotMessage("👋 Hi! I'm your Nearby Locator Assistant. I can help you discover places around you like restaurants, hospitals, ATMs, and more.\n\nTry asking: 'Find restaurants within 2 km' or use the quick actions below!");
        setIsTyping(false);
        setShowQuickActions(true);
        setShowDistanceSelector(false);
      }, 1000);
      return;
    }

    appendUserMessage(textToSend);
    setInput("");

    const { category, radius } = parseInput(textToSend);

    // Check if message contains both a valid category and radius
    const hasValidCategory = category !== null;
    const hasValidRadius = radius !== null;

    // If missing either category or radius, ask for clarification
    if (!hasValidCategory || !hasValidRadius) {
      setIsTyping(true);

      let clarificationMessage = "";
      if (!hasValidCategory && !hasValidRadius) {
        clarificationMessage = "I didn't catch a specific location type or distance. Could you please tell me what you're looking for (e.g., restaurants, hospitals, ATMs) and how far away (e.g., 2 km, 5 km)?";
      } else if (!hasValidCategory) {
        clarificationMessage = "I didn't catch what type of place you're looking for. Could you please specify? (e.g., restaurants, hospitals, ATMs, schools, malls, pharmacies, banks, cafes, or hotels)";
      } else if (!hasValidRadius) {
        clarificationMessage = "I found what you're looking for, but I need to know the search radius. How far away would you like me to search? (e.g., 2 km, 5 km, 10 km, 20 km)";
      }

      setTimeout(() => {
        appendBotMessage(clarificationMessage);
        setIsTyping(false);
        setShowQuickActions(true);
        setShowDistanceSelector(false);

        // Add restart prompt after a delay
        setTimeout(() => {
          showRestartPrompt();
        }, 2000);
      }, 800);
      return;
    }

    // If both category and radius are found, search for places
    setLoading(true);
    setIsTyping(true);
    setShowQuickActions(false);
    setShowDistanceSelector(false);

    setTimeout(() => fetchPlaces(category, radius), 1500);
  };

  const showRestartPrompt = () => {
    appendBotMessage("💬 Say 'Hi' or 'Hello' to start a fresh conversation and explore more places!");
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 flex items-center justify-center p-4 relative overflow-hidden ${isDark
      ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800'
      : 'bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50'
      }`}>

      {/* Main Chat Container with Glassmorphism */}
      <div className={`w-full max-w-4xl h-[90vh] flex flex-col rounded-3xl shadow-2xl border overflow-hidden transition-colors duration-300 relative z-10 ${isDark
        ? 'bg-slate-900/80 backdrop-blur-xl border-slate-700/50'
        : 'bg-white/80 backdrop-blur-xl border-white/50'
        }`}>

        {/* Header */}
        <header className={`px-6 py-4 flex items-center justify-between shadow-lg transition-colors duration-300 ${isDark
          ? 'bg-gradient-to-r from-slate-800 to-slate-700 border-b border-slate-700'
          : 'bg-gradient-to-r from-blue-500 to-cyan-500 border-b border-blue-300'
          }`}>
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ring-2 transition-colors duration-300 ${isDark
              ? 'bg-gradient-to-br from-cyan-500 to-blue-600 ring-cyan-400/30'
              : 'bg-white/30 ring-white/60'
              }`}>
              <LocationIcon width={24} height={24} color="white" />
            </div>
            <div>
              <h1 className="font-bold text-xl text-white" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>Nearby Locator</h1>
              <p className="text-sm text-white/95" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.2)' }}>Discover places around you</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full animate-pulse ${isDark ? 'bg-emerald-400' : 'bg-emerald-500'}`}></div>
              <span className={`text-sm hidden sm:inline transition-colors duration-300 ${isDark ? 'text-white/90' : 'text-white'}`}>Online</span>
            </div>
          </div>
        </header>

        {/* Messages Container */}
        <main className={`flex-grow overflow-y-auto px-4 py-6 scrollbar-hidden transition-colors duration-300 ${isDark ? 'bg-slate-900/50' : 'bg-white/50'
          }`} aria-live="polite" aria-relevant="additions">
          <div className="max-w-3xl mx-auto">
            {messages.map((msg, idx) => (
              <Message key={idx} text={msg.text} isUser={msg.isUser} timestamp={msg.timestamp} isDark={isDark} places={msg.places} />
            ))}

            {isTyping && (
              <div className="flex gap-3 mb-6 animate-fade-in">
                <BotAvatar isDark={isDark} />
                <div className={`rounded-3xl rounded-tl-sm shadow-md backdrop-blur-sm border ${isDark ? 'bg-slate-700 border-slate-600' : 'bg-white border-gray-200'}`}>
                  <TypingIndicator isDark={isDark} />
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        </main>

        {/* Quick Actions */}
        {showQuickActions && (
          <div className="px-4 pb-2">
            <QuickActions onAction={handleCategorySelect} disabled={loading} isDark={isDark} />
          </div>
        )}

        {/* Distance Selector */}
        {showDistanceSelector && (
          <div className="px-4 pb-2">
            <DistanceSelector onSelect={handleDistanceSelect} disabled={loading} isDark={isDark} />
          </div>
        )}

        {/* Input Area */}
        <footer className={`border-t transition-colors duration-300 p-4 ${isDark
          ? 'bg-slate-800/50 border-slate-700 backdrop-blur-xl'
          : 'bg-white/50 border-white backdrop-blur-xl'
          }`}>
          <div className="max-w-3xl mx-auto flex gap-3">
            <div className="flex-grow">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                rows={1}
                placeholder="Type your message here..."
                disabled={loading}
                className={`w-full resize-none rounded-2xl px-4 transition-colors duration-300 focus:outline-none focus:ring-2 focus:border-transparent shadow-lg scrollbar-hidden ${isDark
                  ? 'bg-slate-700 text-white border border-slate-600 focus:ring-cyan-500 placeholder:text-gray-400'
                  : 'bg-white text-gray-800 border border-gray-200 focus:ring-blue-500 placeholder:text-gray-400'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                aria-label="Chat message input"
                style={{ height: '48px', maxHeight: '120px', lineHeight: '1.5', paddingTop: '10px', paddingBottom: '10px', overflow: 'hidden' }}
              />
            </div>
            <button
              onClick={() => handleSend()}
              disabled={loading || input.trim() === ""}
              className={`h-12 px-6 rounded-2xl text-white font-semibold flex items-center justify-center gap-2 shadow-lg transition-all duration-300 hover:scale-105 disabled:hover:scale-100 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 ${isDark
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 disabled:from-slate-600 disabled:to-slate-700'
                : 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 disabled:from-gray-400 disabled:to-gray-500'
                }`}
              aria-label="Send message"
            >
              {loading ? (
                <>
                  <LoaderIcon width={20} height={20} color="white" />
                  <span className="hidden sm:inline">Sending...</span>
                </>
              ) : (
                <>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className="hidden sm:inline">Send</span>
                </>
              )}
            </button>
          </div>
        </footer>
      </div>

      {/* Location Permission Popup */}
      {showLocationPopup && (
        <LocationPermissionPopup
          isDark={isDark}
          onEnable={handleEnableLocation}
          onClose={handleClosLocationPopup}
        />
      )}
    </div>
  );
}

export default App;