import React, { useState, useEffect } from 'react';
import { Button, ListGroup, Form, Alert, Modal, Card, Row, Col } from 'react-bootstrap';
import { getReports, addRating, logMonitoring, search, exportReports } from '../services/api';

const StudentDashboard = () => {
  const [reports, setReports] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState('reports');
  const [ratingData, setRatingData] = useState({ target_id: '', target_type: 'lecture', rating: 1, comment: '' });
  const [showModal, setShowModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [error, setError] = useState('');
  const studentId = 'student123'; // Simulated student ID
  const studentClassId = 'class456'; // Simulated class ID

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const res = await getReports();
      const studentReports = res.data.filter(report => report.class_id === studentClassId);
      setReports(studentReports);
      await logMonitoring({ action: 'Viewed personal reports' });
    } catch (err) {
      setError('Error fetching reports. Check if backend is running and token is valid.');
    }
  };

  const handleSearch = async () => {
    try {
      const res = await search(searchType, searchQuery);
      if (searchType === 'reports') {
        const studentReports = res.data.filter(report => report.class_id === studentClassId);
        setReports(studentReports);
      } else {
        console.log(`Search results for ${searchType}:`, res.data);
        alert(`Search for ${searchType} completed. Results in console.`);
      }
    } catch (err) {
      setError('Search error. Ensure backend is running.');
    }
  };

  const handleRating = async (e) => {
    e.preventDefault();
    try {
      await addRating({
        ...ratingData,
        user_id: studentId,
      });
      alert('Feedback submitted successfully');
      setRatingData({ target_id: '', target_type: 'lecture', rating: 1, comment: '' });
    } catch (err) {
      setError('Error submitting feedback. Check console for details.');
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
      document.body.removeChild(link);
    } catch (err) {
      setError('Export failed. Ensure backend has xlsx installed and reports exist. Check console for errors.');
      console.error(err);
    }
  };

  const handleMonitorView = async (report) => {
    try {
      await logMonitoring({ action: `Viewed Report ${report.id}` });
      setSelectedReport(report);
      setShowModal(true);
    } catch (err) {
      setError('Monitoring log failed.');
    }
  };

  const getPersonalStats = (report) => {
    const attendancePercentage = (report.actual_students_present / report.total_registered_students) * 100;
    const progress = reports.filter(r => r.class_id === studentClassId).length / 10 * 100;
    return { attendancePercentage, progress };
  };

  return (
    <div className="p-3">
      <h2>Student Dashboard</h2>
      {error && <Alert variant="danger">{error}</Alert>}
      <Button onClick={handleExport} className="mb-3">Download Reports (Excel)</Button>

      <Row className="g-3">
        <Col md={6}>
          <Card className="h-100 tight-card">
            <Card.Header>Provide Feedback</Card.Header>
            <Card.Body>
              <Form onSubmit={handleRating}>
                <Form.Group className="mb-1">
                  <Form.Label>Select Target</Form.Label>
                  <Form.Select
                    onChange={(e) => setRatingData({ ...ratingData, target_id: e.target.value.split('-')[0], target_type: e.target.value.split('-')[1] })}
                    required
                  >
                    <option value="">Select Target</option>
                    {reports.map(r => [
                      <option key={`lecture-${r.id}`} value={`${r.id}-lecture`}>Lecture: {r.topic_taught}</option>,
                      <option key={`course-${r.course_id}`} value={`${r.course_id}-course`}>Course: {r.course_name}</option>,
                      <option key={`lecturer-${r.lecturer_id}`} value={`${r.lecturer_id}-lecturer`}>Lecturer: {r.lecturer_name}</option>,
                    ])}
                  </Form.Select>
                </Form.Group>
                <Form.Group className="mb-1">
                  <Form.Label>Rating (1-5)</Form.Label>
                  <Form.Control
                    type="number"
                    min={1}
                    max={5}
                    value={ratingData.rating}
                    onChange={(e) => setRatingData({ ...ratingData, rating: e.target.value })}
                    required
                  />
                </Form.Group>
                <Form.Group className="mb-1">
                  <Form.Label>Comment (e.g., effectiveness, clarity, engagement)</Form.Label>
                  <Form.Control
                    as="textarea"
                    value={ratingData.comment}
                    onChange={(e) => setRatingData({ ...ratingData, comment: e.target.value })}
                    placeholder="e.g., The lecture was clear and engaging"
                  />
                </Form.Group>
                <Button type="submit" size="sm" className="mt-1">Submit Feedback</Button>
              </Form>
            </Card.Body>
          </Card>
        </Col>
        <Col md={6}>
          <Card className="h-100 tight-card">
            <Card.Header>Monitoring (Track Attendance & Progress)</Card.Header>
            <Card.Body>
              <ListGroup>
                {reports.length === 0 ? (
                  <ListGroup.Item>No reports available. Ask a lecturer to add some.</ListGroup.Item>
                ) : (
                  reports.map(report => {
                    const { attendancePercentage, progress } = getPersonalStats(report);
                    return (
                      <ListGroup.Item key={report.id} className="py-1">
                        {report.topic_taught} - {report.actual_students_present}/{report.total_registered_students} present (Date: {report.date_of_lecture})
                        <br />
                        <small className="text-muted">
                          Attendance: {attendancePercentage.toFixed(1)}% | Progress: {progress.toFixed(1)}%
                        </small>
                        <Button size="sm" onClick={() => handleMonitorView(report)} className="ms-2">View Details</Button>
                      </ListGroup.Item>
                    );
                  })
                )}
              </ListGroup>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Report Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedReport && (
            <div>
              <p><strong>Faculty:</strong> {selectedReport.faculty_name}</p>
              <p><strong>Class:</strong> {selectedReport.class_name}</p>
              <p><strong>Week:</strong> {selectedReport.week_of_reporting}</p>
              <p><strong>Date:</strong> {selectedReport.date_of_lecture}</p>
              <p><strong>Course:</strong> {selectedReport.course_name} ({selectedReport.course_code})</p>
              <p><strong>Lecturer:</strong> {selectedReport.lecturer_name}</p>
              <p><strong>Present/Total:</strong> {selectedReport.actual_students_present}/{selectedReport.total_registered_students}</p>
              <p><strong>Venue:</strong> {selectedReport.venue}</p>
              <p><strong>Time:</strong> {selectedReport.scheduled_lecture_time}</p>
              <p><strong>Topic:</strong> {selectedReport.topic_taught}</p>
              <p><strong>Outcomes:</strong> {selectedReport.learning_outcomes}</p>
              <p><strong>Lecturer Recommendations:</strong> {selectedReport.lecturer_recommendations}</p>
              <p><strong>Lecturer Feedback:</strong> {selectedReport.prl_feedback || 'None'}</p>
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

export default StudentDashboard;