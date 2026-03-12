import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars from root if necessary, or assume process.env is populated
dotenv.config({ path: path.join(__dirname, '../../../.env') });

const connectDB = async () => {
    try {
        let uri = process.env.MONGODB_URI;
        if (!uri) {
            throw new Error('MONGODB_URI is not defined in environment variables');
        }

        // Advanced URI Healing: Fix unencoded @, /? formatting, and @admin patterns
        try {
            const uriMatch = uri.match(/^([^:]+):\/\/(.+)$/);
            if (uriMatch) {
                const protocol = uriMatch[1];
                let body = uriMatch[2];

                // 1. Fix the /?DatabaseName issue if present
                if (body.includes('/?') && !body.includes('?')) {
                    body = body.replace('/?', '/');
                }

                // 2. Handle the @admin pattern if present in the credentials
                const lastAt = body.lastIndexOf('@');
                if (lastAt !== -1) {
                    let credentials = body.substring(0, lastAt);
                    const rest = body.substring(lastAt + 1);

                    let authSource = '';
                    if (credentials.includes('@admin')) {
                        credentials = credentials.replace('@admin', '');
                        authSource = 'authSource=admin';
                    }

                    const firstColon = credentials.indexOf(':');
                    if (firstColon !== -1) {
                        const user = credentials.substring(0, firstColon);
                        const pass = credentials.substring(firstColon + 1);

                        // Reconstruct with properly encoded user/pass
                        uri = `${protocol}://${encodeURIComponent(user)}:${encodeURIComponent(pass)}@${rest}`;

                        // Add authSource if we found it
                        if (authSource) {
                            uri += (uri.includes('?') ? '&' : '?') + authSource;
                        }
                    }
                }
            }
        } catch (e) {
            console.error('Error auto-fixing URI:', e);
        }

        const conn = await mongoose.connect(uri);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        if (error instanceof Error) {
            console.error(`Error: ${error.message}`);
        } else {
            console.error('An unknown error occurred while connecting to MongoDB');
        }
        process.exit(1);
    }
};

export default connectDB;
