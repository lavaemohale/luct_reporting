import React, { useState } from 'react';
import { Form, Button, Alert, Card } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { register } from '../services/api';

const Register = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Student');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await register({ username, email, password, role });
      alert('Registered successfully. Please login.');
      navigate('/');
    } catch (err) {
      setError('Error registering. User may already exist.');
    }
  };

  return (
    <div className="d-flex justify-content-center align-items-center min-vh-100">
      <Card className="tight-card centered-card">
        <Card.Body>
          <h2 className="mb-1">Register</h2>
          {error && <Alert variant="danger" className="mb-1">{error}</Alert>}
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-1">
              <Form.Label>Username</Form.Label>
              <Form.Control
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </Form.Group>
            <Form.Group className="mb-1">
              <Form.Label>Email</Form.Label>
              <Form.Control
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </Form.Group>
            <Form.Group className="mb-1">
              <Form.Label>Password</Form.Label>
              <Form.Control
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </Form.Group>
            <Form.Group className="mb-1">
              <Form.Label>Role</Form.Label>
              <Form.Select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                required
              >
                <option value="Student">Student</option>
                <option value="Lecturer">Lecturer</option>
                <option value="PRL">Principal Lecturer (PRL)</option>
                <option value="PL">Program Leader (PL)</option>
              </Form.Select>
            </Form.Group>
            <Button type="submit" size="sm" className="mt-1">Register</Button>
            <p className="mt-1 mb-0">Already have an account? <a href="/">Login</a></p>
          </Form>
        </Card.Body>
      </Card>
    </div>
  );
};

export default Register;