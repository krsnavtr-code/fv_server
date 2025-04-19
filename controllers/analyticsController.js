const db = require('../config/db');

const getAnalytics = async (req, res) => {
    try {
        // Get total students
        const [studentCount] = await db.execute('SELECT COUNT(*) as count FROM students');
        
        // Get total courses
        const [courseCount] = await db.execute('SELECT COUNT(*) as count FROM courses');
        
        // Get total revenue
        const [revenue] = await db.execute(`
            SELECT SUM(amount) as total 
            FROM payments 
            WHERE status = 'completed'
        `);
        
        // Get active users (users who logged in within last 7 days)
        const [activeUsers] = await db.execute(`
            SELECT COUNT(DISTINCT user_id) as count 
            FROM user_activities 
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        `);

        // Get course enrollments by month
        const [enrollments] = await db.execute(`
            SELECT 
                DATE_FORMAT(created_at, '%Y-%m') as month,
                COUNT(*) as count
            FROM course_enrollments
            GROUP BY month
            ORDER BY month DESC
            LIMIT 12
        `);

        // Get average progress by course
        const [progress] = await db.execute(`
            SELECT 
                c.title as course,
                AVG(ce.progress) as averageProgress
            FROM courses c
            LEFT JOIN course_enrollments ce ON c.id = ce.course_id
            GROUP BY c.id
            ORDER BY averageProgress DESC
            LIMIT 10
        `);

        // Get course completion statistics
        const [completion] = await db.execute(`
            SELECT 
                SUM(CASE WHEN progress = 100 THEN 1 ELSE 0 END) as completed,
                SUM(CASE WHEN progress > 0 AND progress < 100 THEN 1 ELSE 0 END) as inProgress,
                SUM(CASE WHEN progress = 0 OR progress IS NULL THEN 1 ELSE 0 END) as notStarted
            FROM course_enrollments
        `);

        // Get monthly revenue
        const [monthlyRevenue] = await db.execute(`
            SELECT 
                DATE_FORMAT(created_at, '%Y-%m') as month,
                SUM(amount) as amount
            FROM payments
            WHERE status = 'completed'
            GROUP BY month
            ORDER BY month DESC
            LIMIT 12
        `);

        // Get popular courses
        const [popularCourses] = await db.execute(`
            SELECT 
                c.id,
                c.title,
                COUNT(ce.id) as enrollments,
                AVG(cr.rating) as rating,
                (COUNT(CASE WHEN ce.progress = 100 THEN 1 END) * 100.0 / COUNT(*)) as completionRate,
                SUM(p.amount) as revenue
            FROM courses c
            LEFT JOIN course_enrollments ce ON c.id = ce.course_id
            LEFT JOIN course_ratings cr ON c.id = cr.course_id
            LEFT JOIN payments p ON ce.id = p.enrollment_id AND p.status = 'completed'
            GROUP BY c.id
            ORDER BY enrollments DESC
            LIMIT 5
        `);

        // Get student engagement metrics
        const [engagement] = await db.execute(`
            SELECT 
                'Average Session Duration' as name,
                AVG(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN duration END) as lastWeek,
                AVG(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN duration END) as lastMonth,
                ((AVG(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN duration END) - 
                  AVG(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN duration END)) * 100.0 / 
                 AVG(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN duration END)) as trend
            FROM user_activities
            UNION ALL
            SELECT 
                'Assignments Submitted' as name,
                COUNT(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 END) as lastWeek,
                COUNT(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 END) as lastMonth,
                ((COUNT(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 END) * 30.0 / 7 - 
                  COUNT(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 END)) * 100.0 / 
                 COUNT(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 END)) as trend
            FROM assignment_submissions
            UNION ALL
            SELECT 
                'Forum Participation' as name,
                COUNT(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 END) as lastWeek,
                COUNT(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 END) as lastMonth,
                ((COUNT(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 END) * 30.0 / 7 - 
                  COUNT(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 END)) * 100.0 / 
                 COUNT(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 END)) as trend
            FROM forum_posts
        `);

        res.json({
            totalStudents: studentCount[0].count,
            totalCourses: courseCount[0].count,
            totalRevenue: revenue[0].total || 0,
            activeUsers: activeUsers[0].count,
            courseEnrollments: enrollments,
            studentProgress: progress,
            courseCompletion: completion[0],
            revenueData: monthlyRevenue,
            popularCourses: popularCourses,
            studentEngagement: engagement
        });
    } catch (error) {
        console.error('Error fetching analytics:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

module.exports = {
    getAnalytics
};
