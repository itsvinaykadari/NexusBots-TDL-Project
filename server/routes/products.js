const express = require('express');
const router = express.Router();
const Product = require('../models/Product');

// GET /api/products
router.get('/', (req, res) => {
  try {
    const { category, search } = req.query;
    let products;
    
    if (search) {
      products = Product.search(search);
    } else if (category && category !== 'All') {
      products = Product.getByCategory(category);
    } else {
      products = Product.getAll();
    }
    
    // Parse specs and tags from JSON strings
    products = products.map(p => ({
      ...p,
      specs: p.specs ? JSON.parse(p.specs) : {},
      tags: p.tags ? JSON.parse(p.tags) : [],
      in_stock: Boolean(p.in_stock)
    }));
    
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/products/:id
router.get('/:id', (req, res) => {
  try {
    const product = Product.getById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    // Parse specs and tags
    product.specs = product.specs ? JSON.parse(product.specs) : {};
    product.tags = product.tags ? JSON.parse(product.tags) : [];
    product.in_stock = Boolean(product.in_stock);
    
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
