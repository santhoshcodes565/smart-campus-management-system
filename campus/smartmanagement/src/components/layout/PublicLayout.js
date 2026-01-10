import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import PublicNavbar from './PublicNavbar';
import { FiMail, FiPhone, FiMapPin } from 'react-icons/fi';

const PublicLayout = () => {
    return (
        <div className="min-h-screen flex flex-col">
            <PublicNavbar />

            {/* Main Content - Add padding-top for fixed navbar */}
            <main className="flex-1 pt-16">
                <Outlet />
            </main>

            {/* Footer */}
            <footer className="bg-secondary-900 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                        {/* Brand */}
                        <div className="md:col-span-1">
                            <Link to="/" className="flex items-center gap-2 text-xl font-bold">
                                <span>🎓</span>
                                <span>SmartCampus+</span>
                            </Link>
                            <p className="mt-4 text-secondary-400 text-sm leading-relaxed">
                                Empowering educational institutions with smart, connected campus management solutions.
                            </p>
                        </div>

                        {/* Quick Links */}
                        <div>
                            <h4 className="font-semibold text-white mb-4">Quick Links</h4>
                            <ul className="space-y-2 text-sm text-secondary-400">
                                <li><Link to="/features" className="hover:text-white transition-colors">Features</Link></li>
                                <li><Link to="/about" className="hover:text-white transition-colors">About Us</Link></li>
                                <li><Link to="/contact" className="hover:text-white transition-colors">Contact</Link></li>
                                <li><Link to="/login" className="hover:text-white transition-colors">Login</Link></li>
                            </ul>
                        </div>

                        {/* Features */}
                        <div>
                            <h4 className="font-semibold text-white mb-4">Features</h4>
                            <ul className="space-y-2 text-sm text-secondary-400">
                                <li>Student Management</li>
                                <li>Faculty Portal</li>
                                <li>Attendance Tracking</li>
                                <li>Fee Management</li>
                            </ul>
                        </div>

                        {/* Contact */}
                        <div>
                            <h4 className="font-semibold text-white mb-4">Contact Us</h4>
                            <ul className="space-y-3 text-sm text-secondary-400">
                                <li className="flex items-center gap-2">
                                    <FiMail size={14} />
                                    <span>hello@smartcampus.edu</span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <FiPhone size={14} />
                                    <span>+91 98765 43210</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <FiMapPin size={14} className="mt-0.5" />
                                    <span>Tech Park, Bangalore, India</span>
                                </li>
                            </ul>
                        </div>
                    </div>

                    <div className="mt-12 pt-8 border-t border-secondary-800 flex flex-col md:flex-row items-center justify-between gap-4">
                        <p className="text-sm text-secondary-500">
                            © 2026 SmartCampus+. All rights reserved.
                        </p>
                        <div className="flex items-center gap-6 text-sm text-secondary-500">
                            <Link to="#" className="hover:text-white transition-colors">Privacy Policy</Link>
                            <Link to="#" className="hover:text-white transition-colors">Terms of Service</Link>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default PublicLayout;
