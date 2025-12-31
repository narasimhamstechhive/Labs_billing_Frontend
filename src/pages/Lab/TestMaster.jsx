import React, { useEffect, useState } from 'react';
import { testsAPI, departmentsAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { Trash2, Edit } from 'lucide-react';

const TestMaster = () => {
    const [tests, setTests] = useState([]);
    const [page, setPage] = useState(1);
    const [pages, setPages] = useState(1);
    const [limit] = useState(50);
    const [departments, setDepartments] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [editingTest, setEditingTest] = useState(null);
    const [formData, setFormData] = useState({
        testName: '',
        department: '',
        sampleType: '',
        unit: '',
        method: '',
        price: '',
        tat: '',
        normalRanges: {
            male: { min: '', max: '' },
            female: { min: '', max: '' },
            child: { min: '', max: '' },
            general: ''
        }
    });

    const fetchData = async (pageNum = page) => {
        try {
            const [testsRes, deptsRes] = await Promise.all([
                getTests({ page: pageNum, limit }),
                getDepartments()
            ]);
            setTests(testsRes.data.tests || []);
            setPages(testsRes.data.pages || 1);
            setPage(testsRes.data.page || 1);
            setDepartments(deptsRes.data);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchData();
    }, [page]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name.includes('.')) {
            const [parent, child, sub] = name.split('.');
            if (sub) {
                setFormData(prev => ({
                    ...prev,
                    [parent]: {
                        ...prev[parent],
                        [child]: {
                            ...prev[parent][child],
                            [sub]: value
                        }
                    }
                }));
            } else {
                setFormData(prev => ({
                    ...prev,
                    [parent]: {
                        ...prev[parent],
                        [child]: value
                    }
                }));
            }
        } else {
            setFormData({ ...formData, [name]: value });
        }
    };

    const handleRangeChange = (category, type, value) => {
        setFormData(prev => ({
            ...prev,
            normalRanges: {
                ...prev.normalRanges,
                [category]: {
                    ...prev.normalRanges[category],
                    [type]: value
                }
            }
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingTest) {
                await testsAPI.update(editingTest._id, formData);
                toast.success('Test updated successfully');
            } else {
                await testsAPI.create(formData);
                toast.success('Test created successfully');
            }
            setShowModal(false);
            setEditingTest(null);
            setFormData({ // Reset
                testName: '', department: '', sampleType: '', unit: '', method: '', price: '', tat: '',
                normalRanges: { male: { min: '', max: '' }, female: { min: '', max: '' }, child: { min: '', max: '' }, general: '' }
            });
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to save test');
        }
    };

    const handleEdit = (test) => {
        setEditingTest(test);
        setFormData({
            testName: test.testName || '',
            department: test.department?._id || test.department || '',
            sampleType: test.sampleType || '',
            unit: test.unit || '',
            method: test.method || '',
            price: test.price || '',
            tat: test.tat || '',
            normalRanges: {
                male: { min: test.normalRanges?.male?.min || '', max: test.normalRanges?.male?.max || '' },
                female: { min: test.normalRanges?.female?.min || '', max: test.normalRanges?.female?.max || '' },
                child: { min: test.normalRanges?.child?.min || '', max: test.normalRanges?.child?.max || '' },
                general: test.normalRanges?.general || ''
            }
        });
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        try {
            await testsAPI.delete(id);
            toast.success('Test deleted successfully');
            fetchData();
        } catch (err) {
            toast.error('Failed to delete test');
        }
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Test Master</h2>
                <button
                    onClick={() => {
                        setEditingTest(null);
                        setFormData({
                            testName: '', department: '', sampleType: '', unit: '', method: '', price: '', tat: '',
                            normalRanges: { male: { min: '', max: '' }, female: { min: '', max: '' }, child: { min: '', max: '' }, general: '' }
                        });
                        setShowModal(true);
                    }}
                    className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                >
                    Add New Test
                </button>
            </div>

            <div className="bg-white rounded shadow overflow-x-auto">
                <table className="min-w-full">
                    <thead>
                        <tr className="bg-gray-100 border-b">
                            <th className="p-3 text-left">Test Name</th>
                            <th className="p-3 text-left">Department</th>
                            <th className="p-3 text-left">Sample</th>
                            <th className="p-3 text-left">Price</th>
                            <th className="p-3 text-left">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {tests.map(test => (
                            <tr key={test._id} className="border-b hover:bg-gray-50">
                                <td className="p-3">{test.testName}</td>
                                <td className="p-3">{test.department?.name || '-'}</td>
                                <td className="p-3">{test.sampleType}</td>
                                <td className="p-3">₹{test.price}</td>
                                <td className="p-3">
                                    <div className="flex gap-3">
                                        <button onClick={() => handleEdit(test)} className="text-blue-500 hover:text-blue-700">
                                            <Edit size={20} />
                                        </button>
                                        <button onClick={() => handleDelete(test._id)} className="text-red-500 hover:text-red-700">
                                            <Trash2 size={20} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Pagination */}
                {pages > 1 && (
                    <div className="p-4 border-t flex justify-between items-center bg-gray-50">
                        <span className="text-sm text-gray-600">Page {page} of {pages}</span>
                        <div className="flex gap-2">
                            <button
                                disabled={page === 1}
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                className="px-3 py-1 border rounded bg-white hover:bg-gray-100 disabled:opacity-50"
                            >
                                Previous
                            </button>
                            <button
                                disabled={page === pages}
                                onClick={() => setPage(p => Math.min(pages, p + 1))}
                                className="px-3 py-1 border rounded bg-white hover:bg-gray-100 disabled:opacity-50"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <h3 className="text-xl font-bold mb-4">{editingTest ? 'Edit Test' : 'Add Test'}</h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <input name="testName" placeholder="Test Name" value={formData.testName} onChange={handleChange} className="border p-2 rounded" required />
                                <select name="department" value={formData.department} onChange={handleChange} className="border p-2 rounded" required>
                                    <option value="">Select Department</option>
                                    {departments.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
                                </select>
                                <input name="sampleType" placeholder="Sample Type" value={formData.sampleType} onChange={handleChange} className="border p-2 rounded" required />
                                <input name="price" type="number" placeholder="Price (₹)" value={formData.price} onChange={handleChange} className="border p-2 rounded" required />
                                <input name="unit" placeholder="Unit (e.g. mg/dL)" value={formData.unit} onChange={handleChange} className="border p-2 rounded" />
                                <input name="method" placeholder="Method (e.g. ELISA)" value={formData.method} onChange={handleChange} className="border p-2 rounded" />
                                <input name="tat" placeholder="Turnaround Time" value={formData.tat} onChange={handleChange} className="border p-2 rounded" />
                            </div>

                            <h4 className="font-semibold mt-4">Normal Ranges</h4>
                            <div className="grid grid-cols-3 gap-4 text-sm">
                                <div>
                                    <p className="font-medium">Male</p>
                                    <input placeholder="Min" type="number" step="any" className="border p-1 w-full mb-1" value={formData.normalRanges.male.min} onChange={(e) => handleRangeChange('male', 'min', e.target.value)} />
                                    <input placeholder="Max" type="number" step="any" className="border p-1 w-full" value={formData.normalRanges.male.max} onChange={(e) => handleRangeChange('male', 'max', e.target.value)} />
                                </div>
                                <div>
                                    <p className="font-medium">Female</p>
                                    <input placeholder="Min" type="number" step="any" className="border p-1 w-full mb-1" value={formData.normalRanges.female.min} onChange={(e) => handleRangeChange('female', 'min', e.target.value)} />
                                    <input placeholder="Max" type="number" step="any" className="border p-1 w-full" value={formData.normalRanges.female.max} onChange={(e) => handleRangeChange('female', 'max', e.target.value)} />
                                </div>
                                <div>
                                    <p className="font-medium">Child</p>
                                    <input placeholder="Min" type="number" step="any" className="border p-1 w-full mb-1" value={formData.normalRanges.child.min} onChange={(e) => handleRangeChange('child', 'min', e.target.value)} />
                                    <input placeholder="Max" type="number" step="any" className="border p-1 w-full" value={formData.normalRanges.child.max} onChange={(e) => handleRangeChange('child', 'max', e.target.value)} />
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 mt-6">
                                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border rounded hover:bg-gray-100">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                                    {editingTest ? 'Update Test' : 'Save Test'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TestMaster;
