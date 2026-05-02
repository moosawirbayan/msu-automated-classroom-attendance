# Quick Backend Deployment Script
# Copies backend files to Laragon www directory

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "MSU Attendance - Backend Deployment" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

$SOURCE = "backend"
$DESTINATION = "C:\laragon\www\msu-attendance-api"

# Check if source exists
if (-Not (Test-Path $SOURCE)) {
    Write-Host "ERROR: Backend folder not found: $SOURCE" -ForegroundColor Red
    pause
    exit
}

# Check if Laragon directory exists
if (-Not (Test-Path "C:\laragon\www")) {
    Write-Host "ERROR: Laragon www directory not found" -ForegroundColor Red
    Write-Host "Please install Laragon or update the DESTINATION path in this script" -ForegroundColor Yellow
    pause
    exit
}

Write-Host "Copying backend files..." -ForegroundColor Yellow
Write-Host "From: $SOURCE" -ForegroundColor Gray
Write-Host "To: $DESTINATION" -ForegroundColor Gray
Write-Host ""

# Remove destination if exists
if (Test-Path $DESTINATION) {
    Write-Host "Removing old backend files..." -ForegroundColor Yellow
    Remove-Item -Path $DESTINATION -Recurse -Force
}

# Copy files
try {
    Copy-Item -Path $SOURCE -Destination $DESTINATION -Recurse -Force
    Write-Host "✓ Backend files deployed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Backend is now available at:" -ForegroundColor Cyan
    Write-Host "http://localhost/msu-attendance-api" -ForegroundColor White
    Write-Host ""
    Write-Host "Test endpoints:" -ForegroundColor Cyan
    Write-Host "  Login: http://localhost/msu-attendance-api/modules/instructor/auth/login.php" -ForegroundColor Gray
    Write-Host "  Register: http://localhost/msu-attendance-api/modules/instructor/auth/register.php" -ForegroundColor Gray
    Write-Host ""
} catch {
    Write-Host "✗ Deployment failed: $_" -ForegroundColor Red
}

Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
