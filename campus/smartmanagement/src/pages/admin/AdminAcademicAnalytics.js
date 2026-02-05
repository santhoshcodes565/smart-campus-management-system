import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell, LineChart, Line, Area, AreaChart
} from 'recharts';
import './AdminAcademicAnalytics.css';

const COLORS = ['#00C49F', '#0088FE', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FF6B6B'];
const GRADE_COLORS = {
    O: '#00C49F',
    Aplus: '#0088FE',
    A: '#00B4D8',
    B: '#FFBB28',
    C: '#FF8042',
    D: '#8884D8',
    F: '#FF6B6B'
};

const AdminAcademicAnalytics = () => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filters, setFilters] = useState({
        academicYear: '',
        departmentId: ''
    });

    // Data states
    const [kpis, setKpis] = useState(null);
    const [semesterTrend, setSemesterTrend] = useState([]);
    const [toppers, setToppers] = useState([]);
    const [atRiskStudents, setAtRiskStudents] = useState([]);
    const [failedSubjects, setFailedSubjects] = useState([]);
    const [departments, setDepartments] = useState([]);

    // Fetch filter options
    const fetchDepartments = useCallback(async () => {
        try {
            const response = await api.get('/admin/departments');
            if (response.data?.success) {
                setDepartments(response.data.data || []);
            }
        } catch (err) {
            console.error('Failed to fetch departments:', err);
        }
    }, []);

    // Fetch analytics data
    const fetchAnalytics = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const queryParams = new URLSearchParams();
            if (filters.academicYear) queryParams.append('academicYear', filters.academicYear);
            if (filters.departmentId) queryParams.append('departmentId', filters.departmentId);
            const query = queryParams.toString() ? `?${queryParams}` : '';

            // Use allSettled to handle partial failures gracefully
            const results = await Promise.allSettled([
                api.get(`/admin/academic-analytics/overview${query}`),
                api.get(`/admin/academic-analytics/semester-trend${query}`),
                api.get(`/admin/academic-analytics/toppers?limit=10${filters.departmentId ? `&departmentId=${filters.departmentId}` : ''}`),
                api.get(`/admin/academic-analytics/at-risk-students?limit=10${filters.departmentId ? `&departmentId=${filters.departmentId}` : ''}`),
                api.get(`/admin/academic-analytics/failed-subjects?limit=10${filters.departmentId ? `&departmentId=${filters.departmentId}` : ''}`)
            ]);

            const [kpisRes, trendRes, toppersRes, riskRes, failedRes] = results;

            // Handle each response individually
            if (kpisRes.status === 'fulfilled' && kpisRes.value.data?.success) {
                setKpis(kpisRes.value.data.data);
            } else {
                setKpis(null);
            }

            if (trendRes.status === 'fulfilled' && trendRes.value.data?.success) {
                setSemesterTrend(trendRes.value.data.data?.trend || []);
            } else {
                setSemesterTrend([]);
            }

            if (toppersRes.status === 'fulfilled' && toppersRes.value.data?.success) {
                setToppers(toppersRes.value.data.data?.toppers || []);
            } else {
                setToppers([]);
            }

            if (riskRes.status === 'fulfilled' && riskRes.value.data?.success) {
                setAtRiskStudents(riskRes.value.data.data?.students || []);
            } else {
                setAtRiskStudents([]);
            }

            if (failedRes.status === 'fulfilled' && failedRes.value.data?.success) {
                setFailedSubjects(failedRes.value.data.data?.subjects || []);
            } else {
                setFailedSubjects([]);
            }

        } catch (err) {
            console.error('Failed to fetch analytics:', err);
            // Don't show error, just show empty state
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        fetchDepartments();
    }, [fetchDepartments]);

    useEffect(() => {
        fetchAnalytics();
    }, [fetchAnalytics]);

    // Transform grade distribution for pie chart
    const getGradeChartData = () => {
        if (!kpis?.gradeDistribution) return [];
        const dist = kpis.gradeDistribution;
        return [
            { name: 'O (90%+)', value: dist.O, color: GRADE_COLORS.O },
            { name: 'A+ (80-89%)', value: dist.Aplus, color: GRADE_COLORS.Aplus },
            { name: 'A (70-79%)', value: dist.A, color: GRADE_COLORS.A },
            { name: 'B (60-69%)', value: dist.B, color: GRADE_COLORS.B },
            { name: 'C (50-59%)', value: dist.C, color: GRADE_COLORS.C },
            { name: 'D (40-49%)', value: dist.D, color: GRADE_COLORS.D },
            { name: 'F (<40%)', value: dist.F, color: GRADE_COLORS.F }
        ].filter(item => item.value > 0);
    };

    // Handle filter change
    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    // Get risk level badge class
    const getRiskBadgeClass = (level) => {
        switch (level) {
            case 'critical': return 'risk-critical';
            case 'high': return 'risk-high';
            case 'medium': return 'risk-medium';
            case 'low': return 'risk-low';
            default: return '';
        }
    };

    // Get trend icon
    const getTrendIcon = (trend) => {
        switch (trend) {
            case 'improving': return '📈';
            case 'declining': return '📉';
            case 'stable': return '➡️';
            default: return '•';
        }
    };

    if (loading) {
        return (
            <div className="analytics-loading">
                <div className="spinner"></div>
                <p>Loading Academic Analytics...</p>
            </div>
        );
    }

    return (
        <div className="academic-analytics">
            {/* Header */}
            <div className="analytics-header">
                <div className="header-content">
                    <h1>📊 Academic Analytics Dashboard</h1>
                    <p className="subtitle">University Intelligence Engine • {kpis?.academicYear || 'Current Year'}</p>
                </div>

                <div className="filters">
                    <select
                        name="departmentId"
                        value={filters.departmentId}
                        onChange={handleFilterChange}
                        className="filter-select"
                    >
                        <option value="">All Departments</option>
                        {departments.map(dept => (
                            <option key={dept._id} value={dept._id}>{dept.name}</option>
                        ))}
                    </select>

                    <select
                        name="academicYear"
                        value={filters.academicYear}
                        onChange={handleFilterChange}
                        className="filter-select"
                    >
                        <option value="">Current Year</option>
                        <option value="2025-26">2025-26</option>
                        <option value="2024-25">2024-25</option>
                        <option value="2023-24">2023-24</option>
                    </select>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="kpi-grid">
                <div className="kpi-card kpi-students">
                    <div className="kpi-icon">🎓</div>
                    <div className="kpi-content">
                        <span className="kpi-value">{kpis?.totalStudents?.toLocaleString() || 0}</span>
                        <span className="kpi-label">Total Students</span>
                    </div>
                </div>

                <div className="kpi-card kpi-pass">
                    <div className="kpi-icon">✅</div>
                    <div className="kpi-content">
                        <span className="kpi-value">{kpis?.passPercentage || 0}%</span>
                        <span className="kpi-label">Pass Rate</span>
                    </div>
                    <div className="kpi-subtitle">{kpis?.passCount || 0} passed</div>
                </div>

                <div className="kpi-card kpi-gpa">
                    <div className="kpi-icon">📈</div>
                    <div className="kpi-content">
                        <span className="kpi-value">{kpis?.averageGPA || 0}</span>
                        <span className="kpi-label">Average GPA</span>
                    </div>
                    <div className="kpi-subtitle">Highest: {kpis?.highestGPA || 0}</div>
                </div>

                <div className="kpi-card kpi-placement">
                    <div className="kpi-icon">💼</div>
                    <div className="kpi-content">
                        <span className="kpi-value">{kpis?.placementEligibleCount?.toLocaleString() || 0}</span>
                        <span className="kpi-label">Placement Eligible</span>
                    </div>
                </div>

                <div className="kpi-card kpi-risk">
                    <div className="kpi-icon">⚠️</div>
                    <div className="kpi-content">
                        <span className="kpi-value">{kpis?.atRiskCount || 0}</span>
                        <span className="kpi-label">At Risk</span>
                    </div>
                </div>
            </div>

            {/* Charts Row */}
            <div className="charts-row">
                {/* Grade Distribution */}
                <div className="chart-card">
                    <h3>📊 Grade Distribution</h3>
                    <div className="chart-container">
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={getGradeChartData()}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={2}
                                    dataKey="value"
                                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                                >
                                    {getGradeChartData().map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Semester Trend */}
                <div className="chart-card">
                    <h3>📈 Semester Performance Trend</h3>
                    <div className="chart-container">
                        <ResponsiveContainer width="100%" height={300}>
                            <AreaChart data={semesterTrend}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                <XAxis dataKey="semester" stroke="#888" label={{ value: 'Semester', position: 'bottom' }} />
                                <YAxis stroke="#888" domain={[0, 100]} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1e1e2f', border: '1px solid #3d3d5c' }}
                                    labelStyle={{ color: '#fff' }}
                                />
                                <Legend />
                                <Area
                                    type="monotone"
                                    dataKey="passPercentage"
                                    name="Pass Rate (%)"
                                    stroke="#00C49F"
                                    fill="rgba(0, 196, 159, 0.3)"
                                />
                                <Line
                                    type="monotone"
                                    dataKey="averageGPA"
                                    name="Avg GPA (×10)"
                                    stroke="#0088FE"
                                    strokeWidth={2}
                                    dot={{ fill: '#0088FE' }}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Toppers and At-Risk Row */}
            <div className="tables-row">
                {/* Top Performers */}
                <div className="table-card toppers-card">
                    <h3>🏆 Top Performers</h3>
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Rank</th>
                                    <th>Name</th>
                                    <th>Roll No</th>
                                    <th>CGPA</th>
                                    <th>Trend</th>
                                </tr>
                            </thead>
                            <tbody>
                                {toppers.length === 0 ? (
                                    <tr><td colSpan="5" className="no-data">No data available</td></tr>
                                ) : toppers.map((student, idx) => (
                                    <tr key={student.studentId || idx}>
                                        <td>
                                            <span className={`rank-badge rank-${student.rank}`}>
                                                {student.rank === 1 ? '🥇' : student.rank === 2 ? '🥈' : student.rank === 3 ? '🥉' : `#${student.rank}`}
                                            </span>
                                        </td>
                                        <td>{student.name}</td>
                                        <td>{student.rollNo}</td>
                                        <td><span className="cgpa-badge">{student.cgpa}</span></td>
                                        <td>{getTrendIcon(student.performanceTrend)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* At-Risk Students */}
                <div className="table-card risk-card">
                    <h3>⚠️ At-Risk Students</h3>
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Roll No</th>
                                    <th>CGPA</th>
                                    <th>Risk</th>
                                    <th>Arrears</th>
                                </tr>
                            </thead>
                            <tbody>
                                {atRiskStudents.length === 0 ? (
                                    <tr><td colSpan="5" className="no-data">No at-risk students</td></tr>
                                ) : atRiskStudents.map((student, idx) => (
                                    <tr key={student.studentId || idx}>
                                        <td>{student.name}</td>
                                        <td>{student.rollNo}</td>
                                        <td><span className="cgpa-low">{student.cgpa}</span></td>
                                        <td>
                                            <span className={`risk-badge ${getRiskBadgeClass(student.riskLevel)}`}>
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

            {/* Failed Subjects Alert */}
            <div className="table-card failure-alert-card">
                <h3>🚨 High Failure Rate Subjects (Pass Rate &lt; 50%)</h3>
                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Subject</th>
                                <th>Code</th>
                                <th>Semester</th>
                                <th>Faculty</th>
                                <th>Attempts</th>
                                <th>Pass Rate</th>
                                <th>Difficulty</th>
                            </tr>
                        </thead>
                        <tbody>
                            {failedSubjects.length === 0 ? (
                                <tr><td colSpan="7" className="no-data success-msg">✅ All subjects have pass rate above 50%</td></tr>
                            ) : failedSubjects.map((subject, idx) => (
                                <tr key={subject.subjectId || idx}>
                                    <td>{subject.subjectName}</td>
                                    <td>{subject.subjectCode}</td>
                                    <td>Sem {subject.semester}</td>
                                    <td>{subject.facultyName}</td>
                                    <td>{subject.totalAttempts}</td>
                                    <td>
                                        <span className="pass-rate-low">{subject.passPercentage}%</span>
                                    </td>
                                    <td>
                                        <span className={`difficulty-badge difficulty-${subject.difficultyLevel}`}>
                                            {subject.difficultyLevel}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminAcademicAnalytics;
