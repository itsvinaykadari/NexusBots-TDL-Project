const db = require('../config/db');

function ensureOrdersTable() {
    db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id TEXT UNIQUE NOT NULL,
      user_id TEXT NOT NULL,
      items_json TEXT NOT NULL,
      total_amount REAL NOT NULL,
            status TEXT DEFAULT 'Processing',
            estimated_delivery TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
    CREATE INDEX IF NOT EXISTS idx_orders_order_id ON orders(order_id);
  `);

    const columns = db.prepare("PRAGMA table_info(orders)").all();
    const hasEstimatedDelivery = columns.some((c) => c.name === 'estimated_delivery');
    if (!hasEstimatedDelivery) {
        db.exec("ALTER TABLE orders ADD COLUMN estimated_delivery TEXT");
    }
}

function generateOrderId() {
    const random = Math.random().toString(36).slice(2, 8).toUpperCase();
    return `ORD-${random}`;
}

function normalizeOrderRow(row) {
    if (!row) return null;
    return {
        ...row,
        items: row.items_json ? JSON.parse(row.items_json) : [],
    };
}

function computeStatusAndEta() {
    const statuses = ['Processing', 'Shipped', 'Delivered'];
    const status = statuses[Math.floor(Math.random() * statuses.length)];

    const eta = new Date();
    if (status === 'Processing') eta.setDate(eta.getDate() + 5);
    if (status === 'Shipped') eta.setDate(eta.getDate() + 2);
    if (status === 'Delivered') eta.setDate(eta.getDate() - 1);

    return {
        status,
        estimatedDelivery: eta.toISOString(),
    };
}

ensureOrdersTable();

const Order = {
    create({ userId, items, totalAmount }) {
        let orderId = generateOrderId();
        const { status, estimatedDelivery } = computeStatusAndEta();

        // Keep generating in the unlikely event of a collision.
        while (db.prepare('SELECT 1 FROM orders WHERE order_id = ?').get(orderId)) {
            orderId = generateOrderId();
        }

        const stmt = db.prepare(
            `INSERT INTO orders (order_id, user_id, items_json, total_amount, status, estimated_delivery)
             VALUES (?, ?, ?, ?, ?, ?)`
        );

        const result = stmt.run(
            orderId,
            userId,
            JSON.stringify(items),
            totalAmount,
            status,
            estimatedDelivery
        );

        const created = db
            .prepare('SELECT * FROM orders WHERE id = ?')
            .get(result.lastInsertRowid);

        return normalizeOrderRow(created);
    },

    getByUserAndOrderId(userId, orderId) {
        const row = db
            .prepare('SELECT * FROM orders WHERE user_id = ? AND order_id = ?')
            .get(userId, orderId);
        return normalizeOrderRow(row);
    },

    getByUser(userId) {
        return db
            .prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC')
            .all(userId)
            .map(normalizeOrderRow);
    },
};

module.exports = Order;
