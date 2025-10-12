import React, { useState, useContext } from 'react';
import { Modal, Form, Button, Alert, Row, Col, Spinner } from 'react-bootstrap';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';

const ReportForm = ({ show, onHide, onReportSubmitted, mode = 'create', initialData = {} }) => {
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    faculty_name: initialData.faculty_name || '',
    class_name: initialData.class_name || '',
    week: initialData.week || '',
    lecture_date: initialData.lecture_date || '',
    course_name: initialData.course_name || '',
    course_code: initialData.course_code || '',
    lecturer_name: initialData.lecturer_name || user?.name || '',
    students_present: initialData.students_present || '',
    total_students: initialData.total_students || '',
    venue: initialData.venue || '',
    scheduled_time: initialData.scheduled_time || '',
    topic_taught: initialData.topic_taught || '',
    learning_outcomes: initialData.learning_outcomes || '',
    recommendations: initialData.recommendations || ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Validation
      if (!formData.faculty_name || !formData.class_name || !formData.week || !formData.lecture_date) {
        throw new Error('Please fill in all required fields');
      }

      const submitData = {
        ...formData,
        week: parseInt(formData.week),
        students_present: parseInt(formData.students_present),
        total_students: parseInt(formData.total_students) || 0,
        lecturer_name: formData.lecturer_name || user?.name || 'Current User'
      };

      let response;
      if (mode === 'edit' && initialData.id) {
        response = await api.put(`/reports/${initialData.id}`, submitData);
      } else {
        response = await api.post('/reports', submitData);
      }

      // Reset form
      if (mode === 'create') {
        setFormData({
          faculty_name: '',
          class_name: '',
          week: '',
          lecture_date: '',
          course_name: '',
          course_code: '',
          lecturer_name: user?.name || '',
          students_present: '',
          total_students: '',
          venue: '',
          scheduled_time: '',
          topic_taught: '',
          learning_outcomes: '',
          recommendations: ''
        });
      }

      onReportSubmitted(response.data);
      onHide();

    } catch (err) {
      console.error('Report submission error:', err);
      setError(err.response?.data?.message || err.message || 'Failed to submit report');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setError('');
    setLoading(false);
    onHide();
  };

  return (
    <Modal show={show} onHide={handleClose} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>
          {mode === 'edit' ? 'Edit Report' : 'Create Lecture Report'}
        </Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          
          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Faculty Name *</Form.Label>
                <Form.Control 
                  name="faculty_name"
                  value={formData.faculty_name}
                  onChange={handleChange}
                  required
                  placeholder="Enter faculty name"
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Class Name *</Form.Label>
                <Form.Control 
                  name="class_name"
                  value={formData.class_name}
                  onChange={handleChange}
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
                  name="week"
                  min="1"
                  max="52"
                  value={formData.week}
                  onChange={handleChange}
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
                  name="lecture_date"
                  value={formData.lecture_date}
                  onChange={handleChange}
                  required
                />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>Students Present *</Form.Label>
                <Form.Control 
                  type="number"
                  name="students_present"
                  min="0"
                  value={formData.students_present}
                  onChange={handleChange}
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
                  name="course_name"
                  value={formData.course_name}
                  onChange={handleChange}
                  placeholder="Enter course name"
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Course Code</Form.Label>
                <Form.Control 
                  name="course_code"
                  value={formData.course_code}
                  onChange={handleChange}
                  placeholder="Enter course code"
                />
              </Form.Group>
            </Col>
          </Row>

          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Lecturer Name</Form.Label>
                <Form.Control 
                  name="lecturer_name"
                  value={formData.lecturer_name}
                  onChange={handleChange}
                  placeholder="Enter lecturer name"
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Total Students</Form.Label>
                <Form.Control 
                  type="number"
                  name="total_students"
                  min="0"
                  value={formData.total_students}
                  onChange={handleChange}
                  placeholder="Total number of students"
                />
              </Form.Group>
            </Col>
          </Row>

          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Venue</Form.Label>
                <Form.Control 
                  name="venue"
                  value={formData.venue}
                  onChange={handleChange}
                  placeholder="Enter venue"
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Scheduled Time</Form.Label>
                <Form.Control 
                  type="time"
                  name="scheduled_time"
                  value={formData.scheduled_time}
                  onChange={handleChange}
                />
              </Form.Group>
            </Col>
          </Row>

          <Form.Group className="mb-3">
            <Form.Label>Topic Taught</Form.Label>
            <Form.Control 
              as="textarea"
              rows={2}
              name="topic_taught"
              value={formData.topic_taught}
              onChange={handleChange}
              placeholder="Describe the topic taught"
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Learning Outcomes</Form.Label>
            <Form.Control 
              as="textarea"
              rows={2}
              name="learning_outcomes"
              value={formData.learning_outcomes}
              onChange={handleChange}
              placeholder="List learning outcomes"
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Recommendations</Form.Label>
            <Form.Control 
              as="textarea"
              rows={2}
              name="recommendations"
              value={formData.recommendations}
              onChange={handleChange}
              placeholder="Any recommendations or observations"
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={loading}>
            {loading ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                {mode === 'edit' ? 'Updating...' : 'Submitting...'}
              </>
            ) : (
              mode === 'edit' ? 'Update Report' : 'Submit Report'
            )}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default ReportForm;