import React, { useState, useEffect } from 'react';
import { Table, Form, Button, Card, Row, Col, Alert, Modal, Badge, Spinner } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import { apiGet, apiPost } from '../services/api';

const LecturerDashboard = () => {
  const { user, logout } = useAuth();
  const [modules, setModules] = useState([]);
  const [classes, setClasses] = useState([]);
  const [reports, setReports] = useState([]);
  const [ratings, setRatings] = useState({});
  const [monitoring, setMonitoring] = useState({ avg_attendance: 0, student_engagement: 0 });
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // Form states
  const [showReportForm, setShowReportForm] = useState(false);
  const [showClassForm, setShowClassForm] = useState(false);
  const [showRatingForm, setShowRatingForm] = useState(false);

  const [reportForm, setReportForm] = useState({
    faculty_name: '',
    class_name: '',
    week: '',
    lecture_date: '',
    course_name: '',
    course_code: '',
    lecturer_name: '',
    students_present: '',
    total_students: '',
    venue: '',
    scheduled_time: '',
    topic_taught: '',
    learning_outcomes: '',
    recommendations: ''
  });

  const [classForm, setClassForm] = useState({
    name: '',
    venue: '',
    scheduled_time: '',
    module_id: ''
  });

  const [ratingForm, setRatingForm] = useState({
    report_id: '',
    rating: '',
    comments: '',
    type: 'student_engagement'
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');

      const [modulesData, classesData, reportsData, monitoringData] = await Promise.allSettled([
        apiGet('/lecturer/modules').catch(() => []),
        apiGet('/classes').catch(() => []),
        apiGet('/reports').catch(() => []),
        apiGet('/monitoring/lecturer').catch(() => ({ avg_attendance: 0, student_engagement: 0 }))
      ]);

      setModules(modulesData.status === 'fulfilled' ? modulesData.value : []);
      setClasses(classesData.status === 'fulfilled' ? classesData.value : []);
      setReports(reportsData.status === 'fulfilled' ? reportsData.value : []);
      setMonitoring(monitoringData.status === 'fulfilled' ? monitoringData.value : { avg_attendance: 0, student_engagement: 0 });

      // Fetch ratings for each report if we have reports
      if (reportsData.status === 'fulfilled' && reportsData.value.length > 0) {
        fetchRatings(reportsData.value);
      }

    } catch (err) {
      console.error('Fetch data error:', err);
      handleApiError(err, 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const fetchRatings = async (reportsList) => {
    try {
      const ratingsPromises = reportsList.map(report => 
        apiGet(`/reports/${report.id}/ratings`).catch(err => {
          console.error(`Error fetching ratings for report ${report.id}:`, err);
          return [];
        })
      );
      
      const ratingsResults = await Promise.allSettled(ratingsPromises);
      const ratingsMap = {};
      
      reportsList.forEach((report, index) => {
        ratingsMap[report.id] = ratingsResults[index].status === 'fulfilled' ? ratingsResults[index].value : [];
      });
      
      setRatings(ratingsMap);
    } catch (err) {
      console.error('Error fetching ratings:', err);
    }
  };

  const handleApiError = (err, defaultMessage) => {
    if (err.response?.status === 401) {
      setError('Session expired. Please login again.');
      setTimeout(() => logout(), 2000);
    } else if (err.response?.status === 500) {
      setError('Server error. Please try again later.');
    } else {
      setError(err.response?.data?.message || err.response?.data?.error || defaultMessage || 'An error occurred');
    }
  };

  const showSuccess = (message) => {
    setSuccess(message);
    setTimeout(() => setSuccess(''), 5000);
  };

  // Handle Report Submission
  const handleSubmitReport = async (e) => {
    e.preventDefault();
    try {
      // Validation
      if (!reportForm.faculty_name || !reportForm.class_name || !reportForm.week || !reportForm.lecture_date) {
        setError('Please fill in all required fields');
        return;
      }

      const reportData = {
        ...reportForm,
        week: parseInt(reportForm.week),
        students_present: parseInt(reportForm.students_present),
        total_students: parseInt(reportForm.total_students) || 0,
        lecturer_name: reportForm.lecturer_name || user?.name || 'Current Lecturer'
      };

      console.log('Submitting report:', reportData);

      await apiPost('/reports', reportData);

      setShowReportForm(false);
      setReportForm({
        faculty_name: '',
        class_name: '',
        week: '',
        lecture_date: '',
        course_name: '',
        course_code: '',
        lecturer_name: '',
        students_present: '',
        total_students: '',
        venue: '',
        scheduled_time: '',
        topic_taught: '',
        learning_outcomes: '',
        recommendations: ''
      });

      await fetchData();
      showSuccess('Report submitted successfully!');

    } catch (err) {
      console.error('Submit report error:', err);
      handleApiError(err, 'Failed to submit report');
    }
  };

  // Handle Add Class
  const handleAddClass = async (e) => {
    e.preventDefault();
    try {
      if (!classForm.name || !classForm.venue || !classForm.scheduled_time) {
        setError('Class name, venue, and scheduled time are required');
        return;
      }

      const classData = {
        ...classForm,
        module_id: classForm.module_id ? parseInt(classForm.module_id) : null
      };

      await apiPost('/classes', classData);
      
      setShowClassForm(false);
      setClassForm({
        name: '',
        venue: '',
        scheduled_time: '',
        module_id: ''
      });

      await fetchData();
      showSuccess('Class added successfully!');

    } catch (err) {
      console.error('Add class error:', err);
      handleApiError(err, 'Failed to add class');
    }
  };

  // Handle Submit Rating
  const handleSubmitRating = async (e) => {
    e.preventDefault();
    try {
      if (!ratingForm.report_id || !ratingForm.rating) {
        setError('Report and rating are required');
        return;
      }

      const ratingData = {
        ...ratingForm,
        report_id: parseInt(ratingForm.report_id),
        rating: parseInt(ratingForm.rating)
      };

      await apiPost('/ratings', ratingData);
      
      setShowRatingForm(false);
      setRatingForm({
        report_id: '',
        rating: '',
        comments: '',
        type: 'student_engagement'
      });

      await fetchData();
      showSuccess('Rating submitted successfully!');

    } catch (err) {
      console.error('Submit rating error:', err);
      handleApiError(err, 'Failed to submit rating');
    }
  };

  // Handle Search
  const handleSearch = async () => {
    if (!search.trim()) {
      await fetchData();
      return;
    }

    try {
      setLoading(true);
      const data = await apiGet(`/reports/search?query=${encodeURIComponent(search)}`);
      setReports(data);
      showSuccess(`Found ${data.length} reports matching "${search}"`);
    } catch (err) {
      handleApiError(err, 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  // Clear search and show all reports
  const handleClearSearch = async () => {
    setSearch('');
    await fetchData();
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  if (loading && modules.length === 0 && classes.length === 0 && reports.length === 0) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '50vh' }}>
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </div>
    );
  }

  return (
    <div className="container-fluid py-3">
      {error && (
        <Alert variant="danger" onClose={() => setError('')} dismissible>
          {error}
        </Alert>
      )}
      {success && (
        <Alert variant="success" onClose={() => setSuccess('')} dismissible>
          {success}
        </Alert>
      )}
      
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Lecturer Dashboard</h2>
        <Badge bg="primary">Welcome, {user?.name || 'Lecturer'}</Badge>
      </div>

      <Row>
        <Col md={6}>
          <Card className="h-100">
            <Card.Header className="d-flex justify-content-between align-items-center">
              <span>Lecture Reports ({reports.length})</span>
              <Button variant="primary" size="sm" onClick={() => setShowReportForm(true)}>
                Create New Report
              </Button>
            </Card.Header>
            <Card.Body>
              <div className="d-flex mb-3">
                <Form.Control 
                  value={search} 
                  onChange={e => setSearch(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Search reports by topic, class, or course..." 
                  className="me-2"
                />
                <Button onClick={handleSearch} variant="outline-primary" className="me-2" disabled={loading}>
                  {loading ? <Spinner animation="border" size="sm" /> : 'Search'}
                </Button>
                <Button onClick={handleClearSearch} variant="outline-secondary">
                  Clear
                </Button>
              </div>

              <div className="table-responsive">
                <Table striped bordered hover>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Class</th>
                      <th>Course</th>
                      <th>Topic</th>
                      <th>Attendance</th>
                      <th>Week</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map(report => (
                      <tr key={report.id}>
                        <td>{new Date(report.lecture_date).toLocaleDateString()}</td>
                        <td>{report.class_name}</td>
                        <td>{report.course_name} ({report.course_code})</td>
                        <td className="text-truncate" style={{ maxWidth: '150px' }} title={report.topic_taught}>
                          {report.topic_taught}
                        </td>
                        <td>
                          <Badge bg={report.students_present / report.total_students > 0.7 ? 'success' : 'warning'}>
                            {report.students_present}/{report.total_students}
                          </Badge>
                        </td>
                        <td>Week {report.week}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
              
              {reports.length === 0 && !loading && (
                <Alert variant="info" className="text-center">
                  No reports found. Create your first lecture report above.
                </Alert>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col md={6}>
          <Card className="h-100">
            <Card.Header className="d-flex justify-content-between align-items-center">
              <span>Classes ({classes.length})</span>
              <Button variant="primary" size="sm" onClick={() => setShowClassForm(true)}>
                Add New Class
              </Button>
            </Card.Header>
            <Card.Body>
              <div className="table-responsive">
                <Table striped bordered hover>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Venue</th>
                      <th>Time</th>
                      <th>Module</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classes.map(classItem => (
                      <tr key={classItem.id}>
                        <td>{classItem.name}</td>
                        <td>{classItem.venue}</td>
                        <td>{new Date(classItem.scheduled_time).toLocaleString()}</td>
                        <td>{modules.find(m => m.id === classItem.module_id)?.name || 'Not assigned'}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
              
              {classes.length === 0 && !loading && (
                <Alert variant="info" className="text-center">
                  No classes found. Add your first class above.
                </Alert>
              )}
            </Card.Body>
          </Card>

          <Card className="mt-4">
            <Card.Header>Monitoring Overview</Card.Header>
            <Card.Body>
              <Row>
                <Col md={6}>
                  <div className="text-center">
                    <h4>{(monitoring.avg_attendance * 100).toFixed(1)}%</h4>
                    <p className="text-muted mb-2">Average Attendance</p>
                    <div className="progress">
                      <div 
                        className="progress-bar bg-success" 
                        style={{ width: `${monitoring.avg_attendance * 100}%` }}
                        role="progressbar"
                      >
                      </div>
                    </div>
                  </div>
                </Col>
                <Col md={6}>
                  <div className="text-center">
                    <h4>{(monitoring.student_engagement * 100).toFixed(1)}%</h4>
                    <p className="text-muted mb-2">Student Engagement</p>
                    <div className="progress">
                      <div 
                        className="progress-bar bg-info" 
                        style={{ width: `${monitoring.student_engagement * 100}%` }}
                        role="progressbar"
                      >
                      </div>
                    </div>
                  </div>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="mt-4">
        <Col md={6}>
          <Card className="h-100">
            <Card.Header className="d-flex justify-content-between align-items-center">
              <span>My Assigned Modules</span>
              <Badge bg="primary">{modules.length} modules</Badge>
            </Card.Header>
            <Card.Body>
              <div className="table-responsive">
                <Table striped bordered hover>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Code</th>
                      <th>Course</th>
                      <th>Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {modules.map(module => (
                      <tr key={module.id}>
                        <td>
                          <strong>{module.name}</strong>
                          {module.lecturer_id && (
                            <Badge bg="success" className="ms-2">Assigned</Badge>
                          )}
                        </td>
                        <td>{module.code}</td>
                        <td>{module.course_name || 'General'}</td>
                        <td className="text-truncate" style={{ maxWidth: '200px' }} title={module.description}>
                          {module.description || 'No description'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
              
              {modules.length === 0 && !loading && (
                <Alert variant="info" className="text-center">
                  No modules assigned to you yet. Contact the Program Leader for module assignments.
                </Alert>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col md={6}>
          <Card className="h-100">
            <Card.Header className="d-flex justify-content-between align-items-center">
              <span>Ratings & Feedback</span>
              <Button variant="primary" size="sm" onClick={() => setShowRatingForm(true)}>
                Add Rating
              </Button>
            </Card.Header>
            <Card.Body style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {reports.filter(report => ratings[report.id]?.length > 0).length === 0 ? (
                <Alert variant="info" className="text-center">
                  No ratings yet. Add ratings for your lecture reports.
                </Alert>
              ) : (
                reports.map(report => (
                  ratings[report.id]?.length > 0 && (
                    <div key={report.id} className="mb-3 p-3 border rounded">
                      <div className="d-flex justify-content-between align-items-start">
                        <div>
                          <h6>Report #{report.id} - {report.course_name}</h6>
                          <small className="text-muted">
                            {new Date(report.lecture_date).toLocaleDateString()} - {report.topic_taught}
                          </small>
                        </div>
                        <Button 
                          variant="outline-primary" 
                          size="sm"
                          onClick={() => {
                            setRatingForm({...ratingForm, report_id: report.id});
                            setShowRatingForm(true);
                          }}
                        >
                          Rate This
                        </Button>
                      </div>
                      {ratings[report.id].map(rating => (
                        <div key={rating.id} className="mt-2 p-2 bg-light rounded">
                          <div className="fw-bold">
                            {'⭐'.repeat(rating.rating)} - {rating.type?.replace('_', ' ').toUpperCase()}
                          </div>
                          <div>{rating.comments}</div>
                          <small className="text-muted">
                            {new Date(rating.created_at).toLocaleDateString()}
                          </small>
                        </div>
                      ))}
                    </div>
                  )
                ))
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Report Form Modal */}
      <Modal show={showReportForm} onHide={() => setShowReportForm(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Create Lecture Report</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmitReport}>
          <Modal.Body>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Faculty Name *</Form.Label>
                  <Form.Control 
                    value={reportForm.faculty_name}
                    onChange={e => setReportForm({...reportForm, faculty_name: e.target.value})}
                    required
                    placeholder="Enter faculty name"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Class Name *</Form.Label>
                  <Form.Control 
                    value={reportForm.class_name}
                    onChange={e => setReportForm({...reportForm, class_name: e.target.value})}
                    required
                    placeholder="Enter class name"
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Week *</Form.Label>
                  <Form.Control 
                    type="number"
                    min="1"
                    max="52"
                    value={reportForm.week}
                    onChange={e => setReportForm({...reportForm, week: e.target.value})}
                    required
                    placeholder="Week number"
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Lecture Date *</Form.Label>
                  <Form.Control 
                    type="date"
                    value={reportForm.lecture_date}
                    onChange={e => setReportForm({...reportForm, lecture_date: e.target.value})}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Students Present *</Form.Label>
                  <Form.Control 
                    type="number"
                    min="0"
                    value={reportForm.students_present}
                    onChange={e => setReportForm({...reportForm, students_present: e.target.value})}
                    required
                    placeholder="Number present"
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Course Name</Form.Label>
                  <Form.Control 
                    value={reportForm.course_name}
                    onChange={e => setReportForm({...reportForm, course_name: e.target.value})}
                    placeholder="Enter course name"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Course Code</Form.Label>
                  <Form.Control 
                    value={reportForm.course_code}
                    onChange={e => setReportForm({...reportForm, course_code: e.target.value})}
                    placeholder="Enter course code"
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Venue</Form.Label>
                  <Form.Control 
                    value={reportForm.venue}
                    onChange={e => setReportForm({...reportForm, venue: e.target.value})}
                    placeholder="Enter venue"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Scheduled Time</Form.Label>
                  <Form.Control 
                    type="time"
                    value={reportForm.scheduled_time}
                    onChange={e => setReportForm({...reportForm, scheduled_time: e.target.value})}
                  />
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Topic Taught</Form.Label>
              <Form.Control 
                as="textarea"
                rows={2}
                value={reportForm.topic_taught}
                onChange={e => setReportForm({...reportForm, topic_taught: e.target.value})}
                placeholder="Describe the topic taught"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Learning Outcomes</Form.Label>
              <Form.Control 
                as="textarea"
                rows={2}
                value={reportForm.learning_outcomes}
                onChange={e => setReportForm({...reportForm, learning_outcomes: e.target.value})}
                placeholder="List learning outcomes"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Recommendations</Form.Label>
              <Form.Control 
                as="textarea"
                rows={2}
                value={reportForm.recommendations}
                onChange={e => setReportForm({...reportForm, recommendations: e.target.value})}
                placeholder="Any recommendations or observations"
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowReportForm(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={loading}>
              {loading ? <Spinner animation="border" size="sm" /> : 'Submit Report'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Class Form Modal */}
      <Modal show={showClassForm} onHide={() => setShowClassForm(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Add New Class</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleAddClass}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Class Name *</Form.Label>
              <Form.Control 
                value={classForm.name}
                onChange={e => setClassForm({...classForm, name: e.target.value})}
                required
                placeholder="Enter class name"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Venue *</Form.Label>
              <Form.Control 
                value={classForm.venue}
                onChange={e => setClassForm({...classForm, venue: e.target.value})}
                required
                placeholder="Enter venue"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Scheduled Time *</Form.Label>
              <Form.Control 
                type="datetime-local"
                value={classForm.scheduled_time}
                onChange={e => setClassForm({...classForm, scheduled_time: e.target.value})}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Assign to Module (Optional)</Form.Label>
              <Form.Select 
                value={classForm.module_id}
                onChange={e => setClassForm({...classForm, module_id: e.target.value})}
              >
                <option value="">Select Module</option>
                {modules.map(module => (
                  <option key={module.id} value={module.id}>
                    {module.name} ({module.code})
                  </option>
                ))}
              </Form.Select>
              <Form.Text className="text-muted">
                Only shows modules assigned to you by the Program Leader
              </Form.Text>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowClassForm(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={loading}>
              {loading ? <Spinner animation="border" size="sm" /> : 'Add Class'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Rating Form Modal */}
      <Modal show={showRatingForm} onHide={() => setShowRatingForm(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Add Rating</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmitRating}>
          <Modal.Body>
            <Form.Group className="mb-3">
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Rating Type</Form.Label>
              <Form.Select 
                value={ratingForm.type}
                onChange={e => setRatingForm({...ratingForm, type: e.target.value})}
              >
                <option value="student_engagement">Student Engagement</option>
                <option value="class_performance">Class Performance</option>
                <option value="course_delivery">Course Delivery</option>
                <option value="overall">Overall Rating</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Rating (1-5) *</Form.Label>
              <Form.Select 
                value={ratingForm.rating}
                onChange={e => setRatingForm({...ratingForm, rating: e.target.value})}
                required
              >
                <option value="">Select Rating</option>
                <option value="1">1- Poor</option>
                <option value="2">2- Fair</option>
                <option value="3">3- Good</option>
                <option value="4">4- Very Good</option>
                <option value="5">5- Excellent</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Comments</Form.Label>
              <Form.Control 
                as="textarea"
                rows={3}
                value={ratingForm.comments}
                onChange={e => setRatingForm({...ratingForm, comments: e.target.value})}
                placeholder="Add your comments or observations..."
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowRatingForm(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={loading}>
              {loading ? <Spinner animation="border" size="sm" /> : 'Submit Rating'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
};

export default LecturerDashboard;