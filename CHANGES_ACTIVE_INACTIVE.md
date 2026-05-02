# Database & Feature Updates Summary

## Issues Fixed
✅ **SQLSTATE[42S22]: Column not found: 'schedule'** - Removed old schedule column, replaced with start_time, end_time, days
✅ **Active/Inactive Class Status** - Added is_active toggle functionality

## Changes Made

### 1. Database Schema Updates
- **Removed:** `schedule` column (old single-field approach)
- **Added:** 
  - `start_time` TIME NOT NULL
  - `end_time` TIME NOT NULL
  - `days` VARCHAR(100) NOT NULL
  - `section` VARCHAR(50)
  - `is_active` BOOLEAN DEFAULT TRUE

### 2. Backend API Updates

#### Updated Files:
- **backend/classes/index.php**
  - POST: Now accepts start_time, end_time, days, is_active
  - PUT: Supports updating is_active status
  - GET: Returns all new fields including is_active
  
- **backend/classes/get_all.php**
  - Updated to return start_time, end_time, days, is_active
  - Removed references to schedule column

- **database/schema.sql**
  - Updated to match migration schema

### 3. Frontend Updates

#### Updated Files:
- **src/screens/instructor/ClassesScreen.js**
  - Added Switch component import
  - Added is_active toggle at top of each class card
  - Shows "Class is active/inactive" status
  - Shows warning when class is inactive
  - API call to update is_active status
  
- **src/screens/instructor/AddClassScreen.js**
  - New classes default to is_active = true

### 4. Migration Files
- **Created:** `database/migrations/006_update_classes_table_for_active_status.sql`
  - MySQL 5.7 compatible migration script
  - Safely adds new columns if they don't exist
  - Removes old schedule column if it exists

## Next Steps - Required Actions

### Step 1: Run Database Migration
Open **HeidiSQL** or **phpMyAdmin** in Laragon:

1. Connect to your database
2. Select `msu_attendance_db` database
3. Open the SQL tab
4. Copy and paste the contents of:
   ```
   database/migrations/006_update_classes_table_for_active_status.sql
   ```
5. Click **Execute** or **Run**

### Step 2: Restart Your Development Server
If Laragon is already running:
1. Stop Apache (if running)
2. Start Apache again

### Step 3: Test the App
1. Clear Expo cache: `npx expo start --clear`
2. Reload the app on your device
3. Try creating a new class - should work without errors
4. Toggle the Active/Inactive switch on existing classes

## Features Now Available

### Active/Inactive Toggle
- Each class card shows a toggle switch at the top
- Toggle between "Class is active" and "Class is inactive"
- When inactive, shows warning: "Activate class to enable QR scanning"
- Status persists in database

### Time-Based Scheduling
- Start time and end time pickers
- Day selection (Mon, Tue, Wed, Thu, Fri, Sat, Sun)
- Proper display format: "Mon, Wed, Fri • 8:00 AM - 10:00 AM"

### Grade & Section
- Separate fields in form
- Combined display: "Grade 10 - Section A"

## Verification Checklist
- [ ] Migration script executed successfully in HeidiSQL
- [ ] Backend files updated in `C:\laragon\www\`
- [ ] Expo app restarted with --clear flag
- [ ] Can create new class without errors
- [ ] Can toggle is_active status on existing classes
- [ ] Class cards show correct schedule format

## Troubleshooting

### If you still get "Column not found: schedule" error:
1. Check if migration ran successfully in HeidiSQL
2. Verify columns exist: `DESCRIBE classes;` in SQL tab
3. Ensure backend files were copied to Laragon www folder

### If toggle doesn't work:
1. Check browser console/Expo logs for errors
2. Verify API URL in `src/config/api.js` points to correct backend
3. Check that authToken is valid

## Files Modified
- backend/classes/index.php
- backend/classes/get_all.php
- database/schema.sql
- src/screens/instructor/ClassesScreen.js
- src/screens/instructor/AddClassScreen.js

## Files Created
- database/migrations/006_update_classes_table_for_active_status.sql
