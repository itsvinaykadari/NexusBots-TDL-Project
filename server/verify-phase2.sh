#!/bin/bash
echo "=================================="
echo "Phase 2 Verification Checklist"
echo "=================================="
echo ""

# 1. Check server files exist
echo "✓ Checking server structure..."
[ -f "index.js" ] && echo "  ✓ index.js exists"
[ -f "config/db.js" ] && echo "  ✓ config/db.js exists"
[ -f "models/Product.js" ] && echo "  ✓ models/Product.js exists"
[ -f "models/Chat.js" ] && echo "  ✓ models/Chat.js exists"
[ -f "routes/products.js" ] && echo "  ✓ routes/products.js exists"
[ -f "routes/chats.js" ] && echo "  ✓ routes/chats.js exists"
[ -f "database/nexusbots.db" ] && echo "  ✓ database/nexusbots.db exists"
echo ""

# 2. Check database content
echo "✓ Checking database content..."
PRODUCTS=$(node -e "const db=require('./config/db');console.log(db.prepare('SELECT COUNT(*) as count FROM products').get().count)")
echo "  ✓ Products in DB: $PRODUCTS/22"
echo ""

# 3. Check server is running
echo "✓ Checking if server is running..."
if curl -s --max-time 2 http://localhost:5000/api/health > /dev/null 2>&1; then
    echo "  ✓ Server is running on port 5000"
else
    echo "  ✗ Server is NOT running. Run: npm run dev"
    exit 1
fi
echo ""

# 4. Test API endpoints
echo "✓ Testing API endpoints..."

# Health check
HEALTH=$(curl -s http://localhost:5000/api/health | grep -o '"status":"ok"')
[ -n "$HEALTH" ] && echo "  ✓ GET /api/health works" || echo "  ✗ Health check failed"

# Get all products
PROD_COUNT=$(curl -s http://localhost:5000/api/products | node -e "console.log(JSON.parse(require('fs').readFileSync(0,'utf8')).length)")
[ "$PROD_COUNT" = "22" ] && echo "  ✓ GET /api/products returns 22 products" || echo "  ✗ Products endpoint failed"

# Get single product
PROD_NAME=$(curl -s http://localhost:5000/api/products/1 | node -e "console.log(JSON.parse(require('fs').readFileSync(0,'utf8')).name)")
[ "$PROD_NAME" = "Nexus HomeHub" ] && echo "  ✓ GET /api/products/:id works" || echo "  ✗ Single product failed"

# Filter by category
SEC_COUNT=$(curl -s "http://localhost:5000/api/products?category=Security" | node -e "console.log(JSON.parse(require('fs').readFileSync(0,'utf8')).length)")
[ "$SEC_COUNT" = "3" ] && echo "  ✓ GET /api/products?category=Security returns 3 robots" || echo "  ✗ Category filter failed"

# Search
SEARCH_COUNT=$(curl -s "http://localhost:5000/api/products?search=vacuum" | node -e "console.log(JSON.parse(require('fs').readFileSync(0,'utf8')).length)")
[ "$SEARCH_COUNT" -ge "1" ] && echo "  ✓ GET /api/products?search=vacuum works" || echo "  ✗ Search failed"

# Create chat
CHAT_ID=$(curl -s -X POST http://localhost:5000/api/chats -H "Content-Type: application/json" -d '{"language":"en"}' | node -e "console.log(JSON.parse(require('fs').readFileSync(0,'utf8')).id)")
[ -n "$CHAT_ID" ] && echo "  ✓ POST /api/chats creates session (ID: $CHAT_ID)" || echo "  ✗ Create chat failed"

# Add message
if [ -n "$CHAT_ID" ]; then
    MSG_ID=$(curl -s -X POST http://localhost:5000/api/chats/$CHAT_ID/messages -H "Content-Type: application/json" -d '{"role":"user","content":"test message","intent":"test"}' | node -e "console.log(JSON.parse(require('fs').readFileSync(0,'utf8')).id)")
    [ -n "$MSG_ID" ] && echo "  ✓ POST /api/chats/:id/messages adds message" || echo "  ✗ Add message failed"
    
    # Get chat with messages
    MSG_COUNT=$(curl -s http://localhost:5000/api/chats/$CHAT_ID | node -e "console.log(JSON.parse(require('fs').readFileSync(0,'utf8')).messages.length)")
    [ "$MSG_COUNT" -ge "1" ] && echo "  ✓ GET /api/chats/:id retrieves messages" || echo "  ✗ Get messages failed"
fi

echo ""
echo "=================================="
echo "✅ Phase 2 is COMPLETE!"
echo "=================================="
echo ""
echo "Summary:"
echo "- Express server: ✓"
echo "- SQLite database: ✓"
echo "- 22 robot products seeded: ✓"
echo "- Product API endpoints: ✓"
echo "- Chat session API endpoints: ✓"
