// src/routes/users.ts
import { Router } from 'express';
import { userAuth } from '../middleware/validateToken';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import dotenv from 'dotenv';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

dotenv.config();

const router = Router();

// Ensure that the 'public/avatars' directory exists.
const avatarRoot = path.join(process.cwd(), 'public', 'avatars');
if (!fs.existsSync(avatarRoot)) {
    fs.mkdirSync(avatarRoot, { recursive: true });
}

// Configure Multer storage for avatar uploads.
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, avatarRoot);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + file.originalname;
        cb(null, uniqueSuffix);
    }
});

// Multer middleware for handling optional file uploads.
const upload = multer({ storage });

// User registration endpoint, accepts both JSON data and an optional avatar file upload.
router.post('/register', upload.single('avatarFile'), async (req, res): Promise<void> => {
    try {
        console.log('Register request received:', req.body);
        const { email, password, username, isAdmin, avatar } = req.body;

        // Check if the user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            console.log('User already exists:', email);
            res.status(400).json({ message: 'User already exists' });
            return;
        }

        // Determine avatar path
        let avatarPath = '';
        if (req.file) {
            console.log('Avatar file uploaded:', req.file.filename);
            avatarPath = '/avatars/' + req.file.filename;
        } else if (avatar) {
            console.log('Avatar URL provided:', avatar);
            avatarPath = avatar;
        }

        // Create and save the new user
        const newUser = new User({
            email,
            password,
            username,
            isAdmin: isAdmin === 'true' || isAdmin === true,
            avatar: avatarPath,
        });

        await newUser.save();
        console.log('User registered successfully:', newUser);
        res.status(201).json({ message: 'User registered successfully' });
    } catch (error: any) {
        console.error('Error during registration:', error);
        res.status(500).json({ error: error?.message || 'Server error' });
    }
});

// User login endpoint
router.post('/login', async (req, res): Promise<void> => {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
        res.status(400).json({ message: 'Invalid credentials' });
        return;
    }

    // Compare the provided password with the hashed password in the database
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        res.status(400).json({ message: 'Invalid credentials' });
        return;
    }

    // Generate a JWT token that expires in 1 hour
    const token = jwt.sign(
        { id: user._id, isAdmin: user.isAdmin },
        process.env.JWT_SECRET!,
        { expiresIn: '1h' }
    );

    res.json({ token });
});

// Get current user profile
router.get('/me', userAuth, async (req, res): Promise<void> => {
    try {
        // After decoding the token, user ID is available as (req as any).user.id
        const userId = (req as any).user.id;
        const user = await User.findById(userId).select('-password'); // Exclude password field
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        res.json(user); // Returns user data including avatar
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

export default router;
