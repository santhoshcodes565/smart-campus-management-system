// Featurepage.js - Features page for SmartCampus+
// Displays all available features with detailed descriptions

import { useState } from 'react';
import { Link } from 'react-router-dom';
import '../styles/Feature.css';

function Featurepage() {
    // State for mobile menu toggle
    const [menuOpen, setMenuOpen] = useState(false);

    // State for active category filter
    const [activeCategory, setActiveCategory] = useState('all');

    // Toggle function for hamburger menu
    const toggleMenu = () => {
        setMenuOpen(!menuOpen);
    };

    // Handle category button click
    const handleCategoryClick = (category) => {
        setActiveCategory(category);
    };

    return (
        <>
            {/* Navigation Bar */}
            <nav className="navbar">
                <Link to="/" className="logo">SmartCampus+</Link>
                <ul className={`nav-menu ${menuOpen ? 'active' : ''}`} id="navMenu">
                    <li><Link to="/">Home</Link></li>
                    <li><Link to="/features">Features</Link></li>
                    <li><Link to="/about">About</Link></li>
                    <li><Link to="/contact">Contact</Link></li>
                </ul>
                <div className="nav-buttons">
                    <Link to="/login" className="btn btn-login" role="button">Login</Link>
                    <Link to="/login" className="btn btn-register" role="button">Login</Link>
                </div>
                <button
                    className={`hamburger ${menuOpen ? 'active' : ''}`}
                    id="hamburger"
                    onClick={toggleMenu}
                    aria-label="Toggle navigation menu"
                >
                    <span></span>
                    <span></span>
                    <span></span>
                </button>
            </nav>

            {/* Features Hero Section */}
            <section className="features-hero">
                <h1>Powerful Features</h1>
                <p>Everything you need to manage your campus efficiently, all in one integrated platform</p>
            </section>

            {/* Category Filter Buttons */}
            <section className="feature-categories">
                <button
                    className={`category-btn ${activeCategory === 'all' ? 'active' : ''}`}
                    onClick={() => handleCategoryClick('all')}
                >
                    All Features
                </button>
                <button
                    className={`category-btn ${activeCategory === 'students' ? 'active' : ''}`}
                    onClick={() => handleCategoryClick('students')}
                >
                    For Students
                </button>
                <button
                    className={`category-btn ${activeCategory === 'staff' ? 'active' : ''}`}
                    onClick={() => handleCategoryClick('staff')}
                >
                    For Staff
                </button>
                <button
                    className={`category-btn ${activeCategory === 'admins' ? 'active' : ''}`}
                    onClick={() => handleCategoryClick('admins')}
                >
                    For Admins
                </button>
            </section>

            {/* Main Feature Showcases */}
            <section className="main-features">
                {/* Feature 1: Attendance Tracking */}
                <div className="feature-showcase fade-in">
                    <div className="feature-content">
                        <h2>Smart Attendance Tracking</h2>
                        <p>Revolutionary attendance management system that combines QR codes, facial recognition, and manual marking for maximum flexibility and accuracy.</p>
                        <ul className="feature-list">
                            <li>Real-time attendance monitoring and analytics</li>
                            <li>Multiple marking methods (QR, facial recognition, manual)</li>
                            <li>Automated parent/guardian notifications</li>
                            <li>Attendance trends and predictive insights</li>
                            <li>Integration with academic performance tracking</li>
                        </ul>
                    </div>
                    <div className="feature-visual">
                        📊
                    </div>
                </div>

                {/* Feature 2: Digital ID */}
                <div className="feature-showcase fade-in">
                    <div className="feature-content">
                        <h2>Digital ID &amp; Access Control</h2>
                        <p>Secure, contactless campus access system with digital ID cards, QR code verification, and comprehensive access logs.</p>
                        <ul className="feature-list">
                            <li>Digital student/staff ID cards on mobile devices</li>
                            <li>QR code-based entry and exit tracking</li>
                            <li>Library, lab, and facility access management</li>
                            <li>Visitor management system</li>
                            <li>Real-time campus occupancy monitoring</li>
                        </ul>
                    </div>
                    <div className="feature-visual">
                        🎫
                    </div>
                </div>

                {/* Feature 3: Scheduling */}
                <div className="feature-showcase fade-in">
                    <div className="feature-content">
                        <h2>Intelligent Scheduling System</h2>
                        <p>AI-powered scheduling that optimizes classroom allocation, prevents conflicts, and adapts to changing requirements automatically.</p>
                        <ul className="feature-list">
                            <li>Automated timetable generation</li>
                            <li>Resource allocation optimization</li>
                            <li>Conflict detection and resolution</li>
                            <li>Exam scheduling with smart room assignment</li>
                            <li>Calendar integration and notifications</li>
                        </ul>
                    </div>
                    <div className="feature-visual">
                        📅
                    </div>
                </div>

                {/* Feature 4: Analytics */}
                <div className="feature-showcase fade-in">
                    <div className="feature-content">
                        <h2>Advanced Analytics Dashboard</h2>
                        <p>Comprehensive data visualization and insights platform that helps administrators make informed decisions based on real-time campus data.</p>
                        <ul className="feature-list">
                            <li>Real-time performance metrics and KPIs</li>
                            <li>Student academic progress tracking</li>
                            <li>Staff efficiency and utilization reports</li>
                            <li>Financial analytics and forecasting</li>
                            <li>Custom report generation and export</li>
                        </ul>
                    </div>
                    <div className="feature-visual">
                        📈
                    </div>
                </div>
            </section>

            {/* Detailed Features Grid */}
            <section className="detailed-features fade-in">
                <h2 className="section-title">Complete Feature Set</h2>
                <div className="features-grid">
                    <div className="feature-card">
                        <div className="feature-icon">💬</div>
                        <h3>Communication Hub</h3>
                        <p>Integrated messaging system for announcements, notifications, and direct communication between students, staff, and parents.</p>
                        <div className="feature-tags">
                            <span className="tag">Messaging</span>
                            <span className="tag">Notifications</span>
                        </div>
                    </div>

                    <div className="feature-card">
                        <div className="feature-icon">📚</div>
                        <h3>Library Management</h3>
                        <p>Digital library system with book tracking, reservation system, fine management, and e-book integration.</p>
                        <div className="feature-tags">
                            <span className="tag">Books</span>
                            <span className="tag">Digital</span>
                        </div>
                    </div>

                    <div className="feature-card">
                        <div className="feature-icon">💰</div>
                        <h3>Fee Management</h3>
                        <p>Complete financial management with online payments, automated reminders, receipts, and detailed financial reporting.</p>
                        <div className="feature-tags">
                            <span className="tag">Payments</span>
                            <span className="tag">Reports</span>
                        </div>
                    </div>

                    <div className="feature-card">
                        <div className="feature-icon">🎓</div>
                        <h3>Grade Management</h3>
                        <p>Comprehensive grading system with customizable rubrics, transcript generation, and academic progress tracking.</p>
                        <div className="feature-tags">
                            <span className="tag">Grades</span>
                            <span className="tag">Transcripts</span>
                        </div>
                    </div>

                    <div className="feature-card">
                        <div className="feature-icon">🔐</div>
                        <h3>Role-Based Access</h3>
                        <p>Granular permission system ensuring each user sees only relevant information with complete data security.</p>
                        <div className="feature-tags">
                            <span className="tag">Security</span>
                            <span className="tag">Privacy</span>
                        </div>
                    </div>

                    <div className="feature-card">
                        <div className="feature-icon">📱</div>
                        <h3>Mobile Applications</h3>
                        <p>Native iOS and Android apps for students, staff, and parents with offline capability and push notifications.</p>
                        <div className="feature-tags">
                            <span className="tag">iOS</span>
                            <span className="tag">Android</span>
                        </div>
                    </div>

                    <div className="feature-card">
                        <div className="feature-icon">🏥</div>
                        <h3>Health Records</h3>
                        <p>Medical history tracking, vaccination records, health checkup scheduling, and emergency contact management.</p>
                        <div className="feature-tags">
                            <span className="tag">Medical</span>
                            <span className="tag">Safety</span>
                        </div>
                    </div>

                    <div className="feature-card">
                        <div className="feature-icon">🚌</div>
                        <h3>Transport Management</h3>
                        <p>GPS-enabled bus tracking, route optimization, driver management, and real-time location sharing with parents.</p>
                        <div className="feature-tags">
                            <span className="tag">GPS</span>
                            <span className="tag">Tracking</span>
                        </div>
                    </div>

                    <div className="feature-card">
                        <div className="feature-icon">🍽️</div>
                        <h3>Hostel &amp; Mess</h3>
                        <p>Complete hostel management with room allocation, mess menu planning, attendance, and complaint management.</p>
                        <div className="feature-tags">
                            <span className="tag">Hostel</span>
                            <span className="tag">Dining</span>
                        </div>
                    </div>

                    <div className="feature-card">
                        <div className="feature-icon">🎯</div>
                        <h3>Event Management</h3>
                        <p>Plan, organize, and manage campus events with registration, ticketing, and attendance tracking.</p>
                        <div className="feature-tags">
                            <span className="tag">Events</span>
                            <span className="tag">Registration</span>
                        </div>
                    </div>

                    <div className="feature-card">
                        <div className="feature-icon">📹</div>
                        <h3>CCTV Integration</h3>
                        <p>Campus-wide surveillance with AI-powered analytics, incident detection, and secure video storage.</p>
                        <div className="feature-tags">
                            <span className="tag">Security</span>
                            <span className="tag">AI</span>
                        </div>
                    </div>

                    <div className="feature-card">
                        <div className="feature-icon">☁️</div>
                        <h3>Cloud Storage</h3>
                        <p>Secure cloud storage for documents, assignments, and institutional records with automatic backup.</p>
                        <div className="feature-tags">
                            <span className="tag">Cloud</span>
                            <span className="tag">Backup</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Comparison Table */}
            <section className="comparison-section fade-in">
                <h2 className="section-title">Why Choose SmartCampus+</h2>
                <div className="comparison-table">
                    <table>
                        <thead>
                            <tr>
                                <th>Feature</th>
                                <th>SmartCampus+</th>
                                <th>Traditional Systems</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>Real-time Updates</td>
                                <td><span className="check">✓</span></td>
                                <td><span className="cross">✗</span></td>
                            </tr>
                            <tr>
                                <td>Mobile Apps</td>
                                <td><span className="check">✓</span></td>
                                <td><span className="cross">✗</span></td>
                            </tr>
                            <tr>
                                <td>AI-Powered Analytics</td>
                                <td><span className="check">✓</span></td>
                                <td><span className="cross">✗</span></td>
                            </tr>
                            <tr>
                                <td>Cloud-Based</td>
                                <td><span className="check">✓</span></td>
                                <td><span className="cross">✗</span></td>
                            </tr>
                            <tr>
                                <td>Automated Workflows</td>
                                <td><span className="check">✓</span></td>
                                <td><span className="cross">✗</span></td>
                            </tr>
                            <tr>
                                <td>24/7 Support</td>
                                <td><span className="check">✓</span></td>
                                <td><span className="cross">✗</span></td>
                            </tr>
                            <tr>
                                <td>Regular Updates</td>
                                <td><span className="check">✓</span></td>
                                <td><span className="cross">✗</span></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </section>

            {/* Call to Action Section */}
            <section className="cta-section fade-in">
                <div className="cta-content">
                    <h2>Ready to Transform Your Campus?</h2>
                    <p>Join 500+ institutions already using SmartCampus+ to streamline operations and enhance the educational experience.</p>
                    <div className="cta-buttons">
                        <Link to="/contact" className="btn btn-primary">Request a Demo</Link>
                        <Link to="/contact" className="btn btn-secondary">View Pricing</Link>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="footer">
                <div className="footer-content">
                    <div className="footer-section">
                        <h3>Quick Links</h3>
                        <Link to="/">Home</Link>
                        <Link to="/about">About</Link>
                        <Link to="/contact">Contact</Link>
                        <a href="#privacy">Privacy Policy</a>
                    </div>
                    <div className="footer-section">
                        <h3>Contact Us</h3>
                        <p>📧 info@smartcampus.edu</p>
                        <p>📍 123 Education Lane, Campus City, CC 12345</p>
                    </div>
                    <div className="footer-section">
                        <h3>Follow Us</h3>
                        <p>Stay connected on social media</p>
                    </div>
                </div>
                <div className="footer-bottom">
                    <p>&copy; 2025 SmartCampus+. All rights reserved.</p>
                </div>
            </footer>
        </>
    );
}

export default Featurepage;
