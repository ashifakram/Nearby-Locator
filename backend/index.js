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
    "gas_station": "gas_station",
    atm: "atm"
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

        if (response.data.status !== "OK") {
            console.log("⚠️  API Warning:", response.data.status);
            if (response.data.error_message) {
                console.log("❌ Error Message:", response.data.error_message);
            }
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
        
        res.json({ status: "error", message: error.message });
    }
});

app.listen(5000, () => {
    console.log("\n🚀 ========================================");
    console.log("🚀 BACKEND SERVER STARTED SUCCESSFULLY");
    console.log("🚀 ========================================");
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