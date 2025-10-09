import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import { Button, Form, Alert } from 'react-bootstrap';

const StudentDashboard = () => {
  const { user, setUser } = useContext(AuthContext); // Added setUser for logout on 401
  const [attendance, setAttendance] = useState([]);
  const [progress, setProgress] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [error, setError] = useState('');
  const [reportForm, setReportForm] = useState({ module_name: '', lecture_date: '', comments: '' });
  const [ratingForm, setRatingForm] = useState({ report_id: '', rating: '', comments: '' });
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setError('Please log in to access the dashboard.');
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        if (!token) throw new Error('No token found');

        const [att, prog, fb, rpts] = await Promise.all([
          api.get('/students/me/attendance'),
          api.get('/students/me/progress'),
          api.get('/students/me/feedback'),
          api.get('/reports'),
        ]);
        setAttendance(att.data);
        setProgress(prog.data);
        setFeedback(fb.data);
        setReports(rpts.data.filter(r => r.student_id === user.id || r.lecturer_id === user.id));
      } catch (err) {
        console.error('Dashboard fetch error:', err);
        const errorMessage = err.response ? `API Error: ${err.response.status} - ${err.response.data.message}` : `Network Error: ${err.message}`;
        if (err.response && err.response.status === 401) {
          setError('Session expired. Please log in again.');
          localStorage.removeItem('token'); // Clear invalid token
          setUser(null); // Log out user
        } else {
          setError(`Failed to load data. Check backend or network. Details: ${errorMessage}`);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user, setUser]);

  const handleDownloadFeedback = () => {
    if (!user) {
      setError('Please log in to download feedback.');
      return;
    }
    api.get('/students/me/feedback/export', { responseType: 'blob' })
      .then((response) => {
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'student_feedback.xlsx');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      })
      .catch((err) => {
        console.error('Download error:', err);
        setError('Failed to download feedback');
      });
  };

  const handleSubmitReport = async (e) => {
    e.preventDefault();
    if (!user) {
      setError('Please log in to submit a report.');
      return;
    }
    try {
      const response = await api.post('/students/me/reports', {
        module_name: reportForm.module_name,
        lecture_date: reportForm.lecture_date,
        comments: reportForm.comments,
      });
      setReports([...reports, response.data]);
      setReportForm({ module_name: '', lecture_date: '', comments: '' });
      setError('Report submitted successfully!');
      setTimeout(() => setError(''), 3000);
    } catch (err) {
      console.error('Report submission error:', err);
      if (err.response && err.response.status === 401) {
        setError('Session expired. Please log in again.');
        localStorage.removeItem('token');
        setUser(null);
      } else {
        setError('Failed to submit report');
      }
    }
  };

  const handleSubmitRating = async (e) => {
    e.preventDefault();
    if (!user) {
      setError('Please log in to submit a rating.');
      return;
    }
    try {
      await api.post('/ratings', {
        report_id: ratingForm.report_id,
        rating: parseInt(ratingForm.rating),
        comments: ratingForm.comments,
      });
      setRatingForm({ report_id: '', rating: '', comments: '' });
      setError('Rating submitted successfully!');
      setTimeout(() => setError(''), 3000);
    } catch (err) {
      console.error('Rating submission error:', err);
      if (err.response && err.response.status === 401) {
        setError('Session expired. Please log in again.');
        localStorage.removeItem('token');
        setUser(null);
      } else {
        setError('Failed to submit rating');
      }
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!user) return <div>Please log in to view the dashboard.</div>;

  return (
    <div className="container mt-5">
      <h2>Welcome, {user.name}</h2>

      {error && <Alert variant={error.includes('successfully') ? 'success' : 'danger'}>{error}</Alert>}

      <h3>Attendance</h3>
      {attendance.length > 0 ? (
        <ul>
          {attendance.map((a, i) => (
            <li key={i}>{a.module_name} - {a.lecture_date} - {a.present}</li>
          ))}
        </ul>
      ) : <p>No attendance data</p>}

      <h3>Progress</h3>
      {progress.length > 0 ? (
        <ul>
          {progress.map((p, i) => (
            <li key={i}>{p.module_name} - {p.progress * 100}%</li>
          ))}
        </ul>
      ) : <p>No progress data</p>}

      <h3>Feedback</h3>
      {feedback.length > 0 ? (
        <div>
          <ul>
            {feedback.map((f, i) => (
              <li key={i}>{f.module_name} - {f.lecture_date} - {f.feedback}</li>
            ))}
          </ul>
          <Button onClick={handleDownloadFeedback}>Download Feedback</Button>
        </div>
      ) : <p>No feedback data</p>}

      <h3>Submit Report</h3>
      <Form onSubmit={handleSubmitReport}>
        <Form.Group className="mb-3">
          <Form.Label>Module Name</Form.Label>
          <Form.Control
            type="text"
            value={reportForm.module_name}
            onChange={(e) => setReportForm({ ...reportForm, module_name: e.target.value })}
            required
          />
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>Lecture Date</Form.Label>
          <Form.Control
            type="date"
            value={reportForm.lecture_date}
            onChange={(e) => setReportForm({ ...reportForm, lecture_date: e.target.value })}
            required
          />
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>Comments</Form.Label>
          <Form.Control
            as="textarea"
            value={reportForm.comments}
            onChange={(e) => setReportForm({ ...reportForm, comments: e.target.value })}
          />
        </Form.Group>
        <Button variant="primary" type="submit">Submit Report</Button>
      </Form>

      <h3>Rate a Report</h3>
      <Form onSubmit={handleSubmitRating}>
        <Form.Group className="mb-3">
          <Form.Label>Report ID</Form.Label>
          <Form.Control
            type="text"
            value={ratingForm.report_id}
            onChange={(e) => setRatingForm({ ...ratingForm, report_id: e.target.value })}
            required
          />
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>Rating (1-5)</Form.Label>
          <Form.Control
            type="number"
            min="1"
            max="5"
            value={ratingForm.rating}
            onChange={(e) => setRatingForm({ ...ratingForm, rating: e.target.value })}
            required
          />
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>Comments</Form.Label>
          <Form.Control
            as="textarea"
            value={ratingForm.comments}
            onChange={(e) => setRatingForm({ ...ratingForm, comments: e.target.value })}
          />
        </Form.Group>
        <Button variant="primary" type="submit">Submit Rating</Button>
      </Form>
    </div>
  );
};

export default StudentDashboard;