import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/NavBar';
import HomePage from './pages/HomePage'; // Add this import
import Login from './pages/Login';
import Register from './pages/Register';
import StudentDashboard from './pages/StudentDashboard';
import LecturerDashboard from './pages/LecturerDashboard';
import PRLDashboard from './pages/PRLDashboard';
import PLDashboard from './pages/PLDashboard';
import './App.css';

const App = () => {
  return (
    <Router>
      <Navbar />
      <Routes>
        {/* Change the root path to HomePage */}
        <Route path="/" element={<HomePage />} />
        {/* Keep all your existing routes */}
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