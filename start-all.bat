@echo off
REM PLXYGROUND Auto-Start Script
REM Starts Backend, Frontend, and Admin Panel

echo.
echo ╔════════════════════════════════════════════╗
echo ║  🏀 PLXYGROUND - Starting All Services     ║
echo ╚════════════════════════════════════════════╝
echo.

REM Check if all directories exist
if not exist "backend\" (
    echo ❌ Error: backend folder not found
    exit /b 1
)

if not exist "frontend\" (
    echo ❌ Error: frontend folder not found
    exit /b 1
)

if not exist "admin-panel\" (
    echo ❌ Error: admin-panel folder not found
    exit /b 1
)

REM Start Backend
echo 📦 Installing backend dependencies...
cd backend
if not exist "node_modules\" (
    call npm install
)

echo 🌱 Seeding database...
call npm run seed

echo 🚀 Starting backend on port 3011...
start cmd /k "npm start"
cd ..

REM Wait a bit for backend to start
timeout /t 3 /nobreak

REM Start Frontend  
echo 📦 Installing frontend dependencies...
cd frontend
if not exist "node_modules\" (
    call npm install
)

echo 🚀 Starting frontend on port 19006...
start cmd /k "npm run web"
cd ..

REM Wait a bit for frontend to start
timeout /t 3 /nobreak

REM Start Admin Panel
echo 📦 Installing admin dependencies...
cd admin-panel
if not exist "node_modules\" (
    call npm install
)

echo 🚀 Starting admin panel on port 3012...
start cmd /k "npm start"
cd ..

REM Wait for services to start
timeout /t 8 /nobreak

REM Health check
echo.
echo ✅ All services should be starting...
echo.
echo 📍 ACCESS POINTS:
echo   Frontend: http://localhost:19006
echo   Admin:    http://localhost:3012
echo   API:      http://localhost:3011
echo.
echo 🔐 Demo Credentials:
echo   Admin:    admin@plxyground.local / Internet2026@
echo   Creator:  sarahjohnson@plxyground.local / Password1!
echo.
echo 🌐 Testing backend health...
timeout /t 2 /nobreak

REM Try health check (requires curl)
curl -s http://localhost:3011/healthz >nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ Backend health check passed
) else (
    echo ⚠ Backend health check failed - please check logs
)

echo.
echo All terminal windows will display logs.
echo Close any window to stop that service.
echo.
pause
