"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const generative_ai_1 = require("@google/generative-ai");
dotenv_1.default.config();
const key = process.env.GEMINI_API_KEY || '';
console.log(`Key length: ${key.length}`);
const genAI = new generative_ai_1.GoogleGenerativeAI(key);
async function testModels() {
    const models = [
        'gemini-2.5-flash',
        'gemini-2.5-flash-lite',
        'gemini-3.8-flash',
        'gemini-3.5-flash'
    ];
    for (const m of models) {
        try {
            const model = genAI.getGenerativeModel({ model: m });
            const res = await model.generateContent('Hi');
            console.log(`SUCCESS: Model ${m} output:`, res.response.text().trim());
        }
        catch (e) {
            console.log(`FAILED: Model ${m} error:`, e.message);
        }
    }
}
testModels();
