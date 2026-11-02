import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
dotenv.config();

const key = process.env.GEMINI_API_KEY || '';
console.log(`Key length: ${key.length}`);

const genAI = new GoogleGenerativeAI(key);

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
        } catch (e: any) {
            console.log(`FAILED: Model ${m} error:`, e.message);
        }
    }
}

testModels();

