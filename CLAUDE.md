# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Frontend
- `npm run dev` - Start frontend development server (runs on localhost:3000)
- `npm test` - Run frontend tests with Jest
- `npm run build` - Build frontend for production


### Backend
- Navigate to `backend/` directory
- `npm install` - Install backend dependencies
- `npm start` or `node index.js` - Start backend server (runs on localhost:5000)
- Backend uses Express.js with Google Places API integration

### Docker
- `docker-compose up` - Start both frontend and backend in development mode
- `docker-compose -f docker-compose.dev.yml up` - Start with development configuration
- `docker-compose build` - Rebuild Docker images

### Common Development Tasks
- Frontend code lives in `frontend/src/` directory
- Main App component: `frontend/src/App.js`
- Entry point: `frontend/src/index.js`
- Styling: TailwindCSS configured via `tailwind.config.js` and `postcss.config.js`
- Environment variables: `.env` file in frontend root

## Code Architecture & Structure

### Frontend (React Application)
- **Entry Point**: `frontend/src/index.js` - Renders `<App />` into root div
- **Main Component**: `frontend/src/App.js` - Contains all application state and UI logic
  - State management: Uses React useState/useEffect hooks for:
    - Messages array (chat history)
    - Input text state
    - Loading states
    - Location permission and coordinates
    - UI toggles (quick actions, distance selector, location popup)
  - Business logic: Includes functions for:
    - Geolocation handling
    - Input parsing (category and radius extraction)
    - API calls to backend
    - Message handling
    - UI state transitions
  - Components defined within App.js:
    - Avatar components (BotAvatar, UserAvatar)
    - Message component
    - Typing indicator
    - Quick actions buttons with dropdowns
    - Distance selector
    - Location permission popup
- **Styling**: TailwindCSS with custom CSS in `index.css`
- **Assets**: 
  - Icons: `frontend/src/icons/` (SVG components)
  - Logo: `frontend/src/logo.svg`
  - Public assets: `frontend/public/` (includes favicon and index.html)

### Backend (Node.js/Express API)
- **Entry Point**: `backend/index.js`
- **Key Features**:
  - Express server with CORS and JSON middleware
  - Google Places API integration for nearby search
  - In-memory storage for user lists (using Map)
  - Endpoints:
    - POST `/nearby` - Search for nearby places
    - GET `/health` - Health check for Docker
    - CRUD endpoints for `/lists` (create, read, update, delete lists)
    - Place management within lists
- **Configuration**: 
  - Environment variables via `.env` (GOOGLE_API_KEY)
  - Categories mapping in code
- **Dependencies**: express, axios, cors, dotenv

### Project Structure
```
nearby-locator/
├── frontend/                  # React frontend application
│   ├── public/                # Static assets
│   │   └── index.html         # Main HTML file
│   ├── src/                   # Source code
│   │   ├── components/        # Empty currently (components in App.js)
│   │   ├── icons/             # SVG icon components
│   │   ├── App.js             # Main application component
│   │   ├── index.js           # Entry point
│   │   ├── index.css          # Tailwind base styles
│   │   └── ...                # config files
│   ├── package.json           # Frontend dependencies and scripts
│   └── tailwind.config.js     # Tailwind configuration
├── backend/                   # Node.js/Express backend
│   ├── index.js               # Server entry point
│   ├── config.js              # Google API key configuration
│   └── package.json           # Backend dependencies
├── docker-compose.yml         # Production Docker configuration
├── docker-compose.dev.yml     # Development Docker configuration
├── README.md                  # Project overview
└── .env.example               # Environment variables template
```

### Key Implementation Details
1. **State Management**: All state is managed within App.js using React hooks
2. **API Communication**: Frontend communicates with backend via fetch calls to `http://localhost:5000`
3. **Location Handling**: Uses browser Geolocation API with permission handling
4. **Place Search**: Integrates with Google Places Nearby Search API
5. **Lists Functionality**: Client-side list management (would need persistence for production)
6. **Styling Approach**: Utility-first CSS with TailwindCSS, responsive design
7. **Testing**: Uses React Testing Library and Jest (see App.test.js)

### Important Notes for Development
1. **Environment Variables**: 
   - Frontend: VITE_BACKEND_URL in .env (defaults to localhost:5000)
   - Backend: GOOGLE_API_KEY in .env (required for API calls)
2. **Development Flow**: 
   - Start backend first (`cd backend && npm start`)
   - Then start frontend (`cd frontend && npm run dev`)
   - Or use Docker Compose for both
3. **Testing**: 
   - Run `npm test` in frontend directory
   - Tests are located alongside components (App.test.js)
4. **CSS Framework**: TailwindCSS is configured with custom colors and responsive utilities
5. **Icons**: Custom SVG React components in `frontend/src/icons/`

This architecture provides a solid foundation for a location-based search application with real-time chat interface for discovering nearby places.