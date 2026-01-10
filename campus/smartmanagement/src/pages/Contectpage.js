// Contactpage.js - Contact page for SmartCampus+
// Displays contact form, contact info, map, and FAQ section

import { useState } from 'react';
import { Link } from 'react-router-dom';
import '../styles/Contect.css';

function Contactpage() {
    // State for mobile menu toggle
    const [menuOpen, setMenuOpen] = useState(false);

    // State for form submission
    const [formSubmitted, setFormSubmitted] = useState(false);

    // State for FAQ accordion
    const [activeQuestion, setActiveQuestion] = useState(null);

    // Toggle function for hamburger menu
    const toggleMenu = () => {
        setMenuOpen(!menuOpen);
    };

    // Handle form submission
    const handleSubmit = (e) => {
        e.preventDefault();
        // Show success message
        setFormSubmitted(true);
        // Reset form
        e.target.reset();
        // Hide success message after 5 seconds
        setTimeout(() => setFormSubmitted(false), 5000);
    };

    // Toggle FAQ question
    const toggleQuestion = (index) => {
        setActiveQuestion(activeQuestion === index ? null : index);
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

            {/* Contact Hero Section */}
            <section className="contact-hero">
                <h1>Get In Touch</h1>
                <p>Have questions? We'd love to hear from you. Send us a message and we'll respond as soon as possible.</p>
            </section>

            {/* Contact Main Section */}
            <section className="contact-main fade-in">
                <div className="contact-container">
                    {/* Contact Form */}
                    <div className="contact-form-wrapper">
                        <h2>Send Us a Message</h2>
                        <form id="contactForm" onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label htmlFor="name">Full Name *</label>
                                <input
                                    type="text"
                                    id="name"
                                    name="name"
                                    required
                                    placeholder="Enter your full name"
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="email">Email Address *</label>
                                <input
                                    type="email"
                                    id="email"
                                    name="email"
                                    required
                                    placeholder="your.email@example.com"
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="phone">Phone Number</label>
                                <input
                                    type="tel"
                                    id="phone"
                                    name="phone"
                                    placeholder="+91 12345 67890"
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="subject">Subject *</label>
                                <select id="subject" name="subject" required>
                                    <option value="">Select a subject</option>
                                    <option value="general">General Inquiry</option>
                                    <option value="support">Technical Support</option>
                                    <option value="demo">Request a Demo</option>
                                    <option value="partnership">Partnership Opportunity</option>
                                    <option value="feedback">Feedback</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label htmlFor="message">Message *</label>
                                <textarea
                                    id="message"
                                    name="message"
                                    required
                                    placeholder="Tell us more about your inquiry..."
                                ></textarea>
                            </div>
                            <button type="submit" className="btn btn-submit">Send Message</button>

                            {/* Success Message - controlled by React state */}
                            {formSubmitted && (
                                <div className="success-message show" id="successMessage">
                                    ✓ Thank you! Your message has been sent successfully. We'll get back to you soon.
                                </div>
                            )}
                        </form>
                    </div>

                    {/* Contact Info Cards */}
                    <div className="contact-info">
                        <div className="info-card">
                            <div className="info-icon">📧</div>
                            <h3>Email Us</h3>
                            <p>For general inquiries:<br />
                                <a href="mailto:info@smartcampus.edu">info@smartcampus.edu</a></p>
                            <p>For support:<br />
                                <a href="mailto:support@smartcampus.edu">support@smartcampus.edu</a></p>
                        </div>

                        <div className="info-card">
                            <div className="info-icon">📞</div>
                            <h3>Call Us</h3>
                            <p>Main Office: <a href="tel:+911234567890">+91 12345 67890</a></p>
                            <p>Support Hotline: <a href="tel:+911234567891">+91 12345 67891</a></p>
                            <p>Available: Mon-Fri, 9:00 AM - 6:00 PM IST</p>
                        </div>

                        <div className="info-card">
                            <div className="info-icon">📍</div>
                            <h3>Visit Us</h3>
                            <p>SmartCampus+ Headquarters<br />
                                123 Education Lane<br />
                                Campus City, CC 12345<br />
                                India</p>
                        </div>

                        <div className="info-card">
                            <div className="info-icon">🌐</div>
                            <h3>Follow Us</h3>
                            <p>Stay connected on social media for updates, tips, and campus management insights.</p>
                            <p style={{ marginTop: '1rem' }}>
                                <a href="#linkedin">LinkedIn</a> •
                                <a href="#twitter">Twitter</a> •
                                <a href="#facebook">Facebook</a>
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Map Section */}
            <section className="map-section fade-in">
                <h2>Find Us Here</h2>
                <div className="map-container">
                    <div className="map-placeholder">
                        🗺️
                    </div>
                    <p style={{ color: 'rgba(255, 255, 255, 0.8)', marginTop: '1rem', fontSize: '0.95rem' }}>
                        Interactive map integration available. Visit us at our office location or schedule a virtual meeting.
                    </p>
                </div>
            </section>

            {/* FAQ Section with accordion functionality */}
            <section className="faq-section fade-in">
                <h2>Frequently Asked Questions</h2>
                <div className="faq-container">
                    {/* FAQ Item 1 */}
                    <div
                        className={`faq-item ${activeQuestion === 0 ? 'active' : ''}`}
                        onClick={() => toggleQuestion(0)}
                    >
                        <div className="faq-question">
                            <h3>What are your business hours?</h3>
                            <span className="faq-icon">▼</span>
                        </div>
                        <div className="faq-answer">
                            Our office is open Monday through Friday, 9:00 AM to 6:00 PM IST. Our support team is available via email 24/7, and we respond within 24 hours on business days.
                        </div>
                    </div>

                    {/* FAQ Item 2 */}
                    <div
                        className={`faq-item ${activeQuestion === 1 ? 'active' : ''}`}
                        onClick={() => toggleQuestion(1)}
                    >
                        <div className="faq-question">
                            <h3>How quickly can I expect a response?</h3>
                            <span className="faq-icon">▼</span>
                        </div>
                        <div className="faq-answer">
                            We typically respond to all inquiries within 24 hours during business days. Urgent technical support requests are prioritized and handled within 4-6 hours.
                        </div>
                    </div>

                    {/* FAQ Item 3 */}
                    <div
                        className={`faq-item ${activeQuestion === 2 ? 'active' : ''}`}
                        onClick={() => toggleQuestion(2)}
                    >
                        <div className="faq-question">
                            <h3>Do you offer on-site demonstrations?</h3>
                            <span className="faq-icon">▼</span>
                        </div>
                        <div className="faq-answer">
                            Yes! We offer both virtual and on-site demonstrations for educational institutions interested in SmartCampus+. Contact us to schedule a personalized demo session.
                        </div>
                    </div>

                    {/* FAQ Item 4 */}
                    <div
                        className={`faq-item ${activeQuestion === 3 ? 'active' : ''}`}
                        onClick={() => toggleQuestion(3)}
                    >
                        <div className="faq-question">
                            <h3>How can I report a technical issue?</h3>
                            <span className="faq-icon">▼</span>
                        </div>
                        <div className="faq-answer">
                            For technical issues, please email support@smartcampus.edu with detailed information about the problem. You can also call our support hotline for immediate assistance.
                        </div>
                    </div>

                    {/* FAQ Item 5 */}
                    <div
                        className={`faq-item ${activeQuestion === 4 ? 'active' : ''}`}
                        onClick={() => toggleQuestion(4)}
                    >
                        <div className="faq-question">
                            <h3>Do you provide training for new users?</h3>
                            <span className="faq-icon">▼</span>
                        </div>
                        <div className="faq-answer">
                            Absolutely! We provide comprehensive training sessions for administrators, staff, and students. Training is included with all institutional packages and can be customized to your needs.
                        </div>
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
                        <Link to="/features">Features</Link>
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

export default Contactpage;
