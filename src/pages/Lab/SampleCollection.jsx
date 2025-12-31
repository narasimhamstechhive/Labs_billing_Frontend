import React, { useEffect, useState } from 'react';
import { samplesAPI } from '../../services/api';
import { TestTube2, CheckCircle, Clock, Filter } from 'lucide-react';
import toast from 'react-hot-toast';

const SampleCollection = () => {
    const [samples, setSamples] = useState([]);
    const [filter, setFilter] = useState('All');
    const [stats, setStats] = useState({ pending: 0, collected: 0, processing: 0 });
    const [page, setPage] = useState(1);
    const [pages, setPages] = useState(1);
    const [limit] = useState(10);

    const fetchSamples = async (pageNum = page) => {
        try {
            const { data } = await samplesAPI.getAll({
                status: filter !== 'All' ? filter : '',
                page: pageNum,
                limit
            });
            setSamples(data.samples || []);
            setPages(data.pages || 1);
            setPage(data.page || 1);
            setStats(data.stats || { pending: 0, collected: 0, processing: 0 });
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchSamples();
    }, [filter, page]);

    // Reset page when filter changes
    useEffect(() => {
        setPage(1);
    }, [filter]);

    const handleCollect = async (id) => {
        try {
            await samplesAPI.updateStatus(id, { status: 'Collected' });
            toast.success('Sample marked as Collected');
            fetchSamples();
        } catch (err) {
            toast.error('Failed to update status');
        }
    };

    const getStatusColor = (status) => {
        const colors = {
            'Pending': 'bg-warning-100 text-warning-700 border-warning-200',
            'Collected': 'bg-success-100 text-success-700 border-success-200',
            'Processing': 'bg-primary-100 text-primary-700 border-primary-200',
            'Completed': 'bg-secondary-100 text-secondary-700 border-secondary-200',
            'Approved': 'bg-success-100 text-success-700 border-success-200',
        };
        return colors[status] || 'bg-gray-100 text-gray-700 border-gray-200';
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Sample Collection</h1>
                    <p className="text-gray-500 mt-1">Track and manage sample collection workflow</p>
                </div>
                <div className="flex items-center gap-3">
                   
                    <select
                        className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all"
                        value={filter}
                        onChange={e => setFilter(e.target.value)}
                    >
                        <option value="Pending">Pending</option>
                        <option value="Collected">Collected</option>
                        <option value="All">All Samples</option>
                    </select>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    { label: 'Pending Collection', count: stats.pending, color: 'warning' },
                    { label: 'Collected Today', count: stats.collected, color: 'success' },
                    { label: 'In Processing', count: stats.processing, color: 'primary' },
                ].map((stat, index) => (
                    <div key={index} className="bg-white rounded-xl p-6 shadow-soft">
                        <p className="text-sm font-medium text-gray-600 mb-2">{stat.label}</p>
                        <p className={`text-3xl font-bold text-${stat.color}-600`}>{stat.count}</p>
                    </div>
                ))}
            </div>

            {/* Samples Table */}
            <div className="bg-white rounded-xl shadow-soft overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Sample ID</th>
                                <th>Patient</th>
                                <th>Sample Type</th>
                                <th>Tests</th>
                                <th>Status</th>
                                <th>Collection Time</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {samples.map(sample => (
                                <tr key={sample._id}>
                                    <td>
                                        <div className="flex items-center gap-2">
                                            <TestTube2 className="w-4 h-4 text-primary-500" />
                                            <span className="font-mono text-sm font-semibold text-primary-600">
                                                {sample.sampleId}
                                            </span>
                                        </div>
                                    </td>
                                    <td>
                                        <div>
                                            <p className="font-medium text-gray-900">{sample.patient?.name}</p>
                                            <p className="text-xs text-gray-500">{sample.patient?.patientId}</p>
                                        </div>
                                    </td>
                                    <td>
                                        <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                                            {sample.sampleType}
                                        </span>
                                    </td>
                                    <td className="text-sm text-gray-600 max-w-xs truncate">
                                        {sample.tests?.map(t => t.testName).join(', ')}
                                    </td>
                                    <td>
                                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(sample.status)}`}>
                                            {sample.status}
                                        </span>
                                    </td>
                                    <td className="text-sm text-gray-600">
                                        {sample.collectionDate ? new Date(sample.collectionDate).toLocaleString() : '-'}
                                    </td>
                                    <td>
                                        {sample.status === 'Pending' && (
                                            <button
                                                onClick={() => handleCollect(sample._id)}
                                                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-success-600 to-success-500 text-white rounded-lg text-sm font-medium hover:from-success-700 hover:to-success-600 transition-all shadow-soft"
                                            >
                                                <CheckCircle className="w-4 h-4" />
                                                <span>Collect</span>
                                            </button>
                                        )}
                                        {sample.status === 'Collected' && (
                                            <div className="flex items-center gap-2 text-success-600">
                                                <CheckCircle className="w-4 h-4" />
                                                <span className="text-sm font-medium">Collected</span>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {samples.length === 0 && (
                                <tr>
                                    <td colSpan="7" className="text-center py-12">
                                        <TestTube2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                        <p className="text-gray-500">No samples found for the selected filter.</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination */}
            {pages > 1 && (
                <div className="flex items-center justify-between p-4 bg-white rounded-xl shadow-soft mt-6">
                    <p className="text-sm text-gray-600">
                        Page <span className="font-semibold">{page}</span> of <span className="font-semibold">{pages}</span>
                    </p>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-all"
                        >
                            Previous
                        </button>
                        <button
                            onClick={() => setPage(p => Math.min(pages, p + 1))}
                            disabled={page === pages}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-all"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SampleCollection;
