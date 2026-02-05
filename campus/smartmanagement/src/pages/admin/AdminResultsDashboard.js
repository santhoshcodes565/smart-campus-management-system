/**
 * Simplified Analytics Dashboard
 * Sub-200ms reads from pre-computed collection
 * 
 * DISPLAYS: KPI Cards, Grade Distribution, Semester Trend, Subject Difficulty
 */

import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import './AdminResultsDashboard.css';

const GRADE_COLORS = {
    'O (90%+)': '#00C49F',
    'A+ (80-89%)': '#0088FE',
    'A (70-79%)': '#00B4D8',
    'B+ (60-69%)': '#FFBB28',
    'B (55-59%)': '#FF9500',
    'C (50-54%)': '#FF8042',
    'D (40-49%)': '#8884D8',
    'F (<40%)': '#FF6B6B'
};

const AdminResultsDashboard = () => {
    // Data state
    const [overview, setOverview] = useState(null);
    const [gradeDistribution, setGradeDistribution] = useState([]);
    const [semesterTrend, setSemesterTrend] = useState([]);
    const [subjectDifficulty, setSubjectDifficulty] = useState([]);
    const [recentAnalytics, setRecentAnalytics] = useState([]);

    // Filter state
    const [filters, setFilters] = useState({
        department: '',
        academicYear: '',
        semester: ''
    });
    const [filterOptions, setFilterOptions] = useState({
        departments: [],
        academicYears: []
    });

    // UI state
    const [loading, setLoading] = useState(true);
    const [responseTime, setResponseTime] = useState(0);

    // ==================== FETCH FILTER OPTIONS ====================
    useEffect(() => {
        const fetchFilters = async () => {
            try {
                const response = await api.get('/admin/marks-entry/filters');
                if (response.data?.success) {
                    setFilterOptions({
                        departments: response.data.data.departments || [],
                        academicYears: response.data.data.academicYears || []
                    });
                }
            } catch (err) {
                console.error('Failed to fetch filters:', err);
            }
        };
        fetchFilters();
    }, []);

    // ==================== FETCH DASHBOARD DATA ====================
    const fetchDashboard = useCallback(async () => {
        setLoading(true);
        const startTime = Date.now();

        try {
            const queryParams = new URLSearchParams();
            if (filters.department) queryParams.append('department', filters.department);
            if (filters.academicYear) queryParams.append('academicYear', filters.academicYear);
            if (filters.semester) queryParams.append('semester', filters.semester);
            const query = queryParams.toString() ? `?${queryParams}` : '';

            const [overviewRes, gradeRes, trendRes, difficultyRes, recentRes] = await Promise.all([
                api.get(`/admin/analytics/dashboard${query}`),
                api.get(`/admin/analytics/grade-distribution${query}`),
                api.get(`/admin/analytics/semester-trend${query}`),
                api.get(`/admin/analytics/subject-difficulty${query}`),
                api.get('/admin/analytics/recent?limit=5')
            ]);

            setResponseTime(Date.now() - startTime);

            if (overviewRes.data?.success) setOverview(overviewRes.data.data);
            if (gradeRes.data?.success) setGradeDistribution(gradeRes.data.data || []);
            if (trendRes.data?.success) setSemesterTrend(trendRes.data.data || []);
            if (difficultyRes.data?.success) setSubjectDifficulty(difficultyRes.data.data || []);
            if (recentRes.data?.success) setRecentAnalytics(recentRes.data.data || []);

        } catch (err) {
            console.error('Failed to fetch dashboard:', err);
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        fetchDashboard();
    }, [fetchDashboard]);

    // ==================== HANDLE FILTER CHANGE ====================
    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    // ==================== KPI SKELETON ====================
    const KPISkeleton = () => (
        <div className="kpi-card skeleton">
            <div className="skeleton-icon"></div>
            <div className="skeleton-text"></div>
            <div className="skeleton-subtext"></div>
        </div>
    );

    // ==================== RENDER ====================
    if (loading && !overview) {
        return (
            <div className="dashboard-container">
                <div className="dashboard-header">
                    <h1>📊 Analytics Dashboard</h1>
                    <p className="subtitle">Loading pre-computed metrics...</p>
                </div>
                <div className="kpi-grid">
                    <KPISkeleton />
                    <KPISkeleton />
                    <KPISkeleton />
                    <KPISkeleton />
                    <KPISkeleton />
                </div>
            </div>
        );
    }

    return (
        <div className="dashboard-container">
            {/* Header */}
            <div className="dashboard-header">
                <div className="header-content">
                    <h1>📊 Analytics Dashboard</h1>
                    <p className="subtitle">Pre-computed Intelligence • Response: {responseTime}ms</p>
                </div>
                <div className="filters">
                    <select name="department" value={filters.department} onChange={handleFilterChange}>
                        <option value="">All Departments</option>
                        {filterOptions.departments.map(d => (
                            <option key={d._id} value={d.name}>{d.name}</option>
                        ))}
                    </select>
                    <select name="academicYear" value={filters.academicYear} onChange={handleFilterChange}>
                        <option value="">All Years</option>
                        {filterOptions.academicYears.map(y => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                    <select name="semester" value={filters.semester} onChange={handleFilterChange}>
                        <option value="">All Semesters</option>
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                            <option key={s} value={s}>Semester {s}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* No Data State */}
            {!overview && (
                <div className="no-data-state">
                    <span className="no-data-icon">📭</span>
                    <h2>No Analytics Data Available</h2>
                    <p>Publish some results to see analytics here</p>
                </div>
            )}

            {/* KPI Cards */}
            {overview && (
                <>
                    <div className="kpi-grid">
                        <div className="kpi-card kpi-students">
                            <div className="kpi-icon">🎓</div>
                            <div className="kpi-content">
                                <span className="kpi-value">{overview.totalStudents?.toLocaleString() || 0}</span>
                                <span className="kpi-label">Total Students</span>
                            </div>
                        </div>

                        <div className="kpi-card kpi-pass">
                            <div className="kpi-icon">✅</div>
                            <div className="kpi-content">
                                <span className="kpi-value">{overview.passPercentage || 0}%</span>
                                <span className="kpi-label">Pass Rate</span>
                            </div>
                            <div className="kpi-subtitle">{overview.passCount || 0} passed</div>
                        </div>

                        <div className="kpi-card kpi-avg">
                            <div className="kpi-icon">📈</div>
                            <div className="kpi-content">
                                <span className="kpi-value">{overview.averageMarks || 0}</span>
                                <span className="kpi-label">Average Marks</span>
                            </div>
                            <div className="kpi-subtitle">Highest: {overview.highestScore || 0}</div>
                        </div>

                        <div className="kpi-card kpi-distinction">
                            <div className="kpi-icon">🏆</div>
                            <div className="kpi-content">
                                <span className="kpi-value">{overview.distinctionCount || 0}</span>
                                <span className="kpi-label">Distinctions</span>
                            </div>
                            <div className="kpi-subtitle">≥ 75 marks</div>
                        </div>

                        <div className="kpi-card kpi-risk">
                            <div className="kpi-icon">⚠️</div>
                            <div className="kpi-content">
                                <span className="kpi-value">{overview.atRiskCount || 0}</span>
                                <span className="kpi-label">At Risk</span>
                            </div>
                            <div className="kpi-subtitle">&lt; 40 marks</div>
                        </div>
                    </div>

                    {/* Charts Row */}
                    <div className="charts-row">
                        {/* Grade Distribution */}
                        <div className="chart-card">
                            <h3>📊 Grade Distribution</h3>
                            <div className="chart-container">
                                {gradeDistribution.length > 0 ? (
                                    <ResponsiveContainer width="100%" height={300}>
                                        <PieChart>
                                            <Pie
                                                data={gradeDistribution}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={100}
                                                paddingAngle={2}
                                                dataKey="count"
                                                nameKey="grade"
                                                label={({ grade, percent }) => `${grade.split(' ')[0]} (${(percent * 100).toFixed(0)}%)`}
                                            >
                                                {gradeDistribution.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip formatter={(value) => [value, 'Students']} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="no-chart-data">No grade data</div>
                                )}
                            </div>
                        </div>

                        {/* Semester Trend */}
                        <div className="chart-card">
                            <h3>📈 Semester Performance Trend</h3>
                            <div className="chart-container">
                                {semesterTrend.length > 0 ? (
                                    <ResponsiveContainer width="100%" height={300}>
                                        <AreaChart data={semesterTrend}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
                                            <XAxis dataKey="semester" tickFormatter={(v) => `Sem ${v}`} />
                                            <YAxis domain={[0, 100]} />
                                            <Tooltip />
                                            <Legend />
                                            <Area
                                                type="monotone"
                                                dataKey="passPercentage"
                                                name="Pass %"
                                                stroke="#10b981"
                                                fill="rgba(16, 185, 129, 0.2)"
                                                strokeWidth={2}
                                            />
                                            <Area
                                                type="monotone"
                                                dataKey="averageMarks"
                                                name="Avg Marks"
                                                stroke="#6366f1"
                                                fill="rgba(99, 102, 241, 0.2)"
                                                strokeWidth={2}
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="no-chart-data">No trend data</div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Subject Difficulty Table */}
                    <div className="table-card">
                        <h3>🎯 Subject Difficulty Index</h3>
                        <div className="table-container">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Subject</th>
                                        <th>Pass %</th>
                                        <th>Avg Marks</th>
                                        <th>Difficulty</th>
                                        <th>Index</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {subjectDifficulty.length === 0 ? (
                                        <tr>
                                            <td colSpan="5" className="no-data">No subject data available</td>
                                        </tr>
                                    ) : (
                                        subjectDifficulty.map((s, idx) => (
                                            <tr key={idx}>
                                                <td>
                                                    <strong>{s.subject}</strong>
                                                    <br />
                                                    <small className="text-muted">{s.subjectName}</small>
                                                </td>
                                                <td>
                                                    <span className={`pass-rate ${s.passPercentage >= 50 ? 'good' : 'bad'}`}>
                                                        {s.passPercentage}%
                                                    </span>
                                                </td>
                                                <td>{s.averageMarks}</td>
                                                <td>
                                                    <span className={`difficulty-badge ${s.difficulty?.toLowerCase()}`}>
                                                        {s.difficulty}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div className="difficulty-bar">
                                                        <div
                                                            className="difficulty-fill"
                                                            style={{ width: `${s.difficultyIndex * 100}%` }}
                                                        ></div>
                                                    </div>
                                                    <small>{(s.difficultyIndex * 100).toFixed(0)}%</small>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Recent Analytics */}
                    <div className="table-card recent-analytics">
                        <h3>🕐 Recent Analytics Updates</h3>
                        <div className="table-container">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Subject</th>
                                        <th>Department</th>
                                        <th>Semester</th>
                                        <th>Pass %</th>
                                        <th>Version</th>
                                        <th>Generated</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recentAnalytics.length === 0 ? (
                                        <tr>
                                            <td colSpan="6" className="no-data">No recent updates</td>
                                        </tr>
                                    ) : (
                                        recentAnalytics.map((a, idx) => (
                                            <tr key={idx}>
                                                <td><strong>{a.subject}</strong></td>
                                                <td>{a.department}</td>
                                                <td>Sem {a.semester}</td>
                                                <td>{a.passPercentage}%</td>
                                                <td>
                                                    <span className="version-badge">v{a.version}</span>
                                                </td>
                                                <td>
                                                    {new Date(a.generatedAt).toLocaleString('en-IN', {
                                                        day: 'numeric',
                                                        month: 'short',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default AdminResultsDashboard;
