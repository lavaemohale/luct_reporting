import React, { useState, useEffect } from 'react';
import { Button, ListGroup, Form, Alert, Card, Modal, Table, Row, Col } from 'react-bootstrap';
import { getReports, getCourses, getClasses, addFeedback, addRating, logMonitoring, search, exportReports } from '../services/api';

const PRLDashboard = () => {
  const [reports, setReports] = useState([]);
  const [courses, setCourses] = useState([]);
  const [classes, setClasses] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState('reports');
  const [feedbackData, setFeedbackData] = useState({ report_id: '', prl_feedback: '' });
  const [ratingData, setRatingData] = useState({ report_id: '', rating: 1, comment: '' });
  const [showModal, setShowModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const reportsRes = await getReports();
      setReports(reportsRes.data);

      const coursesRes = await getCourses();
      setCourses(coursesRes.data.filter(c => c.faculty_name === 'Faculty of Information Communication Technology'));

      const classesRes = await getClasses();
      setClasses(classesRes.data);

      await logMonitoring({ action: 'Viewed dashboard as PRL' });
    } catch (err) {
      setError('Error fetching data');
    }
  };

  const handleSearch = async () => {
    try {
      const res = await search(searchType, searchQuery);
      if (searchType === 'reports') setReports(res.data);
      else if (searchType === 'courses') setCourses(res.data);
      else if (searchType === 'classes') setClasses(res.data);
    } catch (err) {
      setError('Search error');
    }
  };

  const handleFeedback = async (e) => {
    e.preventDefault();
    try {
      await addFeedback(feedbackData.report_id, { prl_feedback: feedbackData.prl_feedback });
      alert('Feedback added');
      fetchData();
    } catch (err) {
      setError('Error adding feedback');
    }
  };

  const handleRating = async (e) => {
    e.preventDefault();
    try {
      await addRating(ratingData);
      alert('Rating added');
    } catch (err) {
      setError('Error adding rating');
    }
  };

  const handleExport = async () => {
    try {
      const res = await exportReports();
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'reports.xlsx');
      document.body.appendChild(link);
      link.click();
    } catch (err) {
      setError('Export error');
    }
  };

  const handleMonitorView = async (item, type) => {
    try {
      await logMonitoring({ action: `Viewed ${type} ID ${item.id}` });
      setSelectedItem({ ...item, type });
      setShowModal(true);
    } catch (err) {
      setError('Monitoring error');
    }
  };

  const getAttendancePatterns = () => {
    const patterns = reports.reduce((acc, r) => {
      acc[r.course_code] = acc[r.course_code] || [];
      acc[r.course_code].push({ date: r.date_of_lecture, attendance: r.actual_students_present / r.total_registered_students * 100 });
      return acc;
    }, {});
    return patterns;
  };

  const attendanceData = getAttendancePatterns();

  return (
    <div className="p-3">
      <h2>PRL Dashboard</h2>
      {error && <Alert variant="danger">{error}</Alert>}
      <Button onClick={handleExport} className="mb-3">Download Reports (Excel)
      </Button>
      <Card className="mb-4">
        <Card.Header>Courses & Lecturers Under Stream</Card.Header>
        <Table striped bordered hover className="table">
          <thead>
            <tr>
              <th>Course Name</th>
              <th>Code</th>
              <th>Registered Students</th>
              <th>Assigned Lecturers</th>
            </tr>
          </thead>
          <tbody>
            {courses.map(course => {
              const courseClasses = classes.filter(c => c.course_id === course.id);
              const lecturers = [...new Set(courseClasses.map(c => c.lecturer_id))].map(id => `Lecturer ID: ${id}`);
              return (
                <tr key={course.id}>
                  <td>{course.course_name}</td>
                  <td>{course.course_code}</td>
                  <td>{course.total_registered_students}</td>
                  <td>{lecturers.join(', ') || 'None'}</td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </Card>

      <Card className="mb-4">
        <Card.Header>Classes Assigned to Lecturers</Card.Header>
        <Table striped bordered hover className="table">
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
      </Card>

      <Card className="mb-4">
        <Card.Header>Monitoring (Lecture Delivery, Attendance Patterns, Course Coverage)</Card.Header>
        <Card.Body>
          <h5>Attendance Patterns by Course</h5>
          <Table striped bordered hover className="table">
            <thead>
              <tr>
                <th>Course Code</th>
                <th>Average Attendance (%)</th>
                <th>Dates Monitored</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(attendanceData).map(([code, data]) => (
                <tr key={code}>
                  <td>{code}</td>
                  <td>{(data.reduce((sum, d) => sum + d.attendance, 0) / data.length).toFixed(2)}%</td>
                  <td>{data.map(d => d.date).join(', ')}</td>
                </tr>
              ))}
            </tbody>
          </Table>
          <h5>Course Coverage</h5>
          <ListGroup>
            {courses.map(course => (
              <ListGroup.Item key={course.id}>
                {course.course_name} - Topics Covered: {reports.filter(r => r.course_code === course.course_code).map(r => r.topic_taught).join(', ') || 'None'}
                <Button size="sm" onClick={() => handleMonitorView(course, 'Course Coverage')} className="ms-2">Monitor Coverage</Button>
              </ListGroup.Item>
            ))}
          </ListGroup>
        </Card.Body>
      </Card>

      <div className="dashboard-row">
        <Card className="mb-4">
          <Card.Header>Reports (View Lecturers' Reports & Add Feedback)</Card.Header>
          <Card.Body>
            <ListGroup>
              {reports.map(report => (
                <ListGroup.Item key={report.id}>
                  {report.topic_taught} - Lecturer: {report.lecturer_name} - Feedback: {report.prl_feedback || 'None'}
                  <Button size="sm" onClick={() => handleMonitorView(report, 'Report')} className="ms-2">Monitor View</Button>
                </ListGroup.Item>
              ))}
            </ListGroup>
            <Form onSubmit={handleFeedback} className="form-row mt-2">
              <Row>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Select Report for Feedback</Form.Label>
                    <Form.Select onChange={(e) => setFeedbackData({ ...feedbackData, report_id: e.target.value })} size="sm">
                      <option value="">Select</option>
                      {reports.map(r => <option key={r.id} value={r.id}>{r.topic_taught} by {r.lecturer_name}</option>)}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Feedback</Form.Label>
                    <Form.Control as="textarea" onChange={(e) => setFeedbackData({ ...feedbackData, prl_feedback: e.target.value })} size="sm" />
                  </Form.Group>
                </Col>
              </Row>
              <Button type="submit" size="sm" className="mt-2">Add Feedback</Button>
            </Form>
          </Card.Body>
        </Card>
        <Card className="mb-4">
          <Card.Header>Rating (Rate Lecturers’ Reports and Performance)</Card.Header>
          <Card.Body>
            <Form onSubmit={handleRating} className="form-row">
              <Row>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Select Report to Rate</Form.Label>
                    <Form.Select onChange={(e) => setRatingData({ ...ratingData, report_id: e.target.value })} size="sm">
                      <option value="">Select</option>
                      {reports.map(r => <option key={r.id} value={r.id}>{r.topic_taught} by {r.lecturer_name}</option>)}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Rating (1-5)</Form.Label>
                    <Form.Control type="number" min={1} max={5} onChange={(e) => setRatingData({ ...ratingData, rating: e.target.value })} size="sm" />
                  </Form.Group>
                </Col>
              </Row>
              <Row>
                <Col md={12}>
                  <Form.Group>
                    <Form.Label>Comment (Feedback on Teaching Quality/Curriculum)</Form.Label>
                    <Form.Control as="textarea" onChange={(e) => setRatingData({ ...ratingData, comment: e.target.value })} size="sm" />
                  </Form.Group>
                </Col>
              </Row>
              <Button type="submit" size="sm" className="mt-2">Submit Rating</Button>
            </Form>
          </Card.Body>
        </Card>
      </div>

      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Monitoring Details</Modal.Title>
        </Modal.Header>
        <Modal.Body className="modal-body">
          {selectedItem && (
            <div>
              {selectedItem.type === 'Report' && (
                <>
                  <p><strong>Topic:</strong> {selectedItem.topic_taught}</p>
                  <p><strong>Lecturer:</strong> {selectedItem.lecturer_name}</p>
                  <p><strong>Attendance:</strong> {selectedItem.actual_students_present}/{selectedItem.total_registered_students}</p>
                  <p><strong>Delivery Date:</strong> {selectedItem.date_of_lecture}</p>
                  <p><strong>Feedback:</strong> {selectedItem.prl_feedback || 'None'}</p>
                </>
              )}
              {selectedItem.type === 'Course Coverage' && (
                <>
                  <p><strong>Course:</strong> {selectedItem.course_name}</p>
                  <p><strong>Coverage:</strong> {reports.filter(r => r.course_code === selectedItem.course_code).map(r => r.topic_taught).join(', ') || 'None'}</p>
                </>
              )}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>Close</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default PRLDashboard;