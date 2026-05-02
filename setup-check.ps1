# MSU Attendance System - Quick Setup Script
# Run this script in PowerShell to check your setup

Write-Host "================================" -ForegroundColor Cyan
Write-Host "MSU Attendance System Setup Check" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Check Node.js
Write-Host "Checking Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "✓ Node.js installed: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Node.js not found! Please install from https://nodejs.org/" -ForegroundColor Red
}

# Check npm
Write-Host "Checking npm..." -ForegroundColor Yellow
try {
    $npmVersion = npm --version
    Write-Host "✓ npm installed: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ npm not found!" -ForegroundColor Red
}

# Check Expo CLI
Write-Host "Checking Expo CLI..." -ForegroundColor Yellow
try {
    $expoVersion = expo --version
    Write-Host "✓ Expo CLI installed: $expoVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Expo CLI not found! Install with: npm install -g expo-cli" -ForegroundColor Red
}

# Check if node_modules exists
Write-Host "`nChecking project dependencies..." -ForegroundColor Yellow
if (Test-Path "node_modules") {
    Write-Host "✓ Dependencies installed" -ForegroundColor Green
} else {
    Write-Host "✗ Dependencies not installed! Run: npm install" -ForegroundColor Red
}

# Get local IP address
Write-Host "`nYour Local IP Addresses:" -ForegroundColor Yellow
Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.IPAddress -like "192.168.*" -or $_.IPAddress -like "10.*"} | ForEach-Object {
    Write-Host "  → $($_.IPAddress)" -ForegroundColor Cyan
}

Write-Host "`nUpdate src\config\api.js with your IP address!" -ForegroundColor Magenta

# Check Laragon directory
Write-Host "`nChecking Laragon setup..." -ForegroundColor Yellow
$larafonPath = "C:\laragon\www\msu-attendance-api"
if (Test-Path $laragonPath) {
    Write-Host "✓ Backend found in Laragon: $larafonPath" -ForegroundColor Green
} else {
    Write-Host "✗ Backend not found in Laragon!" -ForegroundColor Red
    Write-Host "  Copy 'backend' folder to: C:\laragon\www\msu-attendance-api\" -ForegroundColor Yellow
}

Write-Host "`n================================" -ForegroundColor Cyan
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host "1. Start Laragon (Apache & MySQL)" -ForegroundColor White
Write-Host "2. Import database/schema.sql in HeidiSQL" -ForegroundColor White
Write-Host "3. Update src\config\api.js with your IP" -ForegroundColor White
Write-Host "4. Run: npm install (if not done)" -ForegroundColor White
Write-Host "5. Run: npm start" -ForegroundColor White
Write-Host "6. Scan QR code with Expo Go app" -ForegroundColor White
Write-Host "`nFor detailed instructions, see SETUP_GUIDE.md" -ForegroundColor Green
Write-Host ""
