import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import Header from './Header.jsx';

const Layout = () => {
    return (
        <div className="app-layout">
            <Sidebar />
            <div className="main-content">
                <Header />
                <main className="content-area">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default Layout;
