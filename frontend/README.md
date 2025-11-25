# Nearby Finder Frontend

Modern React application for finding nearby places using geolocation.

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

- React 19
- Tailwind CSS v3
- Geolocation API
- Google Places API (Backend)

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