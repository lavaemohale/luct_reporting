import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import { Button, Alert, Card, Row, Col, Spinner } from 'react-bootstrap';
import ReportForm from '../components/ReportForm';
import Rating from '../components/Rating';
import Footer from '../components/Footer';

const StudentDashboard = () => {
  const { user, setUser } = useContext(AuthContext);
  const [attendance, setAttendance] = useState([]);
  const [progress, setProgress] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [error, setError] = useState('');
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showReportForm, setShowReportForm] = useState(false);
  const [showRatingForm, setShowRatingForm] = useState(false);
  const [selectedReportForRating, setSelectedReportForRating] = useState(null);

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
          api.get('/students/me/attendance').catch(() => ({ data: [] })),
          api.get('/students/me/progress').catch(() => ({ data: [] })),
          api.get('/students/me/feedback').catch(() => ({ data: [] })),
          api.get('/reports').catch(() => ({ data: [] }))
        ]);
        
        setAttendance(att.data || []);
        setProgress(prog.data || []);
        setFeedback(fb.data || []);
        setReports(rpts.data ? rpts.data.filter(r => r.student_id === user.id || r.lecturer_id === user.id) : []);
      } catch (err) {
        console.error('Dashboard fetch error:', err);
        const errorMessage = err.response ? `API Error: ${err.response.status} - ${err.response.data.message}` : `Network Error: ${err.message}`;
        if (err.response && err.response.status === 401) {
          setError('Session expired. Please log in again.');
          localStorage.removeItem('token');
          setUser(null);
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

  // Handle Report Submission from ReportForm component
  const handleReportSubmitted = (newReport) => {
    setReports(prev => [...prev, newReport]);
    setError('Report submitted successfully!');
    setTimeout(() => setError(''), 3000);
  };

  // Handle Rating Submission from Rating component
  const handleRatingSubmitted = () => {
  setError('Rating submitted successfully!');
  setTimeout(() => setError(''), 3000);
};

  if (loading) return (
    <div className="d-flex justify-content-center align-items-center" style={{ height: '50vh' }}>
      <Spinner animation="border" role="status">
        <span className="visually-hidden">Loading...</span>
      </Spinner>
    </div>
  );
  
  if (!user) return <div>Please log in to view the dashboard.</div>;

  return (
    <div className="d-flex flex-column min-vh-100">
      <div className="container mt-5 flex-grow-1">
        <h2>Welcome, {user.name}</h2>

        {error && (
          <Alert variant={error.includes('successfully') ? 'success' : 'danger'}>
            {error}
          </Alert>
        )}

        <Row>
          <Col md={4}>
            <Card className="mb-4">
              <Card.Header>
                <h5>Attendance</h5>
              </Card.Header>
              <Card.Body>
                {attendance.length > 0 ? (
                  <ul className="list-unstyled">
                    {attendance.map((a, i) => (
                      <li key={i} className="mb-2">
                        <strong>{a.module_name}</strong><br />
                        {a.lecture_date} - {a.present ? 'Present' : 'Absent'}
                      </li>
                    ))}
                  </ul>
                ) : <p className="text-muted">No attendance data</p>}
              </Card.Body>
            </Card>
          </Col>

          <Col md={4}>
            <Card className="mb-4">
              <Card.Header>
                <h5>Progress</h5>
              </Card.Header>
              <Card.Body>
                {progress.length > 0 ? (
                  <ul className="list-unstyled">
                    {progress.map((p, i) => (
                      <li key={i} className="mb-2">
                        <strong>{p.module_name}</strong><br />
                        <div className="progress mb-1">
                          <div 
                            className="progress-bar" 
                            style={{ width: `${p.progress * 100}%` }}
                          >
                            {(p.progress * 100).toFixed(1)}%
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : <p className="text-muted">No progress data</p>}
              </Card.Body>
            </Card>
          </Col>

          <Col md={4}>
            <Card className="mb-4">
              <Card.Header>
                <h5>Feedback</h5>
              </Card.Header>
              <Card.Body>
                {feedback.length > 0 ? (
                  <div>
                    <ul className="list-unstyled">
                      {feedback.map((f, i) => (
                        <li key={i} className="mb-2">
                          <strong>{f.module_name}</strong><br />
                          {f.lecture_date} - {f.feedback}
                        </li>
                      ))}
                    </ul>
                    <Button onClick={handleDownloadFeedback} variant="primary" size="sm">
                      Download Feedback
                    </Button>
                  </div>
                ) : <p className="text-muted">No feedback data</p>}
              </Card.Body>
            </Card>
          </Col>
        </Row>

        <Row>
          <Col md={6}>
            <Card className="mb-4">
              <Card.Header className="d-flex justify-content-between align-items-center">
                <h5>My Reports ({reports.length})</h5>
                <Button variant="primary" size="sm" onClick={() => setShowReportForm(true)}>
                  Submit New Report
                </Button>
              </Card.Header>
              <Card.Body>
                {reports.length > 0 ? (
                  <div className="table-responsive">
                    <table className="table table-striped">
                      <thead>
                        <tr>
                          <th>Module</th>
                          <th>Date</th>
                          <th>Comments</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reports.map(report => (
                          <tr key={report.id}>
                            <td>{report.module_name}</td>
                            <td>{new Date(report.lecture_date).toLocaleDateString()}</td>
                            <td>{report.comments}</td>
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
                    </table>
                  </div>
                ) : (
                  <p className="text-muted">No reports submitted yet.</p>
                )}
              </Card.Body>
            </Card>
          </Col>

          <Col md={6}>
            <Card className="mb-4">
              <Card.Header className="d-flex justify-content-between align-items-center">
                <h5>Rate Reports</h5>
                <Button 
                  variant="primary" 
                  size="sm" 
                  onClick={() => {
                    setSelectedReportForRating(null);
                    setShowRatingForm(true);
                  }}
                >
                  Add Rating
                </Button>
              </Card.Header>
              <Card.Body>
                <p>Rate lecture reports to provide feedback on your learning experience.</p>
                <ul className="list-unstyled">
                  {reports.map(report => (
                    <li key={report.id} className="mb-2 p-2 border rounded">
                      <strong>{report.module_name}</strong> - {new Date(report.lecture_date).toLocaleDateString()}
                      <br />
                      <Button 
                        variant="outline-primary" 
                        size="sm" 
                        className="mt-1"
                        onClick={() => {
                          setSelectedReportForRating(report);
                          setShowRatingForm(true);
                        }}
                      >
                        Rate This Report
                      </Button>
                    </li>
                  ))}
                </ul>
                {reports.length === 0 && (
                  <p className="text-muted">Submit a report first to rate it.</p>
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
      </div>
      
      {/* Footer */}
      <Footer />
    </div>
  );
};

export default StudentDashboard;