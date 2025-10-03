import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { Container, Navbar, Nav, Button } from 'react-bootstrap';
import Login from './components/Login';
import Register from './components/Register';
import StudentDashboard from './components/StudentDashboard';
import LecturerDashboard from './components/LecturerDashboard';
import PRLDashboard from './components/PRLDashboard';
import PLDashboard from './components/PLDashboard';
import LecturerForm from './components/LecturerForm';
import './App.css';
function App() {
  const [role, setRole] = useState(localStorage.getItem('role'));

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) setRole(localStorage.getItem('role'));
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    setRole(null);
  };

  return (
    <Router>
      <div>
        <Navbar bg="light" expand="lg">
          <Container>
            <Navbar.Brand href="/">LUCT Reporting System</Navbar.Brand>
            <Navbar.Toggle aria-controls="basic-navbar-nav" />
            <Navbar.Collapse id="basic-navbar-nav">
              <Nav className="me-auto">
                {!role && (
                  <>
                    <Nav.Link as={Link} to="/">Login</Nav.Link>
                    <Nav.Link as={Link} to="/register">Register</Nav.Link>
                  </>
                )}
                {role && (
                  <>
                    {role === 'Student' && <Nav.Link as={Link} to="/studentdashboard">Student Dashboard</Nav.Link>}
                    {role === 'Lecturer' && <Nav.Link as={Link} to="/lecturerdashboard">Lecturer Dashboard</Nav.Link>}
                    {role === 'PRL' && <Nav.Link as={Link} to="/prldashboard">PRL Dashboard</Nav.Link>}
                    {role === 'PL' && <Nav.Link as={Link} to="/pldashboard">PL Dashboard</Nav.Link>}
                    {role === 'Lecturer' && <Nav.Link as={Link} to="/lecturerform">Add Report</Nav.Link>}
                  </>
                )}
              </Nav>
              {role && <Button onClick={handleLogout} variant="outline-danger">Logout</Button>}
            </Navbar.Collapse>
          </Container>
        </Navbar>

        <Container className="mt-4">
          <Routes>
            <Route path="/" element={!role ? <Login setRole={setRole} /> : <Navigate to={`/${role.toLowerCase()}dashboard`} />} />
            <Route path="/register" element={<Register />} />
            <Route path="/studentdashboard" element={role === 'Student' ? <StudentDashboard /> : <Navigate to="/" />} />
            <Route path="/lecturerdashboard" element={role === 'Lecturer' ? <LecturerDashboard /> : <Navigate to="/" />} />
            <Route path="/prldashboard" element={role === 'PRL' ? <PRLDashboard /> : <Navigate to="/" />} />
            <Route path="/pldashboard" element={role === 'PL' ? <PLDashboard /> : <Navigate to="/" />} />
            <Route path="/lecturerform" element={role === 'Lecturer' ? <LecturerForm /> : <Navigate to="/" />} />
          </Routes>
        </Container>
      </div>
    </Router>
  );
}

export default App;