# Database Verification & Setup

## ✅ Your Database is Already Ready!

The `students` and `enrollments` tables already exist in your schema.sql. No changes needed!

## Quick Verification Steps

### Step 1: Open HeidiSQL
1. Launch Laragon
2. Click **Database** button
3. Connect to `msu_attendance_db`

### Step 2: Verify Tables Exist
Run this query to check if tables are set up correctly:

```sql
-- Check if students table exists
DESCRIBE students;

-- Check if enrollments table exists
DESCRIBE enrollments;
```

**Expected Results:**

**students** table should have:
- `id` - INT (Primary Key)
- `student_id` - VARCHAR(50) UNIQUE
- `first_name` - VARCHAR(50)
- `last_name` - VARCHAR(50)
- `email` - VARCHAR(100)
- `phone` - VARCHAR(20)
- `program` - VARCHAR(100)
- `year_level` - INT
- `created_at` - TIMESTAMP
- `updated_at` - TIMESTAMP

**enrollments** table should have:
- `id` - INT (Primary Key)
- `student_id` - INT (Foreign Key → students.id)
- `class_id` - INT (Foreign Key → classes.id)
- `enrolled_date` - TIMESTAMP
- `status` - ENUM('active', 'dropped', 'completed')

---

## If Tables Don't Exist (Unlikely)

If for some reason the tables are missing, run this:

```sql
-- Create students table
CREATE TABLE IF NOT EXISTS students (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id VARCHAR(50) NOT NULL UNIQUE,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE,
    phone VARCHAR(20),
    program VARCHAR(100),
    year_level INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_student_id (student_id),
    INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create enrollments table
CREATE TABLE IF NOT EXISTS enrollments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    class_id INT NOT NULL,
    enrolled_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('active', 'dropped', 'completed') DEFAULT 'active',
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
    UNIQUE KEY unique_enrollment (student_id, class_id),
    INDEX idx_student (student_id),
    INDEX idx_class (class_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## Test Enrollment Flow

### 1. Check if sample data exists:
```sql
SELECT * FROM students;
SELECT * FROM enrollments;
```

### 2. If empty, that's perfect! 
The app will create students when you enroll them.

### 3. Test query to see enrolled students:
```sql
-- Get students enrolled in class ID 1
SELECT 
    s.*,
    e.enrolled_date,
    e.status
FROM students s
INNER JOIN enrollments e ON s.id = e.student_id
WHERE e.class_id = 1 AND e.status = 'active';
```

---

## How the App Uses These Tables

### When You Enroll a Student:

**Step 1:** App checks if `student_id` (e.g., "2025-001") exists in `students` table
- **If YES:** Use existing student record
- **If NO:** Create new student record

**Step 2:** App checks if enrollment already exists
- **If YES:** Show error "Student already enrolled"
- **If NO:** Create enrollment record

**Step 3:** Insert into `enrollments` table:
```sql
INSERT INTO enrollments (student_id, class_id, enrolled_date, status) 
VALUES (1, 5, NOW(), 'active');
```

### When You View Class Details:

App fetches enrolled students:
```sql
SELECT s.*, e.enrolled_date
FROM students s
INNER JOIN enrollments e ON s.id = e.student_id
WHERE e.class_id = ? AND e.status = 'active'
ORDER BY s.last_name, s.first_name;
```

---

## Common Issues & Solutions

### Issue: "Unknown column 'phone' in 'field list'"
**Solution:** Run this to add missing column:
```sql
ALTER TABLE students ADD COLUMN phone VARCHAR(20) AFTER email;
```

### Issue: "Duplicate entry for key 'unique_enrollment'"
**Cause:** Trying to enroll same student twice in same class
**Solution:** This is correct behavior! System preventing duplicates.

### Issue: Foreign key constraint fails
**Cause:** Trying to enroll in a class that doesn't exist
**Solution:** Create the class first in "My Classes" screen

---

## Verify Backend Files Copied

Make sure these files exist in Laragon:

```
C:\laragon\www\
├── enrollments\
│   ├── get_students.php  ← NEW FILE
│   └── enroll.php        ← NEW FILE
├── classes\
│   ├── index.php
│   └── get_all.php
└── auth\
    ├── login.php
    └── register.php
```

### Quick Copy Command (PowerShell):
```powershell
# From your project directory
Copy-Item -Path "backend\enrollments\*" -Destination "C:\laragon\www\enrollments\" -Recurse -Force
```

---

## ✅ Checklist

Before testing the enrollment feature:

- [ ] Laragon is running (Apache + MySQL green)
- [ ] Database `msu_attendance_db` exists
- [ ] Tables `students` and `enrollments` exist
- [ ] Backend files copied to `C:\laragon\www\enrollments\`
- [ ] Expo app restarted with `npx expo start --clear`
- [ ] At least one class created in the app

**If all checked, you're ready to enroll students!** 🎉

---

## Test Data (Optional)

Want to test with existing students? Run this:

```sql
-- Insert sample students
INSERT INTO students (student_id, first_name, last_name, phone, program, year_level) VALUES
('2025-001', 'Juan', 'Dela Cruz', '+63 912 111 1111', 'BS Computer Science', 3),
('2025-002', 'Maria', 'Santos', '+63 912 222 2222', 'BS Computer Science', 3),
('2025-003', 'Pedro', 'Reyes', '+63 912 333 3333', 'BS Information Technology', 2);

-- Check if inserted
SELECT * FROM students;
```

Now when you enroll student "2025-001", the app will:
- Find existing record
- Just create the enrollment (won't duplicate student)
- Show in enrolled list

---

## Need Help?

**Database Not Working?**
1. Check Laragon MySQL is running (should be green)
2. Verify database name: `msu_attendance_db`
3. Re-run schema.sql if needed

**Backend Errors?**
1. Check PHP error log in Laragon
2. Verify file paths are correct
3. Make sure CORS headers are present

**App Errors?**
1. Check Expo console for errors
2. Verify API_BASE_URL in `src/config/api.js`
3. Clear cache: `npx expo start --clear`
