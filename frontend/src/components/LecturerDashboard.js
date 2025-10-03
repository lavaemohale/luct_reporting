import React, { useState, useEffect } from 'react';
import { Button, ListGroup, Form, Alert, Card, Modal } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { getReports, getClasses, addRating, logMonitoring, search, exportReports } from '../services/api';

const LecturerDashboard = () => {
  const [reports, setReports] = useState([]);
  const [classes, setClasses] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState('reports');
  const [ratingData, setRatingData] = useState({ report_id: '', rating: 1, comment: '' });
  const [showModal, setShowModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const reportsRes = await getReports();
      setReports(reportsRes.data.filter(r => r.lecturer_id === parseInt(localStorage.getItem('userId')) || !r.lecturer_id)); // Filter for current lecturer's reports
      const classesRes = await getClasses();
      setClasses(classesRes.data.filter(c => c.lecturer_id === parseInt(localStorage.getItem('userId')) || !c.lecturer_id)); // Filter for current lecturer's classes
      await logMonitoring({ action: 'Viewed dashboard as Lecturer' });
    } catch (err) {
      setError('Error fetching data. Ensure backend is running and you have a valid token.');
      console.error(err);
    }
  };

  const handleSearch = async () => {
    try {
      const res = await search(searchType, searchQuery);
      if (searchType === 'reports') setReports(res.data);
      else if (searchType === 'classes') setClasses(res.data);
    } catch (err) {
      setError('Search error. Check backend connection.');
      console.error(err);
    }
  };

  const handleRating = async (e) => {
    e.preventDefault();
    try {
      await addRating(ratingData);
      alert('Rating submitted successfully');
      setRatingData({ report_id: '', rating: 1, comment: '' }); // Reset form
    } catch (err) {
      setError('Error adding rating. Check console for details.');
      console.error(err);
    }
  };

  const handleExport = async () => {
    try {
      const res = await exportReports();
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'lecturer_reports.xlsx');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url); // Clean up
    } catch (err) {
      setError('Export failed. Ensure backend has xlsx installed, reports exist, and backend is running. Check console.');
      console.error(err);
    }
  };

  const handleMonitorView = async (report) => {
    try {
      await logMonitoring({ action: `Viewed Report ${report.id}` });
      setSelectedReport(report);
      setShowModal(true);
    } catch (err) {
      setError('Monitoring log failed. Check console.');
      console.error(err);
    }
  };

  return (
    <div>
      <h2>Lecturer Dashboard</h2>
      {error && <Alert variant="danger">{error}</Alert>}
      <Button onClick={handleExport} className="mb-3">Download Reports (Excel)</Button>
      <Link to="/lecturerform"><Button className="mb-3 ms-2">Add New Report</Button></Link>
      <Card className="mb-4">
        <Card.Header>Classes</Card.Header>
        <ListGroup>
          {classes.length === 0 ? (
            <ListGroup.Item>No classes assigned. Contact PL to assign.</ListGroup.Item>
          ) : (
            classes.map(cls => (
              <ListGroup.Item key={cls.id}>
                {cls.class_name} - Venue: {cls.venue}, Time: {cls.scheduled_time}
                <Button size="sm" onClick={() => logMonitoring({ action: `Viewed Class ${cls.id}` })} className="ms-2">Monitor</Button>
              </ListGroup.Item>
            ))
          )}
        </ListGroup>
      </Card>

      <Card className="mb-4">
        <Card.Header>Reports</Card.Header>
        <ListGroup>
          {reports.length === 0 ? (
            <ListGroup.Item>No reports available. Add a report using the form.</ListGroup.Item>
          ) : (
            reports.map(report => (
              <ListGroup.Item key={report.id}>
                {report.topic_taught} - Date: {report.date_of_lecture}
                <Button size="sm" onClick={() => handleMonitorView(report)} className="ms-2">Monitor View</Button>
              </ListGroup.Item>
            ))
          )}
        </ListGroup>
      </Card>

      <Card>
        <Card.Header>Rating</Card.Header>
        <Card.Body>
          <Form onSubmit={handleRating}>
            <Form.Group>
              <Form.Label>Select Report to Rate</Form.Label>
              <Form.Select onChange={(e) => setRatingData({ ...ratingData, report_id: e.target.value })} value={ratingData.report_id} required>
                <option value="">Select</option>
                {reports.map(r => <option key={r.id} value={r.id}>{r.topic_taught}</option>)}
              </Form.Select>
            </Form.Group>
            <Form.Group>
              <Form.Label>Rating (1-5)</Form.Label>
              <Form.Control type="number" min={1} max={5} onChange={(e) => setRatingData({ ...ratingData, rating: e.target.value })} value={ratingData.rating} required />
            </Form.Group>
            <Form.Group>
              <Form.Label>Comment</Form.Label>
              <Form.Control as="textarea" onChange={(e) => setRatingData({ ...ratingData, comment: e.target.value })} value={ratingData.comment} />
            </Form.Group>
            <Button type="submit" className="mt-2">Submit Rating</Button>
          </Form>
        </Card.Body>
      </Card>

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
              <p><strong>Recommendations:</strong> {selectedReport.lecturer_recommendations}</p>
              <p><strong>PRL Feedback:</strong> {selectedReport.prl_feedback || 'None'}</p>
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

export default LecturerDashboard;