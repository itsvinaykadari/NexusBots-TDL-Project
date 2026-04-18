const express = require('express');
const router = express.Router();
const Chat = require('../models/Chat');
const Order = require('../models/Order');
const CallbackRequest = require('../models/CallbackRequest');

// POST /api/chats - Create new chat session
router.post('/', (req, res) => {
  try {
    const language = req.body?.language || 'en';
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

// POST /api/chats/support/validate-order
router.post('/support/validate-order', (req, res) => {
  try {
    const { user_id: userId, order_id: orderId } = req.body || {};
    if (!userId || !orderId) {
      return res.status(400).json({
        valid: false,
        message: 'user_id and order_id are required.',
      });
    }

    const order = Order.getByUserAndOrderId(userId, orderId);
    if (!order) {
      return res.status(404).json({
        valid: false,
        message: 'No order found with those details, please double-check',
      });
    }

    return res.json({ valid: true, order });
  } catch (error) {
    res.status(500).json({ valid: false, message: error.message });
  }
});

// POST /api/chats/support/request-callback
router.post('/support/request-callback', (req, res) => {
  try {
    const {
      user_id: userId,
      order_id: orderId,
      issue_description: issueDescription,
    } = req.body || {};

    if (!userId || !issueDescription) {
      return res.status(400).json({
        success: false,
        message: 'user_id and issue_description are required.',
      });
    }

    const callback = CallbackRequest.create({
      userId,
      orderId: orderId || null,
      issueDescription,
    });

    return res.status(201).json({
      success: true,
      message: 'No worries! Our support agent will call you shortly.',
      callback,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/chats/support/callbacks?user_id=...
router.get('/support/callbacks', (req, res) => {
  try {
    const userId = req.query.user_id;
    if (!userId) {
      return res.status(400).json({ message: 'user_id query parameter is required.' });
    }
    const callbacks = CallbackRequest.getByUserId(userId);
    return res.json({ callbacks });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
