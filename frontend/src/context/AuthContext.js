import React, { createContext, useState, useEffect, useContext } from 'react';
import { jwtDecode } from 'jwt-decode';
import api from '../services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Function to refresh token
  const refreshToken = async () => {
    try {
      console.log('Attempting token refresh...');
      const response = await api.post('/refresh');
      const { token } = response.data;
      
      localStorage.setItem('token', token);
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      const decodedUser = jwtDecode(token);
      setUser(decodedUser);
      
      console.log('Token refreshed successfully');
      return token;
    } catch (err) {
      console.error('Token refresh failed:', err);
      logout();
      return null;
    }
  };

  // Enhanced API interceptor for token refresh
  useEffect(() => {
    const interceptor = api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          console.log('Token expired, attempting refresh...');
          
          const newToken = await refreshToken();
          if (newToken) {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return api(originalRequest);
          }
        }
        
        return Promise.reject(error);
      }
    );

    return () => {
      api.interceptors.response.eject(interceptor);
    };
  }, []);

  // Restore session if token exists
  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('token');
      
      if (!token) {
        console.log('No token found in localStorage');
        setLoading(false);
        return;
      }

      try {
        console.log('Token found, validating...');
        const decoded = jwtDecode(token);
        
        // Check if token is expired
        const currentTime = Date.now() / 1000;
        if (decoded.exp < currentTime) {
          console.warn('Token expired, attempting refresh...');
          const newToken = await refreshToken();
          if (!newToken) {
            setLoading(false);
            return;
          }
        } else {
          // Token is valid
          console.log('Token is valid, setting user:', decoded);
          setUser(decoded);
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        }
      } catch (err) {
        console.error('Invalid token:', err);
        localStorage.removeItem('token');
        delete api.defaults.headers.common['Authorization'];
      }
      
      setLoading(false);
    };

    initializeAuth();
  }, []);

  // Login function with enhanced debugging
  const login = async (identifier, credential, role) => {
    try {
      setError('');
      setLoading(true);
      
      console.log('Login attempt:', { identifier, credential, role });
      
      let loginData;
      if (role === 'student') {
        loginData = { 
          student_number: identifier, 
          password: credential,
          role 
        };
      } else {
        loginData = { 
          email: identifier, 
          password: credential,
          role 
        };
      }
      
      console.log('Sending login data to /login:', loginData);
      
      // ✅ FIXED: Changed from '/auth/login' to '/login'
      const response = await api.post('/login', loginData);
      console.log('Login response:', response.data);
      
      const { token, user: userData } = response.data;
      
      if (!token) {
        throw new Error('No token received from server');
      }
      
      localStorage.setItem('token', token);
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      setUser(userData);
      console.log('Login successful, user set:', userData);
      
      return userData;
    } catch (err) {
      console.error('Login error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
        config: err.config
      });
      
      let errorMessage = 'Login failed';
      
      if (err.response?.data) {
        // Handle HTML error responses
        if (typeof err.response.data === 'string' && err.response.data.includes('<!DOCTYPE html>')) {
          errorMessage = 'Server endpoint not found. Check backend routes.';
        } else {
          errorMessage = err.response.data.message || err.response.data.error || JSON.stringify(err.response.data);
        }
      } else if (err.request) {
        errorMessage = 'No response from server. Check if backend is running.';
      } else {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Register function
  const register = async (email, password, role, name, student_number) => {
    try {
      setError('');
      setLoading(true);
      
      const { data } = await api.post('/register', { 
        email, 
        password, 
        role, 
        name, 
        student_number 
      });
      
      return data;
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.response?.data?.error || 'Registration failed';
      setError(errorMessage);
      console.error('Registration error:', err.response?.data || err.message);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = () => {
    console.log('Logging out...');
    localStorage.removeItem('token');
    delete api.defaults.headers.common['Authorization'];
    setUser(null);
    setError('');
  };

  // Clear error
  const clearError = () => setError('');

  // Check if user has specific role
  const hasRole = (role) => {
    return user?.role === role;
  };

  // Check if user is authenticated
  const isAuthenticated = () => {
    return !!user;
  };

  // Get auth token
  const getToken = () => {
    return localStorage.getItem('token');
  };

  const value = {
    user,
    loading,
    error,
    login,
    register,
    logout,
    clearError,
    hasRole,
    isAuthenticated,
    getToken,
    refreshToken
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};