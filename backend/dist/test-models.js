"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const generative_ai_1 = require("@google/generative-ai");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
async function listModels() {
    const genAI = new generative_ai_1.GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    try {
        // Note: listModels is not directly on genAI in the node SDK sometimes, 
        // it's a separate REST call usually, but let's try a simple generation test with a few common names.
        const models = ['gemini-1.5-flash', 'gemini-1.5-flash-latest', 'gemini-1.5-pro', 'gemini-pro', 'gemini-2.0-flash-exp'];
        console.log("--- TESTING MODELS ---");
        for (const modelName of models) {
            try {
                const model = genAI.getGenerativeModel({ model: modelName });
                await model.generateContent("test");
                console.log(`✅ SUCCESS: ${modelName}`);
            }
            catch (err) {
                console.log(`❌ FAILED: ${modelName} - ${err.message}`);
            }
        }
    }
    catch (err) {
        console.error("List test failed", err);
    }
}
listModels();
