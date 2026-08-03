# Nearby Locator Backend

Backend API for the Nearby Locator application using Google Places API.

## Setup Instructions

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   - Copy `.env.example` to `.env`
   - Add your Google API key to the `.env` file:
     ```
     GOOGLE_API_KEY=your_actual_google_api_key_here
     ```

3. **Get a Google API Key:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select an existing one
   - Enable "Places API"
   - Create credentials (API Key)
   - Copy the API key to your `.env` file

4. **Run the server:**
   ```bash
   node index.js
   ```

The server will start on `http://localhost:5000`

## API Documentation

This project uses OpenAPI/Swagger for API documentation. 
When running locally, documentation is available at `http://localhost:5000/api-docs/v1`.

## Security Note
⚠️ Never commit your `.env` file to Git. The `.gitignore` file is configured to exclude it.