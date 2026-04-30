-- ============================================================
--  STI College Cubao — Faculty Paging System
--  Database Schema
-- ============================================================

CREATE DATABASE IF NOT EXISTS pagesys CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE pagesys;

-- ------------------------------------------------------------
--  Departments
-- ------------------------------------------------------------
CREATE TABLE departments (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(120) NOT NULL,
  active     TINYINT(1)   NOT NULL DEFAULT 1,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------
--  Faculty
-- ------------------------------------------------------------
CREATE TABLE faculty (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  department_id INT          NOT NULL,
  name          VARCHAR(150) NOT NULL,
  designation   VARCHAR(100) DEFAULT NULL,
  photo         VARCHAR(255) DEFAULT NULL,
  available     TINYINT(1)   NOT NULL DEFAULT 1,
  dnd           TINYINT(1)   NOT NULL DEFAULT 0,
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE
);

-- ------------------------------------------------------------
--  Page Queue
-- ------------------------------------------------------------
CREATE TABLE page_queue (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  faculty_id   INT          NOT NULL,
  student_name VARCHAR(150) NOT NULL,
  student_id   VARCHAR(60)  DEFAULT NULL,
  purpose      VARCHAR(100) NOT NULL DEFAULT 'Consultation',
  note         TEXT         DEFAULT NULL,
  status       ENUM('waiting','acknowledged','done','cancelled') NOT NULL DEFAULT 'waiting',
  queue_number INT          NOT NULL DEFAULT 1,
  created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (faculty_id) REFERENCES faculty(id) ON DELETE CASCADE
);

-- ------------------------------------------------------------
--  Page Logs (archive of completed / cancelled pages)
-- ------------------------------------------------------------
CREATE TABLE page_logs (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  faculty_id   INT          DEFAULT NULL,
  faculty_name VARCHAR(150) DEFAULT NULL,
  department   VARCHAR(120) DEFAULT NULL,
  student_name VARCHAR(150) DEFAULT NULL,
  student_id   VARCHAR(60)  DEFAULT NULL,
  purpose      VARCHAR(100) DEFAULT NULL,
  status       VARCHAR(20)  DEFAULT NULL,
  created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------
--  App Settings (single row)
-- ------------------------------------------------------------
CREATE TABLE settings (
  id                  INT  AUTO_INCREMENT PRIMARY KEY,
  sound_mode          ENUM('chime','tts','both') NOT NULL DEFAULT 'both',
  tts_rate            FLOAT  NOT NULL DEFAULT 0.9,
  auto_reset_seconds  INT    NOT NULL DEFAULT 30,
  updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------
--  Admin Users
-- ------------------------------------------------------------
CREATE TABLE admin_users (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  username   VARCHAR(80)  NOT NULL UNIQUE,
  password   VARCHAR(255) NOT NULL,
  full_name  VARCHAR(150) DEFAULT NULL,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
--  Seed Data
-- ============================================================

INSERT INTO departments (name) VALUES
  ('General Education'),
  ('Senior High School'),
  ('Information Technology'),
  ('Computer Engineering'),
  ('Business Administration');

INSERT INTO settings (sound_mode) VALUES ('both');

-- Default admin account: username=admin  password=Admin@1234
-- Change this immediately after first login.
INSERT INTO admin_users (username, password, full_name) VALUES
  ('admin', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'System Administrator');
