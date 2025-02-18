// src/routes/users.ts
import { Router } from 'express';
import Column from '../models/Column';
import { userAuth } from '../middleware/validateToken';
import Card from '../models/Card';

const router = Router();

// GET /api/columns, retrieve columns for the logged-in user (admin gets all, others get own), sorted by "order".
router.get('/', userAuth, async (req, res) => {
    const user = (req as any).user;

    let query = user.isAdmin ? {} : { userId: user.id };

    const columns = await Column.find(query)
        .populate({
            path: 'cards',
            populate: {
                path: 'createdBy',
                select: 'username avatar',// Include avatar field
            },
        })
        .sort({ order: 1 }); // Sort columns by order ascending

    res.json(columns);
});

// POST /api/columns, create a new column with an order based on the last column for the user.
router.post('/', userAuth, async (req, res): Promise<void> => {
    const { name } = req.body;
    const user = (req as any).user;

    const lastColumn = await Column.findOne({ userId: user.id }).sort({ order: -1 });
    const nextOrder = lastColumn ? lastColumn.order + 1 : 0;

    const newColumn = new Column({
        name,
        userId: user.id,
        cards: [],
        order: nextOrder,
    });

    await newColumn.save();
    res.status(201).json(newColumn);
});

// DELETE /api/columns/:id, delete a column and all its associated cards.
router.delete('/:id', userAuth, async (req, res): Promise<void> => {
    const { id } = req.params;

    try {
        const column = await Column.findById(id);
        if (!column) {
            res.status(404).json({ message: 'Column not found' });
            return;
        }
        await Card.deleteMany({ _id: { $in: column.cards } });
        await Column.findByIdAndDelete(id);
        res.json({ message: 'Column and its cards deleted successfully' });
    } catch (err) {
        console.error("Error deleting column and its cards:", err);
        res.status(500).json({ message: 'Server error', error: err });
    }
});

// PATCH /api/columns/:id, rename a column (only owner or admin can do this).
router.patch('/:id', userAuth, async (req, res): Promise<void> => {
    const { id } = req.params;
    const { newName } = req.body;
    const column = await Column.findById(id);
    if (!column) {
        res.status(404).json({ message: 'Column not found' });
        return;
    }
    const user = (req as any).user;
    if (!user.isAdmin && column.userId.toString() !== user.id) {
        res.status(403).json({ message: 'Not allowed' });
        return;
    }
    column.name = newName;
    await column.save();
    res.json({ message: 'Column renamed successfully' });
});

// PATCH /api/columns/:id/move - Reorder columns by moving one to the target index.
router.patch('/:id/move', userAuth, async (req, res): Promise<void> => {
    const { id } = req.params;
    let { targetIndex } = req.body;
    targetIndex = parseInt(targetIndex, 10) || 0;
    const user = (req as any).user;

    // Fetch columns that the user is authorized to access
    let query = user.isAdmin ? {} : { userId: user.id };
    const allColumns = await Column.find(query).sort({ order: 1 });
    const movingColumnIndex = allColumns.findIndex((col) => col._id.toString() === id);
    if (movingColumnIndex === -1) {
        res.status(404).json({ message: 'Column not found' });
        return;
    }

    // Grab the column to be moved
    const [movingColumn] = allColumns.splice(movingColumnIndex, 1);
    if (targetIndex < 0) targetIndex = 0;
    if (targetIndex > allColumns.length) targetIndex = allColumns.length;

    // Insert the column at the desired position
    allColumns.splice(targetIndex, 0, movingColumn);

    // Update the order for each column
    for (let i = 0; i < allColumns.length; i++) {
        allColumns[i].order = i;
        await allColumns[i].save();
    }
    res.json({ message: 'Column reordered successfully' });
});

export default router;
