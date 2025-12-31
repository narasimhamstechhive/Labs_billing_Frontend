import React, { useState, useEffect } from 'react';
import { patientsAPI, billingAPI } from '../../services/api';
import { Search, UserPlus, Phone, Mail, MapPin, User, Calendar, Stethoscope, Printer } from 'lucide-react';
import toast from 'react-hot-toast';

const PatientRegistration = () => {
    const [patients, setPatients] = useState([]);
    const [search, setSearch] = useState('');
    const [formData, setFormData] = useState({
        name: '', age: '', ageMonths: '', gender: 'Male', mobile: '', email: '', address: '', referringDoctor: ''
    });
    const [fieldErrors, setFieldErrors] = useState({});
    const [loading, setLoading] = useState(false);

    // Pagination State
    const [page, setPage] = useState(1);
    const [pages, setPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [limit] = useState(8);

    const handlePrint = async (patient) => {
        const toastId = toast.loading('Finding invoice...');
        try {
            const { data } = await getInvoices({ patientId: patient._id, limit: 1 });
            if (data.invoices && data.invoices.length > 0) {
                const invoiceId = data.invoices[0]._id;

                // Use centralized API service
                const response = await billingAPI.printInvoice(invoiceId);

                // Check if response is HTML
                if (typeof response.data === 'string' && response.data.includes('<!DOCTYPE html>')) {
                    const printWindow = window.open('', '_blank');
                    if (!printWindow) {
                        toast.dismiss(toastId);
                        toast.error('Please allow popups to print invoices', { id: toastId });
                        return;
                    }

                    printWindow.document.open();
                    printWindow.document.write(response.data);
                    printWindow.document.close();

                    toast.dismiss(toastId);
                    toast.success('Invoice opened in new tab', { id: toastId });

                    // Auto print after content loads
                    setTimeout(() => {
                        printWindow.print();
                    }, 500);
                } else {
                    throw new Error('Invalid response format. Expected HTML.');
                }
            } else {
                toast.dismiss(toastId);
                toast.error('No invoice found for this patient', { id: toastId });
            }
        } catch (error) {
            console.error('Print error:', error);
            toast.dismiss(toastId);
            toast.error(error.message || 'Failed to fetch invoice', { id: toastId });
        }
    };

    const validateField = (name, value) => {
        let error = '';
        switch (name) {
            case 'name':
                if (value && !/^[a-zA-Z\s]+$/.test(value)) {
                    error = 'Only letters are allowed';
                }
                break;
            case 'age':
                if (value !== '' && !/^\d+$/.test(value)) {
                    error = 'Age must be a whole number';
                }
                break;
            case 'ageMonths':
                if (value !== '' && (!/^\d+$/.test(value) || parseInt(value) > 11)) {
                    error = 'Months must be between 0 and 11';
                }
                break;
            case 'mobile':
                if (value && !/^\d{10}$/.test(value)) {
                    error = 'Phone number must be exactly 10 digits';
                }
                break;
            case 'email':
                if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                    error = 'Please enter a valid email address';
                }
                break;
            case 'referringDoctor':
                if (value && !/^[a-zA-Z\s\.]+$/.test(value)) {
                    error = 'Doctor name must contain only letters';
                }
                break;
            default:
                break;
        }
        setFieldErrors(prev => {
            if (error) return { ...prev, [name]: error };
            const newErrors = { ...prev };
            delete newErrors[name];
            return newErrors;
        });
        return error;
    };

    const handleSearch = async (e) => {
        e.preventDefault();
        setPage(1);
        fetchPatients(search, 1);
    };

    const fetchPatients = async (keyword = search, pageNum = page) => {
        setLoading(true);
        try {
            const { data } = await patientsAPI.getAll({ keyword, page: pageNum, limit });
            setPatients(data.patients || []);
            setPages(data.pages || 1);
            setTotal(data.total || 0);
            setPage(data.page || 1);
        } catch (err) {
            console.error(err);
            toast.error('Failed to fetch patients');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPatients();
    }, [page]);

    // Reset pagination when search changes (handled in handleSearch or debounced effect)

    // Debounced Search Effect
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (search.length >= 2 || search.length === 0) {
                setPage(1);
                fetchPatients(search, 1);
            }
        }, 800);

        return () => clearTimeout(timeoutId);
    }, [search]);

    const handleChange = (e) => {
        let { name, value } = e.target;
        let blockUpdate = false;
        let currentError = '';

        // 1. Filter restricted characters
        if (name === 'name' || name === 'referringDoctor') {
            const allowedRegex = name === 'name' ? /[^a-zA-Z\s]/g : /[^a-zA-Z\s\.]/g;
            const filteredValue = value.replace(allowedRegex, '');
            if (filteredValue !== value) {
                currentError = name === 'name' ? 'Only letters are allowed' : 'Doctor name must contain only letters';
                value = filteredValue;
            }
        } else if (name === 'age' || name === 'ageMonths' || name === 'mobile') {
            const filteredValue = value.replace(/\D/g, '');
            if (filteredValue !== value) {
                currentError = name === 'age' ? 'Age must be a whole number' :
                    name === 'ageMonths' ? 'Months must be between 0 and 11' :
                        'Phone number must be exactly 10 digits';
                value = filteredValue;
            }

            // 2. Range/Length blocking
            if (name === 'ageMonths' && value !== '' && parseInt(value) > 11) {
                currentError = 'Months must be between 0 and 11';
                blockUpdate = true;
            } else if (name === 'mobile' && value.length > 10) {
                blockUpdate = true;
            }
        }

        // 3. Update State and Errors
        if (!blockUpdate) {
            setFormData(prev => ({ ...prev, [name]: value }));
            const validationError = validateField(name, value);
            if (currentError && !validationError) {
                setFieldErrors(prev => ({ ...prev, [name]: currentError }));
            }
        } else if (currentError) {
            setFieldErrors(prev => ({ ...prev, [name]: currentError }));
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();

        // Final validation check
        const errors = {};
        Object.keys(formData).forEach(key => {
            const error = validateField(key, formData[key]);
            if (error) errors[key] = error;
        });

        if (Object.keys(errors).length > 0) {
            toast.error(errors[Object.keys(errors)[0]]);
            const firstErrorKey = Object.keys(errors)[0];
            const element = document.getElementsByName(firstErrorKey)[0];
            if (element) element.focus();
            return;
        }

        setLoading(true);

        try {
            const postData = { ...formData };

            // Refined age formatting
            const years = parseInt(postData.age) || 0;
            const months = parseInt(postData.ageMonths) || 0;

            if (years === 0 && months > 0) {
                postData.age = `${months} Months`;
            } else if (years > 0 && months > 0) {
                postData.age = `${years} Years ${months} Months`;
            } else if (years > 0) {
                postData.age = `${years} Years`;
            } else {
                postData.age = "0 Years"; // Fallback
            }

            delete postData.ageMonths;

            const { data } = await patientsAPI.create(postData);
            toast.success(`Patient registered successfully! ID: ${data.patientId}`);
            setFormData({ name: '', age: '', ageMonths: '', gender: 'Male', mobile: '', email: '', address: '', referringDoctor: '' });
            setFieldErrors({});
            fetchPatients();
        } catch (err) {
            console.error('Registration error:', err);
            const errorMessage = err.response?.data?.message || err.message || 'Registration Failed.';
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Patient Registration</h1>
                    <p className="text-gray-500 mt-1">Register new patients and manage patient records</p>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-primary-50 text-primary-700 rounded-lg">
                    <User className="w-5 h-5" />
                    <span className="font-semibold">{patients.length}</span>
                    <span className="text-sm">Total Patients</span>
                </div>
            </div>

            {/* Search Bar */}
            <div className="bg-white rounded-xl p-6 shadow-soft">
                <form onSubmit={handleSearch} className="flex gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by Name, Mobile, or Patient ID"
                            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <button
                        type="submit"
                        className="px-6 py-3 bg-gradient-to-r from-primary-600 to-primary-500 text-white rounded-lg font-medium hover:from-primary-700 hover:to-primary-600 transition-all shadow-soft hover:shadow-soft-lg"
                    >
                        Search
                    </button>
                </form>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Registration Form */}
                <div className="lg:col-span-1 bg-white rounded-xl p-6 shadow-soft">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
                            <UserPlus className="w-5 h-5 text-primary-600" />
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900">New Patient</h3>
                    </div>


                    <form onSubmit={handleRegister} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                            <input
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-all ${fieldErrors.name ? 'border-error-500 focus:ring-error-500/20' : 'border-gray-200 focus:ring-primary-500/20 focus:border-primary-400'
                                    }`}
                                placeholder="John Doe"
                                required
                            />
                            {fieldErrors.name && (
                                <p className="mt-1 text-xs text-error-600 animate-fade-in">{fieldErrors.name}</p>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Age (Years) *</label>
                                <input
                                    name="age"
                                    type="number"
                                    min="0"
                                    onKeyDown={(e) => ['e', 'E', '.', '-', '+'].includes(e.key) && e.preventDefault()}
                                    value={formData.age}
                                    onChange={handleChange}
                                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-all ${fieldErrors.age ? 'border-error-500 focus:ring-error-500/20' : 'border-gray-200 focus:ring-primary-500/20 focus:border-primary-400'
                                        }`}
                                    placeholder="25"
                                    required
                                />
                                {fieldErrors.age && (
                                    <p className="mt-1 text-xs text-error-600 animate-fade-in">{fieldErrors.age}</p>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Months (Optional)</label>
                                <input
                                    name="ageMonths"
                                    type="number"
                                    min="0"
                                    max="11"
                                    onKeyDown={(e) => ['e', 'E', '.', '-', '+'].includes(e.key) && e.preventDefault()}
                                    value={formData.ageMonths}
                                    onChange={handleChange}
                                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-all ${fieldErrors.ageMonths ? 'border-error-500 focus:ring-error-500/20' : 'border-gray-200 focus:ring-primary-500/20 focus:border-primary-400'
                                        }`}
                                    placeholder="0-11"
                                />
                                {fieldErrors.ageMonths && (
                                    <p className="mt-1 text-xs text-error-600 animate-fade-in">{fieldErrors.ageMonths}</p>
                                )}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Gender *</label>
                            <select
                                name="gender"
                                value={formData.gender}
                                onChange={handleChange}
                                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all"
                            >
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Mobile Number *</label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    name="mobile"
                                    value={formData.mobile}
                                    onChange={handleChange}
                                    className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-all ${fieldErrors.mobile ? 'border-error-500 focus:ring-error-500/20' : 'border-gray-200 focus:ring-primary-500/20 focus:border-primary-400'
                                        }`}
                                    placeholder="9876543210"
                                    required
                                />
                            </div>
                            {fieldErrors.mobile && (
                                <p className="mt-1 text-xs text-error-600 animate-fade-in">{fieldErrors.mobile}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Email (Optional)</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    name="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-all ${fieldErrors.email ? 'border-error-500 focus:ring-error-500/20' : 'border-gray-200 focus:ring-primary-500/20 focus:border-primary-400'
                                        }`}
                                    placeholder="john@example.com"
                                />
                            </div>
                            {fieldErrors.email && (
                                <p className="mt-1 text-xs text-error-600 animate-fade-in">{fieldErrors.email}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                            <div className="relative">
                                <MapPin className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                                <textarea
                                    name="address"
                                    value={formData.address}
                                    onChange={handleChange}
                                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all resize-none"
                                    rows="3"
                                    placeholder="Street, City, State"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Referring Doctor</label>
                            <div className="relative">
                                <Stethoscope className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    name="referringDoctor"
                                    value={formData.referringDoctor}
                                    onChange={handleChange}
                                    className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-all ${fieldErrors.referringDoctor ? 'border-error-500 focus:ring-error-500/20' : 'border-gray-200 focus:ring-primary-500/20 focus:border-primary-400'
                                        }`}
                                    placeholder="Dr. Smith"
                                />
                            </div>
                            {fieldErrors.referringDoctor && (
                                <p className="mt-1 text-xs text-error-600 animate-fade-in">{fieldErrors.referringDoctor}</p>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-primary-600 to-primary-500 text-white py-3 rounded-lg font-semibold hover:from-primary-700 hover:to-primary-600 transition-all shadow-soft hover:shadow-soft-lg disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <div className="spinner"></div>
                            ) : (
                                <>
                                    <UserPlus className="w-5 h-5" />
                                    <span>Register Patient</span>
                                </>
                            )}
                        </button>
                    </form>
                </div>

                {/* Patient List */}
                <div className="lg:col-span-2 bg-white rounded-xl p-6 shadow-soft flex flex-col h-[600px]">
                    <h3 className="text-xl font-semibold text-gray-900 mb-6 flex-shrink-0">Recent Patients</h3>

                    <div className="flex-1 overflow-y-auto pr-2 relative">
                        <table className="table w-full">
                            <thead className="sticky top-0 bg-white z-10 shadow-sm">
                                <tr>
                                    <th className="py-3 text-left">Patient ID</th>
                                    <th className="py-3 text-left">Name</th>
                                    <th className="py-3 text-left">Age/Gender</th>
                                    <th className="py-3 text-left">Mobile</th>
                                    <th className="py-3 text-left">Doctor</th>
                                    <th className="py-3 text-left">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {patients.map(patient => (
                                    <tr key={patient._id} className="border-b last:border-0 hover:bg-gray-50 transition-colors">
                                        <td>
                                            <span className="font-mono text-sm font-semibold text-primary-600">
                                                {patient.patientId}
                                            </span>
                                        </td>
                                        <td className="font-medium text-gray-900">{patient.name}</td>
                                        <td className="text-gray-600">
                                            {patient.age} / {patient.gender.charAt(0)}
                                        </td>
                                        <td className="text-gray-600">{patient.mobile}</td>
                                        <td className="text-gray-600">{patient.referringDoctor || '-'}</td>
                                        <td>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => handlePrint(patient)}
                                                    className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-gray-100 rounded-lg transition-colors border border-transparent hover:border-gray-200"
                                                    title="Print Patient Invoice"
                                                >
                                                    <Printer className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {patients.length === 0 && !loading && (
                                    <tr>
                                        <td colSpan="6" className="text-center py-8 text-gray-500">
                                            No patients found. Register your first patient above.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Controls */}
                    {pages > 1 && (
                        <div className="flex items-center justify-between pt-4 mt-auto border-t border-gray-100">
                            <button
                                onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                                disabled={page === 1}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                            >
                                Previous
                            </button>
                            <span className="text-sm text-gray-600 font-medium">
                                Page {page} of {pages}
                            </span>
                            <button
                                onClick={() => setPage(prev => Math.min(prev + 1, pages))}
                                disabled={page >= pages}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                            >
                                Next
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PatientRegistration;
