// backend/models/Trip.js
const db = require('../config/db');

class Trip {

  static async create({
    user_id,
    trip_name,
    destination,
    start_date,
    end_date,
    budget_type,
    people_count,
    companion_type,
    budget,
    itinerary
  }) {
    const sql = `INSERT INTO trips
      (user_id, trip_name, destination, start_date, end_date, budget_type, people_count, companion_type, budget, itinerary, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`;

    const params = [
      user_id,
      trip_name,
      destination,
      start_date,
      end_date,
      budget_type,
      people_count,
      companion_type,
      budget,
      itinerary
    ];

    const [result] = await db.execute(sql, params);
    // result.insertId contains the primary key
    const insertId = result.insertId;
    // fetch and return inserted row
    const [rows] = await db.execute('SELECT * FROM trips WHERE id = ?', [insertId]);
    return rows[0];
  }

  static async findByUser(user_id) {
    const [rows] = await db.execute('SELECT * FROM trips WHERE user_id = ? ORDER BY created_at DESC', [user_id]);
    return rows;
  }

  static async findById(id) {
    const [rows] = await db.execute('SELECT * FROM trips WHERE id = ?', [id]);
    return rows[0];
  }

  static async update(id, user_id, fields) {
    // fields: object of column: value
    const keys = Object.keys(fields);
    if (keys.length === 0) return null;
    const sets = keys.map(k => `${k} = ?`).join(', ');
    const params = keys.map(k => fields[k]);
    params.push(id, user_id);
    const sql = `UPDATE trips SET ${sets} WHERE id = ? AND user_id = ?`;
    const [result] = await db.execute(sql, params);
    return result.affectedRows;
  }

  static async delete(id, user_id) {
    const [result] = await db.execute('DELETE FROM trips WHERE id = ? AND user_id = ?', [id, user_id]);
    return result.affectedRows;
  }
}

module.exports = Trip;
