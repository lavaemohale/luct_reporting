import React, { useState, useEffect, useContext } from 'react';
import { Table, Button, Card, Row, Col, Alert, Badge, Spinner } from 'react-bootstrap';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import ReportForm from '../components/ReportForm';
import Rating from '../components/Rating';
import Footer from '../components/Footer';

const LecturerDashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const [modules, setModules] = useState([]);
  const [classes, setClasses] = useState([]);
  const [reports, setReports] = useState([]);
  const [ratings, setRatings] = useState({});
  const [monitoring, setMonitoring] = useState({ avg_attendance: 0, student_engagement: 0 });
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // Modal states
  const [showReportForm, setShowReportForm] = useState(false);
  const [showClassForm, setShowClassForm] = useState(false);
  const [showRatingForm, setShowRatingForm] = useState(false);
  const [selectedReportForRating, setSelectedReportForRating] = useState(null);

  // Class form state
  const [classForm, setClassForm] = useState({
    name: '',
    venue: '',
    scheduled_time: '',
    module_id: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');

      const [modulesRes, classesRes, reportsRes, monitoringRes] = await Promise.allSettled([
        api.get('/lecturer/modules'),
        api.get('/classes'),
        api.get('/reports'),
        api.get('/monitoring/lecturer')
      ]);

      setModules(modulesRes.status === 'fulfilled' ? modulesRes.value.data || modulesRes.value : []);
      setClasses(classesRes.status === 'fulfilled' ? classesRes.value.data || classesRes.value : []);
      setReports(reportsRes.status === 'fulfilled' ? reportsRes.value.data || reportsRes.value : []);
      setMonitoring(monitoringRes.status === 'fulfilled' ? monitoringRes.value.data || monitoringRes.value : { avg_attendance: 0, student_engagement: 0 });

      // Fetch ratings for each report if we have reports
      if (reportsRes.status === 'fulfilled' && (reportsRes.value.data || reportsRes.value).length > 0) {
        fetchRatings(reportsRes.value.data || reportsRes.value);
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
        api.get(`/reports/${report.id}/ratings`).catch(err => {
          console.error(`Error fetching ratings for report ${report.id}:`, err);
          return { data: [] };
        })
      );
      
      const ratingsResults = await Promise.allSettled(ratingsPromises);
      const ratingsMap = {};
      
      reportsList.forEach((report, index) => {
        ratingsMap[report.id] = ratingsResults[index].status === 'fulfilled' ? 
          (ratingsResults[index].value.data || ratingsResults[index].value) : [];
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

  const showSuccessMessage = (message) => {
    setSuccess(message);
    setTimeout(() => setSuccess(''), 5000);
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

      await api.post('/classes', classData);
      
      setShowClassForm(false);
      setClassForm({
        name: '',
        venue: '',
        scheduled_time: '',
        module_id: ''
      });

      await fetchData();
      showSuccessMessage('Class added successfully!');

    } catch (err) {
      console.error('Add class error:', err);
      handleApiError(err, 'Failed to add class');
    }
  };

  // Handle Report Submission from ReportForm component
  const handleReportSubmitted = () => {
    setReports(prev => [...prev]);
    showSuccessMessage('Report submitted successfully!');
    fetchData(); // Refresh to get updated data
  };

  // Handle Rating Submission from Rating component
  const handleRatingSubmitted = () => {
  showSuccessMessage('Rating submitted successfully!');
  fetchData(); // Refresh to get updated ratings
};

  // Handle Search
  const handleSearch = async () => {
    if (!search.trim()) {
      await fetchData();
      return;
    }

    try {
      setLoading(true);
      const response = await api.get(`/reports/search?query=${encodeURIComponent(search)}`);
      setReports(response.data.data || response.data);
      showSuccessMessage(`Found ${(response.data.data || response.data).length} reports matching "${search}"`);
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
    <div className="d-flex flex-column min-vh-100">
      <div className="container-fluid py-3 flex-grow-1">
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
                  <input 
                    type="text"
                    className="form-control me-2"
                    value={search} 
                    onChange={e => setSearch(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Search reports by topic, class, or course..." 
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
                        <th>Actions</th>
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
                          <td>
                            <Button 
                              variant="outline-primary" 
                              size="sm"
                              onClick={() => {
                                setSelectedReportForRating(report);
                                setShowRatingForm(true);
                              }}
                            >
                              Rate
                            </Button>
                          </td>
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
                <Button variant="primary" size="sm" onClick={() => {
                  setSelectedReportForRating(null);
                  setShowRatingForm(true);
                }}>
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
                              setSelectedReportForRating(report);
                              setShowRatingForm(true);
                            }}
                          >
                            Add Rating
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
        <ReportForm 
          show={showReportForm}
          onHide={() => setShowReportForm(false)}
          onReportSubmitted={handleReportSubmitted}
        />

        {/* Rating Modal */}
        <Rating 
          show={showRatingForm}
          onHide={() => {
            setShowRatingForm(false);
            setSelectedReportForRating(null);
          }}
          onRatingSubmitted={handleRatingSubmitted}
          reportId={selectedReportForRating?.id}
          reportDetails={selectedReportForRating}
        />

        {/* Class Form Modal */}
        {showClassForm && (
          <div className="modal show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Add New Class</h5>
                  <button type="button" className="btn-close" onClick={() => setShowClassForm(false)}></button>
                </div>
                <form onSubmit={handleAddClass}>
                  <div className="modal-body">
                    <div className="mb-3">
                      <label className="form-label">Class Name *</label>
                      <input 
                        type="text"
                        className="form-control"
                        value={classForm.name}
                        onChange={e => setClassForm({...classForm, name: e.target.value})}
                        required
                        placeholder="Enter class name"
                      />
                    </div>

                    <div className="mb-3">
                      <label className="form-label">Venue *</label>
                      <input 
                        type="text"
                        className="form-control"
                        value={classForm.venue}
                        onChange={e => setClassForm({...classForm, venue: e.target.value})}
                        required
                        placeholder="Enter venue"
                      />
                    </div>

                    <div className="mb-3">
                      <label className="form-label">Scheduled Time *</label>
                      <input 
                        type="datetime-local"
                        className="form-control"
                        value={classForm.scheduled_time}
                        onChange={e => setClassForm({...classForm, scheduled_time: e.target.value})}
                        required
                      />
                    </div>

                    <div className="mb-3">
                      <label className="form-label">Assign to Module (Optional)</label>
                      <select 
                        className="form-select"
                        value={classForm.module_id}
                        onChange={e => setClassForm({...classForm, module_id: e.target.value})}
                      >
                        <option value="">Select Module</option>
                        {modules.map(module => (
                          <option key={module.id} value={module.id}>
                            {module.name} ({module.code})
                          </option>
                        ))}
                      </select>
                      <div className="form-text">
                        Only shows modules assigned to you by the Program Leader
                      </div>
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={() => setShowClassForm(false)}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={loading}>
                      {loading ? <Spinner animation="border" size="sm" /> : 'Add Class'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Footer */}
      <Footer />
    </div>
  );
};

export default LecturerDashboard;