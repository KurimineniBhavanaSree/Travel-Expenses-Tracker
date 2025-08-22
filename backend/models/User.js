const db = require('../config/db');

class User {
    static async create({ username, email, password }) {
        const [result] = await db.execute(
            'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
            [username, email, password]
        );
        return result.insertId;
    }

    static async findByEmail(email) {
        const [rows] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
        return rows[0];
    }

    static async findById(id, options = {}) {
        // By default, exclude password. If options.includePassword is true, include password hash.
        let query = 'SELECT id, username, email';
        if (options.includePassword) {
            query += ', password';
        }
        query += ' FROM users WHERE id = ?';
        const [rows] = await db.execute(query, [id]);
        return rows[0];
    }

    static async update(id, { email, password }) {
        if (!email && !password) {
            throw new Error('Nothing to update');
        }

        if (password && email) {
            const [result] = await db.execute(
                'UPDATE users SET email = ?, password = ? WHERE id = ?',
                [email, password, id]
            );
            return result.affectedRows;
        } else if (email) {
            const [result] = await db.execute(
                'UPDATE users SET email = ? WHERE id = ?',
                [email, id]
            );
            return result.affectedRows;
        } else if (password) {
            const [result] = await db.execute(
                'UPDATE users SET password = ? WHERE id = ?',
                [password, id]
            );
            return result.affectedRows;
        }
    }
}

module.exports = User;
