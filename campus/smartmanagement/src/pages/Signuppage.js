// Signuppage.js - Login page for SmartCampus+
// Handles new user registration with form validation

import { useState } from 'react';
import { Link } from 'react-router-dom';
import '../styles/Signup.css';

function Signuppage() {
    // State for form data
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        role: '',
        password: '',
        confirmPassword: ''
    });

    // State for password visibility
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // State for password strength
    const [passwordStrength, setPasswordStrength] = useState({ level: '', width: '0%', text: '' });

    // State for validation errors
    const [errors, setErrors] = useState({});

    // State for loading indicator
    const [isLoading, setIsLoading] = useState(false);

    // State for alert messages
    const [alert, setAlert] = useState({ show: false, type: '', message: '' });

    // Calculate password strength
    const calculatePasswordStrength = (password) => {
        let strength = 0;

        if (password.length >= 8) strength++;
        if (password.match(/[a-z]/)) strength++;
        if (password.match(/[A-Z]/)) strength++;
        if (password.match(/[0-9]/)) strength++;
        if (password.match(/[^a-zA-Z0-9]/)) strength++;

        if (strength <= 2) {
            return { level: 'weak', width: '33%', text: 'Weak', color: '#f44336' };
        } else if (strength <= 4) {
            return { level: 'medium', width: '66%', text: 'Medium', color: '#ff9800' };
        } else {
            return { level: 'strong', width: '100%', text: 'Strong', color: '#4caf50' };
        }
    };

    // Handle input changes
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));

        // Update password strength when password changes
        if (name === 'password') {
            if (value) {
                setPasswordStrength(calculatePasswordStrength(value));
            } else {
                setPasswordStrength({ level: '', width: '0%', text: '' });
            }
        }

        // Clear error when user starts typing
        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }
    };

    // Validate form fields
    const validateForm = () => {
        const newErrors = {};

        // Validate full name
        if (formData.fullName.trim().length < 2) {
            newErrors.fullName = 'Please enter a valid name';
        }

        // Validate email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            newErrors.email = 'Please enter a valid email address';
        }

        // Validate role
        if (!formData.role) {
            newErrors.role = 'Please select a role';
        }

        // Validate password
        if (formData.password.length < 8) {
            newErrors.password = 'Password must be at least 8 characters';
        }

        // Validate confirm password
        if (formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = 'Passwords do not match';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setIsLoading(true);
        setAlert({ show: false, type: '', message: '' });

        // Simulate API call (replace with actual registration logic)
        try {
            await new Promise(resolve => setTimeout(resolve, 1500));

            setAlert({
                show: true,
                type: 'success',
                message: 'Account created successfully! Redirecting to login...'
            });

            // In a real app, redirect to login page
            // navigate('/login');

        } catch (error) {
            setAlert({
                show: true,
                type: 'error',
                message: 'Registration failed. Please try again.'
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
                    <p>Create your account to get started</p>
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

                    <form id="signupForm" onSubmit={handleSubmit}>
                        {/* Full Name Field */}
                        <div className="form-group">
                            <label htmlFor="fullName">Full Name</label>
                            <input
                                type="text"
                                id="fullName"
                                name="fullName"
                                placeholder="John Doe"
                                required
                                value={formData.fullName}
                                onChange={handleChange}
                            />
                            {errors.fullName && (
                                <div className="error-message show" id="nameError">
                                    {errors.fullName}
                                </div>
                            )}
                        </div>

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
                            {errors.email && (
                                <div className="error-message show" id="emailError">
                                    {errors.email}
                                </div>
                            )}
                        </div>

                        {/* Role Selection */}
                        <div className="form-group">
                            <label htmlFor="role">Select Role</label>
                            <select
                                id="role"
                                name="role"
                                required
                                value={formData.role}
                                onChange={handleChange}
                            >
                                <option value="">Choose your role</option>
                                <option value="Student">Student</option>
                                <option value="Staff">Staff</option>
                                <option value="Admin">Admin</option>
                            </select>
                            {errors.role && (
                                <div className="error-message show" id="roleError">
                                    {errors.role}
                                </div>
                            )}
                        </div>

                        {/* Password Field */}
                        <div className="form-group">
                            <label htmlFor="password">Password</label>
                            <div className="password-wrapper">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    id="password"
                                    name="password"
                                    placeholder="Create a strong password"
                                    required
                                    value={formData.password}
                                    onChange={handleChange}
                                />
                                <button
                                    type="button"
                                    className="password-toggle"
                                    onClick={() => setShowPassword(!showPassword)}
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                >
                                    {showPassword ? '🙈' : '👁️'}
                                </button>
                            </div>
                            {/* Password Strength Indicator */}
                            <div className="password-strength">
                                <div
                                    className={`password-strength-bar strength-${passwordStrength.level}`}
                                    id="strengthBar"
                                    style={{ width: passwordStrength.width }}
                                ></div>
                            </div>
                            {passwordStrength.text && (
                                <div
                                    className="password-strength-text"
                                    id="strengthText"
                                    style={{ color: passwordStrength.color }}
                                >
                                    {passwordStrength.text}
                                </div>
                            )}
                            {errors.password && (
                                <div className="error-message show" id="passwordError">
                                    {errors.password}
                                </div>
                            )}
                        </div>

                        {/* Confirm Password Field */}
                        <div className="form-group">
                            <label htmlFor="confirmPassword">Confirm Password</label>
                            <div className="password-wrapper">
                                <input
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    placeholder="Re-enter your password"
                                    required
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                />
                                <button
                                    type="button"
                                    className="password-toggle"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                                >
                                    {showConfirmPassword ? '🙈' : '👁️'}
                                </button>
                            </div>
                            {errors.confirmPassword && (
                                <div className="error-message show" id="confirmPasswordError">
                                    {errors.confirmPassword}
                                </div>
                            )}
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            className={`btn-primary ${isLoading ? 'loading' : ''}`}
                            id="signupBtn"
                            disabled={isLoading}
                        >
                            <span className="btn-text">Create Account</span>
                            <div className="spinner"></div>
                        </button>
                    </form>
                </div>

                {/* Footer Section */}
                <div className="auth-footer">
                    Already have an account? <Link to="/login">Login</Link>
                </div>
            </div>
        </>
    );
}

export default Signuppage;
