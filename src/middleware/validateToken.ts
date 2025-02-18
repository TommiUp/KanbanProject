// src/middleware/validateToken.ts
import { Request, Response, NextFunction, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();


// Define the JWT payload interface.
interface JwtPayload {
    _id: string;
    username: string;
    isAdmin: boolean;
    iat?: number;
    exp?: number;
}

// Middleware for regular users, verifies JWT and attaches the decoded token to req.user.
export const userAuth: RequestHandler = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
        res.status(401).json({ message: 'Token not found.' });
        return;
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
        res.status(401).json({ message: 'Token not found.' });
        return;
    }

    const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'default_secret'
    ) as JwtPayload;
    (req as any).user = decoded;
    next();
};

// Middleware for admin users, verifies JWT, checks admin flag, and attaches the decoded token to req.user.
export const adminAuth: RequestHandler = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
        res.status(401).json({ message: 'Token not found.' });
        return;
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
        res.status(401).json({ message: 'Token not found.' });
        return;
    }

    const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'default_secret'
    ) as JwtPayload;

    if (!decoded.isAdmin) {
        res.status(403).json({ message: 'Access denied.' });
        return;
    }
    (req as any).user = decoded;
    next();
};

// General token validation middleware.
export const validateToken = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
        return res.status(401).json({ message: 'No token' });
    }
    const token = authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({ message: 'Invalid token' });
    }
    const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'default_secret'
    ) as JwtPayload;
    (req as any).user = decoded;
    next();
};
