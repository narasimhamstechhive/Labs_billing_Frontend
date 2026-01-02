import React, { useEffect, useState } from 'react';
import { samplesAPI, reportsAPI } from '../../services/api';
import { FileCheck, Download, CheckCircle, Clock, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';

const Reports = () => {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(false);
    const [user] = useState(JSON.parse(localStorage.getItem('userInfo')));

    // Pagination State
    const [page, setPage] = useState(1);
    const [pages, setPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [limit] = useState(10);

    const fetchReports = async (pageNum = page) => {
        setLoading(true);
        try {
            const { data } = await samplesAPI.getAll({
                status: 'Processing,Approved',
                page: pageNum,
                limit
            });
            setReports(data.samples || []);
            setPages(data.pages || 1);
            setTotal(data.total || 0);
            setPage(data.page || 1);
        } catch (err) {
            console.error(err);
            toast.error('Failed to fetch reports');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReports();
    }, [page]);

    const handleApprove = async (id) => {
        try {
            await reportsAPI.approve(id);
            toast.success('Report Approved');
            fetchReports();
        } catch (err) {
            toast.error('Approval Failed');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this report? This will also delete all test results associated with it.')) return;

        try {
            await samplesAPI.delete(id);
            toast.success('Report deleted successfully');
            fetchReports();
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.message || 'Failed to delete report');
        }
    };

    const handleDownload = async (sample) => {
        try {
            const response = await reportsAPI.print(sample._id);

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `report-${sample.sampleId}.html`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            console.error('Download error:', err);
            toast.error('Failed to download report');
        }
    };

    const getStatusColor = (status) => {
        return status === 'Approved'
            ? 'bg-success-100 text-success-700 border-success-200'
            : 'bg-warning-100 text-warning-700 border-warning-200';
    };

    const isAdmin = user.role === 'admin';
    const canApprove = isAdmin || user.role === 'pathologist';

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Reports & Approval</h1>
                    <p className="text-gray-500 mt-1">Review and approve test reports</p>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-primary-50 text-primary-700 rounded-lg">
                    <FileCheck className="w-5 h-5" />
                    <span className="font-semibold">{total}</span>
                    <span className="text-sm">Total Reports</span>
                </div>
            </div>

            {/* Reports Table */}
            <div className="bg-white rounded-xl shadow-soft overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Sample ID</th>
                                <th>Patient</th>
                                <th>Tests</th>
                                <th>Status</th>
                                <th>Date</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody className={loading ? 'opacity-50' : ''}>
                            {reports.map(r => (
                                <tr key={r._id}>
                                    <td>
                                        <span className="font-mono text-sm font-semibold text-primary-600">
                                            {r.sampleId}
                                        </span>
                                    </td>
                                    <td>
                                        <div>
                                            <p className="font-medium text-gray-900">{r.patient?.name}</p>
                                            <p className="text-xs text-gray-500">{r.patient?.patientId}</p>
                                        </div>
                                    </td>
                                    <td className="text-sm text-gray-600 max-w-xs truncate">
                                        {r.tests?.map(t => t.testName).join(', ')}
                                    </td>
                                    <td>
                                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(r.status)}`}>
                                            {r.status}
                                        </span>
                                    </td>
                                    <td className="text-sm text-gray-600">
                                        {new Date(r.createdAt).toLocaleDateString()}
                                    </td>
                                    <td>
                                        <div className="flex items-center gap-2">
                                            {r.status === 'Processing' && canApprove && (
                                                <button
                                                    onClick={() => handleApprove(r._id)}
                                                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-success-600 to-success-500 text-white rounded-lg text-sm font-medium hover:from-success-700 hover:to-success-600 transition-all shadow-soft"
                                                >
                                                    <CheckCircle className="w-4 h-4" />
                                                    <span>Approve</span>
                                                </button>
                                            )}
                                            {r.status === 'Approved' && (
                                                <button
                                                    onClick={() => handleDownload(r)}
                                                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary-600 to-primary-500 text-white rounded-lg text-sm font-medium hover:from-primary-700 hover:to-primary-600 transition-all shadow-soft"
                                                >
                                                    <Download className="w-4 h-4" />

                                                </button>
                                            )}
                                            {isAdmin && (
                                                <button
                                                    onClick={() => handleDelete(r._id)}
                                                    className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                                    title="Delete Report"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {reports.length === 0 && !loading && (
                                <tr>
                                    <td colSpan="6" className="text-center py-12">
                                        <FileCheck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                        <p className="text-gray-500">No reports found.</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                {pages > 1 && (
                    <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                        <p className="text-sm text-gray-600">
                            Showing page <span className="font-semibold text-gray-900">{page}</span> of <span className="font-semibold text-gray-900">{pages}</span>
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1 || loading}
                                className="p-2 rounded-lg border border-gray-200 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                <ChevronLeft className="w-5 h-5 text-gray-600" />
                            </button>
                            {[...Array(pages)].map((_, i) => (
                                <button
                                    key={i + 1}
                                    onClick={() => setPage(i + 1)}
                                    className={`w-10 h-10 rounded-lg text-sm font-medium transition-all ${page === i + 1
                                        ? 'bg-primary-600 text-white shadow-soft'
                                        : 'text-gray-600 hover:bg-white border border-transparent hover:border-gray-200'
                                        }`}
                                >
                                    {i + 1}
                                </button>
                            ))}
                            <button
                                onClick={() => setPage(p => Math.min(pages, p + 1))}
                                disabled={page === pages || loading}
                                className="p-2 rounded-lg border border-gray-200 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                <ChevronRight className="w-5 h-5 text-gray-600" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {!canApprove && (
                <div className="bg-warning-50 border border-warning-200 rounded-xl p-4">
                    <p className="text-sm text-warning-700">
                        <strong>Note:</strong> Only Pathologists and Admins can approve reports.
                    </p>
                </div>
            )}
        </div>
    );
};

export default Reports;
