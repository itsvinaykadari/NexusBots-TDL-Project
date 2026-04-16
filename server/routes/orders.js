const express = require('express');
const router = express.Router();
const Order = require('../models/Order');

// POST /api/orders
router.post('/', (req, res) => {
    try {
        const { user_id: userId, items, total_amount: totalAmount } = req.body || {};

        if (!userId || !Array.isArray(items) || items.length === 0 || typeof totalAmount !== 'number') {
            return res.status(400).json({
                error: 'Invalid order payload. Required fields: user_id, items[], total_amount(number).',
            });
        }

        const order = Order.create({
            userId,
            items,
            totalAmount,
        });

        res.status(201).json(order);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/orders/user/:userId
router.get('/user/:userId', (req, res) => {
    try {
        const orders = Order.getByUser(req.params.userId);
        return res.json({
            user_id: req.params.userId,
            count: orders.length,
            orders,
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/orders/validate?user_id=...&order_id=...
router.get('/validate', (req, res) => {
    try {
        const { user_id: userId, order_id: orderId } = req.query;
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

module.exports = router;
