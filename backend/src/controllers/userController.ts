import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import asyncHandler from 'express-async-handler';
import { OAuth2Client } from 'google-auth-library';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const generateToken = (id: string) => {
    return jwt.sign({ id }, process.env.JWT_SECRET as string, {
        expiresIn: '30d',
    });
};

// @desc    Auth user & get token
// @route   POST /api/users/login
// @access  Public
export const authUser = asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (user && (await (user as any).matchPassword(password))) {
        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            token: generateToken((user._id as any).toString()),
        });
    } else {
        res.status(401);
        throw new Error('Invalid email or password');
    }
});

// @desc    Register a new user
// @route   POST /api/users
// @access  Public
export const registerUser = asyncHandler(async (req: Request, res: Response) => {
    const { name, email, password } = req.body;

    const userExists = await User.findOne({ email });

    if (userExists) {
        res.status(400);
        throw new Error('User already exists');
    }

    const user = await User.create({
        name,
        email,
        password,
    });

    if (user) {
        res.status(201).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            token: generateToken((user._id as any).toString()),
        });
    } else {
        res.status(400);
        throw new Error('Invalid user data');
    }
});

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
export const updateUserProfile = asyncHandler(async (req: Request, res: Response) => {
    const user = await User.findById((req as any).user._id);

    if (user) {
        user.name = req.body.name || user.name;
        user.email = req.body.email || user.email;
        if (req.body.password) {
            user.password = req.body.password;
        }

        const updatedUser = await user.save();

        res.json({
            _id: updatedUser._id,
            name: updatedUser.name,
            email: updatedUser.email,
            token: generateToken((updatedUser._id as any).toString()),
        });
    } else {
        res.status(404);
        throw new Error('User not found');
    }
});
// @desc    Auth user with Google token
// @route   POST /api/users/google
// @access  Public
export const googleAuthUser = asyncHandler(async (req: Request, res: Response) => {
    const { credential } = req.body;

    if (!credential) {
        res.status(400);
        throw new Error('Google token is missing');
    }

    try {
        const ticket = await client.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();

        if (!payload) {
            res.status(401);
            throw new Error('Invalid Google token');
        }

        const { email, name, sub: googleId } = payload;

        // Check if user exists
        let user = await User.findOne({ email });

        if (!user) {
            // Create a new user if not exists (with a dummy password for now since it's OAuth)
            user = await User.create({
                name,
                email,
                password: Math.random().toString(36).slice(-8), // Dummy password
            });
        }

        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            token: generateToken((user._id as any).toString()),
        });
    } catch (error: any) {
        res.status(401);
        throw new Error('Google authentication failed: ' + error.message);
    }
});

// @desc    Auth user with Google direct info (custom button flow)
// @route   POST /api/users/google-custom
// @access  Public
export const googleAuthUserCustom = asyncHandler(async (req: Request, res: Response) => {
    const { email, name } = req.body;

    if (!email) {
        res.status(400);
        throw new Error('User email is missing');
    }

    // Check if user exists
    let user = await User.findOne({ email });

    if (!user) {
        // Create a new user if not exists
        user = await User.create({
            name,
            email,
            password: Math.random().toString(36).slice(-8), // Dummy password
        });
    }

    res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        token: generateToken((user._id as any).toString()),
    });
});
