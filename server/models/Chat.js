const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

const Chat = {
  create(language = 'en') {
    const sessionId = uuidv4();
    const stmt = db.prepare(
      'INSERT INTO chats (session_id, language) VALUES (?, ?)'
    );
    const result = stmt.run(sessionId, language);
    return { id: result.lastInsertRowid, session_id: sessionId, language };
  },

  getById(id) {
    return db.prepare('SELECT * FROM chats WHERE id = ?').get(id);
  },

  addMessage(chatId, role, content, intent = null, agent = null) {
    const stmt = db.prepare(
      `INSERT INTO chat_messages (chat_id, role, content, intent, agent) 
       VALUES (?, ?, ?, ?, ?)`
    );
    const result = stmt.run(chatId, role, content, intent, agent);
    return { id: result.lastInsertRowid, chat_id: chatId, role, content, intent, agent };
  },

  getMessages(chatId) {
    return db.prepare(
      'SELECT * FROM chat_messages WHERE chat_id = ? ORDER BY created_at'
    ).all(chatId);
  }
};

module.exports = Chat;
