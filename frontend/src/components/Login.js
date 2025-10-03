import React, { useState } from 'react';
import { Form, Button, Alert, Card } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { login } from '../services/api';

const Login = ({ setRole }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await login({ email, password });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('role', res.data.role);
      setRole(res.data.role);
      navigate(`/${res.data.role.toLowerCase()}dashboard`);
    } catch (err) {
      setError('Invalid credentials');
    }
  };

  return (
    <div className="d-flex justify-content-center align-items-center min-vh-100">
      <Card className="tight-card centered-card">
        <Card.Body>
          <h2 className="mb-1">Login</h2>
          {error && <Alert variant="danger" className="mb-1">{error}</Alert>}
          <Form onSubmit={handleSubmit}>
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
            <Button type="submit" size="sm" className="mt-1">Login</Button>
            <p className="mt-1 mb-0">Don't have account? <a href="/register">Register</a></p>
          </Form>
        </Card.Body>
      </Card>
    </div>
  );
};

export default Login;