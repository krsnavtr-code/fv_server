const db = require('../config/db');

const getSupportTickets = async (req, res) => {
    try {
        const [tickets] = await db.execute(`
            SELECT t.*, 
                   u.name as student_name,
                   c.title as course_title,
                   (SELECT JSON_ARRAYAGG(
                        JSON_OBJECT(
                            'id', m.id,
                            'content', m.content,
                            'sender', CASE 
                                WHEN m.sender_type = 'admin' THEN 'Admin'
                                ELSE u2.name
                            END,
                            'createdAt', m.created_at
                        )
                    )
                    FROM ticket_messages m
                    LEFT JOIN users u2 ON m.sender_id = u2.id
                    WHERE m.ticket_id = t.id
                    ORDER BY m.created_at ASC
                   ) as messages
            FROM support_tickets t
            LEFT JOIN users u ON t.student_id = u.id
            LEFT JOIN courses c ON t.course_id = c.id
            ORDER BY 
                CASE 
                    WHEN t.status = 'open' AND t.priority = 'high' THEN 1
                    WHEN t.status = 'open' THEN 2
                    ELSE 3
                END,
                t.created_at DESC
        `);

        res.json(tickets);
    } catch (error) {
        console.error('Error fetching support tickets:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const getQAThreads = async (req, res) => {
    try {
        const [threads] = await db.execute(`
            SELECT q.*,
                   u.name as student_name,
                   c.title as course_title,
                   (SELECT JSON_ARRAYAGG(
                        JSON_OBJECT(
                            'id', r.id,
                            'content', r.content,
                            'sender', CASE 
                                WHEN r.sender_type = 'admin' THEN 'Admin'
                                ELSE u2.name
                            END,
                            'createdAt', r.created_at
                        )
                    )
                    FROM qa_responses r
                    LEFT JOIN users u2 ON r.sender_id = u2.id
                    WHERE r.thread_id = q.id
                    ORDER BY r.created_at ASC
                   ) as messages
            FROM qa_threads q
            LEFT JOIN users u ON q.student_id = u.id
            LEFT JOIN courses c ON q.course_id = c.id
            ORDER BY 
                CASE WHEN q.status = 'unanswered' THEN 1 ELSE 2 END,
                q.created_at DESC
        `);

        res.json(threads);
    } catch (error) {
        console.error('Error fetching Q&A threads:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const getMentorships = async (req, res) => {
    try {
        const [mentorships] = await db.execute(`
            SELECT m.*,
                   u.name as student_name,
                   i.name as mentor_name,
                   c.title as course_title,
                   (SELECT JSON_ARRAYAGG(
                        JSON_OBJECT(
                            'id', msg.id,
                            'content', msg.content,
                            'sender', CASE 
                                WHEN msg.sender_type = 'admin' THEN 'Admin'
                                WHEN msg.sender_type = 'mentor' THEN i.name
                                ELSE u2.name
                            END,
                            'createdAt', msg.created_at
                        )
                    )
                    FROM mentorship_messages msg
                    LEFT JOIN users u2 ON msg.sender_id = u2.id
                    LEFT JOIN instructors i2 ON msg.sender_id = i2.id AND msg.sender_type = 'mentor'
                    WHERE msg.mentorship_id = m.id
                    ORDER BY msg.created_at ASC
                   ) as messages
            FROM mentorships m
            LEFT JOIN users u ON m.student_id = u.id
            LEFT JOIN instructors i ON m.mentor_id = i.id
            LEFT JOIN courses c ON m.course_id = c.id
            ORDER BY 
                CASE WHEN m.status = 'pending' THEN 1
                     WHEN m.status = 'active' THEN 2
                     ELSE 3
                END,
                m.created_at DESC
        `);

        res.json(mentorships);
    } catch (error) {
        console.error('Error fetching mentorships:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const updateTicketStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        await db.execute(
            'UPDATE support_tickets SET status = ?, updated_at = NOW() WHERE id = ?',
            [status, id]
        );

        res.json({ message: 'Ticket status updated successfully' });
    } catch (error) {
        console.error('Error updating ticket status:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const updateQAStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        await db.execute(
            'UPDATE qa_threads SET status = ?, updated_at = NOW() WHERE id = ?',
            [status, id]
        );

        res.json({ message: 'Q&A thread status updated successfully' });
    } catch (error) {
        console.error('Error updating Q&A status:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const updateMentorshipStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        await db.execute(
            'UPDATE mentorships SET status = ?, updated_at = NOW() WHERE id = ?',
            [status, id]
        );

        res.json({ message: 'Mentorship status updated successfully' });
    } catch (error) {
        console.error('Error updating mentorship status:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const replyToTicket = async (req, res) => {
    try {
        const { id } = req.params;
        const { content } = req.body;
        const adminId = req.user.id;

        await db.execute(
            `INSERT INTO ticket_messages (ticket_id, content, sender_id, sender_type, created_at)
             VALUES (?, ?, ?, 'admin', NOW())`,
            [id, content, adminId]
        );

        // Update ticket status to 'in-progress' if it was 'open'
        await db.execute(
            `UPDATE support_tickets 
             SET status = CASE WHEN status = 'open' THEN 'in-progress' ELSE status END,
                 updated_at = NOW()
             WHERE id = ?`,
            [id]
        );

        res.json({ message: 'Reply sent successfully' });
    } catch (error) {
        console.error('Error sending reply:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const replyToQA = async (req, res) => {
    try {
        const { id } = req.params;
        const { content } = req.body;
        const adminId = req.user.id;

        await db.execute(
            `INSERT INTO qa_responses (thread_id, content, sender_id, sender_type, created_at)
             VALUES (?, ?, ?, 'admin', NOW())`,
            [id, content, adminId]
        );

        // Update thread status to 'answered'
        await db.execute(
            'UPDATE qa_threads SET status = "answered", updated_at = NOW() WHERE id = ?',
            [id]
        );

        res.json({ message: 'Reply sent successfully' });
    } catch (error) {
        console.error('Error sending reply:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const replyToMentorship = async (req, res) => {
    try {
        const { id } = req.params;
        const { content } = req.body;
        const adminId = req.user.id;

        await db.execute(
            `INSERT INTO mentorship_messages (mentorship_id, content, sender_id, sender_type, created_at)
             VALUES (?, ?, ?, 'admin', NOW())`,
            [id, content, adminId]
        );

        res.json({ message: 'Reply sent successfully' });
    } catch (error) {
        console.error('Error sending reply:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const addMentorshipFeedback = async (req, res) => {
    try {
        const { id } = req.params;
        const { content } = req.body;
        const adminId = req.user.id;

        await db.execute(
            `INSERT INTO mentorship_messages (mentorship_id, content, sender_id, sender_type, created_at)
             VALUES (?, ?, ?, 'admin', NOW())`,
            [id, content, adminId]
        );

        res.json({ message: 'Feedback added successfully' });
    } catch (error) {
        console.error('Error adding feedback:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const createMentorship = async (req, res) => {
    try {
        const { studentId, mentorId, courseId, goals, startDate, endDate } = req.body;

        const [result] = await db.execute(
            `INSERT INTO mentorships (student_id, mentor_id, course_id, goals, status, progress, start_date, end_date, created_at, updated_at)
             VALUES (?, ?, ?, ?, 'pending', 0, ?, ?, NOW(), NOW())`,
            [studentId, mentorId, courseId, goals, startDate, endDate]
        );

        res.status(201).json({ 
            id: result.insertId,
            message: 'Mentorship created successfully' 
        });
    } catch (error) {
        console.error('Error creating mentorship:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const getResources = async (req, res) => {
    try {
        const [resources] = await db.execute(`
            SELECT r.*,
                   (SELECT COUNT(*) FROM resource_downloads WHERE resource_id = r.id) as download_count,
                   (SELECT AVG(rating) FROM resource_ratings WHERE resource_id = r.id) as rating
            FROM resources r
            ORDER BY r.featured DESC, r.created_at DESC
        `);

        res.json(resources);
    } catch (error) {
        console.error('Error fetching resources:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const createResource = async (req, res) => {
    try {
        const { title, type, category, description, url, featured } = req.body;
        const adminId = req.user.id;

        const [result] = await db.execute(
            `INSERT INTO resources (title, type, category, description, url, featured, created_by, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
            [title, type, category, description, url, featured ? 1 : 0, adminId]
        );

        res.status(201).json({ 
            id: result.insertId,
            message: 'Resource created successfully' 
        });
    } catch (error) {
        console.error('Error creating resource:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const updateResource = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, type, category, description, url, featured } = req.body;

        await db.execute(
            `UPDATE resources 
             SET title = ?, type = ?, category = ?, description = ?, url = ?, featured = ?, updated_at = NOW()
             WHERE id = ?`,
            [title, type, category, description, url, featured ? 1 : 0, id]
        );

        res.json({ message: 'Resource updated successfully' });
    } catch (error) {
        console.error('Error updating resource:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const deleteResource = async (req, res) => {
    try {
        const { id } = req.params;

        await db.execute('DELETE FROM resources WHERE id = ?', [id]);

        res.json({ message: 'Resource deleted successfully' });
    } catch (error) {
        console.error('Error deleting resource:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const toggleResourceFeatured = async (req, res) => {
    try {
        const { id } = req.params;
        const { featured } = req.body;

        await db.execute(
            'UPDATE resources SET featured = ?, updated_at = NOW() WHERE id = ?',
            [featured ? 1 : 0, id]
        );

        res.json({ message: 'Resource featured status updated successfully' });
    } catch (error) {
        console.error('Error updating resource featured status:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

module.exports = {
    getSupportTickets,
    getQAThreads,
    getMentorships,
    updateTicketStatus,
    updateQAStatus,
    updateMentorshipStatus,
    replyToTicket,
    replyToQA,
    addMentorshipFeedback,
    createMentorship,
    getResources,
    createResource,
    updateResource,
    deleteResource,
    toggleResourceFeatured
};
