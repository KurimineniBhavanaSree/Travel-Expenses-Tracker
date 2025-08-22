const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function generateItinerary(tripDetails) {
    const { destination, start_date, end_date, budget_type, companion_type, people_count } = tripDetails;

    // Calculate trip duration
    const start = new Date(start_date);
    const end = new Date(end_date);
    const duration = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

        // No backend fallback. If AI fails, return null and let frontend handle fallback using itineraries.json.

    // Try AI generation first
    try {
        const prompt = `Create a ${duration}-day itinerary for ${destination} for ${people_count} ${companion_type} with ${budget_type} budget.`;

        const response = await axios.post(
            'https://api-inference.huggingface.co/models/gpt2',
            { inputs: prompt },
            {
                headers: {
                    'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            }
        );
        if (response.data && response.data.length > 0 && response.data[0].generated_text) {
            return response.data[0].generated_text;
        } else {
            // No fallback, let frontend handle
            return null;
        }
    } catch (error) {
        console.error('AI itinerary generation failed:', error.message);
        // No fallback, let frontend handle
        return null;
    }
}

module.exports = { generateItinerary };
