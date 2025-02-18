// src/models/Card.ts
import { Schema, model, Document, Types } from 'mongoose';

// Interface for a comment subdocument.
export interface IComment {
    _id?: Types.ObjectId;             // Mongoose auto-IDs for subdocuments
    text: string;
    createdBy: Types.ObjectId;        // reference to User
    createdAt: Date;
    updatedAt: Date;
}

// Interface for a Card document.
export interface ICard extends Document {
    title: string;
    content: string;
    color: string;
    createdBy: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
    comments: Types.DocumentArray<IComment>;
}

// Define the Comment schema.
const CommentSchema = new Schema<IComment>({
    text: { type: String, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});

// Define the Card schema with timestamps and embedded comments.
const CardSchema = new Schema<ICard>(
    {
        title: { type: String, required: true },
        content: { type: String, required: true },
        color: { type: String, default: "#ffffff" },
        createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        comments: [CommentSchema], // embed subdocs
    },
    { timestamps: true } // card-level createdAt, updatedAt
);

const Card = model<ICard>('Card', CardSchema);
export default Card;
