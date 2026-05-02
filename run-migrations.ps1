# MSU Attendance System - Database Migration Runner

# This script helps you run database migrations in order

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "MSU Attendance System - Database Migration Runner" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$DB_HOST = "localhost"
$DB_USER = "root"
$DB_PASS = ""
$DB_NAME = "msu_attendance_db"
$MYSQL_PATH = "C:\laragon\bin\mysql\mysql-8.0.30-winx64\bin\mysql.exe"
$MIGRATIONS_DIR = "database\migrations"

# Check if MySQL exists
if (-Not (Test-Path $MYSQL_PATH)) {
    Write-Host "ERROR: MySQL not found at $MYSQL_PATH" -ForegroundColor Red
    Write-Host "Please update MYSQL_PATH in this script to match your Laragon installation" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Common paths:" -ForegroundColor Yellow
    Write-Host "  C:\laragon\bin\mysql\mysql-8.0.30-winx64\bin\mysql.exe" -ForegroundColor Gray
    Write-Host "  C:\laragon\bin\mysql\mysql-5.7.33-winx64\bin\mysql.exe" -ForegroundColor Gray
    Write-Host ""
    pause
    exit
}

# Check if migrations directory exists
if (-Not (Test-Path $MIGRATIONS_DIR)) {
    Write-Host "ERROR: Migrations directory not found: $MIGRATIONS_DIR" -ForegroundColor Red
    pause
    exit
}

Write-Host "Step 1: Checking MySQL connection..." -ForegroundColor Yellow
$testConnection = & $MYSQL_PATH -h $DB_HOST -u $DB_USER -e "SELECT 1;" 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Cannot connect to MySQL server" -ForegroundColor Red
    Write-Host "Make sure Laragon is running and MySQL service is started" -ForegroundColor Yellow
    pause
    exit
}
Write-Host "✓ MySQL connection successful" -ForegroundColor Green
Write-Host ""

Write-Host "Step 2: Creating database if not exists..." -ForegroundColor Yellow
$createDB = & $MYSQL_PATH -h $DB_HOST -u $DB_USER -e "CREATE DATABASE IF NOT EXISTS $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;" 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Database '$DB_NAME' is ready" -ForegroundColor Green
} else {
    Write-Host "ERROR: Failed to create database" -ForegroundColor Red
    Write-Host $createDB -ForegroundColor Red
    pause
    exit
}
Write-Host ""

Write-Host "Step 3: Running migrations..." -ForegroundColor Yellow
Write-Host ""

# Get all migration files sorted
$migrations = Get-ChildItem -Path $MIGRATIONS_DIR -Filter "*.sql" | Sort-Object Name

if ($migrations.Count -eq 0) {
    Write-Host "ERROR: No migration files found in $MIGRATIONS_DIR" -ForegroundColor Red
    pause
    exit
}

$successCount = 0
$failCount = 0

foreach ($migration in $migrations) {
    Write-Host "  Running: $($migration.Name)..." -ForegroundColor Cyan
    
    $result = & $MYSQL_PATH -h $DB_HOST -u $DB_USER $DB_NAME -e "source $($migration.FullName)" 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✓ Success" -ForegroundColor Green
        $successCount++
    } else {
        Write-Host "  ✗ Failed" -ForegroundColor Red
        Write-Host "  Error: $result" -ForegroundColor Red
        $failCount++
    }
    Write-Host ""
}

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "Migration Summary" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "Total migrations: $($migrations.Count)" -ForegroundColor White
Write-Host "Successful: $successCount" -ForegroundColor Green
Write-Host "Failed: $failCount" -ForegroundColor $(if ($failCount -gt 0) { "Red" } else { "Green" })
Write-Host ""

if ($failCount -eq 0) {
    Write-Host "Step 4: Verifying tables..." -ForegroundColor Yellow
    $tables = & $MYSQL_PATH -h $DB_HOST -u $DB_USER $DB_NAME -e "SHOW TABLES;" 2>&1
    Write-Host $tables -ForegroundColor White
    Write-Host ""
    Write-Host "✓ All migrations completed successfully!" -ForegroundColor Green
} else {
    Write-Host "⚠ Some migrations failed. Please check the errors above." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
