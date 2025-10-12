const path = require('path');
const express = require('express');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const dotenv = require('dotenv');
const XLSX = require('xlsx');

dotenv.config();

const path = require("path");
app.use(express.static(path.join(__dirname, "../frontend/build")));
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/build", "index.html"));
});

const app = express();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

app.use(cors());
app.use(express.json());

// ===================== Production Serve Frontend =====================
if (process.env.NODE_ENV === 'production') {
  // Serve frontend (React build)
app.use(express.static(path.join(__dirname, "../frontend/build")));

// Catch-all route for SPA (React Router)
app.get("/*", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/build", "index.html"));
});

}

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

// ===================== REST OF YOUR ENDPOINTS =====================
// (all your faculties, courses, modules, reports, monitoring, etc. go here unchanged)

// ... [KEEP all your existing routes exactly as in your current file] ...

// ===================== START SERVER =====================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
