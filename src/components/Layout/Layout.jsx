import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

const Layout = () => {
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col" style={{ overflowX: 'hidden', overscrollBehavior: 'none' }}>
            <Header />
            <div className="flex flex-1 pt-16" style={{ overflowX: 'hidden' }}>
                <Sidebar />
                <main className="flex-1 ml-64 min-h-screen overflow-y-auto" style={{ overflowX: 'hidden', overscrollBehavior: 'none' }}>
                    <div className="p-8">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
};

export default Layout;
