import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import './StudentPerformanceView.css';

const StudentPerformanceView = () => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [performance, setPerformance] = useState(null);
    const [studentInfo, setStudentInfo] = useState(null);
    const [placementStatus, setPlacementStatus] = useState(null);

    // Fetch performance data
    const fetchPerformance = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            // Use allSettled to handle partial failures gracefully
            const [perfRes, placementRes] = await Promise.allSettled([
                api.get('/student/performance'),
                api.get('/student/placement-status')
            ]);

            // Handle performance data
            if (perfRes.status === 'fulfilled' && perfRes.value.data?.success) {
                setStudentInfo(perfRes.value.data.data?.student || null);
                setPerformance(perfRes.value.data.data?.performance || null);
            } else {
                // Set defaults if API fails or no data
                setStudentInfo(null);
                setPerformance(null);
            }

            // Handle placement data
            if (placementRes.status === 'fulfilled' && placementRes.value.data?.success) {
                setPlacementStatus(placementRes.value.data.data);
            } else {
                // Set default placement status
                setPlacementStatus({
                    eligible: false,
                    cgpa: 0,
                    activeArrears: 0,
                    requirements: { minCGPA: 6.0 },
                    details: {
                        cgpa: { met: false },
                        arrears: { met: true }
                    }
                });
            }

        } catch (err) {
            console.error('Failed to fetch performance:', err);
            // Don't show error, just show empty state
            setPerformance(null);
            setPlacementStatus(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPerformance();
    }, [fetchPerformance]);

    // Get trend icon and color
    const getTrendDisplay = (trend) => {
        switch (trend) {
            case 'improving':
                return { icon: '📈', color: '#00C49F', text: 'Improving' };
            case 'declining':
                return { icon: '📉', color: '#FF6B6B', text: 'Declining' };
            case 'stable':
                return { icon: '➡️', color: '#0088FE', text: 'Stable' };
            default:
                return { icon: '•', color: '#8888aa', text: 'New' };
        }
    };

    // Format GPA chart data
    const getGPAChartData = () => {
        if (!performance?.semesterWiseGPA) return [];
        return performance.semesterWiseGPA.map(sem => ({
            semester: `Sem ${sem.semester}`,
            gpa: sem.gpa,
            passed: sem.passedSubjects,
            failed: sem.failedSubjects
        }));
    };

    if (loading) {
        return (
            <div className="performance-loading">
                <div className="spinner"></div>
                <p>Loading Performance Data...</p>
            </div>
        );
    }

    const trend = getTrendDisplay(performance?.performanceTrend);

    return (
        <div className="student-performance">
            {/* Header */}
            <div className="performance-header">
                <h1>📊 My Academic Performance</h1>
                <p className="subtitle">
                    {studentInfo?.rollNo} • {studentInfo?.department} • {studentInfo?.course}
                </p>
            </div>

            {/* Main KPI Cards */}
            <div className="main-kpi-grid">
                {/* CGPA Card */}
                <div className="cgpa-card">
                    <div className="cgpa-circle">
                        <span className="cgpa-value">{performance?.cgpa || 0}</span>
                        <span className="cgpa-label">CGPA</span>
                    </div>
                    <div className="cgpa-details">
                        <div className="detail-item">
                            <span className="label">Credits Earned</span>
                            <span className="value">{performance?.creditsEarned || 0}</span>
                        </div>
                        <div className="detail-item">
                            <span className="label">Total Credits</span>
                            <span className="value">{performance?.totalCredits || 0}</span>
                        </div>
                    </div>
                </div>

                {/* Trend Card */}
                <div className="trend-card">
                    <span className="trend-icon" style={{ color: trend.color }}>{trend.icon}</span>
                    <span className="trend-text" style={{ color: trend.color }}>{trend.text}</span>
                    <span className="trend-label">Performance Trend</span>
                </div>

                {/* Arrears Card */}
                <div className={`arrears-card ${performance?.activeArrears > 0 ? 'has-arrears' : 'no-arrears'}`}>
                    <span className="arrears-value">{performance?.activeArrears || 0}</span>
                    <span className="arrears-label">Active Arrears</span>
                </div>
            </div>

            {/* Placement Eligibility */}
            <div className={`placement-card ${placementStatus?.eligible ? 'eligible' : 'not-eligible'}`}>
                <div className="placement-header">
                    <span className="placement-icon">{placementStatus?.eligible ? '✅' : '⚠️'}</span>
                    <h2>Placement Eligibility</h2>
                </div>
                <div className="placement-status">
                    <span className="status-text">
                        {placementStatus?.eligible
                            ? 'You are ELIGIBLE for campus placements!'
                            : 'You are currently NOT ELIGIBLE for placements'}
                    </span>
                </div>
                <div className="placement-requirements">
                    <div className={`requirement ${placementStatus?.details?.cgpa?.met ? 'met' : 'not-met'}`}>
                        <span className="check">{placementStatus?.details?.cgpa?.met ? '✓' : '✗'}</span>
                        <span>CGPA ≥ {placementStatus?.requirements?.minCGPA} (Current: {placementStatus?.cgpa})</span>
                    </div>
                    <div className={`requirement ${placementStatus?.details?.arrears?.met ? 'met' : 'not-met'}`}>
                        <span className="check">{placementStatus?.details?.arrears?.met ? '✓' : '✗'}</span>
                        <span>No Active Arrears (Current: {placementStatus?.activeArrears})</span>
                    </div>
                </div>
            </div>

            {/* GPA Trend Chart */}
            <div className="gpa-trend-section">
                <h2>📈 Semester-wise GPA Trend</h2>
                <div className="chart-container">
                    {performance?.semesterWiseGPA?.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={getGPAChartData()}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                <XAxis dataKey="semester" stroke="#888" />
                                <YAxis stroke="#888" domain={[0, 10]} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1e1e2f', border: '1px solid #3d3d5c', borderRadius: '8px' }}
                                    labelStyle={{ color: '#fff' }}
                                    formatter={(value, name) => {
                                        if (name === 'gpa') return [value, 'GPA'];
                                        return [value, name];
                                    }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="gpa"
                                    stroke="#00C49F"
                                    strokeWidth={3}
                                    dot={{ fill: '#00C49F', strokeWidth: 2, r: 6 }}
                                    activeDot={{ r: 8, fill: '#00C49F' }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="no-data">No semester data available yet</div>
                    )}
                </div>
            </div>

            {/* Semester Breakdown */}
            <div className="semester-breakdown">
                <h2>📚 Semester-wise Performance</h2>
                <div className="semester-grid">
                    {performance?.semesterWiseGPA?.length > 0 ? (
                        performance.semesterWiseGPA.map((sem, idx) => (
                            <div key={idx} className="semester-card">
                                <div className="sem-header">Semester {sem.semester}</div>
                                <div className="sem-gpa">{sem.gpa}</div>
                                <div className="sem-details">
                                    <div className="detail passed">
                                        <span className="count">{sem.passedSubjects}</span>
                                        <span className="label">Passed</span>
                                    </div>
                                    <div className="detail failed">
                                        <span className="count">{sem.failedSubjects}</span>
                                        <span className="label">Failed</span>
                                    </div>
                                    <div className="detail total">
                                        <span className="count">{sem.totalSubjects}</span>
                                        <span className="label">Total</span>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="no-data">No semester data available</div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StudentPerformanceView;
