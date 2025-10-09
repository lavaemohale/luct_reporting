const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('./db'); // your database connection
const router = express.Router();

router.post('/register', async (req, res) => {
  const { email, password, role, name, student_number } = req.body;

  if (!email || !password || !role || !name) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  if (role === 'student' && !student_number) {
    return res.status(400).json({ message: 'Student number is required for students' });
  }

  try {
    // Check if email already exists
    const existingUser = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user
    await db.query(
      'INSERT INTO users (email, password, role, name, student_number) VALUES ($1, $2, $3, $4, $5)',
      [email, hashedPassword, role, name, student_number || null]
    );

    res.status(201).json({ message: 'Registration successful' });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

module.exports = router;
