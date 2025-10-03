import axios from 'axios';

const API = axios.create({ baseURL: 'http://localhost:5000/api' });

API.interceptors.request.use((req) => {
  const token = localStorage.getItem('token');
  console.log('Request token:', token ? 'Present' : 'Missing'); // Debug token presence
  if (token) req.headers.Authorization = `Bearer ${token}`;
  return req;
});

export const register = (data) => API.post('/register', data);
export const login = (data) => API.post('/login', data);

export const addReport = (data) => API.post('/reports', data);
export const getReports = () => API.get('/reports');

export const addFeedback = (id, data) => API.put(`/reports/${id}/feedback`, data);

export const addCourse = (data) => API.post('/courses', data);
export const getCourses = () => API.get('/courses');

export const addClass = (data) => API.post('/classes', data);
export const getClasses = () => API.get('/classes');

export const addRating = (data) => API.post('/ratings', data);
export const getRatings = () => API.get('/ratings');

export const logMonitoring = (data) => API.post('/monitoring', data);

export const search = (type, query) => API.get(`/search/${type}/${query}`);

export const exportReports = () =>
  API.get('/export-reports/excel', { responseType: 'blob' });