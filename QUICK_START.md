# 🚀 MSU Attendance System - Quick Start Guide

## ⚡ Fast Setup (3 Steps)

### 1️⃣ Deploy Backend (1 minute)

Open PowerShell in project folder and run:

```powershell
.\deploy-backend.ps1
```

This copies backend files to `C:\laragon\www\msu-attendance-api`

### 2️⃣ Setup Database (1 minute)

Run database migrations:

```powershell
.\run-migrations.ps1
```

This creates `msu_attendance_db` and all required tables.

### 3️⃣ Start Frontend (1 minute)

```powershell
npm install
npx expo start
```

Press `w` for web or scan QR code with Expo Go app.

---

## ✅ Verify Everything Works

### Test Backend

Open browser: http://localhost/msu-attendance-api/modules/instructor/auth/login.php

**Expected:** JSON response like `{"success":false,"message":"..."}`

### Test Registration

1. Open the app
2. Click "Create Account"
3. Fill form with:
   - Name: Test Instructor
   - Email: test@msuiit.edu.ph
   - Department: Computer Science
   - Employee ID: EMP001
   - Password: password123

4. Should see "Registration successful!"

### Test Login

1. Login with:
   - Email: test@msuiit.edu.ph
   - Name: Test Instructor
   - Password: password123

2. Should navigate to instructor dashboard

---

## 📋 Prerequisites Checklist

- ✅ Laragon installed and running
- ✅ MySQL service started in Laragon
- ✅ Node.js installed (v16+)
- ✅ Expo CLI installed (`npm install -g expo-cli`)

---

## 🔧 Configuration Notes

### For Physical Device Testing

1. Find your IP address:
   ```powershell
   ipconfig
   ```

2. Update `src/config/api.js`:
   ```javascript
   export const API_BASE_URL = 'http://YOUR_IP:80/msu-attendance-api';
   // Example: 'http://192.168.1.100/msu-attendance-api'
   ```

3. Make sure phone and computer are on same WiFi

### For Emulator/Web Testing

Default configuration works:
```javascript
export const API_BASE_URL = 'http://localhost/msu-attendance-api';
```

---

## 📁 Project Structure

```
msu-automated-classroom-attendance/
│
├── backend/                           # PHP Backend (Modular Architecture)
│   ├── core/                         # Core utilities (Database, Response, Validator)
│   └── modules/                      # Feature modules
│       └── instructor/               # Instructor module
│           ├── auth/                 # Login & Register
│           ├── classes/              # Class management
│           └── dashboard/            # Statistics
│
├── database/
│   └── migrations/                   # Database migrations (001-005)
│
├── src/                              # React Native Frontend
│   ├── config/api.js                # API configuration
│   ├── constants/colors.js          # MSU brand colors
│   ├── screens/                     # All app screens
│   └── navigation/                  # App navigation
│
├── deploy-backend.ps1               # Quick backend deployment
├── run-migrations.ps1               # Database migration runner
└── BACKEND_SETUP.md                 # Detailed setup guide
```

---

## 🎯 Current Features

### ✅ Implemented

- [x] Modular monolithic architecture
- [x] Database migrations (users, classes, students, enrollments, attendance)
- [x] Instructor authentication (login/register)
- [x] MSU email validation (@msuiit.edu.ph)
- [x] Secure password hashing (bcrypt)
- [x] Proper error handling and validation
- [x] Landing screen with MSU branding
- [x] Instructor bottom tab navigation
- [x] Dashboard with analytics cards
- [x] Profile screen
- [x] QR Scanner screen (platform-specific)

### 🚧 Next Features

- [ ] Create class screen (matching reference images)
- [ ] Class list with total students count
- [ ] Class details and editing
- [ ] Student enrollment
- [ ] QR code generation for classes
- [ ] Attendance marking via QR scan
- [ ] Attendance reports and statistics

---

## 🐛 Troubleshooting

### Backend not responding

```powershell
# Check if Apache is running in Laragon
# Restart Apache if needed
```

### Database connection error

```powershell
# Run migrations again
.\run-migrations.ps1
```

### App can't connect to backend

1. Check `src/config/api.js` - verify correct URL
2. Test backend in browser first
3. For physical device, use IP address (not localhost)
4. Ensure both phone and PC on same WiFi

### CORS errors

- Already configured in `backend/core/cors.php`
- Make sure all PHP files include: `require_once '../../core/cors.php';`

---

## 📚 Documentation

- [BACKEND_SETUP.md](BACKEND_SETUP.md) - Detailed setup instructions
- [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md) - Project overview
- [QUICK_REFERENCE.md](QUICK_REFERENCE.md) - API endpoints reference

---

## 💡 Development Tips

1. **Always start Laragon first** before testing
2. **Check HeidiSQL** to verify database changes
3. **Use browser DevTools** to inspect API responses
4. **Test endpoints in browser** before integrating with frontend
5. **Check terminal logs** for React Native errors
6. **Reload app** after backend changes (press `r` in Expo)

---

## 🎨 MSU Brand Colors

```javascript
Primary Maroon: #7D1F1F
Gold Accent: #C4A24C
Dark: #1A1A1A
Light: #F5F5F5
```

---

## 📞 Need Help?

Check these in order:

1. **Error logs**: Check Expo terminal and browser console
2. **API test**: Test endpoint in browser directly
3. **Database check**: Use HeidiSQL to verify data
4. **Laravel logs**: `C:\laragon\bin\apache\logs\error.log`
5. **Detailed guide**: Read [BACKEND_SETUP.md](BACKEND_SETUP.md)

---

## ✨ You're All Set!

Your MSU Automated Classroom Attendance System is ready! 🎉

Next step: Test registration and login to verify everything works.
