const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const { db } = require('../config/dbConfig');

class User {
    constructor(id, name, email, password, role, isVerified) {
        this.id = id;
        this.name = name;
        this.email = email;
        this.password = password;
        this.role = role;
        this.isVerified = isVerified;
    }

    static async findByEmail(email) {
        try {
            const [rows] = await db.query(
                'SELECT * FROM users WHERE email = ?',
                [email]
            );
            return rows[0] ? new User(...Object.values(rows[0])) : null;
        } catch (error) {
            console.error('Error finding user by email:', error);
            throw error;
        }
    }

    static async findById(id) {
        try {
            const [rows] = await db.query(
                'SELECT * FROM users WHERE id = ?',
                [id]
            );
            return rows[0] ? new User(...Object.values(rows[0])) : null;
        } catch (error) {
            console.error('Error finding user by ID:', error);
            throw error;
        }
    }

    async save() {
        try {
            if (this.id) {
                // Update existing user
                await db.query(
                    'UPDATE users SET name = ?, email = ?, password = ?, role = ?, isVerified = ? WHERE id = ?',
                    [this.name, this.email, this.password, this.role, this.isVerified, this.id]
                );
            } else {
                // Create new user
                const [result] = await db.query(
                    'INSERT INTO users (name, email, password, role, isVerified) VALUES (?, ?, ?, ?, ?)',
                    [this.name, this.email, this.password, this.role, this.isVerified]
                );
                this.id = result.insertId;
            }
            return this;
        } catch (error) {
            console.error('Error saving user:', error);
            throw error;
        }
    }

    static async create(name, email, password, role = 'user', isVerified = false) {
        try {
            const hashedPassword = await bcrypt.hash(password, 10);
            const user = new User(null, name, email, hashedPassword, role, isVerified);
            return await user.save();
        } catch (error) {
            console.error('Error creating user:', error);
            throw error;
        }
    }

    static async verifyPassword(user, password) {
        try {
            return await bcrypt.compare(password, user.password);
        } catch (error) {
            console.error('Error verifying password:', error);
            throw error;
        }
    }

    static async updatePassword(userId, newPassword) {
        try {
            const hashedPassword = await bcrypt.hash(newPassword, 10);
            await db.query(
                'UPDATE users SET password = ? WHERE id = ?',
                [hashedPassword, userId]
            );
        } catch (error) {
            console.error('Error updating password:', error);
            throw error;
        }
    }

    static async verifyEmail(userId) {
        try {
            await db.query(
                'UPDATE users SET isVerified = 1 WHERE id = ?',
                [userId]
            );
        } catch (error) {
            console.error('Error verifying email:', error);
            throw error;
        }
    }

    static async delete(userId) {
        try {
            await db.query(
                'DELETE FROM users WHERE id = ?',
                [userId]
            );
        } catch (error) {
            console.error('Error deleting user:', error);
            throw error;
        }
    }
}

module.exports = User;
