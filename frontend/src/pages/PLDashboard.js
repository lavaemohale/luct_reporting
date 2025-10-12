import React, { useState, useEffect } from 'react'; // Remove useContext from imports
import { Table, Form, Button, Card, Row, Col, Alert, Badge, Spinner } from 'react-bootstrap';
// Remove AuthContext import since it's not used
import api from '../services/api';
import Footer from '../components/Footer';

const PLDashboard = () => {
  // Remove this line: const { user } = useContext(AuthContext);
  const [courses, setCourses] = useState([]);
  const [modules, setModules] = useState([]);
  const [lecturers, setLecturers] = useState([]);
  const [programMonitoring, setProgramMonitoring] = useState({
    overall_performance: 0,
    avg_attendance: 0,
    curriculum_coverage: 0,
    lecturer_performance: {},
    student_satisfaction: 0,
    report_completion_rate: 0
  });
  // ... rest of the PLDashboard.js code remains exactly the same ...
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  
  // Form states
  const [courseForm, setCourseForm] = useState({ name: '', code: '', faculty_id: '' });
  const [moduleForm, setModuleForm] = useState({ name: '', code: '', description: '', course_id: '', lecturer_id: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      console.log('Fetching data...');
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token found');

      const [coursesRes, monitoringRes, lecturersRes] = await Promise.all([
        api.get('/courses'),
        api.get('/monitoring/program'),
        api.get('/users/lecturers') // Get all lecturers
      ]);

      console.log('Courses fetched:', coursesRes.data);
      console.log('Lecturers fetched:', lecturersRes.data);

      // Handle both array and object responses
      const coursesData = Array.isArray(coursesRes.data) ? coursesRes.data : coursesRes.data.courses || [];
      
      // Filter to only include lecturers (not other roles)
      let lecturersData = Array.isArray(lecturersRes.data) ? lecturersRes.data : lecturersRes.data.lecturers || [];
      lecturersData = lecturersData.filter(user => user.role === 'lecturer');
      
      console.log('Filtered lecturers:', lecturersData);

      setCourses(coursesData);
      setLecturers(lecturersData);
      setProgramMonitoring(monitoringRes.data || {
        overall_performance: 0,
        avg_attendance: 0,
        curriculum_coverage: 0,
        lecturer_performance: {},
        student_satisfaction: 0,
        report_completion_rate: 0
      });

      // Fetch modules for each course
      const modulesPromises = coursesData.map(c => 
        api.get(`/courses/${c.id}/modules`).catch(err => {
          console.error(`Error fetching modules for course ${c.id}:`, err);
          return { data: [] };
        })
      );
      const modulesRes = await Promise.all(modulesPromises);
      const allModules = modulesRes.flatMap(res => 
        Array.isArray(res.data) ? res.data : res.data.modules || []
      );
      console.log('Modules fetched:', allModules);
      setModules(allModules);

    } catch (err) {
      console.error('Fetch data error:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to load data';
      if (err.response && err.response.status === 401) {
        setError('Failed to load data: Invalid token. Please log in again.');
        localStorage.removeItem('token');
      } else {
        setError(`Failed to load data: ${errorMessage}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // IMPROVED: Add Course Function with Better Response Handling
  const handleAddCourse = async (e) => {
    e.preventDefault();
    console.log('Add course button clicked');
    console.log('Form data:', courseForm);
    
    try {
      setError('');
      // Validation
      if (!courseForm.name || !courseForm.code || !courseForm.faculty_id) {
        setError('All fields (Name, Code, Faculty ID) are required.');
        return;
      }

      // Prepare data
      const courseData = {
        name: courseForm.name.trim(),
        code: courseForm.code.trim().toUpperCase(),
        faculty_id: parseInt(courseForm.faculty_id)
      };

      console.log('Sending course data:', courseData);

      // Make API call
      const response = await api.post('/courses', courseData);
      console.log('Course API response:', response.data);

      // Handle different response formats
      let newCourse;
      if (response.data.course) {
        newCourse = response.data.course;
      } else if (response.data.id) {
        newCourse = response.data;
      } else if (Array.isArray(response.data) && response.data[0]) {
        newCourse = response.data[0];
      } else {
        throw new Error('Invalid response format from server');
      }

      console.log('New course data:', newCourse);
      
      // Update state with new course
      setCourses(prevCourses => {
        const updatedCourses = [...prevCourses, newCourse];
        console.log('Updated courses:', updatedCourses);
        return updatedCourses;
      });
      
      // Reset form
      setCourseForm({ name: '', code: '', faculty_id: '' });
      
      // Show success message
      const successMessage = response.data.message || 'Course added successfully!';
      setSuccess(successMessage);
      setTimeout(() => setSuccess(''), 5000);
      
      // Refresh modules to ensure consistency
      setTimeout(() => {
        fetchModulesForCourse(newCourse.id);
      }, 1000);
      
    } catch (err) {
      console.error('Add course error details:', err);
      console.error('Error response:', err.response);
      
      let errorMessage = 'Failed to add course';
      
      if (err.response) {
        if (err.response.status === 400) {
          errorMessage = err.response.data?.message || 'Invalid data. Please check your inputs.';
        } else if (err.response.status === 401) {
          errorMessage = 'Unauthorized. Please log in again.';
          localStorage.removeItem('token');
        } else if (err.response.status === 409) {
          errorMessage = err.response.data?.message || 'Course with this code already exists.';
        } else if (err.response.status === 500) {
          errorMessage = 'Server error. Please try again later.';
        } else {
          errorMessage = err.response.data?.message || `Error: ${err.response.status}`;
        }
      } else if (err.request) {
        errorMessage = 'No response from server. Please check your connection.';
      } else {
        errorMessage = err.message || 'Unknown error occurred';
      }
      
      setError(errorMessage);
    }
  };

  // IMPROVED: Add Module Function with Better Response Handling
  const handleAddModule = async (e) => {
    e.preventDefault();
    console.log('Add module button clicked');
    console.log('Module form data:', moduleForm);
    
    try {
      setError('');
      // Validation
      if (!moduleForm.name || !moduleForm.code || !moduleForm.course_id) {
        setError('Name, Code, and Course are required fields.');
        return;
      }

      // Prepare data - ensure course_id is integer
      const moduleData = {
        name: moduleForm.name.trim(),
        code: moduleForm.code.trim().toUpperCase(),
        description: moduleForm.description.trim(),
        course_id: parseInt(moduleForm.course_id),
        lecturer_id: moduleForm.lecturer_id ? parseInt(moduleForm.lecturer_id) : null
      };

      console.log('Sending module data:', moduleData);

      // Make API call
      const response = await api.post('/modules', moduleData);
      console.log('Module API response:', response.data);

      // Handle different response formats
      let newModule;
      if (response.data.module) {
        newModule = response.data.module;
      } else if (response.data.id) {
        newModule = response.data;
      } else if (Array.isArray(response.data) && response.data[0]) {
        newModule = response.data[0];
      } else {
        throw new Error('Invalid response format from server');
      }

      console.log('New module data:', newModule);

      // Update state with new module
      setModules(prevModules => {
        const updatedModules = [...prevModules, newModule];
        console.log('Updated modules:', updatedModules);
        return updatedModules;
      });
      
      // Reset form
      setModuleForm({ name: '', code: '', description: '', course_id: '', lecturer_id: '' });
      
      // Show success message
      const lecturerName = moduleForm.lecturer_id 
        ? lecturers.find(l => l.id === parseInt(moduleForm.lecturer_id))?.name 
        : null;
      
      const successMessage = response.data.message || 
        (lecturerName 
          ? `Module "${newModule.name}" added successfully and assigned to ${lecturerName}!`
          : `Module "${newModule.name}" added successfully!`);
      
      setSuccess(successMessage);
      setTimeout(() => setSuccess(''), 5000);
      
    } catch (err) {
      console.error('Add module error details:', err);
      console.error('Error response:', err.response);
      
      let errorMessage = 'Failed to add module';
      
      if (err.response) {
        if (err.response.status === 400) {
          errorMessage = err.response.data?.message || 'Invalid data. Please check your inputs.';
        } else if (err.response.status === 401) {
          errorMessage = 'Unauthorized. Please log in again.';
          localStorage.removeItem('token');
        } else if (err.response.status === 409) {
          errorMessage = err.response.data?.message || 'Module with this code already exists.';
        } else if (err.response.status === 500) {
          errorMessage = 'Server error. Please try again later.';
        } else {
          errorMessage = err.response.data?.message || `Error: ${err.response.status}`;
        }
      } else if (err.request) {
        errorMessage = 'No response from server. Please check your connection.';
      } else {
        errorMessage = err.message || 'Unknown error occurred';
      }
      
      setError(errorMessage);
    }
  };

  // Helper function to fetch modules for a specific course
  const fetchModulesForCourse = async (courseId) => {
    try {
      const response = await api.get(`/courses/${courseId}/modules`);
      const newModules = Array.isArray(response.data) ? response.data : response.data.modules || [];
      
      setModules(prevModules => {
        // Remove old modules for this course and add new ones
        const filteredModules = prevModules.filter(m => m.course_id !== courseId);
        return [...filteredModules, ...newModules];
      });
    } catch (err) {
      console.error(`Error fetching modules for course ${courseId}:`, err);
    }
  };

  // IMPROVED: Assign Lecturer function with state persistence
  const handleAssignLecturer = async (moduleId, lecturerId) => {
    try {
      console.log(`Assigning lecturer ${lecturerId} to module ${moduleId}`);
      
      const response = await api.put(`/modules/${moduleId}/assign`, { 
        lecturer_id: lecturerId ? parseInt(lecturerId) : null 
      });
      console.log('Assignment response:', response.data);
      
      // Update local state optimistically
      setModules(prevModules => 
        prevModules.map(module => 
          module.id === moduleId 
            ? { ...module, lecturer_id: lecturerId ? parseInt(lecturerId) : null }
            : module
        )
      );
      
      if (lecturerId) {
        const lecturerName = lecturers.find(l => l.id === parseInt(lecturerId))?.name || 'Lecturer';
        setSuccess(`Lecturer ${lecturerName} assigned to module successfully!`);
      } else {
        setSuccess('Lecturer assignment removed from module successfully!');
      }
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Assignment error:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Assignment failed';
      setError(`Assignment failed: ${errorMessage}`);
    }
  };

  // Force refresh data
  const handleRefreshData = () => {
    fetchData();
    setSuccess('Data refreshed successfully!');
    setTimeout(() => setSuccess(''), 3000);
  };

  // Test function to check if modules are loading
  const testModulesLoad = () => {
    console.log('Current modules state:', modules);
    console.log('Modules length:', modules.length);
    console.log('Courses state:', courses);
    console.log('Courses length:', courses.length);
    console.log('Lecturers state:', lecturers);
    console.log('Lecturers length:', lecturers.length);
  };

  // Helper function for performance colors
  const getPerformanceColor = (percentage) => {
    if (percentage >= 80) return 'success';
    if (percentage >= 60) return 'warning';
    return 'danger';
  };

  return (
    <div className="d-flex flex-column min-vh-100">
      <div className="pl-dashboard flex-grow-1">
        {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}
        {success && <Alert variant="success" onClose={() => setSuccess('')} dismissible>{success}</Alert>}
        
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h2>Program Leader Dashboard</h2>
          <div className="d-flex gap-2">
            <Badge bg="primary">Overall Performance: {programMonitoring.overall_performance}%</Badge>
            <Button variant="outline-info" size="sm" onClick={handleRefreshData} disabled={loading}>
              {loading ? <Spinner animation="border" size="sm" /> : 'Refresh Data'}
            </Button>
            <Button variant="outline-secondary" size="sm" onClick={testModulesLoad}>
              Debug Data
            </Button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <Card className="mb-4">
          <Card.Header>
            <div className="d-flex flex-wrap gap-2">
              <Button 
                variant={activeTab === 'overview' ? 'primary' : 'outline-primary'}
                onClick={() => setActiveTab('overview')}
              >
                Program Overview
              </Button>
              <Button 
                variant={activeTab === 'courses' ? 'primary' : 'outline-primary'}
                onClick={() => setActiveTab('courses')}
              >
                Courses & Modules
              </Button>
              <Button 
                variant={activeTab === 'monitoring' ? 'primary' : 'outline-primary'}
                onClick={() => setActiveTab('monitoring')}
              >
                Program Monitoring
              </Button>
            </div>
          </Card.Header>
        </Card>

        {/* Loading Spinner */}
        {loading && (
          <div className="text-center mb-3">
            <Spinner animation="border" role="status">
              <span className="visually-hidden">Loading...</span>
            </Spinner>
          </div>
        )}

        {/* PROGRAM OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <Row>
            <Col md={3}>
              <Card className="text-center">
                <Card.Body>
                  <Card.Title>Attendance Rate</Card.Title>
                  <div className="mb-2">
                    <div className="progress">
                      <div 
                        className={`progress-bar bg-${getPerformanceColor(programMonitoring.avg_attendance * 100)}`}
                        style={{ width: `${programMonitoring.avg_attendance * 100}%` }}
                      ></div>
                    </div>
                  </div>
                  <h3>{(programMonitoring.avg_attendance * 100).toFixed(1)}%</h3>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="text-center">
                <Card.Body>
                  <Card.Title>Curriculum Coverage</Card.Title>
                  <div className="mb-2">
                    <div className="progress">
                      <div 
                        className={`progress-bar bg-${getPerformanceColor(programMonitoring.curriculum_coverage * 100)}`}
                        style={{ width: `${programMonitoring.curriculum_coverage * 100}%` }}
                      ></div>
                    </div>
                  </div>
                  <h3>{(programMonitoring.curriculum_coverage * 100).toFixed(1)}%</h3>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="text-center">
                <Card.Body>
                  <Card.Title>Student Satisfaction</Card.Title>
                  <div className="mb-2">
                    <div className="progress">
                      <div 
                        className={`progress-bar bg-${getPerformanceColor(programMonitoring.student_satisfaction * 100)}`}
                        style={{ width: `${programMonitoring.student_satisfaction * 100}%` }}
                      ></div>
                    </div>
                  </div>
                  <h3>{(programMonitoring.student_satisfaction * 100).toFixed(1)}%</h3>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="text-center">
                <Card.Body>
                  <Card.Title>Report Completion</Card.Title>
                  <div className="mb-2">
                    <div className="progress">
                      <div 
                        className={`progress-bar bg-${getPerformanceColor(programMonitoring.report_completion_rate * 100)}`}
                        style={{ width: `${programMonitoring.report_completion_rate * 100}%` }}
                      ></div>
                    </div>
                  </div>
                  <h3>{(programMonitoring.report_completion_rate * 100).toFixed(1)}%</h3>
                </Card.Body>
              </Card>
            </Col>

            <Col md={6} className="mt-4">
              <Card>
                <Card.Header>
                  <h5>Program Courses</h5>
                </Card.Header>
                <Card.Body>
                  <Table striped hover>
                    <thead>
                      <tr>
                        <th>Code</th>
                        <th>Name</th>
                        <th>Modules</th>
                      </tr>
                    </thead>
                    <tbody>
                      {courses.map(course => (
                        <tr key={course.id}>
                          <td>
                            <Badge bg="secondary">{course.code}</Badge>
                          </td>
                          <td>{course.name}</td>
                          <td>
                            <Badge bg="info">
                              {modules.filter(m => m.course_id === course.id).length}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </Card.Body>
              </Card>
            </Col>

            <Col md={6} className="mt-4">
              <Card>
                <Card.Header>
                  <h5>Lecturer Performance</h5>
                </Card.Header>
                <Card.Body>
                  {Object.entries(programMonitoring.lecturer_performance).map(([lecturerId, performance]) => {
                    const lecturer = lecturers.find(l => l.id == lecturerId);
                    return (
                      <div key={lecturerId} className="mb-3">
                        <div className="d-flex justify-content-between">
                          <span>{lecturer?.name || `Lecturer ${lecturerId}`}</span>
                          <span className="fw-bold">{performance}%</span>
                        </div>
                        <div className="progress">
                          <div 
                            className={`progress-bar bg-${getPerformanceColor(performance)}`}
                            style={{ width: `${performance}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                  {Object.keys(programMonitoring.lecturer_performance).length === 0 && (
                    <p className="text-muted">No lecturer performance data available.</p>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>
        )}

        {/* COURSES & MODULES TAB */}
        {activeTab === 'courses' && (
          <Row>
            <Col md={6}>
              <Card>
                <Card.Header>
                  <h5>Add New Course</h5>
                </Card.Header>
                <Card.Body>
                  <Form onSubmit={handleAddCourse}>
                    <Form.Group className="mb-3">
                      <Form.Label>Course Name *</Form.Label>
                      <Form.Control 
                        value={courseForm.name}
                        onChange={(e) => setCourseForm({...courseForm, name: e.target.value})}
                        required
                        placeholder="Enter course name"
                      />
                    </Form.Group>
                    <Form.Group className="mb-3">
                      <Form.Label>Course Code *</Form.Label>
                      <Form.Control 
                        value={courseForm.code}
                        onChange={(e) => setCourseForm({...courseForm, code: e.target.value})}
                        required
                        placeholder="Enter course code (e.g., CS101)"
                      />
                    </Form.Group>
                    <Form.Group className="mb-3">
                      <Form.Label>Faculty ID *</Form.Label>
                      <Form.Control 
                        type="number"
                        value={courseForm.faculty_id}
                        onChange={(e) => setCourseForm({...courseForm, faculty_id: e.target.value})}
                        required
                        min="1"
                        placeholder="Enter faculty ID"
                      />
                    </Form.Group>
                    <Button type="submit" variant="primary" disabled={loading}>
                      {loading ? <Spinner animation="border" size="sm" /> : 'Add Course'}
                    </Button>
                  </Form>

                  <div className="mt-3 p-3 bg-light rounded">
                    <h6>Data Status:</h6>
                    <p className="mb-1">Courses: {courses.length}</p>
                    <p className="mb-1">Modules: {modules.length}</p>
                    <p className="mb-1">Lecturers: {lecturers.length}</p>
                    <p className="mb-0">Available Lecturers for Assignment: {lecturers.filter(l => l.role === 'lecturer').length}</p>
                  </div>
                </Card.Body>
              </Card>

              <Card className="mt-4">
                <Card.Header className="d-flex justify-content-between align-items-center">
                  <h5>Program Courses ({courses.length})</h5>
                  <Badge bg={courses.length > 0 ? "success" : "secondary"}>
                    {courses.length} courses
                  </Badge>
                </Card.Header>
                <Card.Body>
                  {courses.length === 0 ? (
                    <Alert variant="info">
                      No courses found. Add your first course above.
                    </Alert>
                  ) : (
                    <div className="table-responsive">
                      <Table striped hover>
                        <thead>
                          <tr>
                            <th>ID</th>
                            <th>Code</th>
                            <th>Name</th>
                            <th>Faculty ID</th>
                            <th>Modules</th>
                          </tr>
                        </thead>
                        <tbody>
                          {courses.map(course => (
                            <tr key={course.id}>
                              <td>
                                <Badge bg="dark">{course.id}</Badge>
                              </td>
                              <td>
                                <Badge bg="primary">{course.code}</Badge>
                              </td>
                              <td>{course.name}</td>
                              <td>{course.faculty_id}</td>
                              <td>
                                <Badge bg="info">
                                  {modules.filter(m => m.course_id === course.id).length}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>

            <Col md={6}>
              <Card>
                <Card.Header>
                  <h5>Add New Module</h5>
                </Card.Header>
                <Card.Body>
                  <Form onSubmit={handleAddModule}>
                    <Form.Group className="mb-3">
                      <Form.Label>Module Name *</Form.Label>
                      <Form.Control 
                        value={moduleForm.name}
                        onChange={(e) => setModuleForm({...moduleForm, name: e.target.value})}
                        required
                        placeholder="Enter module name"
                      />
                    </Form.Group>
                    <Form.Group className="mb-3">
                      <Form.Label>Module Code *</Form.Label>
                      <Form.Control 
                        value={moduleForm.code}
                        onChange={(e) => setModuleForm({...moduleForm, code: e.target.value})}
                        required
                        placeholder="Enter module code"
                      />
                    </Form.Group>
                    <Form.Group className="mb-3">
                      <Form.Label>Course *</Form.Label>
                      <Form.Select 
                        value={moduleForm.course_id}
                        onChange={(e) => setModuleForm({...moduleForm, course_id: e.target.value})}
                        required
                      >
                        <option value="">Select Course</option>
                        {courses.map(course => (
                          <option key={course.id} value={course.id}>
                            {course.code} - {course.name}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                    
                    {/* UPDATED: Lecturer Dropdown with all registered lecturers */}
                    <Form.Group className="mb-3">
                      <Form.Label>Assign Lecturer</Form.Label>
                      <Form.Select 
                        value={moduleForm.lecturer_id}
                        onChange={(e) => setModuleForm({...moduleForm, lecturer_id: e.target.value})}
                      >
                        <option value="">Select Lecturer (Optional)</option>
                        {lecturers
                          .filter(lecturer => lecturer.role === 'lecturer')
                          .map(lecturer => (
                            <option key={lecturer.id} value={lecturer.id}>
                              {lecturer.name} - {lecturer.email}
                            </option>
                          ))
                        }
                      </Form.Select>
                      <Form.Text className="text-muted">
                        All registered lecturers appear here. Assigning a lecturer will make this module appear in their dashboard.
                      </Form.Text>
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Label>Description</Form.Label>
                      <Form.Control 
                        as="textarea"
                        rows={3}
                        value={moduleForm.description}
                        onChange={(e) => setModuleForm({...moduleForm, description: e.target.value})}
                        placeholder="Module description"
                      />
                    </Form.Group>
                    <Button type="submit" variant="primary" disabled={loading}>
                      {loading ? <Spinner animation="border" size="sm" /> : 'Add Module'}
                    </Button>
                  </Form>
                </Card.Body>
              </Card>

              <Card className="mt-4">
                <Card.Header className="d-flex justify-content-between align-items-center">
                  <h5>Module Assignment ({modules.length} modules)</h5>
                  <Badge bg={modules.length > 0 ? "success" : "secondary"}>
                    {modules.length} modules
                  </Badge>
                </Card.Header>
                <Card.Body>
                  {modules.length === 0 ? (
                    <Alert variant="info">
                      No modules found. Add modules to courses above.
                    </Alert>
                  ) : (
                    <div className="table-responsive">
                      <Table striped hover>
                        <thead>
                          <tr>
                            <th>ID</th>
                            <th>Module</th>
                            <th>Course</th>
                            <th>Assigned Lecturer</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {modules.map(module => {
                            const assignedLecturer = lecturers.find(l => l.id === module.lecturer_id);
                            const course = courses.find(c => c.id === module.course_id);
                            return (
                              <tr key={module.id}>
                                <td>
                                  <Badge bg="dark">{module.id}</Badge>
                                </td>
                                <td>
                                  <div>
                                    <strong>{module.name}</strong>
                                    <br />
                                    <small className="text-muted">{module.code}</small>
                                  </div>
                                </td>
                                <td>
                                  {course ? (
                                    <Badge bg="secondary">{course.code}</Badge>
                                  ) : (
                                    <Badge bg="warning">Unknown Course</Badge>
                                  )}
                                </td>
                                <td>
                                  {assignedLecturer ? (
                                    <div>
                                      <Badge bg="success">{assignedLecturer.name}</Badge>
                                      <br />
                                      <small className="text-muted">{assignedLecturer.email}</small>
                                    </div>
                                  ) : (
                                    <Badge bg="warning">Unassigned</Badge>
                                  )}
                                </td>
                                <td>
                                  <Form.Select 
                                    value={module.lecturer_id || ''}
                                    onChange={(e) => handleAssignLecturer(module.id, e.target.value)}
                                    size="sm"
                                  >
                                    <option value="">Change Lecturer</option>
                                    {lecturers
                                      .filter(lecturer => lecturer.role === 'lecturer')
                                      .map(lecturer => (
                                        <option key={lecturer.id} value={lecturer.id}>
                                          {lecturer.name}
                                        </option>
                                      ))
                                    }
                                  </Form.Select>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </Table>
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>
        )}

        {/* PROGRAM MONITORING TAB */}
        {activeTab === 'monitoring' && (
          <Row>
            <Col md={6}>
              <Card>
                <Card.Header>
                  <h5>Program Performance Metrics</h5>
                </Card.Header>
                <Card.Body>
                  <div className="mb-4">
                    <h6>Overall Program Performance</h6>
                    <div className="progress mb-2">
                      <div 
                        className="progress-bar bg-success"
                        style={{ width: `${programMonitoring.overall_performance}%` }}
                      ></div>
                    </div>
                    <div className="d-flex justify-content-between">
                      <span>Performance Score</span>
                      <strong>{programMonitoring.overall_performance}%</strong>
                    </div>
                  </div>

                  <div className="mb-4">
                    <h6>Curriculum Alignment</h6>
                    <div className="progress mb-2">
                      <div 
                        className="progress-bar bg-info"
                        style={{ width: `${programMonitoring.curriculum_coverage * 100}%` }}
                      ></div>
                    </div>
                    <div className="d-flex justify-content-between">
                      <span>Coverage Rate</span>
                      <strong>{(programMonitoring.curriculum_coverage * 100).toFixed(1)}%</strong>
                    </div>
                  </div>

                  <div className="mb-4">
                    <h6>Student Engagement</h6>
                    <div className="progress mb-2">
                      <div 
                        className="progress-bar bg-warning"
                        style={{ width: `${programMonitoring.avg_attendance * 100}%` }}
                      ></div>
                    </div>
                    <div className="d-flex justify-content-between">
                      <span>Average Attendance</span>
                      <strong>{(programMonitoring.avg_attendance * 100).toFixed(1)}%</strong>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </Col>

            <Col md={6}>
              <Card>
                <Card.Header>
                  <h5>Program Insights</h5>
                </Card.Header>
                <Card.Body>
                  <h6>Course Performance Distribution</h6>
                  {courses.map(course => {
                    const courseModules = modules.filter(m => m.course_id === course.id);
                    const completionRate = courseModules.length > 0 ? 
                      (courseModules.filter(m => m.status === 'completed').length / courseModules.length) * 100 : 0;
                    
                    return (
                      <div key={course.id} className="mb-3">
                        <div className="d-flex justify-content-between">
                          <span>{course.code}</span>
                          <span>{completionRate.toFixed(1)}%</span>
                        </div>
                        <div className="progress">
                          <div 
                            className="progress-bar bg-primary"
                            style={{ width: `${completionRate}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}

                  <h6 className="mt-4">Key Program Indicators</h6>
                  <ul className="list-unstyled">
                    <li>✅ Total Courses: {courses.length}</li>
                    <li>✅ Total Modules: {modules.length}</li>
                    <li>✅ Active Lecturers: {lecturers.filter(l => l.role === 'lecturer').length}</li>
                    <li>✅ Assigned Modules: {modules.filter(m => m.lecturer_id).length}</li>
                    <li>✅ Program Duration: Ongoing</li>
                  </ul>

                  <h6 className="mt-4">Lecturer Assignment Status</h6>
                  <div className="table-responsive">
                    <Table size="sm" striped>
                      <thead>
                        <tr>
                          <th>Lecturer</th>
                          <th>Assigned Modules</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lecturers
                          .filter(lecturer => lecturer.role === 'lecturer')
                          .map(lecturer => {
                            const assignedModules = modules.filter(m => m.lecturer_id === lecturer.id);
                            return (
                              <tr key={lecturer.id}>
                                <td>{lecturer.name}</td>
                                <td>
                                  <Badge bg={assignedModules.length > 0 ? "success" : "secondary"}>
                                    {assignedModules.length} modules
                                  </Badge>
                                </td>
                              </tr>
                            );
                          })
                        }
                      </tbody>
                    </Table>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        )}
      </div>
      
      {/* Footer */}
      <Footer />
    </div>
  );
};

export default PLDashboard;