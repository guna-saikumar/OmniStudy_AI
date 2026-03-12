import connectDB from './src/config/db';
connectDB().then(() => console.log('success')).catch(console.error);
