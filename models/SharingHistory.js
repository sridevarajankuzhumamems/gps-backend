const db = require('../config/db');

const memoryHistory = [];
let mockHistoryIdCounter = 1;

class SharingHistory {
  static async insert(name, mobile, email, ip, battery, startTime) {
    if (!db.isFallback()) {
      const pool = db.getPool();
      const [result] = await pool.query(
        `INSERT INTO sharing_history (name, mobile, email, ip, battery, start_time) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [name, mobile, email, ip, battery, startTime]
      );
      return result.insertId;
    } else {
      const id = mockHistoryIdCounter++;
      memoryHistory.push({
        id,
        name,
        mobile,
        email,
        ip,
        battery,
        start_time: startTime,
        end_time: null
      });
      return id;
    }
  }

  static async updateEnd(historyId) {
    if (!historyId) return;
    if (!db.isFallback()) {
      const pool = db.getPool();
      await pool.query(
        'UPDATE sharing_history SET end_time = ? WHERE id = ?',
        [new Date(), historyId]
      );
    } else {
      const log = memoryHistory.find(h => h.id === historyId);
      if (log) {
        log.end_time = new Date();
      }
    }
  }

  static async getAll() {
    if (!db.isFallback()) {
      const pool = db.getPool();
      const [rows] = await pool.query(
        'SELECT * FROM sharing_history ORDER BY start_time DESC'
      );
      return rows;
    } else {
      return [...memoryHistory].sort((a, b) => new Date(b.start_time) - new Date(a.start_time));
    }
  }
}

module.exports = SharingHistory;
