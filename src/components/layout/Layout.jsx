import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import Header from './Header.jsx';
import OnboardingTour from '../features/OnboardingTour.jsx';

const Layout = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const location = useLocation();

    // Pages that should use the full-bleed "Terminal" view
    const isTerminalPage = ['/app/markets', '/app/dashboard', '/app', '/app/setups', '/app/alerts', '/app/lab'].some(path =>
        location.pathname === path || location.pathname.startsWith('/app/markets')
    );

    const toggleSidebar = () => {
        setIsSidebarOpen(!isSidebarOpen);
    };

    return (
        <div className="app-layout">
            <OnboardingTour />
            <div
                className={`sidebar-overlay ${isSidebarOpen ? 'visible' : ''}`}
                onClick={toggleSidebar}
            />
            <Sidebar isOpen={isSidebarOpen} closeSidebar={() => setIsSidebarOpen(false)} />
            <div className="main-content">
                <Header toggleSidebar={toggleSidebar} isSidebarOpen={isSidebarOpen} />
                <main className={`content-area ${isTerminalPage ? 'terminal-mode' : ''}`}>
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default Layout;
