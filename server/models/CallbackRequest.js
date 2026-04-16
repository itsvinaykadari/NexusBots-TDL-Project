const db = require('../config/db');

function ensureCallbackRequestsTable() {
    db.exec(`
    CREATE TABLE IF NOT EXISTS callback_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      order_id TEXT,
      issue_description TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_callback_user_id ON callback_requests(user_id);
    CREATE INDEX IF NOT EXISTS idx_callback_order_id ON callback_requests(order_id);
  `);
}

ensureCallbackRequestsTable();

const CallbackRequest = {
    create({ userId, orderId = null, issueDescription }) {
        const stmt = db.prepare(
            `INSERT INTO callback_requests (user_id, order_id, issue_description, status)
       VALUES (?, ?, ?, ?)`
        );

        const result = stmt.run(userId, orderId, issueDescription, 'pending');

        return db.prepare('SELECT * FROM callback_requests WHERE id = ?').get(result.lastInsertRowid);
    },

    getAll() {
        return db
            .prepare('SELECT * FROM callback_requests ORDER BY created_at DESC')
            .all();
    },
};

module.exports = CallbackRequest;
