// Loginpage.js - Login page for SmartCampus+
// Handles user authentication with email and password

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../styles/Login.css';

function Loginpage() {
    const navigate = useNavigate();

    // State for form data
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });

    // State for password visibility toggle
    const [showPassword, setShowPassword] = useState(false);

    // State for loading indicator
    const [isLoading, setIsLoading] = useState(false);

    // State for alert messages
    const [alert, setAlert] = useState({ show: false, type: '', message: '' });

    // Handle input changes
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // Toggle password visibility
    const togglePassword = () => {
        setShowPassword(!showPassword);
    };

    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setAlert({ show: false, type: '', message: '' });

        try {
            // Call the backend login API
            const response = await fetch('http://localhost:5000/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: formData.email,
                    password: formData.password
                })
            });

            const data = await response.json();

            if (data.success) {
                // Store token and user info in localStorage
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));

                // Show success message
                setAlert({
                    show: true,
                    type: 'success',
                    message: `Welcome ${data.user.name}! Redirecting to dashboard...`
                });

                // Redirect based on role
                setTimeout(() => {
                    navigate(data.redirectUrl);
                }, 1000);
            } else {
                setAlert({
                    show: true,
                    type: 'error',
                    message: data.error || 'Login failed. Please check your credentials.'
                });
            }
        } catch (error) {
            console.error('Login error:', error);
            setAlert({
                show: true,
                type: 'error',
                message: 'Connection error. Please check if the server is running.'
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <div className="auth-container">
                {/* Header Section */}
                <div className="auth-header">
                    <h1>🎓 SmartCampus+</h1>
                    <p>Welcome back! Please login to your account</p>
                </div>

                {/* Form Section */}
                <div className="auth-body">
                    {/* Alert Message */}
                    {alert.show && (
                        <div
                            id="alertMessage"
                            className={`alert show alert-${alert.type}`}
                        >
                            {alert.message}
                        </div>
                    )}

                    <form id="loginForm" onSubmit={handleSubmit}>
                        {/* Email Field */}
                        <div className="form-group">
                            <label htmlFor="email">Email Address</label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                placeholder="your.email@example.com"
                                required
                                value={formData.email}
                                onChange={handleChange}
                            />
                        </div>

                        {/* Password Field */}
                        <div className="form-group">
                            <label htmlFor="password">Password</label>
                            <div className="password-wrapper">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    id="password"
                                    name="password"
                                    placeholder="Enter your password"
                                    required
                                    value={formData.password}
                                    onChange={handleChange}
                                />
                                <button
                                    type="button"
                                    className="password-toggle"
                                    onClick={togglePassword}
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                >
                                    {showPassword ? '🙈' : '👁️'}
                                </button>
                            </div>
                        </div>

                        {/* Forgot Password Link */}
                        <div className="forgot-password">
                            <a href="#forgot">Forgot Password?</a>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            className={`btn-primary ${isLoading ? 'loading' : ''}`}
                            id="loginBtn"
                            disabled={isLoading}
                        >
                            <span className="btn-text">Login</span>
                            <div className="spinner"></div>
                        </button>
                    </form>
                </div>

                {/* Footer Section */}
                <div className="auth-footer">
                    <p style={{ color: '#666', fontSize: '14px' }}>Accounts are created by administrator only.</p>
                </div>
            </div>
        </>
    );
}

export default Loginpage;
