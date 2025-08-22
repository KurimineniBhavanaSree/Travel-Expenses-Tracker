// ...removed stray static method definition...
const db = require('../config/db');

class Expense {
    static async findById(id) {
        const [rows] = await db.execute('SELECT * FROM expenses WHERE id = ?', [id]);
        return rows[0];
    }
    static async create({
        trip_id,
        user_id,
        category,
        amount,
        currency,
        description,
        expense_date,
        base_amount,
        base_currency,
        exchange_rate
    }) {
        const [result] = await db.execute(
            `INSERT INTO expenses 
            (trip_id, user_id, category, amount, currency, description, expense_date, base_amount, base_currency, exchange_rate) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [trip_id, user_id, category, amount, currency, description, expense_date, base_amount, base_currency, exchange_rate]
        );
        return result.insertId;
    }

    static async findByTripId(trip_id, user_id) {
        const [rows] = await db.execute(
            'SELECT * FROM expenses WHERE trip_id = ? AND user_id = ? ORDER BY expense_date DESC',
            [trip_id, user_id]
        );
        return rows;
    }

    static async findByUserId(user_id) {
        const [rows] = await db.execute(
            'SELECT * FROM expenses WHERE user_id = ? ORDER BY expense_date DESC',
            [user_id]
        );
        return rows;
    }

    static async getExpenseSummary(user_id) {
        const [rows] = await db.execute(
            `SELECT 
                category, 
                SUM(amount) as total_amount,
                currency
            FROM expenses 
            WHERE user_id = ?
            GROUP BY category, currency`,
            [user_id]
        );
        return rows;
    }

    static async delete(id, user_id) {
        const [result] = await db.execute('DELETE FROM expenses WHERE id = ? AND user_id = ?', [id, user_id]);
        return result.affectedRows;
    }
}

module.exports = Expense;