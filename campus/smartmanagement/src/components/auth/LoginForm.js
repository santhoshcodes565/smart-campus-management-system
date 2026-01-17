import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../services/api';
import { ButtonLoader } from '../common/LoadingSpinner';
import { FiUser, FiLock, FiEye, FiEyeOff } from 'react-icons/fi';
import { getErrorMessage } from '../../utils/errorNormalizer';

const LoginForm = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { login } = useAuth();

    const [formData, setFormData] = useState({
        username: '',
        password: '',
    });
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState({});

    const from = location.state?.from?.pathname || '/';

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: '' }));
        }
    };

    const validate = () => {
        const newErrors = {};
        if (!formData.username) {
            newErrors.username = 'Username is required';
        } else if (formData.username.length < 3) {
            newErrors.username = 'Username must be at least 3 characters';
        }
        if (!formData.password) {
            newErrors.password = 'Password is required';
        } else if (formData.password.length < 6) {
            newErrors.password = 'Password must be at least 6 characters';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;

        setIsLoading(true);
        try {
            const response = await authAPI.login(formData);
            const { token, user, redirectUrl } = response.data;

            login(token, user);
            toast.success(`Welcome back, ${user.name}!`);
            navigate(redirectUrl || from, { replace: true });
        } catch (error) {
            const message = getErrorMessage(error, 'Login failed. Please try again.');
            toast.error(message);
            setErrors({ general: message });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-primary-100 p-4">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <Link to="/" className="inline-flex items-center gap-2 text-3xl font-bold text-primary-600">
                        <span>🎓</span>
                        <span>SmartCampus+</span>
                    </Link>
                    <p className="mt-2 text-secondary-500">Welcome back! Please sign in to continue</p>
                </div>

                {/* Login Card */}
                <div className="bg-white rounded-2xl shadow-xl p-8">
                    {errors.general && (
                        <div className="mb-6 p-4 bg-danger-50 border border-danger-200 rounded-lg text-danger-600 text-sm">
                            {errors.general}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Username Field */}
                        <div className="form-group">
                            <label htmlFor="username" className="label">
                                Username
                            </label>
                            <div className="relative">
                                <FiUser className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary-400" size={18} />
                                <input
                                    type="text"
                                    id="username"
                                    name="username"
                                    value={formData.username}
                                    onChange={handleChange}
                                    placeholder="Enter your username"
                                    className={`input pl-11 ${errors.username ? 'input-error' : ''}`}
                                    disabled={isLoading}
                                />
                            </div>
                            {errors.username && <p className="mt-1 text-sm text-danger-500">{errors.username}</p>}
                        </div>

                        {/* Password Field */}
                        <div className="form-group">
                            <label htmlFor="password" className="label">
                                Password
                            </label>
                            <div className="relative">
                                <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary-400" size={18} />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    id="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    placeholder="Enter your password"
                                    className={`input pl-11 pr-11 ${errors.password ? 'input-error' : ''}`}
                                    disabled={isLoading}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-secondary-400 hover:text-secondary-600"
                                >
                                    {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                                </button>
                            </div>
                            {errors.password && <p className="mt-1 text-sm text-danger-500">{errors.password}</p>}
                        </div>

                        {/* Forgot Password */}
                        <div className="flex items-center justify-between">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" className="w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500" />
                                <span className="text-sm text-secondary-600">Remember me</span>
                            </label>
                            <Link to="/forgot-password" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
                                Forgot Password?
                            </Link>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            className="btn-primary w-full h-12"
                            disabled={isLoading}
                        >
                            {isLoading ? <ButtonLoader /> : 'Sign In'}
                        </button>
                    </form>

                    {/* Demo Credentials */}
                    <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                        <p className="text-xs font-medium text-secondary-600 mb-2">Demo Credentials:</p>
                        <div className="space-y-1 text-xs text-secondary-500">
                            <p><span className="font-medium">Admin:</span> admin / admin123</p>
                            <p><span className="font-medium">Faculty:</span> faculty / faculty123</p>
                            <p><span className="font-medium">Student:</span> student / student123</p>
                        </div>
                    </div>
                </div>

                {/* Contact Admin for Account */}
                <p className="mt-6 text-center text-secondary-600">
                    Need an account? Contact your administrator.
                </p>
            </div>
        </div>
    );
};

export default LoginForm;
