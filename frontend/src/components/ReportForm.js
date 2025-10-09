import React, { useState, useEffect } from 'react';
import { Form, Button } from 'react-bootstrap';
import { useForm } from 'react-hook-form';
import api from '../services/api';

const ReportForm = () => {
  const { register, handleSubmit, setValue } = useForm();
  const [faculties, setFaculties] = useState([]);
  const [courses, setCourses] = useState([]);
  const [modules, setModules] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(''); // Used in state

  useEffect(() => {
    api.get('/faculties').then(res => setFaculties(res.data));
    api.get('/courses').then(res => setCourses(res.data));
  }, []);

  const onCourseChange = (e) => {
    const courseId = e.target.value;
    setSelectedCourse(courseId); // Update state
    const course = courses.find(c => c.id === parseInt(courseId));
    if (course) {
      setValue('course_name', course.name);
      setValue('course_code', course.code);
      api.get(`/courses/${courseId}/modules`).then(res => setModules(res.data));
    }
  };

  const onModuleChange = async (e) => {
    const moduleId = e.target.value;
    const module = modules.find(m => m.id === parseInt(moduleId));
    if (module) {
      setValue('module_name', module.name);
      const { data } = await api.get(`/modules/${moduleId}/total_students`);
      setValue('total_students', data.total_students);
    }
  };

  const onSubmit = (data) => api.post('/reports', data).then(() => alert('Report submitted'));

  return (
    <Form onSubmit={handleSubmit(onSubmit)}>
      <Form.Group>
        <Form.Label>Faculty Name</Form.Label>
        <Form.Select {...register('faculty_name')}>
          <option></option>
          {faculties.map(f => <option key={f.id} value={f.name}>{f.name}</option>)}
        </Form.Select>
      </Form.Group>
      <Form.Group>
        <Form.Label>Class Name</Form.Label>
        <Form.Control {...register('class_name')} />
      </Form.Group>
      <Form.Group>
        <Form.Label>Week</Form.Label>
        <Form.Control type="number" {...register('week')} />
      </Form.Group>
      <Form.Group>
        <Form.Label>Lecture Date</Form.Label>
        <Form.Control type="date" {...register('lecture_date')} />
      </Form.Group>
      <Form.Group>
        <Form.Label>Course</Form.Label>
        <Form.Select onChange={onCourseChange} value={selectedCourse}> {/* Use selectedCourse */}
          <option></option>
          {courses.map(c => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
        </Form.Select>
      </Form.Group>
      <Form.Group>
        <Form.Label>Course Name</Form.Label>
        <Form.Control {...register('course_name')} readOnly />
      </Form.Group>
      <Form.Group>
        <Form.Label>Course Code</Form.Label>
        <Form.Control {...register('course_code')} readOnly />
      </Form.Group>
      <Form.Group>
        <Form.Label>Module</Form.Label>
        <Form.Select {...register('module_id')} onChange={onModuleChange}>
          <option></option>
          {modules.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </Form.Select>
      </Form.Group>
      <Form.Group>
        <Form.Label>Module Name</Form.Label>
        <Form.Control {...register('module_name')} readOnly />
      </Form.Group>
      <Form.Group>
        <Form.Label>Students Present</Form.Label>
        <Form.Control type="number" {...register('students_present')} />
      </Form.Group>
      <Form.Group>
        <Form.Label>Total Students</Form.Label>
        <Form.Control {...register('total_students')} readOnly />
      </Form.Group>
      <Form.Group>
        <Form.Label>Venue</Form.Label>
        <Form.Control {...register('venue')} />
      </Form.Group>
      <Form.Group>
        <Form.Label>Scheduled Time</Form.Label>
        <Form.Control type="datetime-local" {...register('scheduled_time')} />
      </Form.Group>
      <Form.Group>
        <Form.Label>Topic Taught</Form.Label>
        <Form.Control as="textarea" {...register('topic_taught')} />
      </Form.Group>
      <Form.Group>
        <Form.Label>Learning Outcomes</Form.Label>
        <Form.Control as="textarea" {...register('learning_outcomes')} />
      </Form.Group>
      <Form.Group>
        <Form.Label>Recommendations</Form.Label>
        <Form.Control as="textarea" {...register('recommendations')} />
      </Form.Group>
      <Button type="submit">Submit Report</Button>
    </Form>
  );
};

export default ReportForm;