import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

async function listModels() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
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
      } catch (err: any) {
        console.log(`❌ FAILED: ${modelName} - ${err.message}`);
      }
    }
  } catch (err: any) {
    console.error("List test failed", err);
  }
}

listModels();
