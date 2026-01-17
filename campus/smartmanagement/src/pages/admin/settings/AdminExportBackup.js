import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { adminAPI } from '../../../services/api';
import {
    FiDownload,
    FiUsers,
    FiUser,
    FiFileText,
    FiActivity,
    FiCheckCircle
} from 'react-icons/fi';

const AdminExportBackup = () => {
    const [exporting, setExporting] = useState('');

    const exportOptions = [
        { type: 'students', label: 'Students', icon: FiUsers, description: 'Export all student records with personal and academic details' },
        { type: 'faculty', label: 'Faculty', icon: FiUser, description: 'Export all faculty records with department and designation info' },
        { type: 'audit', label: 'Audit Logs', icon: FiActivity, description: 'Export recent audit logs (last 1000 entries)' },
    ];

    const handleExport = async (type) => {
        setExporting(type);
        try {
            const response = await adminAPI.adminSettings.exportData(type);
            if (response.data.success) {
                // Create downloadable file
                const dataStr = JSON.stringify(response.data.data, null, 2);
                const blob = new Blob([dataStr], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `${type}_export_${Date.now()}.json`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);

                toast.success(`Exported ${response.data.count} ${type} records`);
            }
        } catch (error) {
            toast.error(`Failed to export ${type}`);
        } finally {
            setExporting('');
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="card border-l-4 border-l-primary-500">
                <h2 className="text-lg font-semibold text-secondary-800 flex items-center gap-2">
                    <FiDownload className="text-primary-600" />
                    Data Export
                </h2>
                <p className="text-secondary-500 text-sm mt-1">
                    Export system data for backup or reporting purposes
                </p>
            </div>

            {/* Export Options */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {exportOptions.map(option => (
                    <div key={option.type} className="card hover:shadow-md transition-shadow">
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center text-primary-600">
                                <option.icon size={24} />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-semibold text-secondary-800">{option.label}</h3>
                                <p className="text-sm text-secondary-500 mt-1">{option.description}</p>
                            </div>
                        </div>
                        <button
                            onClick={() => handleExport(option.type)}
                            className="btn-primary w-full mt-4"
                            disabled={exporting === option.type}
                        >
                            {exporting === option.type ? (
                                <>Exporting...</>
                            ) : (
                                <>
                                    <FiDownload size={16} />
                                    Export {option.label}
                                </>
                            )}
                        </button>
                    </div>
                ))}
            </div>

            {/* Export Info */}
            <div className="card bg-blue-50 border-blue-200">
                <h3 className="font-semibold text-blue-800 flex items-center gap-2 mb-3">
                    <FiFileText className="text-blue-600" />
                    Export Information
                </h3>
                <ul className="space-y-2 text-sm text-blue-700">
                    <li className="flex items-center gap-2">
                        <FiCheckCircle className="text-blue-500" size={14} />
                        Files are exported in JSON format
                    </li>
                    <li className="flex items-center gap-2">
                        <FiCheckCircle className="text-blue-500" size={14} />
                        All exports are logged in the audit system
                    </li>
                    <li className="flex items-center gap-2">
                        <FiCheckCircle className="text-blue-500" size={14} />
                        Sensitive data (passwords) is never included in exports
                    </li>
                    <li className="flex items-center gap-2">
                        <FiCheckCircle className="text-blue-500" size={14} />
                        Can be imported into Excel or other data tools
                    </li>
                </ul>
            </div>
        </div>
    );
};

export default AdminExportBackup;
