import React, { useState, useEffect } from 'react';
import { Button, ListGroup, Form, Alert, Card, Table, Row, Col } from 'react-bootstrap';
import { getReports, getCourses, getClasses, getRatings, addCourse, addClass, addRating, logMonitoring, search, exportReports } from '../services/api';
// Removed: import './app.css';

const PLDashboard = () => {
  const [reports, setReports] = useState([]);
  const [courses, setCourses] = useState([]);
  const [classes, setClasses] = useState([]);
  const [ratings, setRatings] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState('reports');
  const [courseForm, setCourseForm] = useState({ course_name: '', course_code: '', faculty_name: '', total_registered_students: 0 });
  const [classForm, setClassForm] = useState({ class_name: '', course_id: '', venue: '', scheduled_time: '', lecturer_id: '' });
  const [ratingData, setRatingData] = useState({ report_id: '', rating: 1, comment: '' });
  const [feedbackData, setFeedbackData] = useState({ report_id: '', feedback: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      console.log('Fetching reports...');
      const reportsRes = await getReports();
      console.log('Reports:', reportsRes.data);
      setReports(reportsRes.data.filter(r => r.prl_feedback));
      // Repeat for getCourses, getClasses, getRatings
    } catch (err) {
      console.error('Fetch error:', err);
      setError('Error fetching data: ' + err.message);
    }
  };

  const handleSearch = async () => {
    try {
      const res = await search(searchType, searchQuery);
      if (searchType === 'reports') setReports(res.data.filter(r => r.prl_feedback));
      else if (searchType === 'courses') setCourses(res.data);
      else if (searchType === 'classes') setClasses(res.data);
    } catch (err) {
      setError('Search error: ' + err.message);
    }
  };

  const handleAddCourse = async (e) => {
    e.preventDefault();
    if (!courseForm.course_name || !courseForm.course_code || !courseForm.faculty_name || !courseForm.total_registered_students) {
      setError('All course fields are required');
      return;
    }
    try {
      await addCourse(courseForm);
      setSuccess('Course added successfully');
      fetchData();
      setCourseForm({ course_name: '', course_code: '', faculty_name: '', total_registered_students: 0 });
    } catch (err) {
      setError('Error adding course: ' + err.message);
    }
  };

  const handleAddClass = async (e) => {
    e.preventDefault();
    if (!classForm.class_name || !classForm.course_id || !classForm.venue || !classForm.scheduled_time || !classForm.lecturer_id) {
      setError('All class fields are required');
      return;
    }
    try {
      await addClass(classForm);
      setSuccess('Class assigned successfully');
      fetchData();
      setClassForm({ class_name: '', course_id: '', venue: '', scheduled_time: '', lecturer_id: '' });
    } catch (err) {
      setError('Error assigning class: ' + err.message);
    }
  };

  const handleRating = async (e) => {
    e.preventDefault();
    if (!ratingData.report_id || !ratingData.rating) {
      setError('Report ID and rating are required');
      return;
    }
    try {
      await addRating({ ...ratingData, user_id: parseInt(localStorage.getItem('userId')) });
      setSuccess('Rating added successfully');
      fetchData();
      setRatingData({ report_id: '', rating: 1, comment: '' });
    } catch (err) {
      setError('Error adding rating: ' + err.message);
    }
  };

  const handleFeedback = async (e) => {
    e.preventDefault();
    if (!feedbackData.report_id || !feedbackData.feedback) {
      setError('Report ID and feedback are required');
      return;
    }
    try {
      await addRating({ ...feedbackData, user_id: parseInt(localStorage.getItem('userId')), type: 'feedback' }); // Assume API handles feedback type
      setSuccess('Feedback added successfully');
      fetchData();
      setFeedbackData({ report_id: '', feedback: '' });
    } catch (err) {
      setError('Error adding feedback: ' + err.message);
    }
  };

  const handleExport = async () => {
    try {
      const res = await exportReports();
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'pl_reports.xlsx');
      document.body.appendChild(link);
      link.click();
    } catch (err) {
      setError('Export error: ' + err.message);
    }
  };

  // Monitoring: Attendance Trends
  const getAttendanceTrends = () => {
    const trends = reports.reduce((acc, r) => {
      acc[r.course_code] = acc[r.course_code] || [];
      acc[r.course_code].push({ date: r.date_of_lecture, attendance: r.actual_students_present / r.total_registered_students * 100 });
      return acc;
    }, {});
    return trends;
  };

  // Monitoring: Curriculum Coverage
  const getCurriculumCoverage = () => {
    const coverage = courses.reduce((acc, c) => {
      acc[c.course_code] = reports.filter(r => r.course_code === c.course_code).map(r => r.topic_taught);
      return acc;
    }, {});
    return coverage;
  };

  const attendanceTrends = getAttendanceTrends();
  const curriculumCoverage = getCurriculumCoverage();

  return (
    <div className="container mt-4">
      <h2>Program Leader Dashboard</h2>
      {error && <Alert variant="danger">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}
      <Button onClick={handleExport} className="mb-3">Download Reports (Excel)</Button>

      <Card className="mb-4 tight-card">
        <Card.Header>Courses (Add and Assign Lecturers)</Card.Header>
        <Card.Body>
          <Form onSubmit={handleAddCourse}>
            <Form.Group className="mb-2">
              <Form.Label>Course Name</Form.Label>
              <Form.Control value={courseForm.course_name} onChange={(e) => setCourseForm({ ...courseForm, course_name: e.target.value })} required />
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label>Course Code</Form.Label>
              <Form.Control value={courseForm.course_code} onChange={(e) => setCourseForm({ ...courseForm, course_code: e.target.value })} required />
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label>Faculty Name</Form.Label>
              <Form.Control value={courseForm.faculty_name} onChange={(e) => setCourseForm({ ...courseForm, faculty_name: e.target.value })} required />
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label>Total Registered Students</Form.Label>
              <Form.Control type="number" value={courseForm.total_registered_students} onChange={(e) => setCourseForm({ ...courseForm, total_registered_students: e.target.value })} required />
            </Form.Group>
            <Button type="submit" size="sm" className="mt-2">Add Course</Button>
          </Form>
          <Table striped bordered hover size="sm">
            <thead>
              <tr>
                <th>Course Name</th>
                <th>Code</th>
                <th>Registered Students</th>
              </tr>
            </thead>
            <tbody>
              {courses.map(course => (
                <tr key={course.id}>
                  <td>{course.course_name}</td>
                  <td>{course.course_code}</td>
                  <td>{course.total_registered_students}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card.Body>
      </Card>

      <Card className="mb-4 tight-card">
        <Card.Header>Assign Classes / Lectures</Card.Header>
        <Card.Body>
          <Form onSubmit={handleAddClass}>
            <Form.Group className="mb-2">
              <Form.Label>Class Name</Form.Label>
              <Form.Control value={classForm.class_name} onChange={(e) => setClassForm({ ...classForm, class_name: e.target.value })} required />
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label>Select Course</Form.Label>
              <Form.Select value={classForm.course_id} onChange={(e) => setClassForm({ ...classForm, course_id: e.target.value })} required>
                <option value="">Select</option>
                {courses.map(c => <option key={c.id} value={c.id}>{c.course_name}</option>)}
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label>Venue</Form.Label>
              <Form.Control value={classForm.venue} onChange={(e) => setClassForm({ ...classForm, venue: e.target.value })} required />
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label>Scheduled Time</Form.Label>
              <Form.Control type="time" value={classForm.scheduled_time} onChange={(e) => setClassForm({ ...classForm, scheduled_time: e.target.value })} required />
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label>Lecturer ID</Form.Label>
              <Form.Control type="number" value={classForm.lecturer_id} onChange={(e) => setClassForm({ ...classForm, lecturer_id: e.target.value })} required />
            </Form.Group>
            <Button type="submit" size="sm" className="mt-2">Assign Class</Button>
          </Form>
          <Table striped bordered hover size="sm">
            <thead>
              <tr>
                <th>Class Name</th>
                <th>Course</th>
                <th>Lecturer ID</th>
                <th>Venue & Time</th>
              </tr>
            </thead>
            <tbody>
              {classes.map(cls => {
                const course = courses.find(c => c.id === cls.course_id);
                return (
                  <tr key={cls.id}>
                    <td>{cls.class_name}</td>
                    <td>{course ? course.course_name : 'Unknown'}</td>
                    <td>{cls.lecturer_id}</td>
                    <td>{cls.venue} at {cls.scheduled_time}</td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </Card.Body>
      </Card>

      <Card className="mb-4 tight-card">
        <Card.Header>Monitoring (Overall Program Performance)</Card.Header>
        <Card.Body>
          <h5 className="mb-2">Attendance Trends</h5>
          <Table striped bordered hover size="sm">
            <thead>
              <tr>
                <th>Course Code</th>
                <th>Average Attendance (%)</th>
                <th>Dates</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(attendanceTrends).map(([code, data]) => (
                <tr key={code}>
                  <td>{code}</td>
                  <td>{(data.reduce((sum, d) => sum + d.attendance, 0) / data.length || 0).toFixed(2)}%</td>
                  <td>{data.map(d => d.date).join(', ') || 'No data'}</td>
                </tr>
              ))}
            </tbody>
          </Table>
          <h5 className="mb-2">Curriculum Coverage</h5>
          <Table striped bordered hover size="sm">
            <thead>
              <tr>
                <th>Course Code</th>
                <th>Topics Covered</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(curriculumCoverage).map(([code, topics]) => (
                <tr key={code}>
                  <td>{code}</td>
                  <td>{topics.join(', ') || 'None'}</td>
                </tr>
              ))}
            </tbody>
          </Table>
          <h5 className="mb-2">Lecturer Reports and Student Ratings</h5>
          <ListGroup>
            {reports.map(report => (
              <ListGroup.Item key={report.id} className="py-1">
                {report.topic_taught} - Attendance: {report.actual_students_present}/{report.total_registered_students}
                <br />Rating: {ratings.find(r => r.report_id === report.id)?.rating || 'N/A'}
              </ListGroup.Item>
            ))}
          </ListGroup>
        </Card.Body>
      </Card>

      <Card className="mb-4 tight-card">
        <Card.Header>Classes (View Schedules and Oversee Delivery)</Card.Header>
        <Card.Body>
          <Table striped bordered hover size="sm">
            <thead>
              <tr>
                <th>Class Name</th>
                <th>Course</th>
                <th>Lecturer ID</th>
                <th>Venue & Time</th>
              </tr>
            </thead>
            <tbody>
              {classes.map(cls => {
                const course = courses.find(c => c.id === cls.course_id);
                return (
                  <tr key={cls.id}>
                    <td>{cls.class_name}</td>
                    <td>{course ? course.course_name : 'Unknown'}</td>
                    <td>{cls.lecturer_id}</td>
                    <td>{cls.venue} at {cls.scheduled_time}</td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </Card.Body>
      </Card>

      {/* Bottom Row with Rating and Reports side by side */}
      <Row className="g-0">
        <Col md={6}>
          <Card className="tight-card">
            <Card.Header>Reports (View from PRL)</Card.Header>
            <Card.Body>
              <ListGroup>
                {reports.map(report => (
                  <ListGroup.Item key={report.id} className="py-1">
                    <strong>{report.topic_taught}</strong> - Date: {report.date_of_lecture}
                    <br />PRL Feedback: {report.prl_feedback || 'None'}
                  </ListGroup.Item>
                ))}
              </ListGroup>
              <Form onSubmit={handleFeedback} className="mt-2">
                <Form.Group className="mb-2">
                  <Form.Label>Select Report for Feedback</Form.Label>
                  <Form.Select value={feedbackData.report_id} onChange={(e) => setFeedbackData({ ...feedbackData, report_id: e.target.value })} required>
                    <option value="">Select</option>
                    {reports.map(r => <option key={r.id} value={r.id}>{r.topic_taught}</option>)}
                  </Form.Select>
                </Form.Group>
                <Form.Group className="mb-2">
                  <Form.Label>Top-Level Feedback</Form.Label>
                  <Form.Control as="textarea" value={feedbackData.feedback} onChange={(e) => setFeedbackData({ ...feedbackData, feedback: e.target.value })} required />
                </Form.Group>
                <Button type="submit" size="sm">Submit Feedback</Button>
              </Form>
            </Card.Body>
          </Card>
        </Col>
        <Col md={6}>
          <Card className="tight-card">
            <Card.Header>Rating (Rate Reports and Feedback from PRLs)</Card.Header>
            <Card.Body>
              <Form onSubmit={handleRating}>
                <Form.Group className="mb-2">
                  <Form.Label>Select Report to Rate</Form.Label>
                  <Form.Select value={ratingData.report_id} onChange={(e) => setRatingData({ ...ratingData, report_id: e.target.value })} required>
                    <option value="">Select</option>
                    {reports.map(r => <option key={r.id} value={r.id}>{r.topic_taught}</option>)}
                  </Form.Select>
                </Form.Group>
                <Form.Group className="mb-2">
                  <Form.Label>Rating (1-5)</Form.Label>
                  <Form.Control type="number" min="1" max="5" value={ratingData.rating} onChange={(e) => setRatingData({ ...ratingData, rating: e.target.value })} required />
                </Form.Group>
                <Form.Group className="mb-2">
                  <Form.Label>Comment (Evaluate Lecturer Performance/Course Outcomes)</Form.Label>
                  <Form.Control as="textarea" value={ratingData.comment} onChange={(e) => setRatingData({ ...ratingData, comment: e.target.value })} />
                </Form.Group>
                <Button type="submit" size="sm">Submit Rating</Button>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default PLDashboard;