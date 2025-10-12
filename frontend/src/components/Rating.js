import React, { useState, useContext } from 'react';
import { Modal, Form, Button, Alert, Row, Col, Spinner, Badge } from 'react-bootstrap';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';

const Rating = ({ 
  show, 
  onHide, 
  onRatingSubmitted, 
  reportId = null, 
  reportDetails = null,
  mode = 'create', 
  initialData = {} 
}) => {
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    report_id: initialData.report_id || reportId || '',
    rating: initialData.rating || '',
    comments: initialData.comments || '',
    type: initialData.type || 'student_engagement'
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
      if (!formData.report_id || !formData.rating) {
        throw new Error('Report ID and rating are required');
      }

      const submitData = {
        ...formData,
        report_id: parseInt(formData.report_id),
        rating: parseInt(formData.rating),
        rated_by: user?.id,
        rated_by_name: user?.name || 'Anonymous'
      };

      let response;
      if (mode === 'edit' && initialData.id) {
        response = await api.put(`/ratings/${initialData.id}`, submitData);
      } else {
        response = await api.post('/ratings', submitData);
      }

      // Reset form if creating new
      if (mode === 'create') {
        setFormData({
          report_id: reportId || '',
          rating: '',
          comments: '',
          type: 'student_engagement'
        });
      }

      onRatingSubmitted(response.data);
      onHide();

    } catch (err) {
      console.error('Rating submission error:', err);
      setError(err.response?.data?.message || err.message || 'Failed to submit rating');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setError('');
    setLoading(false);
    onHide();
  };

  const ratingOptions = [
    { value: '1', label: '1 - Poor' },
    { value: '2', label: '2 - Fair' },
    { value: '3', label: '3 - Good' },
    { value: '4', label: '4 - Very Good' },
    { value: '5', label: '5 - Excellent' }
  ];

  const ratingTypes = [
    { value: 'student_engagement', label: 'Student Engagement' },
    { value: 'class_performance', label: 'Class Performance' },
    { value: 'course_delivery', label: 'Course Delivery' },
    { value: 'content_quality', label: 'Content Quality' },
    { value: 'overall', label: 'Overall Rating' }
  ];

  return (
    <Modal show={show} onHide={handleClose}>
      <Modal.Header closeButton>
        <Modal.Title>
          {mode === 'edit' ? 'Edit Rating' : 'Add Rating'}
          {reportDetails && (
            <Badge bg="secondary" className="ms-2">
              Report #{reportDetails.id}
            </Badge>
          )}
        </Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          
          {reportDetails && (
            <div className="mb-3 p-3 bg-light rounded">
              <h6>Report Details:</h6>
              <p className="mb-1">
                <strong>Course:</strong> {reportDetails.course_name} ({reportDetails.course_code})
              </p>
              <p className="mb-1">
                <strong>Class:</strong> {reportDetails.class_name}
              </p>
              <p className="mb-1">
                <strong>Topic:</strong> {reportDetails.topic_taught}
              </p>
              <p className="mb-0">
                <strong>Date:</strong> {new Date(reportDetails.lecture_date).toLocaleDateString()}
              </p>
            </div>
          )}

          {!reportId && (
            <Form.Group className="mb-3">
              <Form.Label>Report ID *</Form.Label>
              <Form.Control 
                type="number"
                name="report_id"
                value={formData.report_id}
                onChange={handleChange}
                required
                min="1"
                placeholder="Enter report ID to rate"
              />
              <Form.Text className="text-muted">
                Enter the ID of the report you want to rate
              </Form.Text>
            </Form.Group>
          )}

          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Rating Type</Form.Label>
                <Form.Select 
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                >
                  {ratingTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Rating (1-5) *</Form.Label>
                <Form.Select 
                  name="rating"
                  value={formData.rating}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select Rating</option>
                  {ratingOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>

          <Form.Group className="mb-3">
            <Form.Label>Comments</Form.Label>
            <Form.Control 
              as="textarea"
              rows={4}
              name="comments"
              value={formData.comments}
              onChange={handleChange}
              placeholder="Add your detailed comments, observations, or feedback..."
            />
            <Form.Text className="text-muted">
              Provide specific feedback about what worked well and what could be improved
            </Form.Text>
          </Form.Group>

          {/* Rating Guide */}
          <div className="p-3 bg-light rounded">
            <h6>Rating Guide:</h6>
            <div className="small">
              <div>⭐ 1 - Poor: Significant issues, needs major improvement</div>
              <div>⭐⭐ 2 - Fair: Below average, several areas need improvement</div>
              <div>⭐⭐⭐ 3 - Good: Meets expectations, satisfactory performance</div>
              <div>⭐⭐⭐⭐ 4 - Very Good: Exceeds expectations, strong performance</div>
              <div>⭐⭐⭐⭐⭐ 5 - Excellent: Outstanding, exemplary performance</div>
            </div>
          </div>
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
              mode === 'edit' ? 'Update Rating' : 'Submit Rating'
            )}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default Rating;