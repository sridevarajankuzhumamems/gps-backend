const db = require('../config/db');

const memoryOtps = new Map();

class Otp {
  static async save(email, otp, expiresAt) {
    if (!db.isFallback()) {
      const pool = db.getPool();
      await pool.query(
        `INSERT INTO otp_records (email, otp, expires_at) VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE otp = VALUES(otp), expires_at = VALUES(expires_at)`,
        [email, otp, expiresAt]
      );
    } else {
      memoryOtps.set(email, { otp, expiresAt });
    }
  }

  static async verify(email, otp) {
    if (!db.isFallback()) {
      const pool = db.getPool();
      const [rows] = await pool.query(
        'SELECT * FROM otp_records WHERE email = ? AND otp = ?',
        [email, otp]
      );
      if (rows.length === 0) return null;
      const record = rows[0];
      if (new Date() > new Date(record.expires_at)) return 'expired';
      await pool.query('DELETE FROM otp_records WHERE email = ?', [email]);
      return 'ok';
    } else {
      const record = memoryOtps.get(email);
      if (!record || record.otp !== otp) return null;
      if (new Date() > record.expiresAt) return 'expired';
      memoryOtps.delete(email);
      return 'ok';
    }
  }
}

module.exports = Otp;
