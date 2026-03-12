"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.googleAuthUserCustom = exports.googleAuthUser = exports.updateUserProfile = exports.registerUser = exports.authUser = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = __importDefault(require("../models/User"));
const express_async_handler_1 = __importDefault(require("express-async-handler"));
const google_auth_library_1 = require("google-auth-library");
const client = new google_auth_library_1.OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const generateToken = (id) => {
    return jsonwebtoken_1.default.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};
// @desc    Auth user & get token
// @route   POST /api/users/login
// @access  Public
exports.authUser = (0, express_async_handler_1.default)(async (req, res) => {
    const { email, password } = req.body;
    const user = await User_1.default.findOne({ email });
    if (user && (await user.matchPassword(password))) {
        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            token: generateToken(user._id.toString()),
        });
    }
    else {
        res.status(401);
        throw new Error('Invalid email or password');
    }
});
// @desc    Register a new user
// @route   POST /api/users
// @access  Public
exports.registerUser = (0, express_async_handler_1.default)(async (req, res) => {
    const { name, email, password } = req.body;
    const userExists = await User_1.default.findOne({ email });
    if (userExists) {
        res.status(400);
        throw new Error('User already exists');
    }
    const user = await User_1.default.create({
        name,
        email,
        password,
    });
    if (user) {
        res.status(201).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            token: generateToken(user._id.toString()),
        });
    }
    else {
        res.status(400);
        throw new Error('Invalid user data');
    }
});
// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
exports.updateUserProfile = (0, express_async_handler_1.default)(async (req, res) => {
    const user = await User_1.default.findById(req.user._id);
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
            token: generateToken(updatedUser._id.toString()),
        });
    }
    else {
        res.status(404);
        throw new Error('User not found');
    }
});
// @desc    Auth user with Google token
// @route   POST /api/users/google
// @access  Public
exports.googleAuthUser = (0, express_async_handler_1.default)(async (req, res) => {
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
        let user = await User_1.default.findOne({ email });
        if (!user) {
            // Create a new user if not exists (with a dummy password for now since it's OAuth)
            user = await User_1.default.create({
                name,
                email,
                password: Math.random().toString(36).slice(-8), // Dummy password
            });
        }
        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            token: generateToken(user._id.toString()),
        });
    }
    catch (error) {
        res.status(401);
        throw new Error('Google authentication failed: ' + error.message);
    }
});
// @desc    Auth user with Google direct info (custom button flow)
// @route   POST /api/users/google-custom
// @access  Public
exports.googleAuthUserCustom = (0, express_async_handler_1.default)(async (req, res) => {
    const { email, name } = req.body;
    if (!email) {
        res.status(400);
        throw new Error('User email is missing');
    }
    // Check if user exists
    let user = await User_1.default.findOne({ email });
    if (!user) {
        // Create a new user if not exists
        user = await User_1.default.create({
            name,
            email,
            password: Math.random().toString(36).slice(-8), // Dummy password
        });
    }
    res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        token: generateToken(user._id.toString()),
    });
});
