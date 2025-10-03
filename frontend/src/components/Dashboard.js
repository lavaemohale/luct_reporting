import React, { useState, useEffect } from 'react';
import { Tabs, Tab, Table, Form, Button, Row, Col, Alert } from 'react-bootstrap';
import axios from 'axios';

const Dashboard = ({ user }) => {
  const [data, setData] = useState([]);
  const [search, setSearch] = useState('');
  const [formData, setFormData] = useState({
    faculty: '',
    class_name: '',
    week: '',
    lecture_date: '',
    course_name: '',
    course_code: '',
    lecturer_name: user.name || '',
    actual_present: '',
    total_registered: '',
    venue: '',
    scheduled_time: '',
    topic: '',
    outcomes: '',
    recommendations: ''
  });
  const [error, setError] = useState(null);

  // Fetch data with error handling
  const fetchData = async (endpoint) => {
    try {
      const res = await axios.get(`http://localhost:5000${endpoint}${search ? `?search=${search}` : ''}`);
      setData(res.data);
      setError(null);
    } catch (err) {
      setError('Failed to load data. Please try again or check your connection.');
      console.error(err);
    }
  };

  // Submit report with validation and error handling
  const handleSubmitReport = async () => {
    setError(null);
    const requiredFields = ['faculty', 'class_name', 'week', 'lecture_date', 'course_name', 'course_code', 'lecturer_name', 'actual_present', 'venue', 'scheduled_time', 'topic', 'outcomes'];
    const missingFields = requiredFields.filter(field => !formData[field]);
    if (missingFields.length > 0) {
      setError(`Please fill in all required fields: ${missingFields.join(', ')}`);
      return;
    }
    if (parseInt(formData.actual_present) < 0) {
      setError('Actual number of students present cannot be negative.');
      return;
    }
    if (parseInt(formData.week) < 1) {
      setError('Week of reporting must be at least 1.');
      return;
    }
    try {
      await axios.post('http://localhost:5000/api/lecturer/reports', formData);
      alert('Report submitted successfully!');
      setFormData({ ...formData, faculty: '', class_name: '', week: '', lecture_date: '', course_name: '', course_code: '', actual_present: '', venue: '', scheduled_time: '', topic: '', outcomes: '', recommendations: '' });
      setError(null);
    } catch (err) {
      setError('Failed to submit report. Please try again or contact support.');
      console.error(err);
    }
  };

  // Student Dashboard
  if (user.role === 'student') {
    return (
      <div className="container">
        <div className="header">
          <h3>LUCT Reporting System - Student Dashboard</h3>
        </div>
        <Tabs defaultActiveKey="monitoring" className="mb-3">
          <Tab eventKey="monitoring" title="Monitoring">
            {error && <Alert variant="danger" onClose={() => setError(null)} dismissible>{error}</Alert>}
            <Button variant="primary" onClick={() => fetchData('/api/student/monitoring')} className="mb-3">
              Load Monitoring
            </Button>
            <Table striped bordered hover responsive>
              <thead className="bg-primary text-white">
                <tr><th>Course</th><th>Present</th><th>Total</th></tr>
              </thead>
              <tbody>
                {data.map((item, i) => (
                  <tr key={i}>
                    <td>{item.name}</td>
                    <td>{item.actual_present}</td>
                    <td>{item.total_registered}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Tab>
          <Tab eventKey="rating" title="Rating">
            {error && <Alert variant="danger" onClose={() => setError(null)} dismissible>{error}</Alert>}
            <h4 className="mb-4">Submit Rating</h4>
            <Form>
              <Form.Group className="mb-3">
                <Form.Label>Target ID (Course/Lecturer)</Form.Label>
                <Form.Control type="number" required />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Type</Form.Label>
                <Form.Select required>
                  <option value="">Select Type</option>
                  <option>course</option>
                  <option>lecturer</option>
                </Form.Select>
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Score (1-5)</Form.Label>
                <Form.Control type="number" min="1" max="5" required />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Comment</Form.Label>
                <Form.Control as="textarea" rows={3} />
              </Form.Group>
              <Button variant="primary" onClick={() => {/* POST to /api/student/rating */}} className="w-100">
                Submit Rating
              </Button>
            </Form>
          </Tab>
        </Tabs>
      </div>
    );
  }

  // Lecturer Dashboard
  if (user.role === 'lecturer') {
    return (
      <div className="container">
        <div className="header">
          <h3>LUCT Reporting System - Lecturer Dashboard</h3>
        </div>
        <Tabs defaultActiveKey="classes" className="mb-3">
          <Tab eventKey="classes" title="Classes">
            {error && <Alert variant="danger" onClose={() => setError(null)} dismissible>{error}</Alert>}
            <Button variant="primary" onClick={() => fetchData('/api/lecturer/classes')} className="mb-3">
              Load Classes
            </Button>
            <Table striped bordered hover responsive>
              <thead className="bg-primary text-white">
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                </tr>
              </thead>
              <tbody>
                {data.map((item, i) => (
                  <tr key={i}>
                    <td>{item.code}</td>
                    <td>{item.name}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Tab>
          <Tab eventKey="reports" title="Reports">
            {error && <Alert variant="danger" onClose={() => setError(null)} dismissible>{error}</Alert>}
            <h4 className="mb-4">Submit Lecture Report</h4>
            <Form>
              <Row>
                <Col md={6} className="mb-3">
                  <Form.Group>
                    <Form.Label>Faculty Name</Form.Label>
                    <Form.Control
                      type="text"
                      value={formData.faculty}
                      onChange={(e) => setFormData({ ...formData, faculty: e.target.value })}
                      placeholder="Enter faculty name"
                      required
                    />
                  </Form.Group>
                </Col>
                <Col md={6} className="mb-3">
                  <Form.Group>
                    <Form.Label>Class Name</Form.Label>
                    <Form.Control
                      type="text"
                      value={formData.class_name}
                      onChange={(e) => setFormData({ ...formData, class_name: e.target.value })}
                      placeholder="Enter class name"
                      required
                    />
                  </Form.Group>
                </Col>
              </Row>
              <Row>
                <Col md={6} className="mb-3">
                  <Form.Group>
                    <Form.Label>Week of Reporting</Form.Label>
                    <Form.Control
                      type="number"
                      value={formData.week}
                      onChange={(e) => setFormData({ ...formData, week: e.target.value })}
                      placeholder="Enter week"
                      min="1"
                      required
                    />
                  </Form.Group>
                </Col>
                <Col md={6} className="mb-3">
                  <Form.Group>
                    <Form.Label>Date of Lecture</Form.Label>
                    <Form.Control
                      type="date"
                      value={formData.lecture_date}
                      onChange={(e) => setFormData({ ...formData, lecture_date: e.target.value })}
                      required
                    />
                  </Form.Group>
                </Col>
              </Row>
              <Row>
                <Col md={6} className="mb-3">
                  <Form.Group>
                    <Form.Label>Course Name</Form.Label>
                    <Form.Control
                      type="text"
                      value={formData.course_name}
                      onChange={(e) => setFormData({ ...formData, course_name: e.target.value })}
                      placeholder="Enter course name"
                      required
                    />
                  </Form.Group>
                </Col>
                <Col md={6} className="mb-3">
                  <Form.Group>
                    <Form.Label>Course Code</Form.Label>
                    <Form.Control
                      type="text"
                      value={formData.course_code}
                      onChange={(e) => setFormData({ ...formData, course_code: e.target.value })}
                      placeholder="Enter course code"
                      required
                    />
                  </Form.Group>
                </Col>
              </Row>
              <Row>
                <Col md={6} className="mb-3">
                  <Form.Group>
                    <Form.Label>Lecturer’s Name</Form.Label>
                    <Form.Control
                      type="text"
                      value={formData.lecturer_name}
                      onChange={(e) => setFormData({ ...formData, lecturer_name: e.target.value })}
                      placeholder="Enter lecturer name"
                      required
                    />
                  </Form.Group>
                </Col>
                <Col md={6} className="mb-3">
                  <Form.Group>
                    <Form.Label>Actual Number of Students Present</Form.Label>
                    <Form.Control
                      type="number"
                      value={formData.actual_present}
                      onChange={(e) => setFormData({ ...formData, actual_present: e.target.value })}
                      placeholder="Enter actual present"
                      min="0"
                      required
                    />
                  </Form.Group>
                </Col>
              </Row>
              <Row>
                <Col md={6} className="mb-3">
                  <Form.Group>
                    <Form.Label>Total Number of Registered Students</Form.Label>
                    <Form.Control
                      type="number"
                      value={formData.total_registered}
                      onChange={(e) => setFormData({ ...formData, total_registered: e.target.value })}
                      placeholder="Will be calculated automatically"
                      readOnly
                    />
                    <Form.Text muted>Calculated from enrollments.</Form.Text>
                  </Form.Group>
                </Col>
                <Col md={6} className="mb-3">
                  <Form.Group>
                    <Form.Label>Venue of the Class</Form.Label>
                    <Form.Control
                      type="text"
                      value={formData.venue}
                      onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                      placeholder="Enter venue"
                      required
                    />
                  </Form.Group>
                </Col>
              </Row>
              <Row>
                <Col md={6} className="mb-3">
                  <Form.Group>
                    <Form.Label>Scheduled Lecture Time</Form.Label>
                    <Form.Control
                      type="time"
                      value={formData.scheduled_time}
                      onChange={(e) => setFormData({ ...formData, scheduled_time: e.target.value })}
                      required
                    />
                  </Form.Group>
                </Col>
                <Col md={6} className="mb-3">
                  <Form.Group>
                    <Form.Label>Topic Taught</Form.Label>
                    <Form.Control
                      type="text"
                      value={formData.topic}
                      onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                      placeholder="Enter topic taught"
                      required
                    />
                  </Form.Group>
                </Col>
              </Row>
              <Row>
                <Col md={12} className="mb-3">
                  <Form.Group>
                    <Form.Label>Learning Outcomes of the Topic</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={3}
                      value={formData.outcomes}
                      onChange={(e) => setFormData({ ...formData, outcomes: e.target.value })}
                      placeholder="Enter learning outcomes"
                      required
                    />
                  </Form.Group>
                </Col>
              </Row>
              <Row>
                <Col md={12} className="mb-3">
                  <Form.Group>
                    <Form.Label>Lecturer’s Recommendations</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={3}
                      value={formData.recommendations}
                      onChange={(e) => setFormData({ ...formData, recommendations: e.target.value })}
                      placeholder="Enter recommendations"
                    />
                  </Form.Group>
                </Col>
              </Row>
              <Button variant="primary" onClick={handleSubmitReport} className="w-100">
                Submit Report
              </Button>
            </Form>
          </Tab>
          <Tab eventKey="monitoring" title="Monitoring">
            {error && <Alert variant="danger" onClose={() => setError(null)} dismissible>{error}</Alert>}
            <Button variant="primary" onClick={() => fetchData('/api/lecturer/monitoring')} className="mb-3">
              Load Stats
            </Button>
            <p className="lead">Average Attendance: {data[0]?.avg_attendance || 0}%</p>
          </Tab>
          <Tab eventKey="rating" title="Rating">
            {error && <Alert variant="danger" onClose={() => setError(null)} dismissible>{error}</Alert>}
            <Button variant="primary" onClick={() => fetchData('/api/lecturer/rating')} className="mb-3">
              Load Ratings
            </Button>
            <Table striped bordered hover responsive>
              <thead className="bg-primary text-white">
                <tr>
                  <th>Score</th>
                  <th>Comment</th>
                </tr>
              </thead>
              <tbody>
                {data.map((item, i) => (
                  <tr key={i}>
                    <td>{item.score}</td>
                    <td>{item.comment || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Tab>
        </Tabs>
      </div>
    );
  }

  // PRL Dashboard
  if (user.role === 'prl') {
    return (
      <div className="container">
        <div className="header">
          <h3>LUCT Reporting System - PRL Dashboard</h3>
        </div>
        <Tabs defaultActiveKey="courses" className="mb-3">
          <Tab eventKey="courses" title="Courses">
            {error && <Alert variant="danger" onClose={() => setError(null)} dismissible>{error}</Alert>}
            <Form className="mb-3" inline>
              <Form.Control placeholder="Search" value={search} onChange={(e) => setSearch(e.target.value)} className="mr-2" />
              <Button variant="primary" onClick={() => fetchData('/api/prl/courses')}>
                Search
              </Button>
            </Form>
            <Table striped bordered hover responsive>
              <thead className="bg-primary text-white">
                <tr><th>Code</th><th>Name</th></tr>
              </thead>
              <tbody>
                {data.map((item, i) => (
                  <tr key={i}>
                    <td>{item.code}</td>
                    <td>{item.name}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Tab>
          <Tab eventKey="reports" title="Reports">
            {error && <Alert variant="danger" onClose={() => setError(null)} dismissible>{error}</Alert>}
            <Form className="mb-3" inline>
              <Form.Control placeholder="Search" value={search} onChange={(e) => setSearch(e.target.value)} className="mr-2" />
              <Button variant="primary" onClick={() => fetchData('/api/prl/reports')}>
                Search
              </Button>
            </Form>
            <Table striped bordered hover responsive>
              <thead className="bg-primary text-white">
                <tr><th>Topic</th><th>Date</th><th>Action</th></tr>
              </thead>
              <tbody>
                {data.map((item, i) => (
                  <tr key={i}>
                    <td>{item.topic}</td>
                    <td>{item.lecture_date}</td>
                    <td>
                      <Button variant="primary" size="sm" onClick={() => {/* POST feedback */}}>
                        Add Feedback
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <Button variant="primary" className="mt-3" onClick={() => {/* Download from /api/reports/excel */}}>
              Download Excel
            </Button>
          </Tab>
          <Tab eventKey="monitoring" title="Monitoring">
            {error && <Alert variant="danger" onClose={() => setError(null)} dismissible>{error}</Alert>}
            <Button variant="primary" onClick={() => fetchData('/api/prl/monitoring')} className="mb-3">
              Load Stats
            </Button>
            <p className="lead">Average Attendance: {data[0]?.avg_attendance || 0}%</p>
          </Tab>
          <Tab eventKey="rating" title="Rating">
            {error && <Alert variant="danger" onClose={() => setError(null)} dismissible>{error}</Alert>}
            <Button variant="primary" onClick={() => fetchData('/api/prl/rating')} className="mb-3">
              Load Ratings
            </Button>
            <Table striped bordered hover responsive>
              <thead className="bg-primary text-white">
                <tr><th>Score</th><th>Comment</th></tr>
              </thead>
              <tbody>
                {data.map((item, i) => (
                  <tr key={i}>
                    <td>{item.score}</td>
                    <td>{item.comment || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Tab>
          <Tab eventKey="classes" title="Classes">
            {error && <Alert variant="danger" onClose={() => setError(null)} dismissible>{error}</Alert>}
            <Button variant="primary" onClick={() => fetchData('/api/prl/classes')} className="mb-3">
              Load Classes
            </Button>
            <Table striped bordered hover responsive>
              <thead className="bg-primary text-white">
                <tr><th>Class Name</th></tr>
              </thead>
              <tbody>
                {data.map((item, i) => (
                  <tr key={i}>
                    <td>{item.class_name}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Tab>
        </Tabs>
      </div>
    );
  }

  // PL Dashboard
  if (user.role === 'pl') {
    return (
      <div className="container">
        <div className="header">
          <h3>LUCT Reporting System - PL Dashboard</h3>
        </div>
        <Tabs defaultActiveKey="courses" className="mb-3">
          <Tab eventKey="courses" title="Courses">
            {error && <Alert variant="danger" onClose={() => setError(null)} dismissible>{error}</Alert>}
            <h4 className="mb-4">Add Course</h4>
            <Form className="mb-4">
              <Form.Group className="mb-3">
                <Form.Label>Course Code</Form.Label>
                <Form.Control type="text" required />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Course Name</Form.Label>
                <Form.Control type="text" required />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Faculty</Form.Label>
                <Form.Control type="text" required />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Assigned Lecturer ID</Form.Label>
                <Form.Control type="number" required />
              </Form.Group>
              <Button variant="primary" onClick={() => {/* POST to /api/pl/courses */}} className="w-100">
                Add Course
              </Button>
            </Form>
            <h4 className="mb-4">Assign Lecturer</h4>
            <Form>
              <Form.Group className="mb-3">
                <Form.Label>Course ID</Form.Label>
                <Form.Control type="number" required />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Lecturer ID</Form.Label>
                <Form.Control type="number" required />
              </Form.Group>
              <Button variant="primary" onClick={() => {/* PUT to /api/pl/courses/:id/assign */}} className="w-100">
                Assign Lecturer
              </Button>
            </Form>
          </Tab>
          <Tab eventKey="reports" title="Reports">
            {error && <Alert variant="danger" onClose={() => setError(null)} dismissible>{error}</Alert>}
            <Form className="mb-3" inline>
              <Form.Control placeholder="Search" value={search} onChange={(e) => setSearch(e.target.value)} className="mr-2" />
              <Button variant="primary" onClick={() => fetchData('/api/pl/reports')}>
                Search
              </Button>
            </Form>
            <Table striped bordered hover responsive>
              <thead className="bg-primary text-white">
                <tr><th>Topic</th><th>Date</th><th>Comment</th></tr>
              </thead>
              <tbody>
                {data.map((item, i) => (
                  <tr key={i}>
                    <td>{item.topic}</td>
                    <td>{item.lecture_date}</td>
                    <td>{item.comment || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <Button variant="primary" className="mt-3" onClick={() => {/* Download from /api/reports/excel */}}>
              Download Excel
            </Button>
          </Tab>
          <Tab eventKey="monitoring" title="Monitoring">
            {error && <Alert variant="danger" onClose={() => setError(null)} dismissible>{error}</Alert>}
            <Button variant="primary" onClick={() => fetchData('/api/pl/monitoring')} className="mb-3">
              Load Stats
            </Button>
            <p className="lead">Average Attendance: {data[0]?.avg_attendance || 0}%</p>
          </Tab>
          <Tab eventKey="classes" title="Classes">
            {error && <Alert variant="danger" onClose={() => setError(null)} dismissible>{error}</Alert>}
            <Button variant="primary" onClick={() => fetchData('/api/pl/classes')} className="mb-3">
              Load Classes
            </Button>
            <Table striped bordered hover responsive>
              <thead className="bg-primary text-white">
                <tr><th>Class Name</th></tr>
              </thead>
              <tbody>
                {data.map((item, i) => (
                  <tr key={i}>
                    <td>{item.class_name}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Tab>
          <Tab eventKey="lecturers" title="Lecturers">
            {error && <Alert variant="danger" onClose={() => setError(null)} dismissible>{error}</Alert>}
            <Button variant="primary" onClick={() => fetchData('/api/pl/lecturers')} className="mb-3">
              Load Lecturers
            </Button>
            <Table striped bordered hover responsive>
              <thead className="bg-primary text-white">
                <tr><th>Name</th></tr>
              </thead>
              <tbody>
                {data.map((item, i) => (
                  <tr key={i}>
                    <td>{item.name}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Tab>
          <Tab eventKey="rating" title="Rating">
            {error && <Alert variant="danger" onClose={() => setError(null)} dismissible>{error}</Alert>}
            <Button variant="primary" onClick={() => fetchData('/api/pl/rating')} className="mb-3">
              Load Ratings
            </Button>
            <Table striped bordered hover responsive>
              <thead className="bg-primary text-white">
                <tr><th>Score</th><th>Comment</th></tr>
              </thead>
              <tbody>
                {data.map((item, i) => (
                  <tr key={i}>
                    <td>{item.score}</td>
                    <td>{item.comment || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Tab>
        </Tabs>
      </div>
    );
  }

  return <div className="container">Invalid Role</div>;
};

export default Dashboard;