"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const axios_1 = __importDefault(require("axios"));
dotenv_1.default.config();
async function checkAvailableModels() {
    const key = process.env.GEMINI_API_KEY || '';
    if (!key) {
        console.log("No Key found.");
        return;
    }
    try {
        console.log("--- SCANNING GOOGLE MODELS ---");
        const response = await axios_1.default.get(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
        const models = response.data.models || [];
        console.log(`Available Models Found: ${models.length}`);
        models.forEach((m) => {
            console.log(`- ${m.name} (${m.supportedGenerationMethods.join(', ')})`);
        });
    }
    catch (err) {
        console.error("Scan failed", err.response?.data || err.message);
    }
}
checkAvailableModels();
