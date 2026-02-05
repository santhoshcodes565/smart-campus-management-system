import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell
} from 'recharts';
import './FacultySubjectAnalytics.css';

const GRADE_COLORS = {
    O: '#00C49F',
    Aplus: '#0088FE',
    A: '#00B4D8',
    B: '#FFBB28',
    C: '#FF8042',
    D: '#8884D8',
    F: '#FF6B6B'
};

const FacultySubjectAnalytics = () => {
    const [initialLoading, setInitialLoading] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [subjects, setSubjects] = useState([]);
    const [selectedSubject, setSelectedSubject] = useState('');
    const [analytics, setAnalytics] = useState(null);
    const [classAnalytics, setClassAnalytics] = useState(null);
    const [weakStudents, setWeakStudents] = useState([]);

    // Fetch subjects assigned to faculty
    const fetchSubjects = useCallback(async () => {
        try {
            const response = await api.get('/faculty/my-subjects');
            if (response.data?.success) {
                // API returns { subjects: [...], department, classIds }
                const subjectsList = response.data.data?.subjects || [];
                setSubjects(subjectsList);
                if (subjectsList.length > 0) {
                    setSelectedSubject(subjectsList[0]._id);
                }
            }
        } catch (err) {
            console.error('Failed to fetch subjects:', err);
            setSubjects([]); // Ensure it's always an array
        } finally {
            setInitialLoading(false);
        }
    }, []);

    // Fetch subject analytics
    const fetchSubjectAnalytics = useCallback(async () => {
        if (!selectedSubject) return;

        setLoading(true);
        setError(null);

        try {
            const response = await api.get(`/faculty/subject-analytics/${selectedSubject}`);
            if (response.data?.success) {
                setAnalytics(response.data.data);
            }
        } catch (err) {
            console.error('Failed to fetch subject analytics:', err);
            setError('Analytics data not available yet');
            setAnalytics(null);
        } finally {
            setLoading(false);
        }
    }, [selectedSubject]);

    // Fetch class analytics
    const fetchClassAnalytics = useCallback(async () => {
        try {
            const response = await api.get('/faculty/class-analytics');
            if (response.data?.success) {
                setClassAnalytics(response.data.data);
            }
        } catch (err) {
            console.error('Failed to fetch class analytics:', err);
        }
    }, []);

    // Fetch weak students
    const fetchWeakStudents = useCallback(async () => {
        try {
            const response = await api.get('/faculty/weak-students?limit=10');
            if (response.data?.success) {
                setWeakStudents(response.data.data?.students || []);
            }
        } catch (err) {
            console.error('Failed to fetch weak students:', err);
        }
    }, []);

    useEffect(() => {
        fetchSubjects();
        fetchClassAnalytics();
        fetchWeakStudents();
    }, [fetchSubjects, fetchClassAnalytics, fetchWeakStudents]);

    useEffect(() => {
        fetchSubjectAnalytics();
    }, [fetchSubjectAnalytics]);

    // Transform grade distribution for chart
    const getGradeChartData = () => {
        if (!analytics?.analytics?.gradeDistribution) return [];
        const dist = analytics.analytics.gradeDistribution;
        return [
            { name: 'O', value: dist.O || 0, fill: GRADE_COLORS.O },
            { name: 'A+', value: dist.Aplus || 0, fill: GRADE_COLORS.Aplus },
            { name: 'A', value: dist.A || 0, fill: GRADE_COLORS.A },
            { name: 'B', value: dist.B || 0, fill: GRADE_COLORS.B },
            { name: 'C', value: dist.C || 0, fill: GRADE_COLORS.C },
            { name: 'D', value: dist.D || 0, fill: GRADE_COLORS.D },
            { name: 'F', value: dist.F || 0, fill: GRADE_COLORS.F }
        ].filter(item => item.value > 0);
    };

    // Get difficulty color
    const getDifficultyColor = (level) => {
        switch (level) {
            case 'easy': return '#00C49F';
            case 'moderate': return '#0088FE';
            case 'challenging': return '#FFBB28';
            case 'difficult': return '#FF8042';
            case 'very_difficult': return '#FF6B6B';
            default: return '#8888aa';
        }
    };

    // Get risk level class
    const getRiskClass = (level) => {
        switch (level) {
            case 'critical': return 'risk-critical';
            case 'high': return 'risk-high';
            case 'medium': return 'risk-medium';
            case 'low': return 'risk-low';
            default: return '';
        }
    };

    // Show spinner only during initial load
    if (initialLoading) {
        return (
            <div className="faculty-analytics-loading">
                <div className="spinner"></div>
                <p>Loading Analytics...</p>
            </div>
        );
    }

    return (
        <div className="faculty-analytics">
            {/* Header */}
            <div className="fac-analytics-header">
                <div className="header-content">
                    <h1>📊 Subject Analytics</h1>
                    <p className="subtitle">Performance insights for your subjects</p>
                </div>

                <div className="subject-selector">
                    {subjects.length > 0 ? (
                        <select
                            value={selectedSubject}
                            onChange={(e) => setSelectedSubject(e.target.value)}
                            className="subject-select"
                        >
                            {subjects.map(subject => (
                                <option key={subject._id} value={subject._id}>
                                    {subject.name} ({subject.code})
                                </option>
                            ))}
                        </select>
                    ) : (
                        <span className="no-subjects">No subjects assigned</span>
                    )}
                </div>
            </div>

            {error && (
                <div className="error-banner">
                    <span>⚠️ {error}</span>
                </div>
            )}

            {/* Subject Analytics Section */}
            {analytics?.analytics && (
                <div className="analytics-section">
                    <div className="section-header">
                        <h2>📚 {analytics.subject?.name}</h2>
                        <span className="subject-code">{analytics.subject?.code} • Semester {analytics.subject?.semester}</span>
                    </div>

                    {/* KPI Row */}
                    <div className="subject-kpi-row">
                        <div className="subject-kpi">
                            <span className="kpi-value">{analytics.analytics.passPercentage}%</span>
                            <span className="kpi-label">Pass Rate</span>
                        </div>
                        <div className="subject-kpi">
                            <span className="kpi-value">{analytics.analytics.averageMarks}</span>
                            <span className="kpi-label">Avg Marks</span>
                        </div>
                        <div className="subject-kpi">
                            <span className="kpi-value">{analytics.analytics.highestMarks}</span>
                            <span className="kpi-label">Highest</span>
                        </div>
                        <div className="subject-kpi">
                            <span className="kpi-value">{analytics.analytics.totalAttempts}</span>
                            <span className="kpi-label">Total Attempts</span>
                        </div>
                        <div className="subject-kpi difficulty-kpi">
                            <span
                                className="kpi-value"
                                style={{ color: getDifficultyColor(analytics.analytics.difficultyLevel) }}
                            >
                                {analytics.analytics.difficultyLevel?.replace('_', ' ')}
                            </span>
                            <span className="kpi-label">Difficulty</span>
                        </div>
                    </div>

                    {/* Charts Row */}
                    <div className="subject-charts-row">
                        {/* Pass/Fail Ring */}
                        <div className="chart-card">
                            <h3>Pass/Fail Distribution</h3>
                            <div className="chart-container">
                                <ResponsiveContainer width="100%" height={250}>
                                    <PieChart>
                                        <Pie
                                            data={[
                                                { name: 'Passed', value: analytics.analytics.passCount, fill: '#00C49F' },
                                                { name: 'Failed', value: analytics.analytics.failCount, fill: '#FF6B6B' }
                                            ]}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={50}
                                            outerRadius={80}
                                            paddingAngle={2}
                                            dataKey="value"
                                            label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                                        >
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Grade Distribution */}
                        <div className="chart-card">
                            <h3>Grade Distribution</h3>
                            <div className="chart-container">
                                <ResponsiveContainer width="100%" height={250}>
                                    <BarChart data={getGradeChartData()}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                        <XAxis dataKey="name" stroke="#888" />
                                        <YAxis stroke="#888" />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#1e1e2f', border: '1px solid #3d3d5c' }}
                                        />
                                        <Bar dataKey="value" name="Students">
                                            {getGradeChartData().map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.fill} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Class Analytics */}
            {classAnalytics && (
                <div className="class-section">
                    <h2>👥 Class Performance Overview</h2>
                    <div className="class-kpi-row">
                        <div className="class-kpi">
                            <span className="kpi-value">{classAnalytics.summary?.totalStudents || 0}</span>
                            <span className="kpi-label">Total Students</span>
                        </div>
                        <div className="class-kpi">
                            <span className="kpi-value">{classAnalytics.summary?.averageCGPA || 0}</span>
                            <span className="kpi-label">Class Avg CGPA</span>
                        </div>
                        <div className="class-kpi risk-kpi">
                            <span className="kpi-value">{classAnalytics.summary?.atRiskCount || 0}</span>
                            <span className="kpi-label">At Risk</span>
                        </div>
                    </div>

                    {/* Top Performers */}
                    <div className="performers-section">
                        <h3>🏆 Top Performers</h3>
                        <div className="performers-list">
                            {classAnalytics.topPerformers?.slice(0, 5).map((student, idx) => (
                                <div key={idx} className="performer-card">
                                    <span className="rank">{student.rank === 1 ? '🥇' : student.rank === 2 ? '🥈' : student.rank === 3 ? '🥉' : `#${student.rank}`}</span>
                                    <span className="name">{student.name}</span>
                                    <span className="roll">{student.rollNo}</span>
                                    <span className="cgpa">{student.cgpa}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Weak Students */}
            <div className="weak-students-section">
                <h2>⚠️ Students Needing Attention</h2>
                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Roll No</th>
                                <th>Semester</th>
                                <th>CGPA</th>
                                <th>Risk Level</th>
                                <th>Arrears</th>
                            </tr>
                        </thead>
                        <tbody>
                            {weakStudents.length === 0 ? (
                                <tr><td colSpan="6" className="no-data">✅ No students below threshold</td></tr>
                            ) : weakStudents.map((student, idx) => (
                                <tr key={student.studentId || idx}>
                                    <td>{student.name}</td>
                                    <td>{student.rollNo}</td>
                                    <td>Sem {student.semester}</td>
                                    <td><span className="cgpa-low">{student.cgpa}</span></td>
                                    <td>
                                        <span className={`risk-badge ${getRiskClass(student.riskLevel)}`}>
                                            {student.riskLevel}
                                        </span>
                                    </td>
                                    <td>{student.activeArrears}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default FacultySubjectAnalytics;
