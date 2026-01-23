// AdminDashboard.js - Admin Portal Dashboard
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BirthdayWidget from '../components/common/BirthdayWidget';
import '../styles/Dashboard.css';

function AdminDashboard() {
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
        if (parsedUser.role !== 'admin') {
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
        <div className="dashboard-container admin">
            <nav className="dashboard-nav">
                <div className="nav-brand">🔑 SmartCampus+ | Admin Portal</div>
                <div className="nav-user">
                    <span>Welcome, {user.name}</span>
                    <button onClick={handleLogout} className="btn-logout">Logout</button>
                </div>
            </nav>

            <div className="dashboard-content">
                <h1>Admin Dashboard</h1>
                <p className="welcome-text">Full system control and management, {user.name}!</p>

                {/* Birthday Widget - Top of Dashboard */}
                <div className="dashboard-widgets-row">
                    <BirthdayWidget showRoleBadge={true} />
                </div>

                <div className="dashboard-grid">
                    <div className="dashboard-card">
                        <div className="card-icon">🎓</div>
                        <h3>Manage Students</h3>
                        <p>Add, edit, remove students</p>
                    </div>
                    <div className="dashboard-card">
                        <div className="card-icon">👨‍🏫</div>
                        <h3>Manage Faculty</h3>
                        <p>Staff management</p>
                    </div>
                    <div className="dashboard-card">
                        <div className="card-icon">📅</div>
                        <h3>Timetable</h3>
                        <p>Manage schedules</p>
                    </div>
                    <div className="dashboard-card">
                        <div className="card-icon">🚌</div>
                        <h3>Transport</h3>
                        <p>Bus & route management</p>
                    </div>
                    <div className="dashboard-card">
                        <div className="card-icon">💰</div>
                        <h3>Fee Management</h3>
                        <p>Handle payments</p>
                    </div>
                    <div className="dashboard-card">
                        <div className="card-icon">📢</div>
                        <h3>Global Notices</h3>
                        <p>Announcements</p>
                    </div>
                    <div className="dashboard-card">
                        <div className="card-icon">📊</div>
                        <h3>Reports</h3>
                        <p>Analytics & insights</p>
                    </div>
                    <div className="dashboard-card">
                        <div className="card-icon">⚙️</div>
                        <h3>Settings</h3>
                        <p>System configuration</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default AdminDashboard;

