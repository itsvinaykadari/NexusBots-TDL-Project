const db = require('../config/db');

const Product = {
  getAll() {
    return db.prepare('SELECT * FROM products ORDER BY id').all();
  },

  getById(id) {
    return db.prepare('SELECT * FROM products WHERE id = ?').get(id);
  },

  getByCategory(category) {
    return db.prepare('SELECT * FROM products WHERE category = ?').all(category);
  },

  search(query) {
    const searchTerm = `%${query}%`;
    return db.prepare(
      `SELECT * FROM products 
       WHERE name LIKE ? OR description LIKE ? OR tags LIKE ?`
    ).all(searchTerm, searchTerm, searchTerm);
  }
};

module.exports = Product;
