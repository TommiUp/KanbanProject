// server.ts
import express, { Application } from 'express';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import users from './src/routes/users';
import cards from './src/routes/cards';
import columns from './src/routes/columns';
import path from 'path';

// Load environment variables from .env file
dotenv.config();

// Create express application instance, define the port, and MongoDB connection URI
const app: Application = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/kanban';

// Middleware
app.use(express.json());

// Routes
app.use('/api/users', users);
app.use('/api/cards', cards);
app.use('/api/columns', columns);

// Static files
app.use(express.static(path.join(__dirname, '../public')));
app.use('/avatars', express.static(path.join(process.cwd(), 'public', 'avatars')));
app.use("/locales", express.static(path.join(__dirname, "public/locales")));

// MongoDB connection
mongoose
    .connect(MONGO_URI)
    .then(() => {
        console.log('Connected to MongoDB');
        app.listen(PORT, () => {
            console.log(`Server running at http://localhost:${PORT}`);
        });
    })
    .catch((err) => {
        console.error('MongoDB connection error:', err);
    });
