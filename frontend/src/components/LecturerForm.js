import React, { useState, useEffect } from 'react';
import { Form, Button, Alert } from 'react-bootstrap';
import { addReport, getClasses } from '../services/api';

const LecturerForm = () => {
  const [formData, setFormData] = useState({
    faculty_name: 'Faculty of Information Communication Technology', // Default as per PDF
    class_name: '',
    week_of_reporting: '',
    date_of_lecture: '',
    course_name: '',
    course_code: '',
    lecturer_name: '',
    actual_students_present: '',
    venue: '',
    scheduled_lecture_time: '',
    topic_taught: '',
    learning_outcomes: '',
    lecturer_recommendations: '',
    class_id: ''
  });
  const [classes, setClasses] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      const res = await getClasses();
      setClasses(res.data);
    } catch (err) {
      setError('Error fetching classes. Check backend connection.');
      console.error(err);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updatedData = { ...prev, [name]: value };
      if (name === 'class_id') {
        const selectedClass = classes.find(c => c.id === parseInt(value));
        if (selectedClass) {
          updatedData.class_name = selectedClass.class_name;
          updatedData.course_name = 'Web Application Development'; // Default based on PDF
          updatedData.course_code = 'DIWA2110'; // Default based on PDF
          updatedData.venue = selectedClass.venue;
          updatedData.scheduled_lecture_time = selectedClass.scheduled_time;
        }
      }
      return updatedData;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    console.log('Submitting form data:', formData); // Log data for debugging

    // Basic validation
    if (!formData.class_id || !formData.week_of_reporting || !formData.date_of_lecture || !formData.topic_taught || !formData.learning_outcomes) {
      setError('Please fill all required fields.');
      return;
    }

    try {
      await addReport(formData);
      setSuccess('Report submitted successfully!');
      setFormData({
        faculty_name: 'Faculty of Information Communication Technology',
        class_name: '',
        week_of_reporting: '',
        date_of_lecture: '',
        course_name: '',
        course_code: '',
        lecturer_name: '',
        actual_students_present: '',
        venue: '',
        scheduled_lecture_time: '',
        topic_taught: '',
        learning_outcomes: '',
        lecturer_recommendations: '',
        class_id: ''
      });
    } catch (err) {
      setError('Error submitting. Check console for details or ensure all fields are valid.');
      console.error('API Error:', err.response ? err.response.data : err.message);
    }
  };

  return (
    <Form onSubmit={handleSubmit}>
      <h2>Lecturer Reporting Form</h2>
      {error && <Alert variant="danger">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}
      <Form.Group>
        <Form.Label>Faculty Name</Form.Label>
        <Form.Control value={formData.faculty_name} readOnly />
      </Form.Group>
      <Form.Group>
        <Form.Label>Class Name</Form.Label>
        <Form.Control as="select" name="class_id" value={formData.class_id} onChange={handleChange} required>
          <option value="">Select Class</option>
          {classes.map(c => <option key={c.id} value={c.id}>{c.class_name}</option>)}
        </Form.Control>
      </Form.Group>
      <Form.Group>
        <Form.Label>Week of Reporting</Form.Label>
        <Form.Control type="number" name="week_of_reporting" value={formData.week_of_reporting} onChange={handleChange} required />
      </Form.Group>
      <Form.Group>
        <Form.Label>Date of Lecture</Form.Label>
        <Form.Control type="date" name="date_of_lecture" value={formData.date_of_lecture} onChange={handleChange} required />
      </Form.Group>
      <Form.Group>
        <Form.Label>Course Name</Form.Label>
        <Form.Control value={formData.course_name} readOnly />
      </Form.Group>
      <Form.Group>
        <Form.Label>Course Code</Form.Label>
        <Form.Control value={formData.course_code} readOnly />
      </Form.Group>
      <Form.Group>
        <Form.Label>Lecturer’s Name</Form.Label>
        <Form.Control name="lecturer_name" value={formData.lecturer_name} onChange={handleChange} required />
      </Form.Group>
      <Form.Group>
        <Form.Label>Actual Number of Students Present</Form.Label>
        <Form.Control type="number" name="actual_students_present" value={formData.actual_students_present} onChange={handleChange} required />
      </Form.Group>
      <Form.Group>
        <Form.Label>Total Registered Students</Form.Label>
        <Form.Control value="Auto-retrieved" readOnly /> {/* Displayed as per backend logic */}
      </Form.Group>
      <Form.Group>
        <Form.Label>Venue</Form.Label>
        <Form.Control value={formData.venue} readOnly />
      </Form.Group>
      <Form.Group>
        <Form.Label>Scheduled Lecture Time</Form.Label>
        <Form.Control type="time" value={formData.scheduled_lecture_time} readOnly />
      </Form.Group>
      <Form.Group>
        <Form.Label>Topic Taught</Form.Label>
        <Form.Control as="textarea" name="topic_taught" value={formData.topic_taught} onChange={handleChange} required />
      </Form.Group>
      <Form.Group>
        <Form.Label>Learning Outcomes</Form.Label>
        <Form.Control as="textarea" name="learning_outcomes" value={formData.learning_outcomes} onChange={handleChange} required />
      </Form.Group>
      <Form.Group>
        <Form.Label>Lecturer’s Recommendations</Form.Label>
        <Form.Control as="textarea" name="lecturer_recommendations" value={formData.lecturer_recommendations} onChange={handleChange} />
      </Form.Group>
      <Button type="submit" className="mt-3">Submit Report</Button>
    </Form>
  );
};

export default LecturerForm;