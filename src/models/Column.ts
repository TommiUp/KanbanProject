// src/models/Column.ts
import { Schema, model, Document, Types } from 'mongoose';

// Interface for a Column document.
export interface IColumn extends Document {
    _id: Types.ObjectId;
    name: string;
    userId: Types.ObjectId;
    cards: Types.ObjectId[];
    order: number;
    createdAt: Date;
    updatedAt: Date;
}

// Define the Column schema with automatic timestamp fields.
const ColumnSchema = new Schema<IColumn>(
    {
        name: {
            type: String,
            required: true,
        },
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        cards: [
            {
                type: Schema.Types.ObjectId,
                ref: 'Card',
            },
        ],
        order: {
            type: Number,
            default: 0,
        },
    },
    { timestamps: true } // Automatically adds createdAt and updatedAt fields.
);

const Column = model<IColumn>('Column', ColumnSchema);

export default Column;
