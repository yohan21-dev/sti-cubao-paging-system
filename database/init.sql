-- ============================================================
-- STI Cubao Faculty Paging System — Database Initialisation
-- ============================================================

CREATE DATABASE IF NOT EXISTS paging_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE paging_db;

-- -------------------------------------------------------
-- users  (admins / staff who manage the system)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id            INT          UNSIGNED NOT NULL AUTO_INCREMENT,
  username      VARCHAR(50)  NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          ENUM('admin','staff') NOT NULL DEFAULT 'staff',
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------
-- departments
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS departments (
  id          INT          UNSIGNED NOT NULL AUTO_INCREMENT,
  name        VARCHAR(100) NOT NULL,
  description TEXT,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_dept_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------
-- teachers
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS teachers (
  id            INT          UNSIGNED NOT NULL AUTO_INCREMENT,
  first_name    VARCHAR(100) NOT NULL,
  last_name     VARCHAR(100) NOT NULL,
  department_id INT          UNSIGNED,
  email         VARCHAR(150),
  status        ENUM('available','unavailable','on_break') NOT NULL DEFAULT 'available',
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_dept (department_id),
  CONSTRAINT fk_teacher_dept FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------
-- pages  (paging requests sent by students)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS pages (
  id           INT          UNSIGNED NOT NULL AUTO_INCREMENT,
  teacher_id   INT          UNSIGNED NOT NULL,
  student_name VARCHAR(150),
  message      TEXT,
  status       ENUM('pending','resolved') NOT NULL DEFAULT 'pending',
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at  DATETIME,
  PRIMARY KEY (id),
  KEY idx_teacher  (teacher_id),
  KEY idx_status   (status),
  KEY idx_created  (created_at),
  CONSTRAINT fk_page_teacher FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Seed data
-- ============================================================

-- Default admin user  (password: admin123)
-- bcrypt hash generated with 10 rounds
INSERT IGNORE INTO users (username, password_hash, role) VALUES
  ('admin', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'admin');

-- Departments
INSERT IGNORE INTO departments (name, description) VALUES
  ('BSIT',  'Bachelor of Science in Information Technology'),
  ('BSCS',  'Bachelor of Science in Computer Science'),
  ('BSIS',  'Bachelor of Science in Information Systems'),
  ('BSBA',  'Bachelor of Science in Business Administration'),
  ('BSHM',  'Bachelor of Science in Hospitality Management'),
  ('GAS',   'General Academic Strand');

-- Sample teachers (BSIT = 1, BSCS = 2, BSIS = 3, BSBA = 4, BSHM = 5, GAS = 6)
INSERT IGNORE INTO teachers (first_name, last_name, department_id, email, status) VALUES
  ('Maria',   'Santos',    1, 'msantos@sti.edu.ph',    'available'),
  ('Jose',    'Reyes',     1, 'jreyes@sti.edu.ph',     'available'),
  ('Ana',     'Cruz',      2, 'acruz@sti.edu.ph',      'available'),
  ('Carlos',  'Garcia',    2, 'cgarcia@sti.edu.ph',    'unavailable'),
  ('Elena',   'Mendoza',   3, 'emendoza@sti.edu.ph',   'available'),
  ('Roberto', 'Lim',       3, 'rlim@sti.edu.ph',       'on_break'),
  ('Patricia','Aquino',    4, 'paquino@sti.edu.ph',    'available'),
  ('Miguel',  'Torres',    4, 'mtorres@sti.edu.ph',    'available'),
  ('Carmen',  'Villanueva',5, 'cvillanueva@sti.edu.ph','available'),
  ('Ricardo', 'Ramos',     6, 'rramos@sti.edu.ph',     'available');
