import dotenv from 'dotenv';
import axios from 'axios';
dotenv.config();

async function checkAvailableModels() {
  const key = process.env.GEMINI_API_KEY || '';
  if (!key) {
    console.log("No Key found.");
    return;
  }

  try {
    console.log("--- SCANNING GOOGLE MODELS ---");
    const response = await axios.get(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
    const models = response.data.models || [];
    console.log(`Available Models Found: ${models.length}`);
    models.forEach((m: any) => {
      console.log(`- ${m.name} (${m.supportedGenerationMethods.join(', ')})`);
    });
  } catch (err: any) {
    console.error("Scan failed", err.response?.data || err.message);
  }
}

checkAvailableModels();
