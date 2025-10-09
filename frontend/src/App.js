import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/NavBar';
import Login from './pages/Login';
import Register from './pages/Register';
import StudentDashboard from './pages/StudentDashboard';
import LecturerDashboard from './pages/LecturerDashboard';
import PRLDashboard from './pages/PRLDashboard';
import PLDashboard from './pages/PLDashboard';

const App = () => {
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/studentdashboard" element={<StudentDashboard />} />
        <Route path="/lecturerdashboard" element={<LecturerDashboard />} />
        <Route path="/prldashboard" element={<PRLDashboard />} />
        <Route path="/pldashboard" element={<PLDashboard />} />
      </Routes>
    </Router>
  );
};

export default App;
