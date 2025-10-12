const path = require('path');
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

// ===================== Database Connection Check =====================
pool.connect((err, client, release) => {
  if (err) {
    console.error('Error acquiring client', err.stack);
  } else {
    console.log('✅ Connected to PostgreSQL');
    client.query('SELECT NOW()', (err, result) => {
      release();
      if (err) console.error('Error executing query', err.stack);
      else console.log('Current time:', result.rows[0]);
    });
  }
});

// ===================== Root Route =====================
app.get('/', (req, res) => {
  res.json({
    message: 'Server is running',
    endpoints: {
      login: 'POST /login',
      register: 'POST /register',
      refresh: 'POST /refresh',
    },
  });
});

// ===================== Middleware =====================
const authenticate = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader)
    return res.status(401).json({ message: 'No authentication token found' });

  const token = authHeader.split(' ')[1];
  if (!token)
    return res.status(401).json({ message: 'Malformed authorization header' });

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
  if (!roles.includes(req.user.role))
    return res.status(403).json({ message: 'Forbidden' });
  next();
};

// ===================== AUTH ROUTES =====================
app.post('/register', async (req, res) => {
  const { email, password, role, name, student_number } = req.body;
  if (role === 'student' && !student_number)
    return res.status(400).json({ message: 'Student number required' });

  const hashed = await bcrypt.hash(password, 10);
  try {
    const result = await pool.query(
      'INSERT INTO users (email, password, role, name, student_number) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [email, hashed, role, name, role === 'student' ? student_number : null]
    );
    res.status(201).json({
      success: true,
      id: result.rows[0].id,
      message: 'User registered successfully',
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message,
    });
  }
});

app.post('/login', async (req, res) => {
  const { student_number, email, password, role } = req.body;
  console.log('Login request received:', req.body);

  try {
    let user;
    if (role === 'student') {
      if (!student_number || !password)
        return res
          .status(400)
          .json({ message: 'Student number and password are required' });

      const result = await pool.query(
        'SELECT * FROM users WHERE student_number = $1 AND role = $2',
        [student_number, 'student']
      );
      user = result.rows[0];
      if (!user) return res.status(401).json({ message: 'Invalid student number' });
    } else {
      if (!email || !password)
        return res
          .status(400)
          .json({ message: 'Email and password are required' });

      const result = await pool.query(
        'SELECT * FROM users WHERE email = $1 AND role = $2',
        [email, role]
      );
      user = result.rows[0];
      if (!user)
        return res
          .status(401)
          .json({ message: `Invalid email or no ${role} account found` });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword)
      return res.status(401).json({ message: 'Invalid password' });

    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
        name: user.name,
        email: user.email,
        student_number: user.student_number,
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        student_number: user.student_number,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({
      success: false,
      message: 'Server error during login',
    });
  }
});

// ===================== TOKEN REFRESH =====================
app.post('/refresh', async (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ message: 'No token provided' });
  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Malformed token' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [decoded.id]);
    const user = result.rows[0];
    if (!user) return res.status(401).json({ message: 'User not found' });

    const newToken = jwt.sign(
      {
        id: user.id,
        role: user.role,
        name: user.name,
        email: user.email,
        student_number: user.student_number,
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      token: newToken,
      user,
    });
  } catch (err) {
    console.error('Token refresh error:', err);
    res.status(403).json({
      success: false,
      message: 'Invalid or expired token',
    });
  }
});

// ===================== ADD YOUR OTHER API ROUTES HERE =====================
// Example routes - add all your actual routes here

// Courses routes
app.get('/courses', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM courses');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/courses', async (req, res) => {
  const { name, code, faculty_id } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO courses (name, code, faculty_id) VALUES ($1, $2, $3) RETURNING *',
      [name, code, faculty_id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Modules routes
app.get('/modules', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM modules');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/modules', async (req, res) => {
  const { name, code, description, course_id, lecturer_id } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO modules (name, code, description, course_id, lecturer_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [name, code, description, course_id, lecturer_id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reports routes
app.get('/reports', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM reports');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/reports', async (req, res) => {
  const {
    faculty_name, class_name, week, lecture_date, course_name, course_code,
    lecturer_name, students_present, total_students, venue, scheduled_time,
    topic_taught, learning_outcomes, recommendations
  } = req.body;
  
  try {
    const result = await pool.query(
      `INSERT INTO reports (
        faculty_name, class_name, week, lecture_date, course_name, course_code,
        lecturer_name, students_present, total_students, venue, scheduled_time,
        topic_taught, learning_outcomes, recommendations
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *`,
      [
        faculty_name, class_name, week, lecture_date, course_name, course_code,
        lecturer_name, students_present, total_students, venue, scheduled_time,
        topic_taught, learning_outcomes, recommendations
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Users routes
app.get('/users/lecturers', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users WHERE role = $1', ['lecturer']);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add all your other routes here...

// ===================== Production Serve Frontend =====================
// THIS MUST BE ABSOLUTELY LAST - after ALL API routes
if (process.env.NODE_ENV === 'production') {
  // Serve static files from the React app
  app.use(express.static(path.join(__dirname, '../frontend/build')));

  // Catch-all route for SPA (React Router) - MUST BE LAST ROUTE
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/build', 'index.html'));
  });
}

// ===================== START SERVER =====================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port 5000`));