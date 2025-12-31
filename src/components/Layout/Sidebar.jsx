import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    UserPlus,
    TestTube,
    ClipboardList,
    FileCheck,
    Receipt,
    Settings,
    Beaker,
    Activity,
    LogOut,
    AlertCircle,
    TrendingUp,
    FileText
} from 'lucide-react';

const Sidebar = () => {
    const location = useLocation();
    const [showLogoutModal, setShowLogoutModal] = useState(false);

    const menuItems = [
        { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { path: '/billing', icon: Receipt, label: 'Billing' },
        { path: '/transactions', icon: FileText, label: 'Transactions' },
        { path: '/registration', icon: UserPlus, label: 'Patient Registration' },
        { path: '/lab/samples', icon: TestTube, label: 'Sample Collection' },
        { path: '/lab/results', icon: ClipboardList, label: 'Result Entry' },
        { path: '/reports', icon: FileCheck, label: 'Approved Reports' },
        { path: '/analytics', icon: TrendingUp, label: 'Analytics' },

        // { path: '/settings', icon: Settings, label: 'Lab Settings' },
        { path: '/lab/departments', icon: Beaker, label: 'Department Master', isMaster: true },
        { path: '/lab/tests', icon: Activity, label: 'Test Master', isMaster: true },
    ];

    const isActive = (path) => location.pathname === path;

    const handleLogout = () => {
        localStorage.removeItem('userInfo');
        window.location.href = '/login';
    };

    return (
        <>
            <div className="w-64 bg-white h-[calc(100vh-64px)] fixed left-0 top-16 border-r border-gray-100 flex flex-col items-stretch">
                {/* Navigation */}
                <nav className="flex-1 p-4 overflow-y-auto custom-scrollbar">
                    <div className="space-y-1">
                        {menuItems.filter(item => !item.isMaster).map((item) => {
                            const Icon = item.icon;
                            const active = isActive(item.path);

                            return (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    className={`
                                        flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium
                                        transition-all duration-200
                                        ${active
                                            ? 'bg-gradient-to-r from-primary-50 to-primary-100/50 text-primary-700 shadow-sm'
                                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                        }
                                    `}
                                >
                                    <Icon className="w-5 h-5" strokeWidth={active ? 2.5 : 2} />
                                    <span>{item.label}</span>
                                </Link>
                            );
                        })}
                    </div>

                    {/* Masters Section */}
                    <div className="mt-6 pt-6 border-t border-gray-100">
                        <p className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                            Masters
                        </p>
                        <div className="space-y-1">
                            {menuItems.filter(item => item.isMaster).map((item) => {
                                const Icon = item.icon;
                                const active = isActive(item.path);

                                return (
                                    <Link
                                        key={item.path}
                                        to={item.path}
                                        className={`
                                            flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium
                                            transition-all duration-200
                                            ${active
                                                ? 'bg-gradient-to-r from-primary-50 to-primary-100/50 text-primary-700 shadow-sm'
                                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                            }
                                        `}
                                    >
                                        <Icon className="w-5 h-5" strokeWidth={active ? 2.5 : 2} />
                                        <span>{item.label}</span>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                </nav>

                {/* User Section */}
                <div className="p-4 border-t border-gray-100">
                    <button
                        onClick={() => setShowLogoutModal(true)}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-gray-600 hover:bg-rose-50 hover:text-rose-600 transition-all duration-200 group"
                    >
                        <LogOut className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                        <span>Logout</span>
                    </button>
                </div>
            </div>

            {/* Logout Confirmation Modal */}
            {showLogoutModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-gray-900/40 backdrop-blur-[2px] animate-in fade-in duration-300"
                        onClick={() => setShowLogoutModal(false)}
                    ></div>

                    {/* Modal content */}
                    <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm animate-in zoom-in-95 duration-200 border border-gray-100">
                        <div className="flex flex-col items-center text-center">
                            <div className="w-16 h-16 rounded-full bg-rose-50 flex items-center justify-center mb-4">
                                <LogOut className="w-8 h-8 text-rose-600" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Confirm Logout</h3>
                            <p className="text-gray-500 mb-8 text-sm leading-relaxed">
                                Are you sure you want to log out? <br /> Any unsaved patient data might be lost.
                            </p>

                            <div className="flex gap-3 w-full">
                                <button
                                    onClick={() => setShowLogoutModal(false)}
                                    className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-all active:scale-95"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleLogout}
                                    className="flex-1 px-4 py-3 rounded-xl bg-rose-600 text-white text-sm font-bold hover:bg-rose-700 shadow-lg shadow-rose-200 transition-all active:scale-95"
                                >
                                    Logout
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default Sidebar;
