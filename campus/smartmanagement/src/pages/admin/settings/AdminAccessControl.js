import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../../services/api';
import { SkeletonCard } from '../../../components/common/LoadingSpinner';
import { FiLock, FiCheck, FiX } from 'react-icons/fi';

const AdminAccessControl = () => {
    const [loading, setLoading] = useState(true);
    const [accessMatrix, setAccessMatrix] = useState({});

    useEffect(() => {
        fetchAccess();
    }, []);

    const fetchAccess = async () => {
        try {
            const response = await adminAPI.adminSettings.getAccessControl();
            if (response.data.success) {
                setAccessMatrix(response.data.data);
            }
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <SkeletonCard />;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="card border-l-4 border-l-primary-500">
                <h2 className="text-lg font-semibold text-secondary-800 flex items-center gap-2">
                    <FiLock className="text-primary-600" />
                    Access Control
                </h2>
                <p className="text-secondary-500 text-sm mt-1">
                    View role-based permissions matrix (read-only)
                </p>
            </div>

            {/* Permissions Matrix */}
            {Object.entries(accessMatrix).map(([role, data]) => (
                <div key={role} className="card">
                    <div className="flex items-center gap-3 mb-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${role === 'admin' ? 'bg-red-100 text-red-600' :
                                role === 'faculty' ? 'bg-blue-100 text-blue-600' :
                                    'bg-green-100 text-green-600'
                            }`}>
                            <FiLock size={18} />
                        </div>
                        <div>
                            <h3 className="font-semibold text-secondary-800">{data.label}</h3>
                            <p className="text-sm text-secondary-500">{data.permissions.length} permissions</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                        {data.permissions.map((permission, idx) => (
                            <div key={idx} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                                <FiCheck className="text-green-500 flex-shrink-0" size={16} />
                                <span className="text-sm text-secondary-700">{permission}</span>
                            </div>
                        ))}
                    </div>
                </div>
            ))}

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-sm text-blue-700">
                    <strong>Note:</strong> Role permissions are system-defined and cannot be modified through this interface.
                    Contact the system administrator for custom permission requirements.
                </p>
            </div>
        </div>
    );
};

export default AdminAccessControl;
