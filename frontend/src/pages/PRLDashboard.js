// src/pages/PrlDashboard.js
import React, { useState, useEffect } from 'react';
import { Table, Form, Button, Card, Row, Col, Alert } from 'react-bootstrap';
import api from '../services/api';

const PrlDashboard = () => {
  const [courses, setCourses] = useState([]);
  const [modules, setModules] = useState([]); // Derived from courses
  const [classes, setClasses] = useState([]);
  const [reports, setReports] = useState([]);
  const [ratings, setRatings] = useState({}); // report_id -> ratings
  const [monitoring, setMonitoring] = useState({ avg_attendance: 0 });
  const [search, setSearch] = useState('');
  const [feedback, setFeedback] = useState({}); // report_id -> feedback text
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [coursesRes, classesRes, reportsRes, monitoringRes] = await Promise.all([
        api.get('/courses'),
        api.get('/classes'),
        api.get('/reports'),
        api.get('/monitoring/attendance')
      ]);
      setCourses(coursesRes.data);
      setClasses(classesRes.data);
      setReports(reportsRes.data);
      setMonitoring(monitoringRes.data);

      // Fetch modules for all courses
      const modulesPromises = coursesRes.data.map(c => api.get(`/courses/${c.id}/modules`));
      const modulesRes = await Promise.all(modulesPromises);
      const allModules = modulesRes.flatMap(res => res.data);
      setModules(allModules);

      // Fetch ratings
      const ratingsPromises = reportsRes.data.map(r => api.get(`/ratings/${r.id}`));
      const ratingsRes = await Promise.all(ratingsPromises);
      const ratingsMap = {};
      reportsRes.data.forEach((r, i) => {
        ratingsMap[r.id] = ratingsRes[i].data;
      });
      setRatings(ratingsMap);
    } catch (err) {
      setError('Failed to load data');
    }
  };

  const handleSearch = async () => {
    try {
      const res = await api.get(`/search/reports?query=${search}`);
      setReports(res.data);
    } catch (err) {
      setError('Search failed');
    }
  };

  const handleAddFeedback = async (reportId) => {
    try {
      await api.put(`/reports/${reportId}/feedback`, { prl_feedback: feedback[reportId] });
      alert('Feedback added');
      fetchData(); // Refresh
    } catch (err) {
      setError('Failed to add feedback');
    }
  };

  return (
    <div>
      {error && <Alert variant="danger">{error}</Alert>}
      <h2>PRL Dashboard</h2>

      <Row>
        <Col md={6}>
          <Card>
            <Card.Header>Courses & Lectures</Card.Header>
            <Card.Body>
              <Table striped bordered hover>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Code</th>
                  </tr>
                </thead>
                <tbody>
                  {courses.map(c => (
                    <tr key={c.id}>
                      <td>{c.name}</td>
                      <td>{c.code}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
              <h5>Modules</h5>
              <Table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Lecturer ID</th>
                  </tr>
                </thead>
                <tbody>
                  {modules.map(m => (
                    <tr key={m.id}>
                      <td>{m.name}</td>
                      <td>{m.lecturer_id}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>

        <Col md={6}>
          <Card>
            <Card.Header>Reports & Feedback</Card.Header>
            <Card.Body>
              <Form inline className="mb-3">
                <Form.Control value={search} onChange={e => setSearch(e.target.value)} placeholder="Search reports" />
                <Button onClick={handleSearch}>Search</Button>
              </Form>
              <Table striped bordered hover>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Module</th>
                    <th>Feedback</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map(r => (
                    <tr key={r.id}>
                      <td>{r.lecture_date}</td>
                      <td>{r.module_name}</td>
                      <td>
                        <Form.Control
                          as="textarea"
                          value={feedback[r.id] || r.prl_feedback || ''}
                          onChange={e => setFeedback({ ...feedback, [r.id]: e.target.value })}
                        />
                        <Button onClick={() => handleAddFeedback(r.id)}>Add Feedback</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="mt-4">
        <Col md={4}>
          <Card>
            <Card.Header>Classes</Card.Header>
            <Card.Body>
              <Table striped bordered hover>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Venue</th>
                  </tr>
                </thead>
                <tbody>
                  {classes.map(c => (
                    <tr key={c.id}>
                      <td>{c.name}</td>
                      <td>{c.venue}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>

        <Col md={4}>
          <Card>
            <Card.Header>Monitoring</Card.Header>
            <Card.Body>
              <p>Average Attendance: {(monitoring.avg_attendance * 100).toFixed(2)}%</p>
            </Card.Body>
          </Card>
        </Col>

        <Col md={4}>
          <Card>
            <Card.Header>Rating</Card.Header>
            <Card.Body>
              {reports.map(r => (
                <div key={r.id}>
                  <h5>Report {r.id}</h5>
                  <Table>
                    <tbody>
                      {ratings[r.id]?.map(rt => (
                        <tr key={rt.id}>
                          <td>{rt.rating} stars</td>
                          <td>{rt.comments}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              ))}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default PrlDashboard;