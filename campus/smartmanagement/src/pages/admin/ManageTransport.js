import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { adminAPI } from '../../services/api';
import Breadcrumb from '../../components/common/Breadcrumb';
import Modal, { ConfirmModal } from '../../components/common/Modal';
import EmptyState from '../../components/common/EmptyState';
import { SkeletonTable } from '../../components/common/LoadingSpinner';
import { FiPlus, FiEdit2, FiTrash2, FiMapPin, FiTruck, FiUsers } from 'react-icons/fi';

const ManageTransport = () => {
    const [routes, setRoutes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selectedRoute, setSelectedRoute] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        busNumber: '',
        routeName: '',
        driverName: '',
        driverPhone: '',
        capacity: 40,
        stops: '',
        departureTime: '',
        arrivalTime: '',
        status: 'active',
    });

    useEffect(() => {
        fetchRoutes();
    }, []);

    const fetchRoutes = async () => {
        try {
            setLoading(true);
            const response = await adminAPI.getTransportRoutes();
            if (response.data.success) {
                setRoutes(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching routes:', error);
            setRoutes([
                { _id: '1', busNumber: 'BUS-001', routeName: 'City Center Route', driverName: 'Ramesh Kumar', driverPhone: '9876543210', capacity: 40, occupancy: 35, stops: ['Railway Station', 'Bus Stand', 'Market', 'College Gate'], departureTime: '08:00', arrivalTime: '08:45', status: 'active' },
                { _id: '2', busNumber: 'BUS-002', routeName: 'Suburb Route', driverName: 'Suresh Singh', driverPhone: '9876543211', capacity: 50, occupancy: 42, stops: ['Township', 'Mall', 'Hospital', 'College Gate'], departureTime: '07:30', arrivalTime: '08:30', status: 'active' },
                { _id: '3', busNumber: 'BUS-003', routeName: 'Highway Route', driverName: 'Mahesh Verma', driverPhone: '9876543212', capacity: 45, occupancy: 30, stops: ['Highway Junction', 'Tech Park', 'College Gate'], departureTime: '08:15', arrivalTime: '09:00', status: 'maintenance' },
            ]);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        const stopsArray = formData.stops.split(',').map(s => s.trim()).filter(Boolean);
        const submitData = { ...formData, stops: stopsArray };

        try {
            if (selectedRoute) {
                await adminAPI.updateTransportRoute(selectedRoute._id, submitData);
                toast.success('Route updated successfully');
            } else {
                await adminAPI.createTransportRoute(submitData);
                toast.success('Route created successfully');
            }
            fetchRoutes();
            handleCloseModal();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Operation failed');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEdit = (route) => {
        setSelectedRoute(route);
        setFormData({
            busNumber: route.busNumber || '',
            routeName: route.routeName || '',
            driverName: route.driverName || '',
            driverPhone: route.driverPhone || '',
            capacity: route.capacity || 40,
            stops: Array.isArray(route.stops) ? route.stops.join(', ') : '',
            departureTime: route.departureTime || '',
            arrivalTime: route.arrivalTime || '',
            status: route.status || 'active',
        });
        setShowModal(true);
    };

    const handleDelete = async () => {
        setIsSubmitting(true);
        try {
            await adminAPI.deleteTransportRoute(selectedRoute._id);
            toast.success('Route deleted successfully');
            fetchRoutes();
            setShowDeleteModal(false);
            setSelectedRoute(null);
        } catch (error) {
            toast.error('Delete failed');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setSelectedRoute(null);
        setFormData({
            busNumber: '', routeName: '', driverName: '', driverPhone: '',
            capacity: 40, stops: '', departureTime: '', arrivalTime: '', status: 'active'
        });
    };

    return (
        <div className="animate-fade-in">
            <Breadcrumb />

            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-secondary-800">Transport Management</h1>
                    <p className="text-secondary-500 mt-1">Manage bus routes and allocations</p>
                </div>
                <button onClick={() => setShowModal(true)} className="btn-primary mt-4 md:mt-0">
                    <FiPlus size={18} />
                    Add Route
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="card">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center text-primary-600">
                            <FiTruck size={24} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-secondary-800">{routes.length}</p>
                            <p className="text-sm text-secondary-500">Total Buses</p>
                        </div>
                    </div>
                </div>
                <div className="card">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-success-50 flex items-center justify-center text-success-500">
                            <FiMapPin size={24} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-secondary-800">{routes.filter(r => r.status === 'active').length}</p>
                            <p className="text-sm text-secondary-500">Active Routes</p>
                        </div>
                    </div>
                </div>
                <div className="card">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-warning-50 flex items-center justify-center text-warning-500">
                            <FiUsers size={24} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-secondary-800">{routes.reduce((sum, r) => sum + (r.occupancy || 0), 0)}</p>
                            <p className="text-sm text-secondary-500">Students Enrolled</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Routes Grid */}
            {loading ? (
                <SkeletonTable rows={3} />
            ) : routes.length === 0 ? (
                <EmptyState
                    icon={FiTruck}
                    title="No routes found"
                    description="No transport routes have been added yet."
                    action={() => setShowModal(true)}
                    actionLabel="Add Route"
                />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {routes.map((route) => (
                        <div key={route._id} className="card hover:shadow-lg transition-shadow">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${route.status === 'active' ? 'bg-success-50 text-success-600' : 'bg-warning-50 text-warning-600'
                                        }`}>
                                        <FiTruck size={24} />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-secondary-800">{route.busNumber}</h3>
                                        <p className="text-sm text-secondary-500">{route.routeName}</p>
                                    </div>
                                </div>
                                <span className={`badge ${route.status === 'active' ? 'badge-success' : 'badge-warning'}`}>
                                    {route.status}
                                </span>
                            </div>

                            <div className="space-y-3 mb-4">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-secondary-500">Driver</span>
                                    <span className="font-medium text-secondary-700">{route.driverName}</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-secondary-500">Phone</span>
                                    <span className="font-medium text-secondary-700">{route.driverPhone}</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-secondary-500">Timing</span>
                                    <span className="font-medium text-secondary-700">{route.departureTime} - {route.arrivalTime}</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-secondary-500">Capacity</span>
                                    <span className="font-medium text-secondary-700">{route.occupancy || 0} / {route.capacity}</span>
                                </div>
                            </div>

                            {/* Stops */}
                            <div className="mb-4">
                                <p className="text-sm text-secondary-500 mb-2">Stops:</p>
                                <div className="flex flex-wrap gap-1">
                                    {route.stops?.slice(0, 3).map((stop, i) => (
                                        <span key={i} className="badge bg-gray-100 text-gray-600 text-xs">{stop}</span>
                                    ))}
                                    {route.stops?.length > 3 && (
                                        <span className="badge bg-gray-100 text-gray-600 text-xs">+{route.stops.length - 3}</span>
                                    )}
                                </div>
                            </div>

                            {/* Progress Bar */}
                            <div className="mb-4">
                                <div className="flex justify-between text-xs text-secondary-500 mb-1">
                                    <span>Occupancy</span>
                                    <span>{Math.round(((route.occupancy || 0) / route.capacity) * 100)}%</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div
                                        className="bg-primary-500 h-2 rounded-full transition-all"
                                        style={{ width: `${Math.min(((route.occupancy || 0) / route.capacity) * 100, 100)}%` }}
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
                                <button
                                    onClick={() => handleEdit(route)}
                                    className="btn-secondary flex-1"
                                >
                                    <FiEdit2 size={16} />
                                    Edit
                                </button>
                                <button
                                    onClick={() => { setSelectedRoute(route); setShowDeleteModal(true); }}
                                    className="btn p-2 bg-danger-50 text-danger-500 hover:bg-danger-100"
                                >
                                    <FiTrash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            <Modal
                isOpen={showModal}
                onClose={handleCloseModal}
                title={selectedRoute ? 'Edit Route' : 'Add New Route'}
                size="lg"
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="form-group">
                            <label className="label">Bus Number *</label>
                            <input
                                type="text"
                                name="busNumber"
                                value={formData.busNumber}
                                onChange={handleChange}
                                className="input"
                                placeholder="e.g., BUS-001"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label className="label">Route Name *</label>
                            <input
                                type="text"
                                name="routeName"
                                value={formData.routeName}
                                onChange={handleChange}
                                className="input"
                                placeholder="e.g., City Center Route"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label className="label">Driver Name *</label>
                            <input
                                type="text"
                                name="driverName"
                                value={formData.driverName}
                                onChange={handleChange}
                                className="input"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label className="label">Driver Phone *</label>
                            <input
                                type="tel"
                                name="driverPhone"
                                value={formData.driverPhone}
                                onChange={handleChange}
                                className="input"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label className="label">Capacity</label>
                            <input
                                type="number"
                                name="capacity"
                                value={formData.capacity}
                                onChange={handleChange}
                                className="input"
                                min="1"
                            />
                        </div>
                        <div className="form-group">
                            <label className="label">Status</label>
                            <select
                                name="status"
                                value={formData.status}
                                onChange={handleChange}
                                className="input"
                            >
                                <option value="active">Active</option>
                                <option value="maintenance">Maintenance</option>
                                <option value="inactive">Inactive</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="label">Departure Time</label>
                            <input
                                type="time"
                                name="departureTime"
                                value={formData.departureTime}
                                onChange={handleChange}
                                className="input"
                            />
                        </div>
                        <div className="form-group">
                            <label className="label">Arrival Time</label>
                            <input
                                type="time"
                                name="arrivalTime"
                                value={formData.arrivalTime}
                                onChange={handleChange}
                                className="input"
                            />
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="label">Stops (comma separated)</label>
                        <textarea
                            name="stops"
                            value={formData.stops}
                            onChange={handleChange}
                            className="input"
                            rows={2}
                            placeholder="Stop 1, Stop 2, Stop 3, ..."
                        />
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                        <button type="button" onClick={handleCloseModal} className="btn-secondary">Cancel</button>
                        <button type="submit" className="btn-primary" disabled={isSubmitting}>
                            {isSubmitting ? 'Saving...' : selectedRoute ? 'Update Route' : 'Add Route'}
                        </button>
                    </div>
                </form>
            </Modal>

            <ConfirmModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={handleDelete}
                title="Delete Route"
                message={`Are you sure you want to delete ${selectedRoute?.busNumber}?`}
                confirmText="Delete"
                isLoading={isSubmitting}
            />
        </div>
    );
};

export default ManageTransport;
