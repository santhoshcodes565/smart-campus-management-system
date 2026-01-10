// Homepage.js - Main landing page for SmartCampus+
// 
// FIX APPLIED: 
// - Removed useEffect IntersectionObserver that caused visibility issues
// - Simplified component to ensure all content renders immediately
// - Hero section now displays: heading, description, buttons, and placeholder image

import { useState } from 'react';
import { Link } from 'react-router-dom';
import '../styles/Home.css';

// Import the hero image from assets folder
import campusImage from '../assets/imagecampus.png';

function HomePage() {
    // State for mobile menu toggle
    const [menuOpen, setMenuOpen] = useState(false);

    // Toggle function for hamburger menu
    const toggleMenu = () => {
        setMenuOpen(!menuOpen);
    };

    // Close menu when clicking a link
    const closeMenu = () => {
        setMenuOpen(false);
    };

    return (
        <>
            {/* ========== NAVBAR ========== */}
            <nav className="navbar">
                <Link to="/" className="logo">SmartCampus+</Link>
                <ul className={`nav-menu ${menuOpen ? 'active' : ''}`}>
                    <li><Link to="/" onClick={closeMenu}>Home</Link></li>
                    <li><Link to="/features" onClick={closeMenu}>Features</Link></li>
                    <li><Link to="/about" onClick={closeMenu}>About</Link></li>
                    <li><Link to="/contact" onClick={closeMenu}>Contact</Link></li>
                </ul>
                <div className="nav-buttons">
                    <Link to="/login" className="btn btn-login">Login</Link>
                    <Link to="/login" className="btn btn-register">Login</Link>
                </div>
                <button
                    className={`hamburger ${menuOpen ? 'active' : ''}`}
                    onClick={toggleMenu}
                    aria-label="Toggle menu"
                >
                    <span></span>
                    <span></span>
                    <span></span>
                </button>
            </nav>

            {/* ========== HERO SECTION ========== */}
            {/* FIX: This section contains the main content that was invisible */}
            <section className="hero">
                <div className="hero-content">
                    <h1>Smart Campus Management System</h1>
                    <p>One platform for students, staff, and administrators</p>
                    <div className="hero-buttons">
                        <Link to="/login" className="btn btn-primary">Login</Link>
                        <Link to="/login" className="btn btn-secondary">Login</Link>
                    </div>
                </div>
                <div className="hero-illustration">
                    {/* Hero image - using imported campusImage */}
                    <img
                        src={campusImage}
                        alt="Smart Campus Management System"
                        className="hero-image"
                    />
                </div>
            </section>

            {/* ========== FEATURES SECTION ========== */}
            <section className="features">
                <h2 className="section-title">Powerful Features</h2>
                <div className="features-grid">
                    <div className="feature-card">
                        <div className="feature-icon">📋</div>
                        <h3>Student Attendance Tracking</h3>
                        <p>Real-time attendance monitoring with automated alerts and detailed analytics for every class.</p>
                    </div>
                    <div className="feature-card">
                        <div className="feature-icon">🎫</div>
                        <h3>Digital ID &amp; QR Scanner</h3>
                        <p>Contactless campus access with secure QR code technology for seamless identification.</p>
                    </div>
                    <div className="feature-card">
                        <div className="feature-icon">👔</div>
                        <h3>Staff Management</h3>
                        <p>Comprehensive tools for managing faculty schedules, payroll, and performance tracking.</p>
                    </div>
                    <div className="feature-card">
                        <div className="feature-icon">⚙️</div>
                        <h3>Admin Control Panel</h3>
                        <p>Complete system oversight with advanced analytics, reports, and configuration options.</p>
                    </div>
                    <div className="feature-card">
                        <div className="feature-icon">📅</div>
                        <h3>Classroom &amp; Lab Scheduling</h3>
                        <p>Intelligent scheduling system that optimizes room allocation and prevents conflicts.</p>
                    </div>
                    <div className="feature-card">
                        <div className="feature-icon">📹</div>
                        <h3>CCTV Monitoring</h3>
                        <p>Campus-wide security surveillance with AI-powered analytics for administrator access.</p>
                    </div>
                </div>
            </section>

            {/* ========== PORTAL ACCESS SECTION ========== */}
            <section className="portals">
                <h2 className="section-title">Quick Portal Access</h2>
                <div className="portals-grid">
                    <div className="portal-card student">
                        <div className="portal-icon">🎓</div>
                        <h3>Student Portal</h3>
                        <p>Access grades, attendance, schedule, and campus services</p>
                        <button className="btn btn-portal">Enter</button>
                    </div>
                    <div className="portal-card staff">
                        <div className="portal-icon">👨‍🏫</div>
                        <h3>Staff Portal</h3>
                        <p>Manage classes, mark attendance, and view schedules</p>
                        <button className="btn btn-portal">Enter</button>
                    </div>
                    <div className="portal-card admin">
                        <div className="portal-icon">🔑</div>
                        <h3>Admin Portal</h3>
                        <p>Full system control, analytics, and management tools</p>
                        <button className="btn btn-portal">Enter</button>
                    </div>
                </div>
            </section>

            {/* ========== ANNOUNCEMENTS SECTION ========== */}
            <section className="announcements">
                <h2 className="section-title">Latest Announcements</h2>
                <div className="announcements-slider">
                    <div className="announcement-card">
                        <h4>🎉 New Semester Registration Open</h4>
                        <p className="announcement-date">December 1, 2025</p>
                    </div>
                    <div className="announcement-card">
                        <h4>📚 Library Extended Hours</h4>
                        <p className="announcement-date">November 28, 2025</p>
                    </div>
                    <div className="announcement-card">
                        <h4>🏆 Annual Sports Day - Dec 15</h4>
                        <p className="announcement-date">November 25, 2025</p>
                    </div>
                    <div className="announcement-card">
                        <h4>💻 New Lab Equipment Installed</h4>
                        <p className="announcement-date">November 22, 2025</p>
                    </div>
                    {/* Duplicate cards for infinite scroll animation */}
                    <div className="announcement-card">
                        <h4>🎉 New Semester Registration Open</h4>
                        <p className="announcement-date">December 1, 2025</p>
                    </div>
                    <div className="announcement-card">
                        <h4>📚 Library Extended Hours</h4>
                        <p className="announcement-date">November 28, 2025</p>
                    </div>
                    <div className="announcement-card">
                        <h4>🏆 Annual Sports Day - Dec 15</h4>
                        <p className="announcement-date">November 25, 2025</p>
                    </div>
                    <div className="announcement-card">
                        <h4>💻 New Lab Equipment Installed</h4>
                        <p className="announcement-date">November 22, 2025</p>
                    </div>
                </div>
            </section>

            {/* ========== FOOTER ========== */}
            <footer className="footer">
                <div className="footer-content">
                    <div className="footer-section">
                        <h3>Quick Links</h3>
                        <Link to="/">Home</Link>
                        <Link to="/features">Features</Link>
                        <Link to="/about">About</Link>
                        <Link to="/contact">Contact</Link>
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

export default HomePage;
