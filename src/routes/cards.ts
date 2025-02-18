// src/routes/users.ts
import { Router } from 'express';
import { Types } from 'mongoose';
import Card from '../models/Card';
import Column from '../models/Column';
import { userAuth } from '../middleware/validateToken';

const router = Router();

// GET /api/cards/:id, get a single card with its comments and creator info.
router.get('/:id', userAuth, async (req, res): Promise<void> => {
    try {
        const cardId = req.params.id;
        const card = await Card.findById(cardId)
            .populate('createdBy', 'username avatar') // who created the card
            .populate('comments.createdBy', 'username avatar'); // who created each comment

        if (!card) {
            res.status(404).json({ message: 'Card not found' });
            return;
        }
        res.json(card);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err });
    }
});

// POST /api/cards/:id/comments, add a new comment to a card.
router.post('/:id/comments', userAuth, async (req, res): Promise<void> => {
    try {
        const cardId = req.params.id;
        const { text } = req.body;
        if (!text) {
            res.status(400).json({ message: 'Comment text is required' });
            return;
        }

        const card = await Card.findById(cardId);
        if (!card) {
            res.status(404).json({ message: 'Card not found' });
            return;
        }

        // Add comment subdoc
        card.comments.push({
            text,
            createdBy: (req as any).user.id,
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        await card.save();
        res.status(201).json({ message: 'Comment added successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err });
    }
});

// POST /api/cards, create a new card.
router.post('/', userAuth, async (req, res): Promise<void> => {
    const { title, content, columnId, color } = req.body;
    try {
        const column = await Column.findById(columnId);
        if (!column) {
            res.status(404).json({ message: 'Column not found' });
            return;
        }

        const newCard = new Card({
            title,
            content,
            color,
            createdBy: new Types.ObjectId((req as any).user.id),
        });

        await newCard.save();
        // Add the new card to the column's cards array
        column.cards.push(newCard._id as Types.ObjectId);
        await column.save();

        res.status(201).json(newCard);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err });
    }
});

// DELETE /api/cards/:id, delete a card and remove it from any columns.
router.delete('/:id', userAuth, async (req, res): Promise<void> => {
    const { id } = req.params;

    try {
        const card = await Card.findByIdAndDelete(id);
        if (!card) {
            res.status(404).json({ message: 'Card not found' });
            return;
        }

        // Remove card from all columns that contain it
        await Column.updateMany({ cards: id }, { $pull: { cards: id } });

        res.json({ message: 'Card deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err });
    }
});

// PATCH /api/cards/:id/move, move a card to another column at a specific index.
router.patch('/:id/move', userAuth, async (req, res): Promise<void> => {
    const cardId = req.params.id;
    const { targetColumnId, targetIndex } = req.body;

    const card = await Card.findById(cardId);
    if (!card) {
        res.status(404).json({ message: 'Card not found' });
        return;
    }

    // Remove card from old column
    await Column.updateMany(
        { cards: card._id },
        { $pull: { cards: card._id } }
    );

    // Add card to new column
    const newColumn = await Column.findById(targetColumnId);
    if (!newColumn) {
        res.status(404).json({ message: 'Target column not found' });
        return;
    }

    let index = parseInt(targetIndex, 10);
    if (isNaN(index) || index < 0) {
        index = 0;
    }
    if (index > newColumn.cards.length) {
        index = newColumn.cards.length;
    }

    newColumn.cards.splice(index, 0, card._id as Types.ObjectId);
    await newColumn.save();

    res.json({ message: 'Card moved successfully' });
});

// PATCH /api/cards/:id, edit a card's title and/or content.
router.patch('/:id', userAuth, async (req, res): Promise<void> => {
    const { id } = req.params;
    const { title, content } = req.body;

    try {
        const card = await Card.findById(id);
        if (!card) {
            res.status(404).json({ message: 'Card not found' });
            return;
        }

        // Only owner or admin
        const user = (req as any).user;
        if (!user.isAdmin && card.createdBy.toString() !== user.id) {
            res.status(403).json({ message: 'Not allowed' });
            return;
        }

        if (title !== undefined) card.title = title;
        if (content !== undefined) card.content = content;

        await card.save();
        res.json({ message: 'Card updated successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err });
    }
});

// PATCH /api/cards/:cardId/comments/:commentId, edit a comment on a card.
router.patch('/:cardId/comments/:commentId', userAuth, async (req, res): Promise<void> => {
    try {
        const { cardId, commentId } = req.params;
        const { text } = req.body;
        if (!text || !text.trim()) {
            res.status(400).json({ message: 'Comment text cannot be empty' });
            return;
        }

        // find the card
        const card = await Card.findById(cardId);
        if (!card) {
            res.status(404).json({ message: 'Card not found' });
            return;
        }

        // find the subdocument
        const comment = card.comments.id(commentId);
        if (!comment) {
            res.status(404).json({ message: 'Comment not found' });
            return;
        }

        // only admin or comment's owner
        const user = (req as any).user;
        if (!user.isAdmin && comment.createdBy.toString() !== user.id) {
            res.status(403).json({ message: 'Not allowed to edit comment' });
            return;
        }

        comment.text = text.trim();
        comment.updatedAt = new Date();

        await card.save();
        res.json({ message: 'Comment updated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error', error: err });
    }
});

// DELETE /api/cards/:cardId/comments/:commentId - Delete a comment from a card.
router.delete('/:cardId/comments/:commentId', userAuth, async (req, res): Promise<void> => {
    try {
        const { cardId, commentId } = req.params;

        const card = await Card.findById(cardId);
        if (!card) {
            res.status(404).json({ message: 'Card not found' });
            return;
        }

        const comment = card.comments.id(commentId);
        if (!comment) {
            res.status(404).json({ message: 'Comment not found' });
            return;
        }

        // Check permission
        const user = (req as any).user;
        if (!user.isAdmin && comment.createdBy.toString() !== user.id) {
            res.status(403).json({ message: 'Not allowed to delete comment' });
            return;
        }

        // remove the subdocument from the array
        await Card.findByIdAndUpdate(cardId, {
            $pull: { comments: { _id: commentId } }
        });

        res.json({ message: 'Comment deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error', error: err });
    }
});

export default router;
