import React, { useEffect, useState } from 'react';
import { departmentsAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { Trash2, Plus, Building2, FileText, Search, X } from 'lucide-react';

const DepartmentMaster = () => {
    const [departments, setDepartments] = useState([]);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);

    const fetchDepartments = async () => {
        try {
            setLoading(true);
            const { data } = await departmentsAPI.getAll();
            setDepartments(data);
        } catch (err) {
            console.error('Failed to fetch departments');
            toast.error('Failed to load departments');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDepartments();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name.trim()) {
            toast.error('Department name is required');
            return;
        }
        try {
            await departmentsAPI.create({ name: name.trim(), description: description.trim() });
            toast.success('Department created successfully');
            setName('');
            setDescription('');
            fetchDepartments();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to create department');
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this department?')) {
            try {
                await departmentsAPI.delete(id);
                toast.success('Department deleted successfully');
                fetchDepartments();
            } catch (err) {
                toast.error('Failed to delete department');
            }
        }
    };

    const filteredDepartments = departments.filter(dept =>
        dept.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (dept.description && dept.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="space-y-6 pb-8">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Department Master</h1>
                        <p className="text-gray-500 mt-1 text-sm">Manage laboratory departments</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 px-6">
                {/* Add Department Form */}
                <div className="lg:col-span-1 bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                            <Plus className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">Add New Department</h3>
                    </div>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Department Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g., Haematology"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Description
                            </label>
                            <textarea
                                className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
                                rows="4"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Optional description for this department"
                            />
                        </div>
                        <button 
                            type="submit" 
                            className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Add Department</span>
                        </button>
                    </form>
                </div>

                {/* Departments List */}
                <div className="lg:col-span-2 bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-gray-200">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center">
                                    <Building2 className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900">Existing Departments</h3>
                                    <p className="text-xs text-gray-500 mt-0.5">{departments.length} department{departments.length !== 1 ? 's' : ''} found</p>
                                </div>
                            </div>
                        </div>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search departments..."
                                className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            {searchTerm && (
                                <button
                                    onClick={() => setSearchTerm('')}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
                        {loading ? (
                            <div className="p-12 text-center">
                                <div className="w-8 h-8 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mx-auto mb-3"></div>
                                <p className="text-sm text-gray-500">Loading departments...</p>
                            </div>
                        ) : filteredDepartments.length === 0 ? (
                            <div className="p-12 text-center">
                                <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                <p className="text-sm font-medium text-gray-500">
                                    {searchTerm ? 'No departments found matching your search' : 'No departments found. Add your first department to get started.'}
                                </p>
                            </div>
                        ) : (
                            filteredDepartments.map((dept) => (
                                <div key={dept._id} className="p-5 hover:bg-gray-50 transition-colors group">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-100 to-indigo-200 flex items-center justify-center flex-shrink-0">
                                                    <FileText className="w-4 h-4 text-indigo-600" />
                                                </div>
                                                <h4 className="font-semibold text-gray-900 text-base">{dept.name}</h4>
                                            </div>
                                            {dept.description && (
                                                <p className="text-sm text-gray-600 ml-11 leading-relaxed">{dept.description}</p>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => handleDelete(dept._id)}
                                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100 flex-shrink-0"
                                            title="Delete department"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DepartmentMaster;
