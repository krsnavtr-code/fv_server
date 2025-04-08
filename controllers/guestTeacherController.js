const db = require('../config/db');

const getAllGuestTeachers = async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM guest_teachers');
        res.json(rows);
    } catch (error) {
        console.error('Error fetching guest teachers:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const addGuestTeacher = async (req, res) => {
    try {
        const { name, email, phone, specialization, availability, rate } = req.body;

        const [rows] = await db.execute('INSERT INTO guest_teachers (name, email, phone, specialization, availability, rate, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [name, email, phone, specialization, availability, rate, 'active']
        );

        res.status(201).json({ message: 'Guest teacher added successfully' });
    } catch (error) {
        console.error('Error adding guest teacher:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const updateGuestTeacherStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const [rows] = await db.execute('SELECT * FROM guest_teachers WHERE id = ?', [id]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Guest teacher not found' });
        }

        await db.execute('UPDATE guest_teachers SET status = ? WHERE id = ?', [status, id]);
        res.json({ message: 'Status updated successfully' });
    } catch (error) {
        console.error('Error updating guest teacher status:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const deleteGuestTeacher = async (req, res) => {
    try {
        const { id } = req.params;

        const [rows] = await db.execute('SELECT * FROM guest_teachers WHERE id = ?', [id]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Guest teacher not found' });
        }

        await db.execute('DELETE FROM guest_teachers WHERE id = ?', [id]);
        res.json({ message: 'Guest teacher deleted successfully' });
    } catch (error) {
        console.error('Error deleting guest teacher:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

module.exports = {
    getAllGuestTeachers,
    addGuestTeacher,
    updateGuestTeacherStatus,
    deleteGuestTeacher
};
