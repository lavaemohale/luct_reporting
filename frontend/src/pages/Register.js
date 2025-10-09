import React, { useContext, useState } from 'react';
import { Form, Button, Alert, Card } from 'react-bootstrap';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const Register = () => {
  const { register: authRegister } = useContext(AuthContext);
  const { register, handleSubmit, formState: { errors }, reset, watch } = useForm();
  const navigate = useNavigate();
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const selectedRole = watch('role');

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      if (data.role === 'student' && !data.student_number) {
        throw new Error('Student number is required for student role');
      }

      await authRegister(
        data.email,
        data.password,
        data.role,
        data.name,
        data.role === 'student' ? data.student_number : null
      );

      reset();
      setErrorMessage('');
      alert('Registration successful! Please log in.');
      navigate('/login');
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      if (msg?.includes('duplicate key')) {
        setErrorMessage('This email is already registered. Please log in instead.');
      } else {
        setErrorMessage(msg || 'An error occurred during registration.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="d-flex justify-content-center align-items-center vh-100">
      <Card style={{ width: '400px' }} className="p-4 shadow-sm">
        <Card.Body>
          <h3 className="mb-4 text-center">Register</h3>

          {errorMessage && <Alert variant="danger">{errorMessage}</Alert>}

          <Form onSubmit={handleSubmit(onSubmit)}>
            <Form.Group className="mb-3">
              <Form.Label>Email</Form.Label>
              <Form.Control
                type="email"
                {...register('email', { 
                  required: 'Email is required',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Invalid email address'
                  }
                })}
                isInvalid={!!errors.email}
              />
              <Form.Control.Feedback type="invalid">{errors.email?.message}</Form.Control.Feedback>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Password</Form.Label>
              <Form.Control
                type="password"
                {...register('password', { 
                  required: 'Password is required',
                  minLength: { value: 6, message: 'Password must be at least 6 characters' }
                })}
                isInvalid={!!errors.password}
              />
              <Form.Control.Feedback type="invalid">{errors.password?.message}</Form.Control.Feedback>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Role</Form.Label>
              <Form.Select
                {...register('role', { required: 'Role is required' })}
                isInvalid={!!errors.role}
              >
                <option value="">Select Role</option>
                <option value="student">Student</option>
                <option value="lecturer">Lecturer</option>
                <option value="pl">Program Leader</option>
                <option value="prl">Principal Lecturer</option>
              </Form.Select>
              <Form.Control.Feedback type="invalid">{errors.role?.message}</Form.Control.Feedback>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Name</Form.Label>
              <Form.Control
                type="text"
                {...register('name', { required: 'Name is required' })}
                isInvalid={!!errors.name}
              />
              <Form.Control.Feedback type="invalid">{errors.name?.message}</Form.Control.Feedback>
            </Form.Group>

            {selectedRole === 'student' && (
              <Form.Group className="mb-3">
                <Form.Label>Student Number</Form.Label>
                <Form.Control
                  type="text"
                  {...register('student_number', { required: 'Student number is required for students' })}
                  isInvalid={!!errors.student_number}
                />
                <Form.Control.Feedback type="invalid">{errors.student_number?.message}</Form.Control.Feedback>
              </Form.Group>
            )}

            <Button variant="primary" type="submit" disabled={loading} className="w-100">
              {loading ? 'Registering...' : 'Register'}
            </Button>
          </Form>
        </Card.Body>
      </Card>
    </div>
  );
};

export default Register;
