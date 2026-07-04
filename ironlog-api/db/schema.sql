-- ============================================
-- IRONLOG — Gym Membership Management System
-- MySQL schema
-- ============================================

CREATE DATABASE IF NOT EXISTS ironlog CHARACTER SET utf8mb4;
USE ironlog;

-- ---------- Branches ----------
CREATE TABLE branches (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(120) NOT NULL,
  address       VARCHAR(255),
  capacity      INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ---------- Users (Admin / Trainer / Member share one table) ----------
CREATE TABLE users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(120) NOT NULL,
  email         VARCHAR(160) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role          ENUM('admin','trainer','member') NOT NULL DEFAULT 'member',
  phone         VARCHAR(20),
  branch_id     INT,
  status        ENUM('active','inactive') NOT NULL DEFAULT 'active',
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL
);

-- ---------- Membership Plans ----------
CREATE TABLE membership_plans (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(80) NOT NULL,
  description   TEXT,
  duration_days INT NOT NULL,
  price         DECIMAL(10,2) NOT NULL,
  is_active     BOOLEAN DEFAULT TRUE
);

-- ---------- Memberships (a member's subscription instance) ----------
CREATE TABLE memberships (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  member_id     INT NOT NULL,
  plan_id       INT NOT NULL,
  start_date    DATE NOT NULL,
  end_date      DATE NOT NULL,
  status        ENUM('active','expired','cancelled') NOT NULL DEFAULT 'active',
  auto_renew    BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (member_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (plan_id) REFERENCES membership_plans(id)
);

-- ---------- Trainer <-> Member assignment ----------
CREATE TABLE trainer_assignments (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  trainer_id    INT NOT NULL,
  member_id     INT NOT NULL,
  assigned_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (trainer_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (member_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uniq_assignment (trainer_id, member_id)
);

-- ---------- Classes ----------
CREATE TABLE classes (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  branch_id     INT NOT NULL,
  trainer_id    INT NOT NULL,
  name          VARCHAR(120) NOT NULL,
  description   TEXT,
  start_time    DATETIME NOT NULL,
  end_time      DATETIME NOT NULL,
  capacity      INT NOT NULL DEFAULT 20,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
  FOREIGN KEY (trainer_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ---------- Class Bookings ----------
CREATE TABLE bookings (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  class_id      INT NOT NULL,
  member_id     INT NOT NULL,
  status        ENUM('confirmed','waitlisted','cancelled') NOT NULL DEFAULT 'confirmed',
  booked_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  FOREIGN KEY (member_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uniq_booking (class_id, member_id)
);

-- ---------- Attendance (QR check-in) ----------
CREATE TABLE attendance (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  member_id     INT NOT NULL,
  branch_id     INT NOT NULL,
  check_in      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  check_out     TIMESTAMP NULL,
  FOREIGN KEY (member_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE
);

-- ---------- Payments ----------
CREATE TABLE payments (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  member_id       INT NOT NULL,
  membership_id   INT,
  amount          DECIMAL(10,2) NOT NULL,
  currency        VARCHAR(8) DEFAULT 'INR',
  status          ENUM('pending','paid','failed','refunded') NOT NULL DEFAULT 'pending',
  gateway         VARCHAR(40),
  gateway_ref     VARCHAR(120),
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (member_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (membership_id) REFERENCES memberships(id) ON DELETE SET NULL
);

-- ---------- Lockers ----------
CREATE TABLE lockers (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  branch_id     INT NOT NULL,
  locker_number VARCHAR(20) NOT NULL,
  status        ENUM('available','occupied','maintenance') NOT NULL DEFAULT 'available',
  member_id     INT NULL,
  assigned_at   TIMESTAMP NULL,
  FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
  FOREIGN KEY (member_id) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE KEY uniq_locker (branch_id, locker_number)
);

-- ---------- Workout Plans ----------
CREATE TABLE workout_plans (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  trainer_id    INT NOT NULL,
  member_id     INT NOT NULL,
  title         VARCHAR(160) NOT NULL,
  details       JSON,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (trainer_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (member_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ---------- Nutrition Plans ----------
CREATE TABLE nutrition_plans (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  trainer_id    INT NOT NULL,
  member_id     INT NOT NULL,
  title         VARCHAR(160) NOT NULL,
  details       JSON,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (trainer_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (member_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ---------- Fitness Progress Logs ----------
CREATE TABLE progress_logs (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  member_id     INT NOT NULL,
  weight_kg     DECIMAL(5,2),
  body_fat_pct  DECIMAL(5,2),
  bmi           DECIMAL(5,2),
  notes         TEXT,
  logged_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (member_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ---------- Notifications ----------
CREATE TABLE notifications (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  user_id       INT NOT NULL,
  title         VARCHAR(160) NOT NULL,
  message       TEXT NOT NULL,
  type          ENUM('renewal','booking','class_update','general') DEFAULT 'general',
  is_read       BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ---------- Indexes for common queries ----------
CREATE INDEX idx_memberships_member ON memberships(member_id);
CREATE INDEX idx_memberships_status ON memberships(status);
CREATE INDEX idx_classes_branch_time ON classes(branch_id, start_time);
CREATE INDEX idx_bookings_member ON bookings(member_id);
CREATE INDEX idx_attendance_member ON attendance(member_id);
CREATE INDEX idx_payments_member ON payments(member_id);

-- ---------- Seed: a starter branch + plans ----------
INSERT INTO branches (name, address, capacity) VALUES
  ('T. Nagar — Main', 'Usman Road, Chennai', 500),
  ('OMR — Annex', 'OMR, Chennai', 300),
  ('Velachery', 'Velachery Main Road, Chennai', 200);

INSERT INTO membership_plans (name, description, duration_days, price) VALUES
  ('Basic Monthly', 'Gym floor access only', 30, 1500.00),
  ('Standard Monthly', 'Gym floor + group classes', 30, 2500.00),
  ('Elite Annual', 'Full access + PT sessions + nutrition plan', 365, 24000.00);
