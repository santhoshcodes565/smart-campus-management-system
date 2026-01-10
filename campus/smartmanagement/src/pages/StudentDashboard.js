// StudentDashboard.js - Student Portal Dashboard
import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import '../styles/Dashboard.css';

function StudentDashboard() {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);

    useEffect(() => {
        // Check if user is logged in
        const token = localStorage.getItem('token');
        const userData = localStorage.getItem('user');

        if (!token || !userData) {
            navigate('/login');
            return;
        }

        const parsedUser = JSON.parse(userData);
        if (parsedUser.role !== 'student') {
            navigate('/login');
            return;
        }

        setUser(parsedUser);
    }, [navigate]);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
    };

    if (!user) return <div className="loading">Loading...</div>;

    return (
        <div className="dashboard-container">
            <nav className="dashboard-nav">
                <div className="nav-brand">🎓 SmartCampus+ | Student Portal</div>
                <div className="nav-user">
                    <span>Welcome, {user.name}</span>
                    <button onClick={handleLogout} className="btn-logout">Logout</button>
                </div>
            </nav>

            <div className="dashboard-content">
                <h1>Student Dashboard</h1>
                <p className="welcome-text">Welcome to your student portal, {user.name}!</p>

                <div className="dashboard-grid">
                    <div className="dashboard-card">
                        <div className="card-icon">📋</div>
                        <h3>View Attendance</h3>
                        <p>Check your attendance records</p>
                    </div>
                    <div className="dashboard-card">
                        <div className="card-icon">📊</div>
                        <h3>View Marks</h3>
                        <p>See your exam results</p>
                    </div>
                    <div className="dashboard-card">
                        <div className="card-icon">📅</div>
                        <h3>Timetable</h3>
                        <p>View your class schedule</p>
                    </div>
                    <div className="dashboard-card">
                        <div className="card-icon">💰</div>
                        <h3>Fee Details</h3>
                        <p>Check payment status</p>
                    </div>
                    <div className="dashboard-card">
                        <div className="card-icon">🚌</div>
                        <h3>Transport</h3>
                        <p>Bus route information</p>
                    </div>
                    <div className="dashboard-card">
                        <div className="card-icon">📝</div>
                        <h3>Apply Leave</h3>
                        <p>Submit leave requests</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default StudentDashboard;

