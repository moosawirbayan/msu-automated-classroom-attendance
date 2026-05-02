# 🚀 QUICK START GUIDE
## MSU Automated Classroom Attendance System

Follow these steps to get the system running on your machine.

---

## ✅ STEP 1: Install Required Software

### 1.1 Install Node.js
- Download from: https://nodejs.org/
- Choose LTS version (v18 or higher)
- Verify installation:
  ```bash
  node --version
  npm --version
  ```

### 1.2 Install Laragon
- Download from: https://laragon.org/download/
- Install with default settings
- Laragon includes: Apache, PHP, MySQL, HeidiSQL

### 1.3 Install Expo CLI
```bash
npm install -g expo-cli
```

### 1.4 Install Expo Go on Phone
- **Android**: https://play.google.com/store/apps/details?id=host.exp.exponent
- **iOS**: https://apps.apple.com/app/expo-go/id982107779

---

## ✅ STEP 2: Setup Database

### 2.1 Start Laragon
1. Open Laragon
2. Click **"Start All"** button
3. Wait for Apache and MySQL to start (green indicators)

### 2.2 Open HeidiSQL
1. In Laragon, click **"Database"** → **"Open"** (or press Ctrl+D)
2. HeidiSQL will open with auto-connection to MySQL

### 2.3 Create Database
1. In HeidiSQL, click **"File"** → **"Run SQL file..."**
2. Navigate to your project folder:
   ```
   D:\Programming\Systems\Mobile-Systems\PHP + React Native\msu-automated-classroom-attendance\database\schema.sql
   ```
3. Click **"Open"**
4. Click **"Execute"** (F9)
5. You should see `msu_attendance_db` database created with all tables

### 2.4 Verify Database
1. In HeidiSQL left panel, expand `msu_attendance_db`
2. You should see these tables:
   - users
   - students
   - classes
   - enrollments
   - attendance
   - qr_codes
   - attendance_reports

---

## ✅ STEP 3: Setup PHP Backend

### 3.1 Copy Backend to Laragon
1. Copy the entire `backend` folder from your project
2. Paste it into Laragon's web root:
   ```
   C:\laragon\www\
   ```
3. Rename it to: `msu-attendance-api`
4. Final path should be:
   ```
   C:\laragon\www\msu-attendance-api\
   ```

### 3.2 Test Backend
1. Open browser
2. Go to: `http://localhost/msu-attendance-api/`
3. You should see JSON response showing:
   ```json
   {
     "api_name": "MSU Attendance API",
     "database": {
       "connection": "OK"
     }
   }
   ```

---

## ✅ STEP 4: Setup Mobile App

### 4.1 Install Dependencies
Open PowerShell in your project directory:
```bash
cd "D:\Programming\Systems\Mobile-Systems\PHP + React Native\msu-automated-classroom-attendance"
npm install
```

### 4.2 Configure API Connection

#### Find Your Local IP Address:
```bash
ipconfig
```
Look for "IPv4 Address" under your active network adapter (e.g., `192.168.1.100`)

#### Update API Configuration:
1. Open file: `src\config\api.js`
2. Replace this line:
   ```javascript
   export const API_BASE_URL = 'http://localhost/msu-attendance-api';
   ```
   With:
   ```javascript
   export const API_BASE_URL = 'http://YOUR_IP_ADDRESS/msu-attendance-api';
   ```
   Example:
   ```javascript
   export const API_BASE_URL = 'http://192.168.1.100/msu-attendance-api';
   ```

---

## ✅ STEP 5: Run the Application

### 5.1 Start Mobile App
In PowerShell:
```bash
npm start
```

### 5.2 Open on Phone
1. Open **Expo Go** app on your phone
2. Make sure phone is on **same WiFi** as your computer
3. Scan the QR code shown in terminal/browser
4. App will load on your phone

### 5.3 Alternative: Run on Emulator
- **Android**: Press `a` in terminal
- **Web Browser**: Press `w` in terminal

---

## ✅ STEP 6: Test the System

### 6.1 Test Landing Page
- App should open showing MSU logo and "Get Started" button

### 6.2 Test Registration
1. Click "Create Account"
2. Fill in the form:
   - **Full Name**: John Instructor
   - **Email**: john@msuiit.edu.ph
   - **Department**: Computer Science
   - **Employee ID**: TEST-001
   - **Password**: test123
   - **Confirm Password**: test123
3. Click "Create Account"
4. Should show success message

### 6.3 Test Login
1. Go back and click "Get Started"
2. Enter:
   - **Email**: john@msuiit.edu.ph
   - **Name**: John Instructor
   - **Password**: test123
3. Click "Login as Instructor"
4. Should navigate to Dashboard

### 6.4 Test Dashboard
- Should see attendance statistics
- Cards showing enrolled students, present/absent counts
- Attendance rate visualization

---

## 🔧 TROUBLESHOOTING

### Problem: "Cannot connect to server"

**Solution**:
1. Check Laragon is running (Apache & MySQL green)
2. Test backend URL in browser: `http://YOUR_IP/msu-attendance-api/`
3. Verify IP address in `api.js` matches your computer's IP
4. Ensure phone and computer on same WiFi network

### Problem: "Database connection failed"

**Solution**:
1. Open Laragon, ensure MySQL is running
2. Open HeidiSQL, verify `msu_attendance_db` exists
3. Check credentials in `backend\config\database.php`

### Problem: QR Scanner shows black screen

**Solution**:
1. Grant camera permission to Expo Go
2. Restart the app
3. Try on physical device (camera doesn't work in browser)

### Problem: App shows blank screen

**Solution**:
1. Clear Expo cache: `expo start -c`
2. Restart Metro bundler
3. Check for JavaScript errors in terminal

---

## 📱 TESTING FLOW

### Complete Test Sequence:

1. **Open App** → See Landing Page
2. **Register** → Create instructor account
3. **Login** → Access dashboard
4. **View Dashboard** → See attendance stats
5. **Go to Classes** → View class list
6. **Go to Scanner** → Test QR scanner (grant camera permission)
7. **Go to Profile** → View instructor info

---

## 🎯 WHAT'S NEXT?

### Phase 2 Features to Add:
- [ ] QR Code Generation for classes
- [ ] Student registration and management
- [ ] Detailed attendance reports
- [ ] Export functionality (PDF, Excel)
- [ ] Push notifications
- [ ] Email notifications
- [ ] Admin panel
- [ ] Analytics and charts

### Database Enhancements:
- [ ] Add more sample data
- [ ] Create indexes for performance
- [ ] Setup automated backups
- [ ] Add audit logs

### Security Improvements:
- [ ] Implement JWT authentication
- [ ] Password reset functionality
- [ ] Session management
- [ ] Rate limiting
- [ ] Input validation and sanitization

---

## 📞 NEED HELP?

### Common Commands:

**Start the app:**
```bash
npm start
```

**Clear cache and restart:**
```bash
npm start -- --clear
```

**View app on phone:**
- Scan QR code with Expo Go

**View app in browser:**
- Press `w` in terminal

**Stop the app:**
- Press `Ctrl + C` in terminal

### Useful Links:
- Expo Documentation: https://docs.expo.dev/
- React Native Docs: https://reactnative.dev/
- PHP Documentation: https://www.php.net/docs.php
- MySQL Documentation: https://dev.mysql.com/doc/

---

## ✨ SUCCESS CHECKLIST

- [ ] Laragon installed and running
- [ ] Database created successfully
- [ ] Backend copied to `C:\laragon\www\msu-attendance-api\`
- [ ] Backend API responds at `http://localhost/msu-attendance-api/`
- [ ] Node.js and npm installed
- [ ] Mobile app dependencies installed (`npm install`)
- [ ] API URL updated in `src\config\api.js`
- [ ] Expo Go installed on phone
- [ ] App running with `npm start`
- [ ] Successfully registered an instructor account
- [ ] Successfully logged in
- [ ] Dashboard showing data

**If all checked ✅ - CONGRATULATIONS! You're ready to develop! 🎉**

---

**Built with ❤️ for MSU-Maguindanao**
