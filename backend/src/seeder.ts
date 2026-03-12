import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import User from './models/User';
import Summary from './models/Summary';
import connectDB from './config/db';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const seedData = async () => {
    try {
        await connectDB();

        // Clear existing data
        await User.deleteMany();
        await Summary.deleteMany();

        console.log('Data Cleared...');

        // Create a sample user
        const user = await User.create({
            name: 'Sample Student',
            email: 'student@example.com',
            password: 'password123',
        });

        console.log('Sample User Created...');

        // Create sample summaries
        const summaries = [
            {
                user: user._id,
                fileName: 'Machine Learning Basics.pdf',
                fileSize: 1024 * 1024 * 2.5,
                pages: 34,
                summaryType: 'Text View',
                status: 'Completed',
                content: {
                    text: '• Machine learning is a field of inquiry devoted to understanding and building methods that "learn".\n• It uses algorithms to identify patterns in data.\n• Applications include object detection and natural language processing.',
                    mindMapData: {
                        label: 'Machine Learning',
                        children: [
                            { label: 'Supervised', children: [{ label: 'Regression' }, { label: 'Classification' }] },
                            { label: 'Unsupervised', children: [{ label: 'Clustering' }, { label: 'Association' }] }
                        ]
                    },
                    infographicData: {
                        title: 'Machine Learning 101',
                        sections: [
                            { title: 'Types', points: ['Supervised', 'Unsupervised', 'Reinforcement'] },
                            { title: 'Workflow', points: ['Data Collection', 'Cleaning', 'Training'] }
                        ]
                    },
                    flashcards: [
                        { question: 'What is ML?', answer: 'Methods that learn from data.' },
                        { question: 'Define Overfitting.', answer: 'When a model learns noise instead of patterns.' }
                    ],
                    comparativeTable: [
                        { concept: 'Deep Learning', keyFeatures: 'Neural Nets', examples: 'Pytorch', differences: 'Needs lots of data' },
                        { concept: 'Standard ML', keyFeatures: 'Linear models', examples: 'Sklearn', differences: 'Works with small data' }
                    ],
                    topicClusters: [
                        { category: 'Math', icon: '🔢', color: 'bg-blue-100 dark:bg-blue-950 border-blue-300 dark:border-blue-800', items: ['Linear Algebra', 'Calculus'] }
                    ]
                }
            },
            {
                user: user._id,
                fileName: 'Quantum Physics.pdf',
                fileSize: 1024 * 1024 * 5.2,
                pages: 120,
                summaryType: 'Mind Map',
                status: 'Completed',
                content: {
                    text: '• Quantum physics is the study of matter and energy at the most fundamental level.\n• It explores the behavior of subatomic particles.\n• Concepts include wave-particle duality and entanglement.',
                    mindMapData: { label: 'Quantum Physics', children: [{ label: 'Wave-Particle Duality' }, { label: 'Entanglement' }] },
                    flashcards: [{ question: 'What is Entanglement?', answer: 'A phenomenon where particles become correlated.' }]
                }
            },
            {
                user: user._id,
                fileName: 'Global Economics.pdf',
                fileSize: 1024 * 1024 * 1.8,
                pages: 15,
                summaryType: 'Flashcards',
                status: 'Completed',
                content: {
                    text: '• Economics is the social science that studies the production, distribution, and consumption of goods and services.\n• Macroeconomics looks at the entire economy.\n• Microeconomics focuses on individual choices.',
                    mindMapData: { label: 'Economics', children: [{ label: 'Microeconomics' }, { label: 'Macroeconomics' }] },
                    flashcards: [{ question: 'What is Macroeconomics?', answer: 'The study of the economy as a whole.' }]
                }
            }
        ];

        await Summary.insertMany(summaries);
        console.log('Sample Summaries Created...');

        console.log('Data Seeded Successfully!');
        process.exit();
    } catch (error) {
        console.error('Error seeding data:', error);
        process.exit(1);
    }
};

seedData();
