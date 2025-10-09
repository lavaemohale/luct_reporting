const express = require('express');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const dotenv = require('dotenv');
const XLSX = require('xlsx');

dotenv.config();

const app = express();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

app.use(cors());
app.use(express.json());

// Test connection on startup
pool.connect((err, client, release) => {
  if (err) {
    console.error('Error acquiring client', err.stack);
  } else {
    console.log('Connected to PostgreSQL');
    client.query('SELECT NOW()', (err, result) => {
      release();
      if (err) {
        console.error('Error executing query', err.stack);
      } else {
        console.log('Current time:', result.rows[0]);
      }
    });
  }
});

// Root endpoint for testing
app.get('/', (req, res) => {
  res.json({ 
    message: 'Server is running',
    endpoints: {
      login: 'POST /login',
      register: 'POST /register',
      refresh: 'POST /refresh'
    }
  });
});

// Middleware
const authenticate = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ message: 'No authentication token found' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'Malformed authorization header' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    console.error('Token verification failed:', err.message);
    res.status(403).json({ message: 'Invalid or expired token' });
  }
};

const authorize = (roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) return res.status(403).json({ message: 'Forbidden' });
  next();
};

// Auth Routes
app.post('/register', async (req, res) => {
  const { email, password, role, name, student_number } = req.body;
  if (role === 'student' && !student_number) return res.status(400).json({ message: 'Student number required' });
  const hashed = await bcrypt.hash(password, 10);
  try {
    const result = await pool.query(
      'INSERT INTO users (email, password, role, name, student_number) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [email, hashed, role, name, role === 'student' ? student_number : null]
    );
    res.status(201).json({ 
      success: true,
      id: result.rows[0].id,
      message: 'User registered successfully'
    });
  } catch (err) {
    res.status(400).json({ 
      success: false,
      message: err.message 
    });
  }
});

app.post('/login', async (req, res) => {
  const { student_number, email, password, role } = req.body;
  
  console.log('Login request received:', req.body);
  
  try {
    if (role === 'student') {
      // Student login - use student_number
      if (!student_number || !password) {
        return res.status(400).json({ message: 'Student number and password are required' });
      }
      
      const result = await pool.query(
        'SELECT * FROM users WHERE student_number = $1 AND role = $2',
        [student_number, 'student']
      );
      const user = result.rows[0];
      
      if (!user) {
        return res.status(401).json({ message: 'Invalid student number' });
      }
      
      // Verify password
      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ message: 'Invalid password' });
      }
      
      const token = jwt.sign({ 
        id: user.id, 
        student_number: user.student_number, 
        role: user.role, 
        name: user.name, 
        email: user.email 
      }, process.env.JWT_SECRET, { expiresIn: '24h' });
      
      res.json({ 
        success: true,
        token, 
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          student_number: user.student_number
        }
      });
      
    } else {
      // Lecturer, PL, PRL login - use email
      if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
      }
      
      const result = await pool.query(
        'SELECT * FROM users WHERE email = $1 AND role = $2',
        [email, role]
      );
      const user = result.rows[0];
      
      if (!user) {
        return res.status(401).json({ message: `Invalid email or no ${role} account found` });
      }
      
      // Verify password
      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ message: 'Invalid password' });
      }
      
      const token = jwt.sign({ 
        id: user.id, 
        role: user.role, 
        name: user.name, 
        email: user.email 
      }, process.env.JWT_SECRET, { expiresIn: '24h' });
      
      res.json({ 
        success: true,
        token, 
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      });
    }
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ 
      success: false,
      message: 'Server error during login' 
    });
  }
});

// Token refresh endpoint
app.post('/refresh', async (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ message: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'Malformed token' });
  }

  try {
    // Verify the current token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get fresh user data from database
    const result = await pool.query(
      'SELECT * FROM users WHERE id = $1',
      [decoded.id]
    );
    const user = result.rows[0];
    
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    // Generate new token
    const newToken = jwt.sign(
      { 
        id: user.id, 
        role: user.role, 
        name: user.name, 
        email: user.email,
        student_number: user.student_number 
      }, 
      process.env.JWT_SECRET, 
      { expiresIn: '24h' }
    );

    res.json({ 
      success: true,
      token: newToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        student_number: user.student_number
      }
    });
  } catch (err) {
    console.error('Token refresh error:', err);
    res.status(403).json({ 
      success: false,
      message: 'Invalid or expired token' 
    });
  }
});

// Temporary route for testing - REMOVE IN PRODUCTION
app.post('/test-create-user', async (req, res) => {
  const { email, password, role, name, student_number } = req.body;
  
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (email, password, role, name, student_number) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, role, name',
      [email, hashedPassword, role, name, role === 'student' ? student_number : null]
    );
    
    res.json({ 
      success: true,
      message: 'Test user created',
      user: result.rows[0]
    });
  } catch (err) {
    console.error('Test user creation error:', err);
    res.status(500).json({ 
      success: false,
      message: err.message 
    });
  }
});

// Faculties
app.get('/faculties', authenticate, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM faculties');
    res.json({
      success: true,
      faculties: result.rows
    });
  } catch (err) {
    console.error('Error fetching faculties:', err);
    res.status(500).json({ 
      success: false,
      message: 'Internal server error' 
    });
  }
});

// Courses - UPDATED with better response format
app.get('/courses', authenticate, async (req, res) => {
  try {
    let query = 'SELECT * FROM courses';
    let params = [];
    if (req.user.role === 'lecturer') {
      query += ' WHERE id IN (SELECT course_id FROM modules WHERE lecturer_id = $1)';
      params = [req.user.id];
    }
    const result = await pool.query(query, params);
    
    res.json({
      success: true,
      courses: result.rows
    });
  } catch (err) {
    console.error('Error fetching courses:', err);
    res.status(500).json({ 
      success: false,
      message: 'Internal server error' 
    });
  }
});

// Create Course - UPDATED with better response format
app.post('/courses', authenticate, authorize(['pl']), async (req, res) => {
  const { name, code, faculty_id } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO courses (name, code, faculty_id) VALUES ($1, $2, $3) RETURNING *',
      [name, code, faculty_id]
    );
    
    res.json({
      success: true,
      course: result.rows[0],
      message: 'Course created successfully'
    });
    
  } catch (err) {
    console.error('Error creating course:', err);
    
    // Handle duplicate course code
    if (err.code === '23505') {
      return res.status(409).json({ 
        success: false,
        message: 'Course with this code already exists' 
      });
    }
    
    res.status(500).json({ 
      success: false,
      message: 'Internal server error' 
    });
  }
});

// Modules - UPDATED with better response format
app.get('/modules', authenticate, async (req, res) => {
  try {
    let query = 'SELECT m.*, c.name as course_name FROM modules m JOIN courses c ON m.course_id = c.id';
    let params = [];
    if (req.user.role === 'lecturer') {
      query += ' WHERE m.lecturer_id = $1';
      params = [req.user.id];
    } else if (req.user.role === 'student') {
      query += ' WHERE m.id IN (SELECT module_id FROM student_modules WHERE student_id = $1)';
      params = [req.user.id];
    }
    const result = await pool.query(query, params);
    
    res.json({
      success: true,
      modules: result.rows
    });
  } catch (err) {
    console.error('Error fetching modules:', err);
    res.status(500).json({ 
      success: false,
      message: 'Internal server error' 
    });
  }
});

// Get modules assigned to current lecturer
app.get('/lecturer/modules', authenticate, authorize(['lecturer']), async (req, res) => {
  try {
    const lecturerId = req.user.id;
    const result = await pool.query(
      `SELECT m.*, c.name as course_name 
       FROM modules m 
       LEFT JOIN courses c ON m.course_id = c.id 
       WHERE m.lecturer_id = $1 
       ORDER BY m.name`,
      [lecturerId]
    );
    
    res.json({
      success: true,
      modules: result.rows
    });
  } catch (err) {
    console.error('Error fetching lecturer modules:', err);
    res.status(500).json({ 
      success: false,
      message: 'Internal server error' 
    });
  }
});

// Get modules for specific course
app.get('/courses/:courseId/modules', authenticate, async (req, res) => {
  const { courseId } = req.params;
  try {
    const result = await pool.query(
      'SELECT m.*, c.name as course_name FROM modules m JOIN courses c ON m.course_id = c.id WHERE m.course_id = $1',
      [courseId]
    );
    
    res.json({
      success: true,
      modules: result.rows
    });
  } catch (err) {
    console.error('Error fetching course modules:', err);
    res.status(500).json({ 
      success: false,
      message: 'Internal server error' 
    });
  }
});

// Create Module - UPDATED with better response format
app.post('/modules', authenticate, authorize(['pl']), async (req, res) => {
  const { name, code, description, course_id, lecturer_id } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO modules (name, code, description, course_id, lecturer_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [name, code, description, course_id, lecturer_id]
    );
    
    res.json({
      success: true,
      module: result.rows[0],
      message: 'Module created successfully'
    });
    
  } catch (err) {
    console.error('Error creating module:', err);
    
    // Handle duplicate module code
    if (err.code === '23505') {
      return res.status(409).json({ 
        success: false,
        message: 'Module with this code already exists' 
      });
    }
    
    res.status(500).json({ 
      success: false,
      message: 'Internal server error' 
    });
  }
});

// Assign lecturer to module
app.put('/modules/:id/assign', authenticate, authorize(['pl']), async (req, res) => {
  const { id } = req.params;
  const { lecturer_id } = req.body;
  try {
    const result = await pool.query(
      'UPDATE modules SET lecturer_id = $1 WHERE id = $2 RETURNING *',
      [lecturer_id, id]
    );
    
    res.json({
      success: true,
      module: result.rows[0],
      message: 'Lecturer assigned successfully'
    });
  } catch (err) {
    console.error('Error assigning lecturer:', err);
    res.status(500).json({ 
      success: false,
      message: 'Internal server error' 
    });
  }
});

// Get module student count
app.get('/modules/:id/total_students', authenticate, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT COUNT(*) FROM student_modules WHERE module_id = $1', [id]);
    res.json({ 
      success: true,
      total_students: parseInt(result.rows[0].count) 
    });
  } catch (err) {
    console.error('Error fetching module students:', err);
    res.status(500).json({ 
      success: false,
      message: 'Internal server error' 
    });
  }
});

// Lecturers for PL
app.get('/users/lecturers', authenticate, authorize(['pl']), async (req, res) => {
  try {
    const result = await pool.query("SELECT id, name, email FROM users WHERE role = 'lecturer'");
    res.json({
      success: true,
      lecturers: result.rows
    });
  } catch (err) {
    console.error('Error fetching lecturers:', err);
    res.status(500).json({ 
      success: false,
      message: 'Internal server error' 
    });
  }
});

// Enrollments
app.post('/enroll', authenticate, authorize(['student']), async (req, res) => {
  const { module_id } = req.body;
  try {
    await pool.query('INSERT INTO student_modules (student_id, module_id) VALUES ($1, $2)', [req.user.id, module_id]);
    res.json({ 
      success: true,
      message: 'Enrolled successfully' 
    });
  } catch (err) {
    console.error('Error enrolling student:', err);
    res.status(500).json({ 
      success: false,
      message: 'Internal server error' 
    });
  }
});

// Classes
app.get('/classes', authenticate, async (req, res) => {
  try {
    let query = 'SELECT * FROM classes';
    let params = [];
    if (req.user.role === 'lecturer') {
      query += ' WHERE module_id IN (SELECT id FROM modules WHERE lecturer_id = $1)';
      params = [req.user.id];
    }
    const result = await pool.query(query, params);
    
    res.json({
      success: true,
      classes: result.rows
    });
  } catch (err) {
    console.error('Error fetching classes:', err);
    res.status(500).json({ 
      success: false,
      message: 'Internal server error' 
    });
  }
});

app.post('/classes', authenticate, authorize(['lecturer', 'prl', 'pl']), async (req, res) => {
  const { name, module_id, course_id, venue, scheduled_time } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO classes (name, module_id, course_id, venue, scheduled_time) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [name, module_id, course_id, venue, scheduled_time]
    );
    
    res.json({
      success: true,
      class: result.rows[0],
      message: 'Class created successfully'
    });
  } catch (err) {
    console.error('Error creating class:', err);
    res.status(500).json({ 
      success: false,
      message: 'Internal server error' 
    });
  }
});

// Reports (Lecturer Reporting Form)
app.post('/reports', authenticate, authorize(['lecturer']), async (req, res) => {
  const { faculty_name, class_name, week, lecture_date, course_name, course_code, module_name, students_present, total_students, venue, scheduled_time, topic_taught, learning_outcomes, recommendations } = req.body;
  const lecturer_id = req.user.id;
  try {
    const lecturer = await pool.query('SELECT name FROM users WHERE id = $1', [lecturer_id]);
    const result = await pool.query(
      'INSERT INTO reports (faculty_name, class_name, week, lecture_date, course_name, course_code, module_name, lecturer_name, students_present, total_students, venue, scheduled_time, topic_taught, learning_outcomes, recommendations, lecturer_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) RETURNING *',
      [faculty_name, class_name, week, lecture_date, course_name, course_code, module_name, lecturer.rows[0].name, students_present, total_students, venue, scheduled_time, topic_taught, learning_outcomes, recommendations, lecturer_id]
    );
    
    res.json({
      success: true,
      report: result.rows[0],
      message: 'Report created successfully'
    });
  } catch (err) {
    console.error('Error creating report:', err);
    res.status(500).json({ 
      success: false,
      message: 'Internal server error' 
    });
  }
});

app.get('/reports', authenticate, async (req, res) => {
  try {
    let query = 'SELECT * FROM reports';
    let params = [];
    if (req.user.role === 'lecturer') {
      query += ' WHERE lecturer_id = $1';
      params = [req.user.id];
    } else if (req.user.role === 'student') {
      query += ' WHERE module_name IN (SELECT m.name FROM modules m JOIN student_modules sm ON m.id = sm.module_id WHERE sm.student_id = $1)';
      params = [req.user.id];
    }
    const result = await pool.query(query, params);
    
    res.json({
      success: true,
      reports: result.rows
    });
  } catch (err) {
    console.error('Error fetching reports:', err);
    res.status(500).json({ 
      success: false,
      message: 'Internal server error' 
    });
  }
});

app.put('/reports/:id/feedback', authenticate, authorize(['prl']), async (req, res) => {
  const { id } = req.params;
  const { prl_feedback } = req.body;
  try {
    await pool.query('UPDATE reports SET prl_feedback = $1 WHERE id = $2', [prl_feedback, id]);
    res.json({ 
      success: true,
      message: 'Feedback added successfully' 
    });
  } catch (err) {
    console.error('Error adding feedback:', err);
    res.status(500).json({ 
      success: false,
      message: 'Internal server error' 
    });
  }
});

// Ratings
app.post('/ratings', authenticate, async (req, res) => {
  const { report_id, rating, comments, type = 'general' } = req.body;
  const user_id = req.user.id;
  try {
    const result = await pool.query(
      'INSERT INTO ratings (report_id, user_id, rating, comments, type) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [report_id, user_id, rating, comments, type]
    );
    
    res.json({
      success: true,
      rating: result.rows[0],
      message: 'Rating submitted successfully'
    });
  } catch (err) {
    console.error('Error creating rating:', err);
    res.status(500).json({ 
      success: false,
      message: 'Internal server error' 
    });
  }
});

app.get('/ratings/:report_id', authenticate, async (req, res) => {
  const { report_id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM ratings WHERE report_id = $1', [report_id]);
    res.json({
      success: true,
      ratings: result.rows
    });
  } catch (err) {
    console.error('Error fetching ratings:', err);
    res.status(500).json({ 
      success: false,
      message: 'Internal server error' 
    });
  }
});

// Monitoring
app.get('/monitoring/attendance', authenticate, async (req, res) => {
  try {
    let query = 'SELECT AVG(students_present::float / total_students) as avg_attendance FROM reports';
    let params = [];
    if (req.user.role === 'lecturer') {
      query += ' WHERE lecturer_id = $1';
      params = [req.user.id];
    }
    const result = await pool.query(query, params);
    
    res.json({
      success: true,
      avg_attendance: parseFloat(result.rows[0]?.avg_attendance) || 0
    });
  } catch (err) {
    console.error('Error fetching attendance monitoring:', err);
    res.status(500).json({ 
      success: false,
      message: 'Internal server error' 
    });
  }
});

// Get lecturer monitoring data
app.get('/monitoring/lecturer', authenticate, authorize(['lecturer']), async (req, res) => {
  try {
    const lecturerId = req.user.id;
    
    // Get average attendance for lecturer's modules
    const attendanceResult = await pool.query(
      `SELECT AVG(students_present::float / NULLIF(total_students, 0)) as avg_attendance 
       FROM reports 
       WHERE lecturer_id = $1 AND total_students > 0`,
      [lecturerId]
    );
    
    // Get student engagement
    const engagementResult = await pool.query(
      `SELECT AVG(rating::float) as student_engagement 
       FROM ratings r 
       JOIN reports rep ON r.report_id = rep.id 
       WHERE rep.lecturer_id = $1 AND r.type = 'student_engagement'`,
      [lecturerId]
    );
    
    const monitoringData = {
      avg_attendance: parseFloat(attendanceResult.rows[0]?.avg_attendance) || 0,
      student_engagement: parseFloat(engagementResult.rows[0]?.student_engagement) / 5 || 0
    };
    
    res.json({
      success: true,
      ...monitoringData
    });
  } catch (err) {
    console.error('Error fetching lecturer monitoring:', err);
    res.status(500).json({ 
      success: false,
      message: 'Internal server error' 
    });
  }
});

// Program monitoring for PL
app.get('/monitoring/program', authenticate, authorize(['pl']), async (req, res) => {
  try {
    // Overall program performance (average of various metrics)
    const attendanceResult = await pool.query(
      'SELECT AVG(students_present::float / NULLIF(total_students, 0)) as avg_attendance FROM reports WHERE total_students > 0'
    );
    
    const curriculumResult = await pool.query(
      'SELECT COUNT(DISTINCT module_name)::float / NULLIF(COUNT(DISTINCT id), 0) as curriculum_coverage FROM modules'
    );
    
    const satisfactionResult = await pool.query(
      'SELECT AVG(rating::float / 5) as student_satisfaction FROM ratings WHERE type = $1',
      ['student_engagement']
    );
    
    const completionResult = await pool.query(
      'SELECT COUNT(*)::float / NULLIF((SELECT COUNT(*) FROM reports WHERE prl_feedback IS NOT NULL), 0) as report_completion_rate FROM reports WHERE prl_feedback IS NOT NULL'
    );
    
    // Lecturer performance
    const lecturerPerformanceResult = await pool.query(
      `SELECT u.id, u.name, 
              AVG(r.students_present::float / NULLIF(r.total_students, 0)) as performance
       FROM users u
       LEFT JOIN reports r ON u.id = r.lecturer_id
       WHERE u.role = 'lecturer' AND r.total_students > 0
       GROUP BY u.id, u.name`
    );
    
    const lecturerPerformance = {};
    lecturerPerformanceResult.rows.forEach(row => {
      lecturerPerformance[row.id] = parseFloat(row.performance) * 100 || 0;
    });
    
    const monitoringData = {
      overall_performance: 75, // Placeholder - calculate based on your metrics
      avg_attendance: parseFloat(attendanceResult.rows[0]?.avg_attendance) || 0,
      curriculum_coverage: parseFloat(curriculumResult.rows[0]?.curriculum_coverage) || 0,
      student_satisfaction: parseFloat(satisfactionResult.rows[0]?.student_satisfaction) || 0,
      report_completion_rate: parseFloat(completionResult.rows[0]?.report_completion_rate) || 0,
      lecturer_performance: lecturerPerformance
    };
    
    res.json({
      success: true,
      ...monitoringData
    });
  } catch (err) {
    console.error('Error fetching program monitoring:', err);
    res.status(500).json({ 
      success: false,
      message: 'Internal server error' 
    });
  }
});

// Search
app.get('/search/reports', authenticate, async (req, res) => {
  const { query } = req.query;
  try {
    const result = await pool.query(
      'SELECT * FROM reports WHERE course_name ILIKE $1 OR module_name ILIKE $1 OR topic_taught ILIKE $1',
      [`%${query}%`]
    );
    
    res.json({
      success: true,
      reports: result.rows
    });
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ 
      success: false,
      message: 'Internal server error' 
    });
  }
});

// Enhanced search endpoint for reports
app.get('/reports/search', authenticate, async (req, res) => {
  const { query } = req.query;
  try {
    let searchQuery = 'SELECT * FROM reports';
    let params = [];
    
    if (req.user.role === 'lecturer') {
      searchQuery += ' WHERE lecturer_id = $1 AND (course_name ILIKE $2 OR module_name ILIKE $2 OR topic_taught ILIKE $2 OR class_name ILIKE $2)';
      params = [req.user.id, `%${query}%`];
    } else {
      searchQuery += ' WHERE course_name ILIKE $1 OR module_name ILIKE $1 OR topic_taught ILIKE $1 OR class_name ILIKE $1';
      params = [`%${query}%`];
    }
    
    const result = await pool.query(searchQuery, params);
    
    res.json({
      success: true,
      reports: result.rows
    });
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ 
      success: false,
      message: 'Internal server error' 
    });
  }
});

// Excel Export
app.get('/reports/export', authenticate, authorize(['pl', 'prl']), async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM reports');
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(result.rows);
    XLSX.utils.book_append_sheet(wb, ws, 'Reports');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', 'attachment; filename=reports.xlsx');
    res.type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (err) {
    console.error('Export error:', err);
    res.status(500).json({ 
      success: false,
      message: 'Internal server error' 
    });
  }
});

app.listen(5000, () => console.log('Server running on port 5000'));