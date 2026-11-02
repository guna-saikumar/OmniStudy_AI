import mongoose, { Schema, Document } from 'mongoose';

export interface IChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
}

export interface IChatSession extends Document {
    user?: mongoose.Types.ObjectId;
    summaryId: mongoose.Types.ObjectId;
    title: string;
    messages: IChatMessage[];
    createdAt: Date;
    updatedAt: Date;
}

const chatSessionSchema = new Schema<IChatSession>(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: false,
        },
        summaryId: {
            type: Schema.Types.ObjectId,
            ref: 'Summary',
            required: true,
        },
        title: {
            type: String,
            required: true,
            default: 'New Chat',
        },
        messages: [
            {
                id: { type: String, required: true },
                role: { type: String, enum: ['user', 'assistant'], required: true },
                content: { type: String, required: true },
                timestamp: { type: String, required: true },
            },
        ],
    },
    {
        timestamps: true,
    }
);

export default mongoose.model<IChatSession>('ChatSession', chatSessionSchema);
