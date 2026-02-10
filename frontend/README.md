# Nearby Locator Frontend

Modern React application for finding nearby places using geolocation with advanced Smart chat interface and interactive animations.

## ✨ Features

### 🤖 smart chat Assistant
- Conversational Smart Search interface for discovering nearby places
- Natural language processing to understand user queries
- Automatic parsing of location categories and search radius
- Smart error handling with helpful prompts

### 📍 Location-Based Search
- Geolocation API integration for precise location detection
- Support for multiple place categories:
  - 🍽️ Restaurants
  - 🏥 Hospitals
  - 💊 Pharmacies
  - 🏧 ATMs
  - ⛽ Gas Stations
  - 🏫 Schools
  - 🏬 Shopping Malls
  - 🏦 Banks
  - ☕ Cafes
  - 🏨 Hotels

### 🎯 Smart Search Features
- **Quick Action Buttons** - One-click search for common place types
- **Distance Selector** - Choose from 2 km to 20 km search radius
- **Real-time Parsing** - Automatically extracts category and distance from messages
- **Contextual Prompts** - Asks for missing information (category or radius)

### 🔐 Location Permissions
- Location permission popup for easy access granting
- Grace period option for users who want to enable later
- Persistent permission status tracking
- Error handling for permission denials

### 💬 Enhanced Chat Experience
- Message timestamps for each conversation
- User and bot avatars with distinct styling
- Typing indicators with animated dots
- Smooth scrolling to latest messages
- Toast-like notifications for errors and success
- Loading states during place searches

### 🎨 Modern UI Components
- **Message Display** - Formatted messages with avatars and timestamps
- **Quick Actions** - Responsive button grid with dropdown menu
- **Distance Selector** - Multiple distance options
- **Location Popup** - Interactive permission request dialog
- **Typing Indicator** - Animated feedback during bot responses
- **Toast Notifications** - Success and error messages

## 🚀 Quick Start

### Install Dependencies
```bash
npm install
```

### Run Development Server
```bash
npm start
```

Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

---

## 📱 **IMPORTANT: Mobile Access Setup**

### Why HTTPS is Required

Modern browsers **require HTTPS** for geolocation API (except on localhost). To access from mobile devices, you **must** use HTTPS.

### Option 1: Using mkcert (Recommended - Easiest)

1. **Install mkcert:**
   - **Windows:** Download from [mkcert releases](https://github.com/FiloSottile/mkcert/releases) or `choco install mkcert`
   - **Mac:** `brew install mkcert`
   - **Linux:** See [mkcert installation](https://github.com/FiloSottile/mkcert#installation)

2. **Find your computer's local IP:**
   ```bash
   # Windows
   ipconfig
   # Look for "IPv4 Address" (e.g., 192.168.1.35)
   
   # Mac/Linux
   ifconfig
   # Look for "inet" address
   ```

3. **Create certificates** (replace `192.168.1.35` with your actual IP):
   ```bash
   # Install local CA
   mkcert -install
   
   # Create certificate
   mkcert localhost 127.0.0.1 192.168.1.35 ::1
   
   # Rename files (Windows PowerShell)
   move mkcert-localhost+3.pem cert.pem
   move mkcert-localhost+3-key.pem key.pem
   
   # Or on Mac/Linux
   mv mkcert-localhost+3.pem cert.pem
   mv mkcert-localhost+3-key.pem key.pem
   ```

4. **Create `.env` file** in frontend folder:
   ```
   HTTPS=true
   SSL_CRT_FILE=cert.pem
   SSL_KEY_FILE=key.pem
   HOST=0.0.0.0
   ```

5. **Start the server:**
   ```bash
   npm start
   ```

6. **Access from mobile:**
   - Make sure mobile is on **same WiFi** as your computer
   - Go to `https://YOUR_IP:3000` (e.g., `https://192.168.1.35:3000`)
   - Accept the security warning (click "Advanced" → "Proceed")
   - Grant location permission

### Option 2: Using OpenSSL (Manual)

```bash
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes
# When prompted for "Common Name", enter your local IP
```

Then create the `.env` file as shown above.

---

## 🔧 Troubleshooting

### Chat Features Issues

#### Bot not responding to queries
✅ **Solutions:**
- Ensure you've granted location permission
- Use clear keywords (restaurant, hospital, ATM, etc.)
- Specify both category and distance (e.g., "restaurants within 5 km")
- Check backend server is running on port 5000

#### Location permission popup doesn't appear
✅ **Solutions:**
- Clear browser cookies and cache
- Check browser privacy settings allow geolocation prompts
- Try in Incognito/Private mode
- Ensure app is accessed via HTTPS on mobile

#### Quick action buttons not working
✅ **Solutions:**
- Grant location permission first
- Ensure backend is running
- Check network connectivity
- Open browser console for error messages

### "Location Access Denied" on Mobile
✅ **Solutions:**
- Ensure you're using `https://` (not `http://`)
- Accept the security certificate warning
- Enable location services on your mobile device
- Use Chrome or Safari (better geolocation support)
- Clear browser cache and try again

### Can't Access from Mobile
✅ **Solutions:**
- Verify both devices are on the **same WiFi network**
- Check Windows Firewall isn't blocking port 3000:
  ```bash
  # Windows: Allow port 3000
  netsh advfirewall firewall add rule name="React Dev Server" dir=in action=allow protocol=TCP localport=3000
  ```
- Try accessing `https://YOUR_IP:3000` in mobile browser

### Backend Connection Issues
✅ **Solutions:**
- Update backend URL in `src/App.js` to use your local IP:
  ```javascript
  const response = await fetch("http://YOUR_LOCAL_IP:5000/nearby", {
  ```
- Ensure backend is running and accessible from network
- Check backend CORS settings allow your IP

---

## 🛠️ Available Scripts

### `npm start`
Runs the app in development mode. The page will reload when you make changes.

### `npm test`
Launches the test runner in interactive watch mode.

### `npm run build`
Builds the app for production to the `build` folder.

### `npm run eject`
**Note: this is a one-way operation. Once you `eject`, you can't go back!**

---

## 📦 Tech Stack

- **React 19** - Latest React framework
- **Tailwind CSS v3** - Utility-first styling
- **Three.js** - WebGL rendering
- **Face-API.js** - Face detection (optional webcam tracking)
- **PostProcessing Library** - Visual effects (bloom, chromatic aberration)
- **Geolocation API** - Browser location services
- **Google Places API** - Backend place search

## 🎬 Animation & Visual Effects

### GridScan Background Animation
- **Three.js powered 3D grid visualization** with perspective effects
- **Real-time scanning lines** with configurable direction
- **Mouse tracking** - Grid responds to cursor movement
- **Tilt & Yaw effects** - Dynamic camera rotation
- **Post-processing effects** - Bloom and chromatic aberration
- **Optional face detection** - Tracks user's face for immersive interaction
- Smooth damping animations for natural motion

### Customizable Animation Parameters
```javascript
<GridScan
  sensitivity={0.55}              // Mouse tracking sensitivity
  lineThickness={1}               // Grid line thickness
  linesColor="#392e4e"            // Primary grid color
  gridScale={0.1}                 // Grid cell size
  scanColor="#FF9FFC"             // Scan line color
  scanOpacity={0.4}               // Scan line opacity
  scanDirection="pingpong"        // Animation direction
  enablePost={true}               // Post-processing effects
  bloomIntensity={0.6}            // Bloom strength
  chromaticAberration={0.002}     // RGB separation
  noiseIntensity={0.01}           // Film grain effect
/>
```

## 📚 Learn More

- [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started)
- [React documentation](https://reactjs.org/)
- [Tailwind CSS](https://tailwindcss.com/)

---

## 🌐 Production Deployment

For production with HTTPS:
- **Vercel** (Frontend) + **Render** (Backend)
- **Netlify** (Frontend) + **Railway** (Backend)
- Any cloud provider with SSL/TLS support
