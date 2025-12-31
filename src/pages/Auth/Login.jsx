import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Mail, Lock, ArrowRight } from 'lucide-react';
import { authAPI } from '../../services/api';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        if (!email || !password) {
            setError('Please fill in all fields');
            setLoading(false);
            return;
        }

        try {
            const { data } = await login(email, password);
            localStorage.setItem('userInfo', JSON.stringify(data));
            window.location.href = '/dashboard';
        } catch (err) {
            console.error('Login error details:', err.response?.data);
            setError(err.response?.data?.message || 'Invalid email or password');
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen bg-gray-50">
            {/* Left Side - Image/Info Overlay */}
            <div className="hidden lg:flex lg:w-1/2 relative text-white overflow-hidden">
                <div className="absolute inset-0 z-0">
                    <img
                        src="/login.avif"
                        alt="Lab Background"
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/60"></div>
                </div>

                <div className="relative z-10 flex flex-col justify-center px-12 lg:px-20">
                    <h1 className="text-4xl lg:text-5xl font-bold mb-6 leading-tight">
                        Advanced Lab<br />Management
                    </h1>
                    <p className="text-lg text-primary-100 mb-8 max-w-md">
                        Streamline your laboratory operations with our comprehensive information system. Accurate results, faster turnaround.
                    </p>
                    <div className="flex flex-wrap gap-4">
                        <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full border border-white/20">
                            <div className="w-2 h-2 rounded-full bg-success-400"></div>
                            <span className="text-sm font-medium">Real-time Results</span>
                        </div>
                        <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full border border-white/20">
                            <div className="w-2 h-2 rounded-full bg-success-400"></div>
                            <span className="text-sm font-medium">HIPAA Compliant</span>
                        </div>
                        <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full border border-white/20">
                            <div className="w-2 h-2 rounded-full bg-success-400"></div>
                            <span className="text-sm font-medium">24/7 Support</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Side - Login Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-12 bg-white">
                <div className="w-full max-w-md">
                    <div className="text-center mb-10">
                        <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-primary-600 shadow-soft-lg mb-4">
                            <Activity className="w-7 h-7 text-white" strokeWidth={2.5} />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900">MediLab LIS</h2>
                        <p className="text-gray-500 text-sm">Laboratory Information System</p>
                    </div>

                    <div className="bg-white p-6 sm:p-8 rounded-2xl border border-gray-100 shadow-soft-xl">
                        <h3 className="text-xl font-bold text-gray-900 mb-6">Welcome Back</h3>

                        {error && (
                            <div className="mb-6 p-4 bg-error-50 border border-error-200 rounded-lg flex items-center gap-2">
                                <div className="w-1 h-1 rounded-full bg-error-500"></div>
                                <p className="text-sm text-error-700 font-medium">{error}</p>
                            </div>
                        )}

                        <form onSubmit={handleLogin} className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
                                <div className="relative group">
                                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 focus:bg-white transition-all"
                                        placeholder="your.email@example.com"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                                <div className="relative group">
                                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full pl-10 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 focus:bg-white transition-all"
                                        placeholder="••••••••"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-primary-600 focus:outline-none transition-colors p-1"
                                    >
                                        {showPassword ? (
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                            </svg>
                                        ) : (
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                            </svg>
                                        )}
                                    </button>
                                </div>
                            </div>



                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-primary-600 text-white py-3.5 rounded-lg font-bold hover:bg-primary-700 focus:outline-none focus:ring-4 focus:ring-primary-500/20 active:scale-[0.98] transition-all duration-200 shadow-lg shadow-primary-500/30 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2 group mt-2"
                            >
                                {loading ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                ) : (
                                    <>
                                        <span>Sign In</span>
                                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </button>
                        </form>
                    </div>


                </div>
            </div>
        </div>
    );
};

export default Login;
