-- Mess In/Out Management System
-- PostgreSQL schema and imaginary seed data

DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS bills CASCADE;
DROP TABLE IF EXISTS feedback CASCADE;
DROP TABLE IF EXISTS attendance CASCADE;
DROP TABLE IF EXISTS meals CASCADE;
DROP TABLE IF EXISTS workers CASCADE;
DROP TABLE IF EXISTS students CASCADE;
DROP TABLE IF EXISTS users CASCADE;

CREATE TABLE users (
    user_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('student', 'admin', 'worker')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE students (
    student_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
    roll_no VARCHAR(30) NOT NULL UNIQUE,
    department VARCHAR(80) NOT NULL,
    room_no VARCHAR(20) NOT NULL,
    phone VARCHAR(25),
    joined_on DATE NOT NULL DEFAULT CURRENT_DATE
);

CREATE TABLE workers (
    worker_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
    job_title VARCHAR(80) NOT NULL,
    shift VARCHAR(30) NOT NULL CHECK (shift IN ('morning', 'evening', 'night', 'full_day')),
    phone VARCHAR(25),
    salary NUMERIC(10, 2) NOT NULL DEFAULT 0
);

CREATE TABLE meals (
    meal_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    meal_date DATE NOT NULL,
    meal_type VARCHAR(20) NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner')),
    planned_count INTEGER NOT NULL DEFAULT 0,
    cost_per_student NUMERIC(10, 2) NOT NULL DEFAULT 0,
    UNIQUE (meal_date, meal_type)
);

CREATE TABLE attendance (
    attendance_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
    meal_id INTEGER NOT NULL REFERENCES meals(meal_id) ON DELETE CASCADE,
    status VARCHAR(10) NOT NULL CHECK (status IN ('IN', 'OUT')),
    marked_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    remarks VARCHAR(255),
    UNIQUE (student_id, meal_id)
);

CREATE TABLE feedback (
    feedback_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewed', 'resolved')),
    submitted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE bills (
    bill_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
    bill_month INTEGER NOT NULL CHECK (bill_month BETWEEN 1 AND 12),
    bill_year INTEGER NOT NULL CHECK (bill_year >= 2020),
    meal_count INTEGER NOT NULL DEFAULT 0,
    total_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'partial', 'paid')),
    generated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (student_id, bill_month, bill_year)
);

CREATE TABLE payments (
    payment_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    bill_id INTEGER NOT NULL REFERENCES bills(bill_id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
    method VARCHAR(30) NOT NULL CHECK (method IN ('cash', 'card', 'bank_transfer', 'easypaisa', 'jazzcash')),
    paid_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reference_no VARCHAR(80)
);

CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_meals_date_type ON meals(meal_date, meal_type);
CREATE INDEX idx_attendance_status ON attendance(status);
CREATE INDEX idx_feedback_status ON feedback(status);
CREATE INDEX idx_bills_status ON bills(status);

-- Demo passwords are plain text for classroom setup convenience.
-- Replace these with bcrypt hashes before production use.
INSERT INTO users (name, email, password_hash, role) VALUES
('Ayesha Malik', 'admin@mess.edu', 'admin123', 'admin'),
('Bilal Cook', 'bilal.worker@mess.edu', 'worker123', 'worker'),
('Maryam Supervisor', 'maryam.worker@mess.edu', 'worker123', 'worker'),
('Ali Khan', 'ali.khan@student.edu', 'student123', 'student'),
('Sara Ahmed', 'sara.ahmed@student.edu', 'student123', 'student'),
('Hassan Raza', 'hassan.raza@student.edu', 'student123', 'student'),
('Fatima Noor', 'fatima.noor@student.edu', 'student123', 'student'),
('Usman Tariq', 'usman.tariq@student.edu', 'student123', 'student');

INSERT INTO workers (user_id, job_title, shift, phone, salary) VALUES
(2, 'Head Cook', 'morning', '0301-1111111', 52000),
(3, 'Mess Supervisor', 'full_day', '0302-2222222', 60000);

INSERT INTO students (user_id, roll_no, department, room_no, phone, joined_on) VALUES
(4, 'CS-2026-001', 'Computer Science', 'A-101', '0311-0000001', '2026-02-01'),
(5, 'SE-2026-014', 'Software Engineering', 'A-102', '0311-0000002', '2026-02-03'),
(6, 'IT-2026-020', 'Information Technology', 'B-201', '0311-0000003', '2026-02-05'),
(7, 'DS-2026-008', 'Data Science', 'B-202', '0311-0000004', '2026-02-07'),
(8, 'AI-2026-011', 'Artificial Intelligence', 'C-301', '0311-0000005', '2026-02-10');

INSERT INTO meals (meal_date, meal_type, planned_count, cost_per_student) VALUES
('2026-04-30', 'breakfast', 90, 120),
('2026-04-30', 'lunch', 110, 180),
('2026-04-30', 'dinner', 105, 200),
('2026-05-01', 'breakfast', 95, 120),
('2026-05-01', 'lunch', 115, 180),
('2026-05-01', 'dinner', 108, 200);

INSERT INTO attendance (student_id, meal_id, status, remarks) VALUES
(1, 1, 'IN', 'Will attend breakfast'),
(1, 2, 'IN', 'Regular lunch'),
(1, 3, 'OUT', 'Going home'),
(2, 1, 'OUT', 'Early class outside campus'),
(2, 2, 'IN', 'Will attend'),
(2, 3, 'IN', 'Will attend'),
(3, 1, 'IN', 'Will attend'),
(3, 2, 'OUT', 'Department event'),
(3, 3, 'IN', 'Will attend'),
(4, 1, 'IN', 'Will attend'),
(4, 2, 'IN', 'Will attend'),
(4, 3, 'IN', 'Will attend'),
(5, 1, 'OUT', 'Medical appointment'),
(5, 2, 'OUT', 'Medical appointment'),
(5, 3, 'IN', 'Back by dinner');

INSERT INTO feedback (student_id, message, rating, status) VALUES
(1, 'Lunch quality was good but serving started late.', 4, 'open'),
(2, 'Please add more vegetarian options in dinner.', 5, 'reviewed'),
(4, 'Breakfast tea was cold today.', 3, 'resolved');

INSERT INTO bills (student_id, bill_month, bill_year, meal_count, total_amount, status) VALUES
(1, 4, 2026, 58, 9400, 'partial'),
(2, 4, 2026, 62, 10120, 'unpaid'),
(3, 4, 2026, 60, 9800, 'paid'),
(4, 4, 2026, 65, 10600, 'paid'),
(5, 4, 2026, 49, 8020, 'unpaid');

INSERT INTO payments (bill_id, amount, method, reference_no) VALUES
(1, 5000, 'easypaisa', 'EP-APR-0001'),
(3, 9800, 'cash', 'CASH-APR-0003'),
(4, 10600, 'bank_transfer', 'BT-APR-0004');
