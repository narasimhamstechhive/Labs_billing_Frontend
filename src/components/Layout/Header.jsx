import React, { useState, useEffect } from 'react';
import { Bell, User, Activity, Receipt, Plus, Maximize, Minimize } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { settingsAPI } from '../../services/api';

const Header = () => {
    const navigate = useNavigate();
    const [labInfo, setLabInfo] = useState({ labName: 'MediLab', logo: '' });
    const [isFullscreen, setIsFullscreen] = useState(false);
    const user = JSON.parse(localStorage.getItem('userInfo')) || { name: 'User', role: 'Staff' };

    useEffect(() => {
        // Check cache first
        const cachedSettings = sessionStorage.getItem('labSettings');
        if (cachedSettings) {
            try {
                setLabInfo(JSON.parse(cachedSettings));
            } catch (e) {
                // Invalid cache, fetch fresh
            }
        }

        const fetchSettings = async () => {
            try {
                const response = await settingsAPI.get();
                const settings = response.data;
                setLabInfo(settings);
                // Cache for session
                sessionStorage.setItem('labSettings', JSON.stringify(settings));
            } catch (error) {
                console.error('Error fetching lab settings for header:', error);
            }
        };
        
        // Only fetch if not cached
        if (!cachedSettings) {
            fetchSettings();
        }
    }, []);

    const getInitials = (name) => {
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    const getRoleColor = (role) => {
        const colors = {
            admin: 'bg-primary-100 text-primary-700',
            pathologist: 'bg-secondary-100 text-secondary-700',
            technician: 'bg-warning-100 text-warning-700',
            default: 'bg-gray-100 text-gray-700'
        };
        return colors[role?.toLowerCase()] || colors.default;
    };

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().then(() => {
                setIsFullscreen(true);
            }).catch(err => {
                console.error('Error attempting to enable fullscreen:', err);
            });
        } else {
            document.exitFullscreen().then(() => {
                setIsFullscreen(false);
            }).catch(err => {
                console.error('Error attempting to exit fullscreen:', err);
            });
        }
    };

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
        };
    }, []);

    return (
        <header className="h-16 bg-white border-b border-gray-200 fixed top-0 right-0 left-0 z-50">
            <div className="h-full px-6 flex items-center justify-between">
                {/* Left: Logo & Name */}
                <div className="flex items-center gap-8">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-soft overflow-hidden relative">
                            {labInfo.logo ? (
                                <>
                                    <img 
                                        src={labInfo.logo.startsWith('data:image') 
                                            ? labInfo.logo 
                                            : labInfo.logo.startsWith('http') 
                                                ? labInfo.logo 
                                                : `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'}${labInfo.logo}`} 
                                        alt="Logo" 
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                            e.target.style.display = 'none';
                                            const fallback = e.target.parentElement?.querySelector('.logo-fallback');
                                            if (fallback) fallback.classList.remove('hidden');
                                        }}
                                    />
                                    <Activity className="w-6 h-6 text-white logo-fallback hidden absolute" strokeWidth={2.5} />
                                </>
                            ) : (
                                <Activity className="w-6 h-6 text-white" strokeWidth={2.5} />
                            )}
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900 tracking-tight">{labInfo.labName}</h1>
                            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold -mt-1">Laboratory System</p>
                        </div>
                    </div>
                </div>

                {/* Right: Actions & Profile */}
                <div className="flex items-center gap-6">
                    {/* Quick Billing Button - Standout Action */}
                    <button
                        onClick={() => navigate('/billing')}
                        className="hidden sm:flex items-center gap-2 px-6 py-2.5 bg-primary-600 text-white rounded-full font-bold text-sm hover:bg-primary-700 transition-all shadow-md shadow-primary-500/20 active:scale-95 group"
                    >
                        <Plus className="w-4 h-4" />
                        <Receipt className="w-4 h-4" />
                        <span>Quick Billing</span>
                    </button>

                    <div className="flex items-center gap-4">
                        {/* Fullscreen Toggle */}
                        <button 
                            onClick={toggleFullscreen}
                            className="p-2 hover:bg-gray-50 rounded-lg transition-colors group"
                            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
                        >
                            {isFullscreen ? (
                                <Minimize className="w-5 h-5 text-gray-600 group-hover:text-primary-600" />
                            ) : (
                                <Maximize className="w-5 h-5 text-gray-600 group-hover:text-primary-600" />
                            )}
                        </button>

                        {/* Notifications */}
                        <button className="relative p-2 hover:bg-gray-50 rounded-lg transition-colors group">
                            <Bell className="w-5 h-5 text-gray-600 group-hover:text-primary-600" />
                            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-error-500 rounded-full border-2 border-white"></span>
                        </button>

                        {/* User Profile */}
                        <div className="flex items-center gap-3 pl-6 border-l border-gray-100">

                            <div
                                onClick={() => navigate('/settings')}
                                className="w-10 h-10 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-primary-700 font-bold text-sm shadow-inner overflow-hidden cursor-pointer hover:border-primary-300 transition-colors"
                            >
                                {getInitials(user.name)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;
