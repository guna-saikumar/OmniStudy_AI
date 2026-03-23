import { Request, Response } from 'express';
import crypto from 'crypto';
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
            profileImage: (user as any).profileImage,
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
            profileImage: (user as any).profileImage,
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
        if (req.body.profileImage) {
            user.profileImage = req.body.profileImage;
        }
        if (req.body.password) {
            user.password = req.body.password;
        }

        const updatedUser = await user.save();

        res.json({
            _id: updatedUser._id,
            name: updatedUser.name,
            email: updatedUser.email,
            profileImage: updatedUser.profileImage,
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

        const { email, name, picture, sub: googleId } = payload;

        // Check if user exists
        let user = await User.findOne({ email });

        if (!user) {
            // Create a new user if not exists (with a dummy password for now since it's OAuth)
            user = await User.create({
                name,
                email,
                password: Math.random().toString(36).slice(-8), // Dummy password
                profileImage: picture,
            });
        }

        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            profileImage: (user as any).profileImage,
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
    const { email, name, profileImage } = req.body;

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
            profileImage: profileImage,
        });
    }

    res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        profileImage: (user as any).profileImage,
        token: generateToken((user._id as any).toString()),
    });
});

import nodemailer from 'nodemailer';

// @desc    Forgot password - generate reset token and send email
// @route   POST /api/users/forgotpassword
// @access  Public
export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
        res.status(404);
        throw new Error('User not found with that email');
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(20).toString('hex');

    // Hash and set to resetPasswordToken field
    (user as any).resetPasswordToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');

    // Set expire (10 minutes)
    (user as any).resetPasswordExpires = Date.now() + 10 * 60 * 1000;

    await user.save();

    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password/${resetToken}`;

    // Create transporter for sending the email
    const transporter = nodemailer.createTransport({
        service: process.env.EMAIL_SERVICE || 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

    const mailOptions = {
        from: `"OmniStudy AI Support" <${process.env.EMAIL_USER}>`,
        to: user.email,
        subject: '🔐 OmniStudy AI - Password Reset Request',
        html: `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #3b82f6;">OMNISTUDY AI</h1>
                    <p style="color: #666;">Security System</p>
                </div>
                <div style="background: #f8fafc; padding: 30px; border-radius: 16px; border: 1px solid #e2e8f0;">
                    <h2 style="color: #1e293b; margin-top: 0;">Password Reset Request</h2>
                    <p>Hello <b>${user.name}</b>,</p>
                    <p>We received a request to reset your password. If you didn't make this request, you can safely ignore this email.</p>
                    <p>To reset your password, click the button below. This link will expire in <b>10 minutes</b>.</p>
                    <div style="text-align: center; margin: 40px 0;">
                        <a href="${resetUrl}" style="background: #3b82f6; color: white; padding: 16px 32px; text-decoration: none; border-radius: 50px; font-weight: bold; box-shadow: 0 4px 15px rgba(59, 130, 246, 0.3);">Reset My Password</a>
                    </div>
                    <p style="font-size: 12px; color: #94a3b8; text-align: center;">
                        If the button doesn't work, copy and paste this link into your browser:<br>
                        <a href="${resetUrl}" style="color: #3b82f6;">${resetUrl}</a>
                    </p>
                </div>
                <div style="text-align: center; margin-top: 30px; font-size: 12px; color: #94a3b8;">
                    &copy; ${new Date().getFullYear()} OmniStudy AI. All rights reserved.
                </div>
            </div>
        `,
    };

    try {
        await transporter.sendMail(mailOptions);
        res.json({ success: true, message: 'Password reset email sent!' });
    } catch (err: any) {
        console.error('Email sending failed:', err.message);
        
        // DEV FALLBACK: If email sending fails, we still log the link to the console
        // so you can test the rest of the flow! 
        console.log('--- PASSWORD RESET LINK (FALLBACK) ---');
        console.log(resetUrl);
        console.log('--------------------------------------');
        
        // Optional: In dev mode, we could return the link in the response, 
        // but it's safer to just log it for now.
        res.status(502);
        throw new Error('Failed to send reset email. Please ensure your .env email credentials are correct.');
    }
});

// @desc    Reset password
// @route   PUT /api/users/resetpassword/:resettoken
// @access  Public
export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
    // Get hashed token
    const resetPasswordToken = crypto
        .createHash('sha256')
        .update(req.params.resettoken)
        .digest('hex');

    const user = await User.findOne({
        resetPasswordToken,
        resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
        res.status(400);
        throw new Error('Invalid or expired reset token');
    }

    // Set new password
    (user as any).password = req.body.password;
    (user as any).resetPasswordToken = undefined;
    (user as any).resetPasswordExpires = undefined;

    await user.save();

    res.json({
        success: true,
        data: {
            _id: user._id,
            name: user.name,
            email: user.email,
            token: generateToken((user._id as any).toString()),
        }
    });
});
