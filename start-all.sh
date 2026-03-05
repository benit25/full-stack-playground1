#!/bin/bash

# PLXYGROUND Auto-Start Script
# Starts Backend, Frontend, and Admin Panel

echo ""
echo "╔════════════════════════════════════════════╗"
echo "║  🏀 PLXYGROUND - Starting All Services     ║"
echo "╚════════════════════════════════════════════╝"
echo ""

# Check if directories exist
if [ ! -d "backend" ]; then
    echo "❌ Error: backend folder not found"
    exit 1
fi

if [ ! -d "frontend" ]; then
    echo "❌ Error: frontend folder not found"
    exit 1
fi

if [ ! -d "admin-panel" ]; then
    echo "❌ Error: admin-panel folder not found"
    exit 1
fi

# Start Backend
echo "📦 Installing backend dependencies..."
cd backend
if [ ! -d "node_modules" ]; then
    npm install
fi

echo "🌱 Seeding database..."
npm run seed

echo "🚀 Starting backend on port 3011..."
npm start &
BACKEND_PID=$!
cd ..

# Wait for backend
sleep 3

# Start Frontend
echo "📦 Installing frontend dependencies..."
cd frontend
if [ ! -d "node_modules" ]; then
    npm install
fi

echo "🚀 Starting frontend on port 19006..."
npm run web &
FRONTEND_PID=$!
cd ..

# Wait for frontend
sleep 3

# Start Admin Panel
echo "📦 Installing admin dependencies..."
cd admin-panel
if [ ! -d "node_modules" ]; then
    npm install
fi

echo "🚀 Starting admin panel on port 3012..."
npm start &
ADMIN_PID=$!
cd ..

# Wait for services
sleep 8

echo ""
echo "✅ All services should be starting..."
echo ""
echo "📍 ACCESS POINTS:"
echo "   Frontend: http://localhost:19006"
echo "   Admin:    http://localhost:3012"
echo "   API:      http://localhost:3011"
echo ""
echo "🔐 Demo Credentials:"
echo "   Admin:    admin@plxyground.local / Internet2026@"
echo "   Creator:  sarahjohnson@plxyground.local / Password1!"
echo ""
echo "🌐 Testing backend health..."
sleep 2

# Health check
curl -s http://localhost:3011/healthz > /dev/null
if [ $? -eq 0 ]; then
    echo "✓ Backend health check passed"
else
    echo "⚠️  Backend health check failed - please check logs"
fi

echo ""
echo "Use Ctrl+C to stop all services, or close individual terminals."
echo ""

# Wait for all processes
wait $BACKEND_PID $FRONTEND_PID $ADMIN_PID
