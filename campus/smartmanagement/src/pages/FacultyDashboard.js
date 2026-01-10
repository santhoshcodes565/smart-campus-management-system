// FacultyDashboard.js - Faculty Portal Dashboard
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/Dashboard.css';

function FacultyDashboard() {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);

    useEffect(() => {
        const token = localStorage.getItem('token');
        const userData = localStorage.getItem('user');

        if (!token || !userData) {
            navigate('/login');
            return;
        }

        const parsedUser = JSON.parse(userData);
        if (parsedUser.role !== 'faculty') {
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
        <div className="dashboard-container faculty">
            <nav className="dashboard-nav">
                <div className="nav-brand">👨‍🏫 SmartCampus+ | Faculty Portal</div>
                <div className="nav-user">
                    <span>Welcome, {user.name}</span>
                    <button onClick={handleLogout} className="btn-logout">Logout</button>
                </div>
            </nav>

            <div className="dashboard-content">
                <h1>Faculty Dashboard</h1>
                <p className="welcome-text">Manage your classes and students, {user.name}!</p>

                <div className="dashboard-grid">
                    <div className="dashboard-card">
                        <div className="card-icon">📋</div>
                        <h3>Mark Attendance</h3>
                        <p>Record student attendance</p>
                    </div>
                    <div className="dashboard-card">
                        <div className="card-icon">📊</div>
                        <h3>Upload Marks</h3>
                        <p>Enter student grades</p>
                    </div>
                    <div className="dashboard-card">
                        <div className="card-icon">👥</div>
                        <h3>Students List</h3>
                        <p>View your students</p>
                    </div>
                    <div className="dashboard-card">
                        <div className="card-icon">📅</div>
                        <h3>Timetable</h3>
                        <p>View your schedule</p>
                    </div>
                    <div className="dashboard-card">
                        <div className="card-icon">📝</div>
                        <h3>Leave Requests</h3>
                        <p>Approve/reject leaves</p>
                    </div>
                    <div className="dashboard-card">
                        <div className="card-icon">📢</div>
                        <h3>Post Notice</h3>
                        <p>Create announcements</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default FacultyDashboard;

