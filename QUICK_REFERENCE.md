# ⚡ QUICK REFERENCE - MSU Attendance System

## 🚀 COMMON COMMANDS

### Start Development
```bash
# Navigate to project
cd "D:\Programming\Systems\Mobile-Systems\PHP + React Native\msu-automated-classroom-attendance"

# Install dependencies (first time only)
npm install

# Start the app
npm start

# Start with cache cleared
npm start -- --clear
```

### View App
- **Phone**: Scan QR code with Expo Go
- **Web**: Press `w` in terminal
- **Android Emulator**: Press `a` in terminal
- **Stop**: Press `Ctrl + C` in terminal

---

## 🗄️ DATABASE COMMANDS

### HeidiSQL (GUI)
1. Start Laragon
2. Click "Database" → "Open" (or Ctrl+D)
3. Execute queries or import SQL files

### SQL Quick Commands
```sql
-- View all tables
SHOW TABLES;

-- View table structure
DESCRIBE users;

-- View all instructors
SELECT * FROM users WHERE role = 'instructor';

-- View all classes
SELECT * FROM classes;

-- View today's attendance
SELECT * FROM attendance WHERE DATE(check_in_time) = CURDATE();

-- Count enrolled students
SELECT COUNT(*) FROM students;
```

---

## 📁 FILE LOCATIONS

### Mobile App Files
```
src/screens/          → All screen components
src/navigation/       → Navigation setup
src/config/api.js     → API URL configuration ⚠️ UPDATE THIS
src/constants/        → Colors and constants
App.js                → Root component
```

### Backend Files
```
C:\laragon\www\msu-attendance-api\
├── auth/             → Login, register endpoints
├── attendance/       → Attendance marking, stats
├── classes/          → Class management
└── config/           → Database, CORS config
```

### Database Files
```
database/schema.sql   → Complete database structure
```

---

## 🔧 CONFIGURATION

### API URL (IMPORTANT!)
**File**: `src/config/api.js`

Find your IP:
```bash
ipconfig
```

Update:
```javascript
export const API_BASE_URL = 'http://YOUR_IP/msu-attendance-api';
// Example: 'http://192.168.1.100/msu-attendance-api'
```

### Database Connection
**File**: `backend/config/database.php`
```php
private $host = "localhost";
private $database_name = "msu_attendance_db";
private $username = "root";
private $password = "";
```

---

## 🧪 TESTING URLS

### Backend API
```
http://localhost/msu-attendance-api/
http://localhost/msu-attendance-api/auth/login.php
http://localhost/msu-attendance-api/attendance/stats.php?instructor_id=1
```

### Test in Browser
1. Open browser
2. Go to: `http://localhost/msu-attendance-api/`
3. Should see JSON response

---

## 🐛 TROUBLESHOOTING

### Cannot connect to server
✅ Check Laragon is running (Apache & MySQL green)
✅ Verify IP address in `api.js`
✅ Phone and PC on same WiFi
✅ Test backend: `http://YOUR_IP/msu-attendance-api/`

### Database error
✅ MySQL running in Laragon
✅ Database `msu_attendance_db` exists
✅ Credentials correct in `database.php`

### App won't start
✅ Run `npm install`
✅ Clear cache: `npm start -- --clear`
✅ Check for errors in terminal

### QR Scanner not working
✅ Grant camera permission
✅ Use physical device (not browser)
✅ Check lighting conditions

---

## 📱 TEST CREDENTIALS

### After Registration
Use the credentials you created during registration.

### Sample Data
- **Instructor**: Prof. Rodriguez
- **Email**: rodriguez@msuiit.edu.ph
- **Classes**: CS101, CS102, CS201, CS301

---

## 🎯 DEVELOPMENT WORKFLOW

### Adding New Feature
1. Create new screen in `src/screens/`
2. Add to navigation if needed
3. Create backend endpoint in `backend/`
4. Test thoroughly
5. Update documentation

### Modifying Existing Feature
1. Locate file (use structure above)
2. Make changes
3. Save (auto-reload in Expo)
4. Test immediately
5. Check for errors in terminal

---

## 📊 PROJECT STRUCTURE QUICK VIEW

```
msu-automated-classroom-attendance/
├── 📱 App.js                  → Root component
├── 📱 src/                    → React Native code
│   ├── screens/              → All screens
│   ├── navigation/           → Tab & stack nav
│   ├── config/               → API config
│   └── constants/            → Colors, etc
├── 🔧 backend/                → PHP API
│   ├── auth/                 → Login, register
│   ├── attendance/           → Mark, stats
│   ├── classes/              → Class list
│   └── config/               → DB, CORS
├── 💾 database/               → SQL schema
├── 📚 *.md                    → Documentation
└── 🛠️ setup-check.ps1         → Setup checker
```

---

## ⚙️ LARAGON CONTROLS

### Start/Stop
- **Start All**: Starts Apache & MySQL
- **Stop All**: Stops all services
- **Restart**: Restarts services

### Quick Access
- **Web**: Click "Web" button → Opens localhost
- **Database**: Click "Database" button → Opens HeidiSQL
- **Root**: Click "Root" button → Opens www folder
- **Terminal**: Click "Terminal" button → Opens CMD

---

## 🎨 COLOR REFERENCE

```javascript
Primary:    #7D1F1F  // MSU Maroon
Secondary:  #C4A24C  // Gold
Success:    #4CAF50  // Green
Error:      #F44336  // Red
Info:       #2196F3  // Blue
Warning:    #FF9800  // Orange
```

---

## 📞 HELP RESOURCES

### Documentation
- README.md → Project overview
- SETUP_GUIDE.md → Detailed setup
- PROJECT_SUMMARY.md → Complete documentation

### Online Resources
- React Native: https://reactnative.dev/
- Expo: https://docs.expo.dev/
- PHP: https://www.php.net/
- MySQL: https://dev.mysql.com/doc/

---

## ✅ DAILY CHECKLIST

**Starting Work:**
- [ ] Start Laragon (Apache & MySQL)
- [ ] Verify backend: http://localhost/msu-attendance-api/
- [ ] Run `npm start` in project directory
- [ ] Open app on phone via Expo Go

**Before Testing:**
- [ ] Backend running
- [ ] Database accessible
- [ ] API URL correct in `api.js`
- [ ] Phone on same WiFi

**Finishing Work:**
- [ ] Stop Expo server (Ctrl+C)
- [ ] Can leave Laragon running or stop it
- [ ] Commit changes if needed

---

**Quick Help**: Run `.\setup-check.ps1` to check your setup!

---

*Keep this file handy for quick reference!* 📌
