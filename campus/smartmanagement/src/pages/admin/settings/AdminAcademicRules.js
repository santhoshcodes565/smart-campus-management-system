import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { adminAPI } from '../../../services/api';
import { SkeletonCard } from '../../../components/common/LoadingSpinner';
import { FiBook, FiPercent, FiAward, FiSave } from 'react-icons/fi';

const AdminAcademicRules = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [rules, setRules] = useState({
        defaultPassMark: 40,
        graceMarks: 0,
        reExamEligibility: 25,
        attendanceMinimum: 75,
        gradeScale: 'percentage'
    });

    useEffect(() => {
        fetchRules();
    }, []);

    const fetchRules = async () => {
        try {
            const response = await adminAPI.adminSettings.getAcademicRules();
            if (response.data.success) {
                setRules(response.data.data);
            }
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const response = await adminAPI.adminSettings.updateAcademicRules(rules);
            if (response.data.success) {
                toast.success('Academic rules saved successfully');
            }
        } catch (error) {
            toast.error('Failed to save rules');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <SkeletonCard />;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="card border-l-4 border-l-primary-500">
                <h2 className="text-lg font-semibold text-secondary-800 flex items-center gap-2">
                    <FiBook className="text-primary-600" />
                    Academic Rules
                </h2>
                <p className="text-secondary-500 text-sm mt-1">
                    Configure pass marks, grading, and attendance requirements
                </p>
            </div>

            {/* Marks Configuration */}
            <div className="card">
                <h3 className="font-semibold text-secondary-800 flex items-center gap-2 mb-4">
                    <FiPercent className="text-primary-600" />
                    Marks Configuration
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="label">Default Pass Mark (%)</label>
                        <input
                            type="number"
                            className="input"
                            value={rules.defaultPassMark}
                            onChange={(e) => setRules({ ...rules, defaultPassMark: parseInt(e.target.value) })}
                            min={0}
                            max={100}
                        />
                        <p className="text-xs text-secondary-400 mt-1">Minimum percentage to pass an exam</p>
                    </div>

                    <div>
                        <label className="label">Grace Marks</label>
                        <input
                            type="number"
                            className="input"
                            value={rules.graceMarks}
                            onChange={(e) => setRules({ ...rules, graceMarks: parseInt(e.target.value) })}
                            min={0}
                            max={10}
                        />
                        <p className="text-xs text-secondary-400 mt-1">Maximum grace marks allowed</p>
                    </div>

                    <div>
                        <label className="label">Re-exam Eligibility (%)</label>
                        <input
                            type="number"
                            className="input"
                            value={rules.reExamEligibility}
                            onChange={(e) => setRules({ ...rules, reExamEligibility: parseInt(e.target.value) })}
                            min={0}
                            max={100}
                        />
                        <p className="text-xs text-secondary-400 mt-1">Minimum marks required to be eligible for re-exam</p>
                    </div>

                    <div>
                        <label className="label">Attendance Minimum (%)</label>
                        <input
                            type="number"
                            className="input"
                            value={rules.attendanceMinimum}
                            onChange={(e) => setRules({ ...rules, attendanceMinimum: parseInt(e.target.value) })}
                            min={0}
                            max={100}
                        />
                        <p className="text-xs text-secondary-400 mt-1">Minimum attendance required to appear for exams</p>
                    </div>
                </div>
            </div>

            {/* Grade Scale */}
            <div className="card">
                <h3 className="font-semibold text-secondary-800 flex items-center gap-2 mb-4">
                    <FiAward className="text-primary-600" />
                    Grading System
                </h3>

                <div className="space-y-4">
                    <div>
                        <label className="label">Grade Scale</label>
                        <select
                            className="input w-full md:w-64"
                            value={rules.gradeScale}
                            onChange={(e) => setRules({ ...rules, gradeScale: e.target.value })}
                        >
                            <option value="percentage">Percentage Based</option>
                            <option value="grade">Letter Grade (A/B/C)</option>
                            <option value="cgpa">CGPA (10-point)</option>
                        </select>
                    </div>

                    {/* Grade Preview */}
                    <div className="p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm font-medium text-secondary-700 mb-3">Current Grade Scale:</p>
                        <div className="grid grid-cols-4 md:grid-cols-8 gap-2 text-center">
                            {[
                                { grade: 'A+', range: '90-100', color: 'bg-green-100 text-green-700' },
                                { grade: 'A', range: '80-89', color: 'bg-green-50 text-green-600' },
                                { grade: 'B+', range: '70-79', color: 'bg-blue-100 text-blue-700' },
                                { grade: 'B', range: '60-69', color: 'bg-blue-50 text-blue-600' },
                                { grade: 'C+', range: '50-59', color: 'bg-yellow-100 text-yellow-700' },
                                { grade: 'C', range: '40-49', color: 'bg-yellow-50 text-yellow-600' },
                                { grade: 'D', range: '33-39', color: 'bg-orange-100 text-orange-700' },
                                { grade: 'F', range: '<33', color: 'bg-red-100 text-red-700' },
                            ].map(g => (
                                <div key={g.grade} className={`p-2 rounded-lg ${g.color}`}>
                                    <p className="font-bold">{g.grade}</p>
                                    <p className="text-xs">{g.range}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
                <button onClick={handleSave} className="btn-primary" disabled={saving}>
                    <FiSave size={16} />
                    {saving ? 'Saving...' : 'Save Rules'}
                </button>
            </div>
        </div>
    );
};

export default AdminAcademicRules;
