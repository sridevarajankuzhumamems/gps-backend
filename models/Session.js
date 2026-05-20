const db = require('../config/db');

const memorySessions = new Map();

class Session {
  static async create(token, email, name, mobile) {
    if (!db.isFallback()) {
      const pool = db.getPool();
      await pool.query(
        'INSERT INTO sessions (token, email, name, mobile) VALUES (?, ?, ?, ?)',
        [token, email, name, mobile]
      );
    } else {
      memorySessions.set(token, { email, name, mobile, createdAt: new Date() });
    }
  }

  static async verify(token) {
    if (!db.isFallback()) {
      const pool = db.getPool();
      const [rows] = await pool.query(
        'SELECT * FROM sessions WHERE token = ?',
        [token]
      );
      if (rows.length === 0) return null;
      return rows[0];
    } else {
      return memorySessions.get(token) || null;
    }
  }

  static async delete(token) {
    if (!db.isFallback()) {
      const pool = db.getPool();
      await pool.query('DELETE FROM sessions WHERE token = ?', [token]);
    } else {
      memorySessions.delete(token);
    }
  }
}

module.exports = Session;
