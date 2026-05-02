# MSU Automated Classroom Attendance System

An automated classroom attendance system for Mindanao State University - Maguindanao using QR code-based attendance tracking.

## 🎯 Features

- **QR Code-Based Attendance**: Quick and efficient attendance marking using QR codes
- **Real-time Dashboard**: Live attendance monitoring and analytics
- **Instructor Portal**: Secure login for instructors to manage classes and students
- **Attendance Reports**: Automated generation of attendance summaries and reports
- **Student Management**: Organized system for class and student information
- **Data Security**: User authentication and data protection measures

## 🛠️ Tech Stack

### Frontend (Mobile App)
- **React Native** (Expo)
- **React Navigation** for navigation
- **Expo Camera & Barcode Scanner** for QR code scanning
- **Axios** for API calls
- **Expo Linear Gradient** for UI styling

### Backend
- **PHP** for REST API
- **MySQL** (via Laragon) for database
- **HeidiSQL** for database management

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

1. **Node.js** (v16 or higher)
2. **Laragon** (includes PHP, MySQL, Apache)
3. **Expo CLI**: `npm install -g expo-cli`
4. **Expo Go** app on your mobile device (for testing)

## 🚀 Installation & Setup

### 1. Clone the Repository

```bash
cd "D:\Programming\Systems\Mobile-Systems\PHP + React Native\msu-automated-classroom-attendance"
```

### 2. Install Mobile App Dependencies

```bash
npm install
```

### 3. Setup Backend (PHP + MySQL)

#### A. Setup Laragon

1. Open **Laragon**
2. Start **Apache** and **MySQL** services

#### B. Create Database

1. Open **HeidiSQL** (comes with Laragon)
2. Connect to your MySQL server
3. Open and execute the SQL file: `database/schema.sql`
   - This will create the database `msu_attendance_db` and all necessary tables

#### C. Configure Backend

1. Copy the `backend` folder to Laragon's web root:
   ```
   C:\laragon\www\msu-attendance-api
   ```

2. Update database credentials if needed in:
   ```
   backend/config/database.php
   ```

3. Test backend by visiting:
   ```
   http://localhost/msu-attendance-api/
   ```

### 4. Configure Mobile App API Connection

1. Find your computer's local IP address:
   ```bash
   ipconfig
   ```
   Look for "IPv4 Address" (e.g., 192.168.1.100)

2. Update API URL in `src/config/api.js`:
   ```javascript
   export const API_BASE_URL = 'http://YOUR_IP_ADDRESS/msu-attendance-api';
   // Example: 'http://192.168.1.100/msu-attendance-api'
   ```

## 🎮 Running the Application

### Start the Mobile App

```bash
npm start
```

This will open Expo DevTools. You can then:
- Scan the QR code with **Expo Go** app (Android/iOS)
- Press `a` to open in Android emulator
- Press `i` to open in iOS simulator
- Press `w` to open in web browser

### Backend is Already Running

Once Laragon's Apache is started, your PHP backend is automatically running at:
```
http://localhost/msu-attendance-api
```

## 📱 App Structure

```
msu-automated-classroom-attendance/
├── src/
│   ├── screens/
│   │   ├── LandingScreen.js          # Welcome screen
│   │   ├── LoginScreen.js            # Instructor login
│   │   ├── RegisterScreen.js         # Instructor registration
│   │   └── instructor/
│   │       ├── DashboardScreen.js    # Main dashboard with stats
│   │       ├── ScannerScreen.js      # QR code scanner
│   │       ├── ClassesScreen.js      # Class management
│   │       └── ProfileScreen.js      # User profile
│   ├── navigation/
│   │   └── InstructorNavigator.js    # Bottom tab navigation
│   ├── config/
│   │   └── api.js                    # API configuration
│   └── constants/
│       └── colors.js                 # Color scheme
├── backend/
│   ├── auth/
│   │   ├── login.php                 # Login endpoint
│   │   └── register.php              # Registration endpoint
│   ├── attendance/
│   │   ├── mark.php                  # Mark attendance
│   │   └── stats.php                 # Get statistics
│   ├── classes/
│   │   └── get_all.php               # Get all classes
│   └── config/
│       ├── database.php              # Database connection
│       └── cors.php                  # CORS configuration
├── database/
│   └── schema.sql                    # Database schema
├── App.js                            # Main app component
├── package.json                      # Dependencies
└── app.json                          # Expo configuration
```

## 🔑 Default Login Credentials

### Instructor Account
- **Email**: `rodriguez@msuiit.edu.ph`
- **Password**: `instructor123`
- **Name**: Prof. Rodriguez

> ⚠️ **Note**: You need to update the hashed password in the database. Use PHP to generate:
> ```php
> password_hash('instructor123', PASSWORD_BCRYPT)
> ```

## 📊 Database Schema

The system includes the following main tables:

- **users**: Instructor/admin accounts
- **students**: Student information
- **classes**: Class information
- **enrollments**: Student-class relationships
- **attendance**: Attendance records
- **qr_codes**: Generated QR codes for attendance
- **attendance_reports**: Generated reports

## 🎨 Design System

The app follows MSU-Maguindanao's brand colors:

- **Primary (Maroon)**: #7D1F1F
- **Secondary (Gold)**: #C4A24C
- **Success (Green)**: #4CAF50
- **Error (Red)**: #F44336
- **Info (Blue)**: #2196F3

## 📸 Features Showcase

### Landing Page
- MSU branding and logo
- Quick access to login/register
- Feature highlights

### Login Screen
- Institutional email authentication
- Secure password entry
- Role-based access (Instructor)

### Dashboard
- Real-time attendance statistics
- Enrolled students count
- Present/Absent tracking
- Attendance rate visualization
- Quick action buttons
- Recent activity feed

### Scanner
- QR code scanning for attendance
- Real-time verification
- Duplicate checking
- Visual feedback

### Classes
- List of all classes
- Student count per class
- Attendance rates
- Quick actions (QR generation, reports)

### Profile
- Instructor information
- Settings and preferences
- Logout option

## 🔧 Troubleshooting

### Cannot Connect to Backend

1. Ensure Laragon is running
2. Check your IP address matches in `api.js`
3. Make sure your phone/emulator is on the same network
4. Check backend URL: `http://YOUR_IP/msu-attendance-api`

### Database Connection Error

1. Verify MySQL is running in Laragon
2. Check database credentials in `backend/config/database.php`
3. Ensure database `msu_attendance_db` exists

### QR Scanner Not Working

1. Grant camera permissions to Expo Go
2. Check device compatibility
3. Ensure proper lighting

## 📝 Development

### Adding New API Endpoints

1. Create new PHP file in appropriate backend folder
2. Include CORS and database config
3. Implement your logic
4. Return JSON response

### Adding New Screens

1. Create screen component in `src/screens/`
2. Add to navigator in `src/navigation/`
3. Update navigation flow

## 🚀 Deployment

### Mobile App
- Build with Expo: `expo build:android` or `expo build:ios`
- Submit to Google Play Store / Apple App Store

### Backend
- Deploy to production server (shared hosting, VPS, etc.)
- Update API URL in mobile app
- Secure with HTTPS

## 📞 Support

For questions or issues:
- Email: support@msuiit.edu.ph
- Department: Computer Science, MSU-Maguindanao

## 📄 License

© 2024 Mindanao State University - Maguindanao. All rights reserved.

---

**Built with ❤️ for MSU-Maguindanao**
