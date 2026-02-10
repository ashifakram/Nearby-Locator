import express from "express";
import axios from "axios";
import cors from "cors";
import dotenv from "dotenv";
import { GOOGLE_API_KEY } from "./config.js";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

const categories = {
    restaurant: "restaurant",
    hospital: "hospital",
    medical: "pharmacy",
    pharmacy: "pharmacy",
    gas_station: "gas_station",
    atm: "atm",
    school: "school",
    shopping_mall: "shopping_mall",
    bank: "bank",
    cafe: "cafe",
    lodging: "lodging"
};

app.post("/nearby", async (req, res) => {
    console.log("\n========================================");
    console.log("📍 NEW REQUEST RECEIVED");
    console.log("========================================");
    console.log("⏰ Timestamp:", new Date().toLocaleString());
    
    try {
        const { latitude, longitude, category, radius } = req.body;
        
        console.log("\n📥 Request Body:");
        console.log("  - Latitude:", latitude);
        console.log("  - Longitude:", longitude);
        console.log("  - Category:", category);
        console.log("  - Radius:", radius, "km");
        
        const placeType = categories[category] || "restaurant";
        console.log("\n🏷️  Mapped Place Type:", placeType);

        console.log("\n🌐 Making API Request to Google Places...");
        const apiUrl = "https://maps.googleapis.com/maps/api/place/nearbysearch/json";
        console.log("  - URL:", apiUrl);
        console.log("  - Location:", `${latitude},${longitude}`);
        console.log("  - Radius:", radius * 1000, "meters");
        console.log("  - Type:", placeType);
        console.log("  - API Key:", GOOGLE_API_KEY ? "✓ Present" : "✗ Missing");

        const response = await axios.get(apiUrl, {
            params: {
                location: `${latitude},${longitude}`,
                radius: radius * 1000,
                type: placeType,
                key: GOOGLE_API_KEY,
            },
        });

        console.log("\n✅ Google API Response Status:", response.data.status);
        console.log("📊 Total Results Found:", response.data.results?.length || 0);

        // Handle Google API errors (anything other than OK or ZERO_RESULTS)
        if (response.data.status !== "OK" && response.data.status !== "ZERO_RESULTS") {
            console.log("⚠️  API Error:", response.data.status);
            if (response.data.error_message) {
                console.log("❌ Error Message:", response.data.error_message);
            }
            
            let errorMessage = "";
            switch (response.data.status) {
                case "REQUEST_DENIED":
                    errorMessage = "🔒 Our location service is currently unavailable. We're working to fix this. Please try again later.";
                    break;
                case "INVALID_REQUEST":
                    errorMessage = "😕 Something went wrong with your search. Please try again with a different location or category.";
                    break;
                case "OVER_QUERY_LIMIT":
                    errorMessage = "⏳ We're experiencing high traffic right now. Please wait a moment and try your search again.";
                    break;
                case "UNKNOWN_ERROR":
                    errorMessage = "😕 Something unexpected happened. Please try your search again.";
                    break;
                default:
                    errorMessage = "😕 We're having trouble finding places right now. Please try again in a moment.";
            }
            
            console.log("========================================\n");
            return res.json({ status: "error", message: errorMessage });
        }

        // Check if results array exists and has data
        if (!response.data.results || response.data.results.length === 0) {
            console.log("\n📭 No results found");
            console.log("========================================\n");
            return res.json({ status: "success", results: [] });
        }

        const results = response.data.results.map((place, index) => {
            const lat = place.geometry.location.lat;
            const lng = place.geometry.location.lng;

            console.log(`\n  ${index + 1}. ${place.name}`);
            console.log(`     📍 ${place.vicinity}`);
            console.log(`     ⭐ Rating: ${place.rating || "N/A"}`);

            return {
                name: place.name,
                address: place.vicinity,
                rating: place.rating,
                map_url: `https://www.google.com/maps/dir/?api=1&origin=${latitude},${longitude}&destination=${lat},${lng}`
            };
        });

        console.log("\n✅ SUCCESS - Sending", results.length, "results to frontend");
        console.log("========================================\n");

        res.json({ status: "success", results });

    } catch (error) {
        console.log("\n❌ ERROR OCCURRED:");
        console.log("  - Message:", error.message);
        console.log("  - Stack:", error.stack);
        
        if (error.response) {
            console.log("\n🔴 API Response Error:");
            console.log("  - Status:", error.response.status);
            console.log("  - Data:", JSON.stringify(error.response.data, null, 2));
        }
        
        console.log("========================================\n");
        
        // Send user-friendly error message
        res.json({ 
            status: "error", 
            message: "😕 We're having trouble connecting to our location service right now. Please try again in a few moments." 
        });
    }
});

// Health check endpoint for Docker
app.get("/health", (req, res) => {
    res.status(200).json({ status: "healthy", timestamp: new Date().toISOString() });
});

app.listen(5000, () => {
    console.log("\n🚀 ========================================");
    console.log("🚀 BACKEND SERVER STARTED SUCCESSFULLY");
    console.log("� ==a======================================");
    console.log("📡 Server running on: http://localhost:5000");
    console.log("🔑 Google API Key:", GOOGLE_API_KEY ? "✓ Configured" : "✗ Missing");
    console.log("⏰ Started at:", new Date().toLocaleString());
    console.log("🚀 ========================================\n");
    console.log("📝 Available Categories:");
    Object.entries(categories).forEach(([key, value]) => {
        console.log(`   - ${key} → ${value}`);
    });
    console.log("\n✅ Ready to accept requests...\n");
});