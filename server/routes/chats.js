const express = require('express');
const router = express.Router();
const Chat = require('../models/Chat');

// POST /api/chats - Create new chat session
router.post('/', (req, res) => {
  try {
    const { language } = req.body;
    const chat = Chat.create(language);
    res.status(201).json(chat);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/chats/:id - Get chat with messages
router.get('/:id', (req, res) => {
  try {
    const chat = Chat.getById(req.params.id);
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }
    const messages = Chat.getMessages(req.params.id);
    res.json({ ...chat, messages });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/chats/:id/messages - Add message to chat
router.post('/:id/messages', (req, res) => {
  try {
    const { role, content, intent, agent } = req.body;
    const message = Chat.addMessage(req.params.id, role, content, intent, agent);
    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
