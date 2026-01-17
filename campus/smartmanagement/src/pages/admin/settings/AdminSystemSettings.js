import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { adminAPI } from '../../../services/api';
import { SkeletonCard } from '../../../components/common/LoadingSpinner';
import {
    FiSettings,
    FiGlobe,
    FiCalendar,
    FiToggleRight,
    FiSave,
    FiAlertTriangle
} from 'react-icons/fi';

const AdminSystemSettings = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [settings, setSettings] = useState({
        institution: {
            name: 'Smart Campus',
            timezone: 'Asia/Kolkata',
            dateFormat: 'DD/MM/YYYY'
        },
        academic: {
            currentYear: '2025-2026',
            currentSemester: 1
        },
        system: {
            maintenanceMode: false
        },
        modules: {
            onlineExam: true,
            attendance: true,
            feedback: true,
            notices: true,
            results: true
        }
    });

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const response = await adminAPI.adminSettings.getSystemSettings();
            if (response.data.success) {
                setSettings(response.data.data);
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
            const response = await adminAPI.adminSettings.updateSystemSettings(settings);
            if (response.data.success) {
                toast.success('System settings saved successfully');
            }
        } catch (error) {
            toast.error('Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    const updateNested = (section, key, value) => {
        setSettings(prev => ({
            ...prev,
            [section]: {
                ...prev[section],
                [key]: value
            }
        }));
    };

    const ToggleSwitch = ({ checked, onChange, label, danger = false }) => (
        <label className="flex items-center justify-between cursor-pointer">
            <span className="text-secondary-700">{label}</span>
            <div className="relative">
                <input
                    type="checkbox"
                    className="sr-only"
                    checked={checked}
                    onChange={(e) => onChange(e.target.checked)}
                />
                <div className={`w-11 h-6 rounded-full transition-colors ${checked
                        ? danger ? 'bg-red-500' : 'bg-primary-600'
                        : 'bg-gray-300'
                    }`}>
                    <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-5' : ''
                        }`}></div>
                </div>
            </div>
        </label>
    );

    if (loading) return <SkeletonCard />;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="card border-l-4 border-l-primary-500">
                <h2 className="text-lg font-semibold text-secondary-800 flex items-center gap-2">
                    <FiSettings className="text-primary-600" />
                    System Configuration
                </h2>
                <p className="text-secondary-500 text-sm mt-1">
                    Configure institution settings and system-wide options
                </p>
            </div>

            {/* Maintenance Mode Warning */}
            {settings.system.maintenanceMode && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
                    <FiAlertTriangle className="text-red-500" size={24} />
                    <div>
                        <p className="font-semibold text-red-700">Maintenance Mode Active</p>
                        <p className="text-sm text-red-600">Users cannot access the system while maintenance mode is enabled.</p>
                    </div>
                </div>
            )}

            {/* Institution Settings */}
            <div className="card">
                <h3 className="font-semibold text-secondary-800 flex items-center gap-2 mb-4">
                    <FiGlobe className="text-primary-600" />
                    Institution
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="label">Institution Name</label>
                        <input
                            type="text"
                            className="input"
                            value={settings.institution.name}
                            onChange={(e) => updateNested('institution', 'name', e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="label">Timezone</label>
                        <select
                            className="input"
                            value={settings.institution.timezone}
                            onChange={(e) => updateNested('institution', 'timezone', e.target.value)}
                        >
                            <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                            <option value="UTC">UTC</option>
                            <option value="America/New_York">America/New_York (EST)</option>
                            <option value="Europe/London">Europe/London (GMT)</option>
                        </select>
                    </div>
                    <div>
                        <label className="label">Date Format</label>
                        <select
                            className="input"
                            value={settings.institution.dateFormat}
                            onChange={(e) => updateNested('institution', 'dateFormat', e.target.value)}
                        >
                            <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                            <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                            <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Academic Settings */}
            <div className="card">
                <h3 className="font-semibold text-secondary-800 flex items-center gap-2 mb-4">
                    <FiCalendar className="text-primary-600" />
                    Academic Period
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="label">Current Academic Year</label>
                        <input
                            type="text"
                            className="input"
                            value={settings.academic.currentYear}
                            onChange={(e) => updateNested('academic', 'currentYear', e.target.value)}
                            placeholder="e.g., 2025-2026"
                        />
                    </div>
                    <div>
                        <label className="label">Current Semester</label>
                        <select
                            className="input"
                            value={settings.academic.currentSemester}
                            onChange={(e) => updateNested('academic', 'currentSemester', parseInt(e.target.value))}
                        >
                            {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                                <option key={sem} value={sem}>Semester {sem}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Module Toggles */}
            <div className="card">
                <h3 className="font-semibold text-secondary-800 flex items-center gap-2 mb-4">
                    <FiToggleRight className="text-primary-600" />
                    Module Controls
                </h3>
                <p className="text-sm text-secondary-500 mb-4">
                    Enable or disable system modules. Disabled modules will be hidden from users.
                </p>

                <div className="space-y-4">
                    <ToggleSwitch
                        label="Online Exam System"
                        checked={settings.modules.onlineExam}
                        onChange={(v) => updateNested('modules', 'onlineExam', v)}
                    />
                    <ToggleSwitch
                        label="Attendance Tracking"
                        checked={settings.modules.attendance}
                        onChange={(v) => updateNested('modules', 'attendance', v)}
                    />
                    <ToggleSwitch
                        label="Feedback System"
                        checked={settings.modules.feedback}
                        onChange={(v) => updateNested('modules', 'feedback', v)}
                    />
                    <ToggleSwitch
                        label="Notice Board"
                        checked={settings.modules.notices}
                        onChange={(v) => updateNested('modules', 'notices', v)}
                    />
                    <ToggleSwitch
                        label="Results Publishing"
                        checked={settings.modules.results}
                        onChange={(v) => updateNested('modules', 'results', v)}
                    />
                </div>
            </div>

            {/* System Controls */}
            <div className="card border-red-200">
                <h3 className="font-semibold text-red-700 flex items-center gap-2 mb-4">
                    <FiAlertTriangle />
                    System Controls
                </h3>

                <div className="space-y-4">
                    <ToggleSwitch
                        label="Maintenance Mode"
                        checked={settings.system.maintenanceMode}
                        onChange={(v) => updateNested('system', 'maintenanceMode', v)}
                        danger
                    />
                    <p className="text-sm text-secondary-500">
                        When enabled, only admins can access the system. All other users will see a maintenance page.
                    </p>
                </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
                <button onClick={handleSave} className="btn-primary" disabled={saving}>
                    <FiSave size={16} />
                    {saving ? 'Saving...' : 'Save All Changes'}
                </button>
            </div>
        </div>
    );
};

export default AdminSystemSettings;
