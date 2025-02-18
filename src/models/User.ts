// src/models/User.ts
import { Schema, model, Document } from 'mongoose';
import bcrypt from 'bcrypt';

// Define the IUser interface for a User document.
export interface IUser extends Document {
    email: string;
    password: string;
    username: string;
    isAdmin: boolean;
    avatar?: string; // Optional avatar URL.
    comparePassword(candidatePassword: string): Promise<boolean>; // Method to compare passwords.
}

// Create the User schema.
const UserSchema = new Schema<IUser>({
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    username: {
        type: String,
        required: true,
    },
    isAdmin: {
        type: Boolean,
        default: false,
    },
    avatar: {
        type: String,
        default: '', // Defaults to an empty string if not provided.
    },
});

// Hash the user's password before saving.
UserSchema.pre('save', async function (next) {
    const user = this;
    if (!user.isModified('password')) {
        return next();
    }

    try {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
        next();
    } catch (err) {
        next(err as Error);
    }
});

// Method, compare a candidate password with the stored hashed password.
UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
    return bcrypt.compare(candidatePassword, this.password);
};

const User = model<IUser>('User', UserSchema);

export default User;
