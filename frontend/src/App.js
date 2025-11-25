import React, { useState, useEffect, useRef } from "react";
import LocationIcon from "./icons/LocationIcon";
import LoaderIcon from "./icons/LoaderIcon";

// Bot Avatar Component
const BotAvatar = () => (
  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg flex-shrink-0">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2C10.3431 2 9 3.34315 9 5V6H7C5.89543 6 5 6.89543 5 8V18C5 19.1046 5.89543 20 7 20H17C18.1046 20 19 19.1046 19 18V8C19 6.89543 18.1046 6 17 6H15V5C15 3.34315 13.6569 2 12 2Z" fill="white"/>
      <circle cx="9" cy="11" r="1" fill="#667eea"/>
      <circle cx="15" cy="11" r="1" fill="#667eea"/>
      <path d="M9 14C9 14 10 16 12 16C14 16 15 14 15 14" stroke="#667eea" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  </div>
);

// User Avatar Component
const UserAvatar = () => (
  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg flex-shrink-0">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="8" r="4" fill="white"/>
      <path d="M6 21C6 17.6863 8.68629 15 12 15C15.3137 15 18 17.6863 18 21" stroke="white" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  </div>
);

// Typing Indicator Component
const TypingIndicator = () => (
  <div className="flex gap-1.5 items-center px-4 py-3">
    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
  </div>
);

// Message component with modern design
const Message = ({ text, isUser, timestamp }) => {
  return (
    <div
      className={`flex gap-3 mb-6 ${isUser ? 'flex-row-reverse' : 'flex-row'} animate-fade-in`}
      aria-live="polite"
    >
      {isUser ? <UserAvatar /> : <BotAvatar />}
      
      <div className={`flex flex-col max-w-[75%] sm:max-w-[65%] ${isUser ? 'items-end' : 'items-start'}`}>
        <div
          className={`px-5 py-3 rounded-2xl shadow-lg backdrop-blur-sm transition-all duration-300 hover:shadow-xl ${
            isUser 
              ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-tr-sm' 
              : 'bg-white/90 text-gray-800 rounded-tl-sm border border-gray-100'
          }`}
        >
          <p className="text-[15px] leading-relaxed whitespace-pre-line">{text}</p>
        </div>
        {timestamp && (
          <span className="text-xs text-gray-300 mt-1.5 px-2">
            {timestamp}
          </span>
        )}
      </div>
    </div>
  );
};

// Quick Action Buttons with Dropdown
const QuickActions = ({ onAction, disabled }) => {
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
      <div className="flex flex-wrap gap-2">
        {primaryActions.map((action, idx) => (
          <button
            key={idx}
            onClick={() => onAction(action.category)}
            disabled={disabled}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 rounded-full text-white text-sm font-medium transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {action.label}
          </button>
        ))}
        
        {/* More Options Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            disabled={disabled}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 rounded-full text-white text-sm font-medium transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-1"
          >
            <span>More</span>
            <svg 
              width="16" 
              height="16" 
              viewBox="0 0 24 24" 
              fill="none" 
              className={`transition-transform duration-300 ${showDropdown ? 'rotate-180' : ''}`}
            >
              <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          
          {showDropdown && (
            <div className="absolute top-full mt-2 left-0 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/30 overflow-hidden z-10 min-w-[180px] animate-fade-in">
              {dropdownActions.map((action, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    onAction(action.category);
                    setShowDropdown(false);
                  }}
                  disabled={disabled}
                  className="w-full px-4 py-3 text-left text-gray-800 hover:bg-purple-100 transition-colors duration-200 text-sm font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
const DistanceSelector = ({ onSelect, disabled }) => {
  const distances = ["2 km", "3 km", "5 km", "7 km", "10 km", "20 km"];

  return (
    <div className="mb-4 px-4 animate-fade-in">
      <p className="text-white text-sm mb-2 font-medium">Select search radius:</p>
      <div className="flex flex-wrap gap-2">
        {distances.map((distance, idx) => (
          <button
            key={idx}
            onClick={() => onSelect(distance)}
            disabled={disabled}
            className="px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 rounded-full text-white text-sm font-medium transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {distance}
          </button>
        ))}
      </div>
    </div>
  );
};

function App() {
  const [messages, setMessages] = useState([
    { 
      text: "👋 Hi! I'm your Nearby Finder Assistant. I can help you discover places around you like restaurants, hospitals, ATMs, and more.\n\nTry asking: 'Find restaurants within 2 km' or use the quick actions below!", 
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
        // permission not yet granted
      } else {
        appendBotMessage("🔒 Location access denied. Please allow location permission to use this assistant properly.");
      }
    });
  }, []);

  const appendUserMessage = (text) => {
    const timestamp = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    setMessages((prev) => [...prev, { text, isUser: true, timestamp }]);
  };

  const appendBotMessage = (text) => {
    const timestamp = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    setMessages((prev) => [...prev, { text, isUser: false, timestamp }]);
  };

  // Check if message is a greeting
  const isGreeting = (message) => {
    const greetings = ["hi", "hello", "hey", "hola", "greetings", "good morning", "good afternoon", "good evening"];
    const lowerMsg = message.toLowerCase().trim();
    return greetings.some(greeting => lowerMsg === greeting || lowerMsg.startsWith(greeting + " "));
  };

  // Parse user input for category and radius
  const parseInput = (message) => {
    const categories = {
      "restaurant": ["restaurant", "food", "eat", "dining"],
      "hospital": ["hospital", "clinic", "medical center"],
      "pharmacy": ["pharmacy", "medicine", "drugstore"],
      "gas_station": ["gas station", "petrol", "fuel"],
      "atm": ["atm", "cash"],
      "school": ["school", "education"],
      "shopping_mall": ["mall", "shopping"],
      "bank": ["bank"],
      "cafe": ["cafe", "coffee"],
      "lodging": ["hotel", "lodging", "accommodation"]
    };

    let foundCategory = null;
    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => message.toLowerCase().includes(keyword))) {
        foundCategory = category;
        break;
      }
    }
    if (!foundCategory) foundCategory = "restaurant";

    const radiusMatch = message.match(/(\d+(\.\d+)?)\s?km/);
    let radius = "2";
    if (radiusMatch) {
      radius = radiusMatch[1];
    }

    return { category: foundCategory, radius };
  };

  const fetchPlaces = async (category, radius) => {
    if (!permissionGranted || !locationCoords) {
      appendBotMessage("📍 Location permission is required to find nearby places. Please enable location access.");
      setLoading(false);
      setIsTyping(false);
      return;
    }
    try {
      const response = await fetch("http://localhost:5000/nearby", {
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
      if (!data.results || data.results.length === 0) {
        appendBotMessage(`😕 Sorry, I couldn't find any ${category}s within ${radius} km of your location. Try increasing the search radius or searching for a different category.`);
      } else {
        const placesList = data.results
          .slice(0, 5)
          .map((place, i) => `${i + 1}. 📍 ${place.name}\n   ${place.address || "Address not available"}`)
          .join("\n\n");
        appendBotMessage(`✨ Here are the top ${category}s within ${radius} km:\n\n${placesList}\n\nNeed more options? Just ask!`);
      }
    } catch (error) {
      console.error("Error fetching places:", error);
      appendBotMessage("⚠️ Oops! Something went wrong while fetching nearby places. Please make sure the backend server is running and try again.");
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

  const handleSend = (messageText = null) => {
    const textToSend = messageText || input.trim();
    if (!textToSend) return;
    
    // Check if it's a greeting
    if (isGreeting(textToSend)) {
      appendUserMessage(textToSend);
      setInput("");
      setIsTyping(true);
      
      setTimeout(() => {
        appendBotMessage("👋 Hi! I'm your Nearby Finder Assistant. I can help you discover places around you like restaurants, hospitals, ATMs, and more.\n\nTry asking: 'Find restaurants within 2 km' or use the quick actions below!");
        setIsTyping(false);
        setShowQuickActions(true);
        setShowDistanceSelector(false);
      }, 1000);
      return;
    }
    
    appendUserMessage(textToSend);
    setInput("");
    setLoading(true);
    setIsTyping(true);
    setShowQuickActions(false);
    setShowDistanceSelector(false);

    const { category, radius } = parseInput(textToSend);

    setTimeout(() => fetchPlaces(category, radius), 1500);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center p-4">
      {/* Main Chat Container with Glassmorphism */}
      <div className="w-full max-w-4xl h-[90vh] flex flex-col bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
        
        {/* Header */}
        <header className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
              <LocationIcon width={24} height={24} color="white" />
            </div>
            <div>
              <h1 className="text-white font-bold text-xl">Nearby Finder</h1>
              <p className="text-white/80 text-sm">Your location assistant</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-white/90 text-sm hidden sm:inline">Online</span>
          </div>
        </header>

        {/* Messages Container */}
        <main className="flex-grow overflow-y-auto px-4 py-6 scrollbar-hidden" aria-live="polite" aria-relevant="additions">
          <div className="max-w-3xl mx-auto">
            {messages.map((msg, idx) => (
              <Message key={idx} text={msg.text} isUser={msg.isUser} timestamp={msg.timestamp} />
            ))}
            
            {isTyping && (
              <div className="flex gap-3 mb-6 animate-fade-in">
                <BotAvatar />
                <div className="bg-white/90 rounded-2xl rounded-tl-sm shadow-lg backdrop-blur-sm border border-gray-100">
                  <TypingIndicator />
                </div>
              </div>
            )}
            
            <div ref={bottomRef} />
          </div>
        </main>

        {/* Quick Actions */}
        {showQuickActions && (
          <div className="px-4 pb-2">
            <QuickActions onAction={handleCategorySelect} disabled={loading} />
          </div>
        )}

        {/* Distance Selector */}
        {showDistanceSelector && (
          <div className="px-4 pb-2">
            <DistanceSelector onSelect={handleDistanceSelect} disabled={loading} />
          </div>
        )}

        {/* Input Area */}
        <footer className="bg-white/10 backdrop-blur-xl border-t border-white/20 p-4">
          <div className="max-w-3xl mx-auto flex gap-3 items-end">
            <div className="flex-grow relative">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                rows={1}
                placeholder="Type your message here..."
                disabled={loading}
                className="w-full resize-none rounded-2xl px-5 py-4 pr-12 text-gray-800 bg-white/90 backdrop-blur-sm border border-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent shadow-lg transition-all duration-300 placeholder:text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Chat message input"
                style={{ minHeight: '56px', maxHeight: '120px' }}
              />
            </div>
            <button
              onClick={() => handleSend()}
              disabled={loading || input.trim() === ""}
              className="h-14 px-6 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed rounded-2xl text-white font-semibold flex items-center justify-center gap-2 shadow-lg transition-all duration-300 hover:scale-105 disabled:hover:scale-100 disabled:opacity-50"
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
                    <path d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span className="hidden sm:inline">Send</span>
                </>
              )}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default App;