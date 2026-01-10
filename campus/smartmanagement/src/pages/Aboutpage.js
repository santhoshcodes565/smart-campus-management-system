// AboutPage.js - About page for SmartCampus+
// Displays company mission, values, team, and timeline

import { useState } from 'react';
import { Link } from 'react-router-dom';
import '../styles/About.css';

function AboutPage() {
    // State for mobile menu toggle
    const [menuOpen, setMenuOpen] = useState(false);

    // Toggle function for hamburger menu
    const toggleMenu = () => {
        setMenuOpen(!menuOpen);
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

            {/* About Hero Section */}
            <section className="about-hero">
                <h1>About SmartCampus+</h1>
                <p>Revolutionizing education management through innovative technology and seamless integration. Building the future of smart campus ecosystems.</p>
            </section>

            {/* Mission Section */}
            <section className="mission-section fade-in">
                <div className="mission-content">
                    <div className="mission-text">
                        <h2>Our Mission</h2>
                        <p>At SmartCampus+, we're committed to transforming educational institutions through cutting-edge technology. Our platform empowers students, staff, and administrators with tools that streamline operations, enhance communication, and create a connected campus environment.</p>
                        <p>We believe in making education accessible, efficient, and engaging for everyone in the academic community. By leveraging innovative solutions, we help institutions focus on what matters most: quality education and student success.</p>
                    </div>
                    <div className="mission-visual">
                        <div className="stat-item">
                            <div className="stat-number">500+</div>
                            <div className="stat-label">Institutions Served</div>
                        </div>
                        <div className="stat-item">
                            <div className="stat-number">100K+</div>
                            <div className="stat-label">Active Users</div>
                        </div>
                        <div className="stat-item">
                            <div className="stat-number">99.9%</div>
                            <div className="stat-label">Uptime Reliability</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Values Section */}
            <section className="values-section fade-in">
                <h2 className="section-title">Our Core Values</h2>
                <div className="values-grid">
                    <div className="value-card">
                        <div className="value-icon">💡</div>
                        <h3>Innovation</h3>
                        <p>We continuously evolve our platform with the latest technologies to stay ahead of educational needs.</p>
                    </div>
                    <div className="value-card">
                        <div className="value-icon">🔒</div>
                        <h3>Security</h3>
                        <p>Protecting your data with enterprise-grade security measures and compliance standards.</p>
                    </div>
                    <div className="value-card">
                        <div className="value-icon">🤝</div>
                        <h3>Collaboration</h3>
                        <p>Fostering seamless communication between students, faculty, and administration.</p>
                    </div>
                    <div className="value-card">
                        <div className="value-icon">⚡</div>
                        <h3>Efficiency</h3>
                        <p>Streamlining processes to save time and resources for what truly matters.</p>
                    </div>
                </div>
            </section>

            {/* Timeline Section */}
            <section className="timeline-section fade-in">
                <h2 className="section-title">Our Journey</h2>
                <div className="timeline">
                    <div className="timeline-item">
                        <div className="timeline-year">2020</div>
                        <div className="timeline-content">
                            <h3>The Beginning</h3>
                            <p>SmartCampus+ was founded with a vision to digitize campus management and create a unified platform for educational institutions.</p>
                        </div>
                    </div>
                    <div className="timeline-item">
                        <div className="timeline-year">2022</div>
                        <div className="timeline-content">
                            <h3>Rapid Growth</h3>
                            <p>Reached 100+ institutions and launched our mobile app, making campus management accessible on the go.</p>
                        </div>
                    </div>
                    <div className="timeline-item">
                        <div className="timeline-year">2024</div>
                        <div className="timeline-content">
                            <h3>AI Integration</h3>
                            <p>Introduced AI-powered analytics and predictive insights for better decision-making and student success tracking.</p>
                        </div>
                    </div>
                    <div className="timeline-item">
                        <div className="timeline-year">2025</div>
                        <div className="timeline-content">
                            <h3>Future Ready</h3>
                            <p>Serving 500+ institutions with advanced features including CCTV integration, smart scheduling, and comprehensive analytics.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Team Section */}
            <section className="team-section fade-in">
                <h2 className="section-title">Meet Our Team</h2>
                <div className="team-grid">
                    <div className="team-card">
                        <div className="team-avatar">👨‍💼</div>
                        <h3>Dr. Rajesh Kumar</h3>
                        <p className="team-role">Chief Executive Officer</p>
                        <p>20+ years in education technology with a passion for innovation.</p>
                    </div>
                    <div className="team-card">
                        <div className="team-avatar">👩‍💻</div>
                        <h3>Priya Sharma</h3>
                        <p className="team-role">Chief Technology Officer</p>
                        <p>Leading our tech vision with expertise in cloud architecture.</p>
                    </div>
                    <div className="team-card">
                        <div className="team-avatar">👨‍🎓</div>
                        <h3>Arun Mehta</h3>
                        <p className="team-role">Head of Product</p>
                        <p>Designing user experiences that delight and empower users.</p>
                    </div>
                    <div className="team-card">
                        <div className="team-avatar">👩‍🔬</div>
                        <h3>Sneha Patel</h3>
                        <p className="team-role">Head of Operations</p>
                        <p>Ensuring seamless service delivery across all institutions.</p>
                    </div>
                </div>
            </section>

            {/* Footer */}
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

export default AboutPage;
