-- ==========================================================
-- 1. Drop existing types & tables (for safety)
-- ==========================================================
DROP TYPE IF EXISTS user_role CASCADE;

DROP TABLE IF EXISTS ratings CASCADE;
DROP TABLE IF EXISTS reports CASCADE;
DROP TABLE IF EXISTS classes CASCADE;
DROP TABLE IF EXISTS student_modules CASCADE;
DROP TABLE IF EXISTS modules CASCADE;
DROP TABLE IF EXISTS courses CASCADE;
DROP TABLE IF EXISTS faculties CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ==========================================================
-- 2. Create ENUM for user roles
-- ==========================================================
CREATE TYPE user_role AS ENUM ('student', 'lecturer', 'prl', 'pl');

-- ==========================================================
-- 3. Users table
-- ==========================================================
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role user_role NOT NULL,
  name VARCHAR(255),
  student_number VARCHAR(50),
  CONSTRAINT chk_student_number
    CHECK (
      (role = 'student' AND student_number IS NOT NULL)
      OR (role <> 'student' AND student_number IS NULL)
    )
);

-- ==========================================================
-- 4. Faculties
-- ==========================================================
CREATE TABLE faculties (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL
);

-- ==========================================================
-- 5. Courses
-- ==========================================================
CREATE TABLE courses (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) UNIQUE NOT NULL,
  faculty_id INTEGER REFERENCES faculties(id) ON DELETE CASCADE,
  lecturer_id INTEGER REFERENCES users(id),
  total_students INTEGER DEFAULT 0
);

-- ==========================================================
-- 6. Modules (each course can have many modules)
-- ==========================================================
CREATE TABLE modules (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
  lecturer_id INTEGER REFERENCES users(id),
  total_students INTEGER DEFAULT 0
);

-- ==========================================================
-- 7. Student enrolments
-- ==========================================================
CREATE TABLE student_modules (
  id SERIAL PRIMARY KEY,
  student_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  module_id INTEGER REFERENCES modules(id) ON DELETE CASCADE,
  enrollment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (student_id, module_id)
);

-- ==========================================================
-- 8. Classes
-- ==========================================================
CREATE TABLE classes (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  module_id INTEGER REFERENCES modules(id) ON DELETE CASCADE,
  course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
  venue VARCHAR(255),
  scheduled_time TIMESTAMP
);

-- ==========================================================
-- 9. Reports
-- ==========================================================
CREATE TABLE reports (
  id SERIAL PRIMARY KEY,
  faculty_name VARCHAR(255),
  class_name VARCHAR(255),
  week INTEGER,
  lecture_date DATE,
  course_name VARCHAR(255),
  course_code VARCHAR(50),
  module_name VARCHAR(255),
  lecturer_name VARCHAR(255),
  students_present INTEGER,
  total_students INTEGER,
  venue VARCHAR(255),
  scheduled_time TIMESTAMP,
  topic_taught TEXT,
  learning_outcomes TEXT,
  recommendations TEXT,
  lecturer_id INTEGER REFERENCES users(id),
  prl_feedback TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================================
-- 10. Ratings
-- ==========================================================
CREATE TABLE ratings (
  id SERIAL PRIMARY KEY,
  report_id INTEGER REFERENCES reports(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  comments TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================================
-- 11. Sample Data
-- ==========================================================
INSERT INTO faculties (name)
VALUES ('Faculty of Information Communication Technology');

INSERT INTO users (email, password, role, name)
VALUES ('admin@pl.com', '$2b$10$examplehashedpassword', 'pl', 'Program Leader');

INSERT INTO users (email, password, role, name)
VALUES ('prl@luct.com', '$2b$10$examplehashedpassword', 'prl', 'Principal Lecturer');

INSERT INTO users (email, password, role, name)
VALUES ('lecturer@luct.com', '$2b$10$examplehashedpassword', 'lecturer', 'Lecturer A');

INSERT INTO users (email, password, role, name, student_number)
VALUES ('student@luct.com', '$2b$10$examplehashedpassword', 'student', 'John Doe', '202501234');

INSERT INTO courses (name, code, faculty_id, lecturer_id)
VALUES ('BSc Information Technology', 'BIT101', 1, 3);

INSERT INTO modules (name, code, description, course_id, lecturer_id)
VALUES 
('Web Development', 'WD101', 'Frontend & Backend basics', 1, 3),
('Data Communication&Networking', 'DB102', 'Building networks', 1, 3),
('AI Fundamentals', 'AI103', 'Intro to AI', 1, 3);

INSERT INTO student_modules (student_id, module_id)
VALUES (4, 1), (4, 2), (4, 3);

DROP TABLE IF EXISTS attendance CASCADE;

CREATE TABLE attendance (
  id SERIAL PRIMARY KEY,
  student_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  class_id INTEGER REFERENCES classes(id) ON DELETE CASCADE,
  present BOOLEAN DEFAULT FALSE
);


CREATE TABLE reports (
   id SERIAL PRIMARY KEY,
   faculty_name VARCHAR(255),
   class_name VARCHAR(255),
   week INTEGER,
   lecture_date DATE,
   course_name VARCHAR(255),
   course_code VARCHAR(50),
   module_name VARCHAR(255),
   lecturer_name VARCHAR(255),
   students_present INTEGER,
   total_students INTEGER,
   venue VARCHAR(255),
   scheduled_time TIMESTAMP,
   topic_taught TEXT,
   learning_outcomes TEXT,
   recommendations TEXT,
   prl_feedback TEXT,
   lecturer_id INTEGER REFERENCES users(id) ON DELETE CASCADE
