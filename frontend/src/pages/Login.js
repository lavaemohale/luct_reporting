import React, { useState, useContext } from "react";
import { Form, Button, Alert, Card, Spinner } from "react-bootstrap";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { AuthContext } from "../context/AuthContext";

const Login = () => {
  const { login, loading } = useContext(AuthContext);
  const { register, handleSubmit, watch, formState: { errors } } = useForm();
  const navigate = useNavigate();
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const onSubmit = async (data) => {
    try {
      setIsLoggingIn(true);
      setErrorMessage("");
      
      console.log("Login form data:", data);
      
      // Call the login function from AuthContext
      await login(data.identifier, data.password, data.role);
      
      // Check if token was stored
      const token = localStorage.getItem("token");
      console.log("Token stored in localStorage:", token ? "Yes" : "No");
      
      if (token) {
        const decoded = jwtDecode(token);
        console.log("Decoded Token:", decoded);
        navigate("/dashboard");
      } else {
        throw new Error("No token received after login");
      }
    } catch (err) {
      console.error("Login error in component:", err);
      setErrorMessage(err.message || "Login failed. Please try again.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const selectedRole = watch("role");

  return (
    <div className="d-flex justify-content-center align-items-center vh-100 bg-light">
      <Card style={{ width: "400px" }} className="p-4 shadow-sm rounded">
        <Card.Body>
          <h3 className="mb-4 text-center">Login</h3>

          {errorMessage && (
            <Alert variant="danger" className="text-center">
              {errorMessage}
            </Alert>
          )}

          <Form onSubmit={handleSubmit(onSubmit)}>
            <Form.Group className="mb-3">
              <Form.Label>Role</Form.Label>
              <Form.Select
                {...register("role", { required: "Role is required" })}
                isInvalid={!!errors.role}
              >
                <option value="">Select Role</option>
                <option value="student">Student</option>
                <option value="lecturer">Lecturer</option>
                <option value="pl">Program Leader</option>
                <option value="prl">Principal Lecturer</option>
              </Form.Select>
              <Form.Control.Feedback type="invalid">
                {errors.role?.message}
              </Form.Control.Feedback>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>
                {selectedRole === "student" ? "Student Number" : "Email"}
              </Form.Label>
              <Form.Control
                type="text"
                {...register("identifier", { 
                  required: "This field is required",
                  pattern: selectedRole === "student" ? undefined : {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: "Invalid email address"
                  }
                })}
                isInvalid={!!errors.identifier}
                placeholder={selectedRole === "student" ? "Enter student number" : "Enter email"}
              />
              <Form.Control.Feedback type="invalid">
                {errors.identifier?.message}
              </Form.Control.Feedback>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Password</Form.Label>
              <Form.Control
                type="password"
                {...register("password", { 
                  required: "Password is required",
                  minLength: {
                    value: 6,
                    message: "Password must be at least 6 characters"
                  }
                })}
                isInvalid={!!errors.password}
                placeholder="Enter password"
              />
              <Form.Control.Feedback type="invalid">
                {errors.password?.message}
              </Form.Control.Feedback>
            </Form.Group>

            <Button 
              type="submit" 
              className="w-100" 
              disabled={isLoggingIn || loading}
            >
              {isLoggingIn || loading ? (
                <>
                  <Spinner
                    as="span"
                    animation="border"
                    size="sm"
                    role="status"
                    aria-hidden="true"
                    className="me-2"
                  />
                  Logging in...
                </>
              ) : (
                "Login"
              )}
            </Button>
          </Form>

          <div className="mt-3 text-center">
            <small className="text-muted">
              Don't have an account? <a href="/register">Register</a>
            </small>
          </div>

        
          
        </Card.Body>
      </Card>
    </div>
  );
};

export default Login;