const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// DB Connection
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

// Test connection and create tables if missing
db.connect((err) => {
  if (err) {
    console.error('MySQL connection failed:', err);
    process.exit(1); // Exit gracefully instead of throwing
  }
  console.log('MySQL Connected');

  // Create ratings table if it doesn't exist
  db.query(`
    CREATE TABLE IF NOT EXISTS ratings (
      id INT AUTO_INCREMENT PRIMARY KEY,
      report_id INT,
      user_id INT,
      rating INT,
      comment TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `, (err) => {
    if (err) console.error('Error creating ratings table:', err);
    else console.log('Ratings table checked/created');
  });
});

// Middleware to verify JWT
const verifyToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) {
    console.log('No token provided in request');
    return res.status(401).json({ msg: 'No token' });
  }
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      console.log('Invalid token error:', err.message);
      return res.status(403).json({ msg: 'Invalid token' });
    }
    req.user = decoded;
    next();
  });
};

// Routes

// 1. Register (All roles)
app.post('/api/register', async (req, res) => {
  const { username, email, password, role } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  db.query('INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)', 
    [username, email, hashedPassword, role], 
    (err, result) => {
      if (err) return res.status(400).json({ msg: 'User exists' });
      res.json({ msg: 'Registered' });
    });
});

// 2. Login
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
    if (err || results.length === 0) return res.status(400).json({ msg: 'Invalid credentials' });
    const user = results[0];
    const validPass = await bcrypt.compare(password, user.password);
    if (!validPass) return res.status(400).json({ msg: 'Invalid credentials' });
    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token, role: user.role });
  });
});

// 3. Lecturer: Add Report (Data Entry Form)
app.post('/api/reports', verifyToken, (req, res) => {
  if (req.user.role !== 'Lecturer') return res.status(403).json({ msg: 'Access denied' });
  const { faculty_name, class_name, week_of_reporting, date_of_lecture, course_name, course_code, lecturer_name, actual_students_present, venue, scheduled_lecture_time, topic_taught, learning_outcomes, lecturer_recommendations, class_id } = req.body;
  
  db.query('SELECT total_registered_students FROM courses c JOIN classes cl ON c.id = cl.course_id WHERE cl.id = ?', [class_id], (err, results) => {
    if (err || results.length === 0) return res.status(400).json({ msg: 'Invalid class' });
    const total_registered_students = results[0].total_registered_students;
    
    db.query('INSERT INTO reports (faculty_name, class_name, week_of_reporting, date_of_lecture, course_name, course_code, lecturer_name, actual_students_present, total_registered_students, venue, scheduled_lecture_time, topic_taught, learning_outcomes, lecturer_recommendations, class_id, lecturer_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [faculty_name, class_name, week_of_reporting, date_of_lecture, course_name, course_code, lecturer_name, actual_students_present, total_registered_students, venue, scheduled_lecture_time, topic_taught, learning_outcomes, lecturer_recommendations, class_id, req.user.id],
      (err, result) => {
        if (err) return res.status(400).json({ msg: 'Error adding report' });
        res.json({ msg: 'Report added', id: result.insertId });
      });
  });
});

// 4. Get All Reports (For viewing by PRL/PL/Students)
app.get('/api/reports', verifyToken, (req, res) => {
  console.log('Fetching reports for user:', req.user.role);
  db.query('SELECT * FROM reports ORDER BY created_at DESC', (err, results) => {
    if (err) {
      console.error('Reports query error:', err);
      return res.status(500).json({ msg: 'Error fetching reports' });
    }
    res.json(results);
  });
});

// 5. PRL: Add Feedback to Report
app.put('/api/reports/:id/feedback', verifyToken, (req, res) => {
  if (req.user.role !== 'PRL') return res.status(403).json({ msg: 'Access denied' });
  const { prl_feedback } = req.body;
  const { id } = req.params;
  db.query('UPDATE reports SET prl_feedback = ? WHERE id = ?', [prl_feedback, id], (err, result) => {
    if (err || result.affectedRows === 0) return res.status(400).json({ msg: 'Error updating' });
    res.json({ msg: 'Feedback added' });
  });
});

// 6. PL: Add Course
app.post('/api/courses', verifyToken, (req, res) => {
  if (req.user.role !== 'PL') return res.status(403).json({ msg: 'Access denied' });
  const { course_name, course_code, faculty_name, total_registered_students } = req.body;
  db.query('INSERT INTO courses (course_name, course_code, faculty_name, total_registered_students, created_by_pl_id) VALUES (?, ?, ?, ?, ?)',
    [course_name, course_code, faculty_name, total_registered_students, req.user.id],
    (err, result) => {
      if (err) return res.status(400).json({ msg: 'Error adding course' });
      res.json({ msg: 'Course added', id: result.insertId });
    });
});

// 7. PL: Assign Class/Lecturer Module
app.post('/api/classes', verifyToken, (req, res) => {
  if (req.user.role !== 'PL') return res.status(403).json({ msg: 'Access denied' });
  const { class_name, course_id, venue, scheduled_time, lecturer_id } = req.body;
  db.query('INSERT INTO classes (class_name, course_id, venue, scheduled_time, lecturer_id) VALUES (?, ?, ?, ?, ?)',
    [class_name, course_id, venue, scheduled_time, lecturer_id],
    (err, result) => {
      if (err) return res.status(400).json({ msg: 'Error adding class' });
      res.json({ msg: 'Class assigned', id: result.insertId });
    });
});

// 8. Get Courses (For PRL/PL viewing)
app.get('/api/courses', verifyToken, (req, res) => {
  console.log('Fetching courses for user:', req.user.role);
  if (req.user.role !== 'PRL' && req.user.role !== 'PL') return res.status(403).json({ msg: 'Access denied' });
  db.query('SELECT * FROM courses', (err, results) => {
    if (err) {
      console.error('Courses query error:', err);
      return res.status(500).json({ msg: 'Error' });
    }
    res.json(results);
  });
});

// 9. Get Classes (For all roles)
app.get('/api/classes', verifyToken, (req, res) => {
  console.log('Fetching classes for user:', req.user.role);
  db.query('SELECT * FROM classes', (err, results) => {
    if (err) {
      console.error('Classes query error:', err);
      return res.status(500).json({ msg: 'Error' });
    }
    res.json(results);
  });
});

// 10. Rating (For Student/Lecturer/PRL/PL)
app.post('/api/ratings', verifyToken, (req, res) => {
  const { report_id, rating, comment } = req.body;
  db.query('INSERT INTO ratings (report_id, user_id, rating, comment) VALUES (?, ?, ?, ?)',
    [report_id, req.user.id, rating, comment],
    (err, result) => {
      if (err) return res.status(400).json({ msg: 'Error adding rating' });
      res.json({ msg: 'Rating added' });
    });
});

// 11. Get Ratings (For PLDashboard viewing)
app.get('/api/ratings', verifyToken, (req, res) => {
  console.log('Fetching ratings for user:', req.user.role);
  db.query('SELECT * FROM ratings ORDER BY timestamp DESC', (err, results) => {
    if (err) {
      console.error('Ratings query error:', err);
      return res.status(500).json({ msg: 'Error fetching ratings' });
    }
    res.json(results || []); // Return empty array if no data
  });
});

// 12. Monitoring (Log activity, e.g., view report)
app.post('/api/monitoring', verifyToken, (req, res) => {
  const { action } = req.body;  // e.g., {action: 'Viewed Report ID 1'}
  db.query('INSERT INTO monitoring_logs (user_id, action) VALUES (?, ?)', [req.user.id, action], (err) => {
    if (err) return res.status(500).json({ msg: 'Error logging' });
    res.json({ msg: 'Logged' });
  });
});

// 13. Search Functionality (Extra Credit) - Search reports/courses/classes by keyword
app.get('/api/search/:type/:query', verifyToken, (req, res) => {
  const { type, query } = req.params;  // type: 'reports', 'courses', 'classes'
  let sql = '';
  const searchParam = `%${query}%`;
  if (type === 'reports') sql = 'SELECT * FROM reports WHERE faculty_name LIKE ? OR course_name LIKE ? OR topic_taught LIKE ?';
  else if (type === 'courses') sql = 'SELECT * FROM courses WHERE course_name LIKE ? OR course_code LIKE ?';
  else if (type === 'classes') sql = 'SELECT * FROM classes WHERE class_name LIKE ?';
  else return res.status(400).json({ msg: 'Invalid type' });

  db.query(sql, [searchParam, searchParam, searchParam], (err, results) => {
    if (err) {
      console.error('Search query error:', err);
      return res.status(500).json({ msg: 'Search error' });
    }
    res.json(results);
  });
});

// 14. Generate Excel Report (Extra Credit) - Download reports as Excel
const XLSX = require('xlsx');  // npm install xlsx
app.get('/api/export-reports/excel', verifyToken, (req, res) => {
  console.log('Generating export for user:', req.user.role);
  db.query('SELECT * FROM reports', (err, results) => {
    if (err) {
      console.error('Export query error:', err);
      return res.status(500).json({ msg: 'Error' });
    }
    const ws = XLSX.utils.json_to_sheet(results);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Reports');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=reports.xlsx');
    XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' }, (err, buffer) => {
      if (err) {
        console.error('Excel generation error:', err);
        return res.status(500).json({ msg: 'Error generating Excel' });
      }
      res.send(buffer);
    });
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port 5000`));