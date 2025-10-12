import React, { useState, useContext } from 'react';
import { Container, Row, Col, Card, Tabs, Tab, Alert } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { jwtDecode } from 'jwt-decode';
import { AuthContext } from '../context/AuthContext';
import Footer from '../components/Footer';

const HomePage = () => {
  const { login, register: authRegister, loading } = useContext(AuthContext);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('login');
  const [loginError, setLoginError] = useState('');
  const [registerError, setRegisterError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  // Login form
  const {
    register: loginRegister,
    handleSubmit: handleLoginSubmit,
    watch: watchLogin,
    formState: { errors: loginErrors }
  } = useForm();

  // Register form
  const {
    register: registerRegister,
    handleSubmit: handleRegisterSubmit,
    watch: watchRegister,
    formState: { errors: registerErrors },
    reset: resetRegister
  } = useForm();

  const loginRole = watchLogin('role');
  const registerRole = watchRegister('role');

  // Handle login
  const onLoginSubmit = async (data) => {
    try {
      setIsLoggingIn(true);
      setLoginError('');
      
      console.log("Login form data:", data);
      
      await login(data.identifier, data.password, data.role);
      
      const token = localStorage.getItem("token");
      console.log("Token stored in localStorage:", token ? "Yes" : "No");
      
      if (token) {
        const decoded = jwtDecode(token);
        console.log("Decoded Token:", decoded);
        navigate("/dashboard");
      } else {
        throw new Error("No token received after login");
      }
    } catch (err) {
      console.error("Login error:", err);
      setLoginError(err.message || "Login failed. Please try again.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Handle register
  const onRegisterSubmit = async (data) => {
    setIsRegistering(true);
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

      resetRegister();
      setRegisterError('');
      alert('Registration successful! Please log in.');
      setActiveTab('login');
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      if (msg?.includes('duplicate key')) {
        setRegisterError('This email is already registered. Please log in instead.');
      } else {
        setRegisterError(msg || 'An error occurred during registration.');
      }
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <div className="min-vh-100 bg-light d-flex flex-column">
      {/* Hero Section */}
      <div className="bg-primary text-white py-5">
        <Container>
          <Row className="text-center">
            <Col>
              <h1 className="display-4 fw-bold">LUCT Reporting System</h1>
              <p className="lead">Streamlined academic reporting and monitoring system</p>
            </Col>
          </Row>
        </Container>
      </div>

      {/* Auth Section */}
      <Container className="py-5 flex-grow-1">
        <Row className="justify-content-center">
          <Col md={8} lg={6}>
            <Card className="shadow-lg border-0">
              <Card.Body className="p-4">
                <Tabs
                  activeKey={activeTab}
                  onSelect={(tab) => setActiveTab(tab)}
                  className="mb-4"
                  justify
                >
                  {/* Login Tab */}
                  <Tab eventKey="login" title="Login">
                    <h3 className="text-center mb-4">Welcome Back</h3>
                    
                    {loginError && (
                      <Alert variant="danger" className="text-center">
                        {loginError}
                      </Alert>
                    )}

                    <form onSubmit={handleLoginSubmit(onLoginSubmit)}>
                      <div className="mb-3">
                        <label className="form-label">Role</label>
                        <select
                          className={`form-select ${loginErrors.role ? 'is-invalid' : ''}`}
                          {...loginRegister("role", { required: "Role is required" })}
                        >
                          <option value="">Select Role</option>
                          <option value="student">Student</option>
                          <option value="lecturer">Lecturer</option>
                          <option value="pl">Program Leader</option>
                          <option value="prl">Principal Lecturer</option>
                        </select>
                        {loginErrors.role && (
                          <div className="invalid-feedback">{loginErrors.role.message}</div>
                        )}
                      </div>

                      <div className="mb-3">
                        <label className="form-label">
                          {loginRole === "student" ? "Student Number" : "Email"}
                        </label>
                        <input
                          type="text"
                          className={`form-control ${loginErrors.identifier ? 'is-invalid' : ''}`}
                          {...loginRegister("identifier", { 
                            required: "This field is required",
                            pattern: loginRole === "student" ? undefined : {
                              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                              message: "Invalid email address"
                            }
                          })}
                          placeholder={loginRole === "student" ? "Enter student number" : "Enter email"}
                        />
                        {loginErrors.identifier && (
                          <div className="invalid-feedback">{loginErrors.identifier.message}</div>
                        )}
                      </div>

                      <div className="mb-3">
                        <label className="form-label">Password</label>
                        <input
                          type="password"
                          className={`form-control ${loginErrors.password ? 'is-invalid' : ''}`}
                          {...loginRegister("password", { 
                            required: "Password is required",
                            minLength: {
                              value: 6,
                              message: "Password must be at least 6 characters"
                            }
                          })}
                          placeholder="Enter password"
                        />
                        {loginErrors.password && (
                          <div className="invalid-feedback">{loginErrors.password.message}</div>
                        )}
                      </div>

                      <button 
                        type="submit" 
                        className="btn btn-primary w-100 py-2"
                        disabled={isLoggingIn || loading}
                      >
                        {isLoggingIn || loading ? "Logging in..." : "Login"}
                      </button>
                    </form>
                  </Tab>

                  {/* Register Tab */}
                  <Tab eventKey="register" title="Register">
                    <h3 className="text-center mb-4">Create Account</h3>
                    
                    {registerError && (
                      <Alert variant="danger" className="text-center">
                        {registerError}
                      </Alert>
                    )}

                    <form onSubmit={handleRegisterSubmit(onRegisterSubmit)}>
                      <div className="mb-3">
                        <label className="form-label">Email</label>
                        <input
                          type="email"
                          className={`form-control ${registerErrors.email ? 'is-invalid' : ''}`}
                          {...registerRegister('email', { 
                            required: 'Email is required',
                            pattern: {
                              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                              message: 'Invalid email address'
                            }
                          })}
                        />
                        {registerErrors.email && (
                          <div className="invalid-feedback">{registerErrors.email.message}</div>
                        )}
                      </div>

                      <div className="mb-3">
                        <label className="form-label">Password</label>
                        <input
                          type="password"
                          className={`form-control ${registerErrors.password ? 'is-invalid' : ''}`}
                          {...registerRegister('password', { 
                            required: 'Password is required',
                            minLength: { 
                              value: 6, 
                              message: 'Password must be at least 6 characters' 
                            }
                          })}
                        />
                        {registerErrors.password && (
                          <div className="invalid-feedback">{registerErrors.password.message}</div>
                        )}
                      </div>

                      <div className="mb-3">
                        <label className="form-label">Role</label>
                        <select
                          className={`form-select ${registerErrors.role ? 'is-invalid' : ''}`}
                          {...registerRegister('role', { required: 'Role is required' })}
                        >
                          <option value="">Select Role</option>
                          <option value="student">Student</option>
                          <option value="lecturer">Lecturer</option>
                          <option value="pl">Program Leader</option>
                          <option value="prl">Principal Lecturer</option>
                        </select>
                        {registerErrors.role && (
                          <div className="invalid-feedback">{registerErrors.role.message}</div>
                        )}
                      </div>

                      <div className="mb-3">
                        <label className="form-label">Full Name</label>
                        <input
                          type="text"
                          className={`form-control ${registerErrors.name ? 'is-invalid' : ''}`}
                          {...registerRegister('name', { required: 'Name is required' })}
                        />
                        {registerErrors.name && (
                          <div className="invalid-feedback">{registerErrors.name.message}</div>
                        )}
                      </div>

                      {registerRole === 'student' && (
                        <div className="mb-3">
                          <label className="form-label">Student Number</label>
                          <input
                            type="text"
                            className={`form-control ${registerErrors.student_number ? 'is-invalid' : ''}`}
                            {...registerRegister('student_number', { 
                              required: 'Student number is required for students' 
                            })}
                          />
                          {registerErrors.student_number && (
                            <div className="invalid-feedback">{registerErrors.student_number.message}</div>
                          )}
                        </div>
                      )}

                      <button 
                        type="submit" 
                        className="btn btn-success w-100 py-2"
                        disabled={isRegistering}
                      >
                        {isRegistering ? 'Registering...' : 'Register'}
                      </button>
                    </form>
                  </Tab>
                </Tabs>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>

      {/* Features Section */}
      <Container className="py-5">
        <Row className="text-center">
          <Col md={4} className="mb-4">
            <Card className="h-100 shadow-sm border-0">
              <Card.Body className="p-4">
                <div className="text-primary mb-3">
                  <i className="fas fa-chart-line fa-3x"></i>
                </div>
                <Card.Title className="h5">Academic Monitoring</Card.Title>
                <Card.Text className="text-muted">
                  Track student progress and academic performance in real-time with comprehensive analytics and reporting tools.
                </Card.Text>
              </Card.Body>
            </Card>
          </Col>
          
          <Col md={4} className="mb-4">
            <Card className="h-100 shadow-sm border-0">
              <Card.Body className="p-4">
                <div className="text-primary mb-3">
                  <i className="fas fa-file-alt fa-3x"></i>
                </div>
                <Card.Title className="h5">Report Generation</Card.Title>
                <Card.Text className="text-muted">
                  Generate comprehensive reports for students and faculty with automated data collection and professional formatting.
                </Card.Text>
              </Card.Body>
            </Card>
          </Col>
          
          <Col md={4} className="mb-4">
            <Card className="h-100 shadow-sm border-0">
              <Card.Body className="p-4">
                <div className="text-primary mb-3">
                  <i className="fas fa-users fa-3x"></i>
                </div>
                <Card.Title className="h5">Role-based Access</Card.Title>
                <Card.Text className="text-muted">
                  Secure access for students, lecturers, and administrators with customized dashboards and permission levels.
                </Card.Text>
              </Card.Body>
            </Card>
          </Col>
        </Row>
        
        {/* Additional Features Row */}
        <Row className="text-center mt-4">
          <Col md={4} className="mb-4">
            <Card className="h-100 shadow-sm border-0">
              <Card.Body className="p-4">
                <div className="text-primary mb-3">
                  <i className="fas fa-graduation-cap fa-3x"></i>
                </div>
                <Card.Title className="h5">Student Progress</Card.Title>
                <Card.Text className="text-muted">
                  Monitor individual student performance, attendance, and engagement throughout their academic journey.
                </Card.Text>
              </Card.Body>
            </Card>
          </Col>
          
          <Col md={4} className="mb-4">
            <Card className="h-100 shadow-sm border-0">
              <Card.Body className="p-4">
                <div className="text-primary mb-3">
                  <i className="fas fa-chalkboard-teacher fa-3x"></i>
                </div>
                <Card.Title className="h5">Lecturer Tools</Card.Title>
                <Card.Text className="text-muted">
                  Powerful tools for lecturers to manage classes, submit reports, and track student progress efficiently.
                </Card.Text>
              </Card.Body>
            </Card>
          </Col>
          
          <Col md={4} className="mb-4">
            <Card className="h-100 shadow-sm border-0">
              <Card.Body className="p-4">
                <div className="text-primary mb-3">
                  <i className="fas fa-tachometer-alt fa-3x"></i>
                </div>
                <Card.Title className="h5">Program Analytics</Card.Title>
                <Card.Text className="text-muted">
                  Comprehensive program-level analytics and insights for program leaders and administrators.
                </Card.Text>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default HomePage;