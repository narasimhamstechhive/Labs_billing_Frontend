import React, { useState, useEffect } from 'react';
import { Save, Upload, Building2, MapPin, Phone, Mail, FileText, ShieldCheck } from 'lucide-react';
import { getSettings, settingsAPI } from '../../services/api';

const Settings = () => {
    const [formData, setFormData] = useState({
        labName: '',
        businessName: '',
        address: '',
        mobile: '',
        email: '',
        gstNumber: '',
        termsAndConditions: '',
        logo: ''
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [errors, setErrors] = useState({});

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const response = await getSettings();
            setFormData(response.data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching settings:', error);
            setMessage({ type: 'error', text: 'Failed to load settings' });
            setLoading(false);
        }
    };

    const validateForm = () => {
        const newErrors = {};
        if (!formData.labName.trim()) newErrors.labName = 'Lab name is required';
        if (!formData.address.trim()) newErrors.address = 'Address is required';

        // Mobile validation (10 digits)
        if (!formData.mobile) {
            newErrors.mobile = 'Mobile number is required';
        } else if (!/^\d{10}$/.test(formData.mobile)) {
            newErrors.mobile = 'Enter a valid 10-digit mobile number';
        }

        // Email validation
        if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = 'Enter a valid email address';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        let newValue = value;

        if (name === 'labName') {
            // Restrict numbers in lab name
            newValue = value.replace(/[0-9]/g, '');
        }

        if (name === 'mobile') {
            // Restrict to digits only and max 10 characters
            newValue = value.replace(/\D/g, '').slice(0, 10);
        }

        if (name === 'gstNumber') {
            // Restrict to 15 characters, usually alphanumeric
            newValue = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 15);
        }

        setFormData({ ...formData, [name]: newValue });
        if (errors[name]) {
            setErrors({ ...errors, [name]: '' });
        }
    };

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // basic client-side check
        if (!file.type.startsWith('image/')) {
            setMessage({ type: 'error', text: 'Please upload an image file (JPG/PNG)' });
            return;
        }

        const uploadFormData = new FormData();
        uploadFormData.append('logo', file);

        try {
            setSaving(true);
            const response = await settingsAPI.uploadLogo(uploadFormData);
            const newLogoPath = response.data.filePath;

            // Update local state
            const updatedData = { ...formData, logo: newLogoPath };
            setFormData(updatedData);

            // Update cache and notify other components
            sessionStorage.setItem('labSettings', JSON.stringify(updatedData));
            window.dispatchEvent(new Event('labSettingsUpdated'));

            setMessage({ type: 'success', text: 'Logo uploaded successfully!' });
        } catch (error) {
            console.error('Error uploading logo:', error);
            setMessage({ type: 'error', text: 'Failed to upload logo' });
        } finally {
            setSaving(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) {
            setMessage({ type: 'error', text: 'Please fix the errors in the form' });
            return;
        }

        setSaving(true);
        setMessage({ type: '', text: '' });
        try {
            await settingsAPI.update(formData);

            // Update cache and notify other components
            sessionStorage.setItem('labSettings', JSON.stringify(formData));
            window.dispatchEvent(new Event('labSettingsUpdated'));

            setMessage({ type: 'success', text: 'Settings updated successfully!' });
            setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        } catch (error) {
            console.error('Error updating settings:', error);
            setMessage({ type: 'error', text: 'Failed to update settings' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="w-10 h-10 border-4 border-primary-100 border-t-primary-600 rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Lab Settings</h1>
                    <p className="text-gray-500">Manage your laboratory profile and appearance</p>
                </div>
            </div>

            {message.text && (
                <div className={`p-4 rounded-xl border ${message.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-red-50 border-red-100 text-red-700'
                    } animate-in fade-in slide-in-from-top-2`}>
                    {message.text}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Sidebar / Profile Pic */}
                    <div className="md:col-span-1 space-y-6">
                        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm text-center">
                            <input
                                type="file"
                                id="logo-upload"
                                className="hidden"
                                accept="image/*"
                                onChange={handleFileChange}
                            />
                            <label
                                htmlFor="logo-upload"
                                className="w-32 h-32 mx-auto bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-2 group hover:border-primary-400 transition-colors cursor-pointer relative overflow-hidden"
                            >
                                {formData.logo ? (
                                    <img
                                        src={formData.logo.startsWith('data:image')
                                            ? formData.logo
                                            : formData.logo.startsWith('http')
                                                ? formData.logo
                                                : `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'}${formData.logo}`}
                                        alt="Logo"
                                        className="w-full h-full object-contain p-2"
                                    />
                                ) : (
                                    <>
                                        <Upload className="w-8 h-8 text-gray-400 group-hover:text-primary-500 transition-colors" />
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Upload Logo</span>
                                    </>
                                )}
                            </label>
                            <p className="mt-4 text-[10px] font-bold text-gray-400 uppercase">Recommended: 200x200px (PNG/JPG)</p>
                        </div>


                    </div>

                    {/* Main Form Fields */}
                    <div className="md:col-span-2 space-y-6">
                        <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                        <Building2 className="w-3 h-3" /> Laboratory Name
                                    </label>
                                    <input
                                        type="text"
                                        name="labName"
                                        value={formData.labName}
                                        onChange={handleChange}
                                        className={`w-full px-4 py-3 bg-gray-50 border ${errors.labName ? 'border-red-500' : 'border-gray-200'} rounded-xl text-sm font-bold focus:ring-4 focus:ring-primary-500/10 focus:border-primary-400 outline-none transition-all placeholder:text-gray-300`}
                                    />
                                    {errors.labName && <p className="text-[10px] text-red-500 font-bold">{errors.labName}</p>}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                        Business Name
                                    </label>
                                    <input
                                        type="text"
                                        name="businessName"
                                        value={formData.businessName}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:ring-4 focus:ring-primary-500/10 focus:border-primary-400 outline-none transition-all placeholder:text-gray-300"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                    <MapPin className="w-3 h-3" /> Full Address
                                </label>
                                <textarea
                                    name="address"
                                    value={formData.address}
                                    onChange={handleChange}
                                    rows="3"
                                    className={`w-full px-4 py-3 bg-gray-50 border ${errors.address ? 'border-red-500' : 'border-gray-200'} rounded-xl text-sm font-bold focus:ring-4 focus:ring-primary-500/10 focus:border-primary-400 outline-none transition-all placeholder:text-gray-300 resize-none`}
                                ></textarea>
                                {errors.address && <p className="text-[10px] text-red-500 font-bold">{errors.address}</p>}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                        <Phone className="w-3 h-3" /> Mobile Number
                                    </label>
                                    <input
                                        type="text"
                                        name="mobile"
                                        value={formData.mobile}
                                        onChange={handleChange}
                                        className={`w-full px-4 py-3 bg-gray-50 border ${errors.mobile ? 'border-red-500' : 'border-gray-200'} rounded-xl text-sm font-bold focus:ring-4 focus:ring-primary-500/10 focus:border-primary-400 outline-none transition-all placeholder:text-gray-300`}
                                    />
                                    {errors.mobile && <p className="text-[10px] text-red-500 font-bold">{errors.mobile}</p>}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                        <Mail className="w-3 h-3" /> Email Address
                                    </label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        className={`w-full px-4 py-3 bg-gray-50 border ${errors.email ? 'border-red-500' : 'border-gray-200'} rounded-xl text-sm font-bold focus:ring-4 focus:ring-primary-500/10 focus:border-primary-400 outline-none transition-all placeholder:text-gray-300`}
                                    />
                                    {errors.email && <p className="text-[10px] text-red-500 font-bold">{errors.email}</p>}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                    GST Number (Optional)
                                </label>
                                <input
                                    type="text"
                                    name="gstNumber"
                                    value={formData.gstNumber}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:ring-4 focus:ring-primary-500/10 focus:border-primary-400 outline-none transition-all placeholder:text-gray-300"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                    <FileText className="w-3 h-3" /> Terms & Conditions
                                </label>
                                <textarea
                                    name="termsAndConditions"
                                    value={formData.termsAndConditions}
                                    onChange={handleChange}
                                    rows="5"
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:ring-4 focus:ring-primary-500/10 focus:border-primary-400 outline-none transition-all placeholder:text-gray-300 resize-none"
                                ></textarea>
                            </div>

                            <button
                                type="submit"
                                disabled={saving}
                                className="w-full py-4 bg-primary-600 text-white rounded-xl font-bold text-sm hover:bg-primary-700 transition-all shadow-lg shadow-primary-500/20 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                <Save className="w-4 h-4" />
                                {saving ? 'Saving Changes...' : 'Save Settings'}
                            </button>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default Settings;
