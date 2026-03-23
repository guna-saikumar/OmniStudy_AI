import dotenv from 'dotenv';
dotenv.config();

const key = process.env.GEMINI_API_KEY || '';
console.log(`Key Defined: ${!!key}`);
console.log(`Length: ${key.length}`);
console.log(`Prefix: ${key.substring(0, 3)}...`);
console.log(`Suffix: ...${key.substring(key.length - 3)}`);
console.log(`Contains quotes: ${key.startsWith('"') || key.endsWith('"') || key.startsWith("'") || key.endsWith("'")}`);
console.log(`Contains spaces: ${key !== key.trim()}`);
