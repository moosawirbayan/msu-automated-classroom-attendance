-- Migration: Add parent contact fields and class notification toggle
-- Run this in HeidiSQL or phpMyAdmin

ALTER TABLE students
ADD COLUMN parent_email VARCHAR(100) NULL AFTER email,
ADD COLUMN parent_name VARCHAR(100) NULL AFTER parent_email;

ALTER TABLE classes
ADD COLUMN notify_parents TINYINT(1) NOT NULL DEFAULT 1 AFTER is_active;

-- Verify changes
-- SELECT COLUMN_NAME, DATA_TYPE FROM information_schema.COLUMNS
-- WHERE TABLE_SCHEMA = 'msu_attendance_db' AND TABLE_NAME IN ('students', 'classes');
