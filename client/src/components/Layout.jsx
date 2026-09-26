import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, Menu, User, ChevronLeft, ChevronRight, Search, Bell, Monitor } from 'lucide-react';
import Sidebar from './Sidebar';

const Layout = () => {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false); // Mobile drawer state
  const [isCollapsed, setIsCollapsed] = useState(false); // Desktop/Tablet mini-sidebar state

  const getRoleBadgeColor = (role) => {
    switch (role?.toLowerCase()) {
      case 'admin':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'operator':
        return 'bg-erp-info bg-opacity-10 text-erp-info border-blue-200';
      case 'technician':
        return 'bg-erp-success bg-opacity-10 text-erp-success border-green-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="min-h-screen bg-erp-bg flex font-inter text-slate-800">
      {/* Sidebar - Passes state for both mobile drawer and desktop collapse */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        isCollapsed={isCollapsed}
        toggleCollapse={() => setIsCollapsed(!isCollapsed)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out">
        {/* Modern Top Header */}
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-40 shadow-sm">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-[72px]">
              {/* Left Side: Toggle Buttons & Search */}
              <div className="flex items-center gap-4 flex-1">
                {/* Mobile Menu Toggle */}
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="lg:hidden p-2 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors"
                >
                  <Menu className="w-5 h-5" />
                </button>

                {/* Desktop Sidebar Toggle */}
                <button
                  onClick={() => setIsCollapsed(!isCollapsed)}
                  className="hidden lg:flex p-2 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors"
                  title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                >
                  {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
                </button>

                {/* Global Search Bar (Hidden on Mobile) */}
                <div className="hidden md:flex items-center max-w-md w-full relative group">
                  <Search className="absolute left-3 w-4 h-4 text-slate-400 group-focus-within:text-erp-primary transition-colors" />
                  <input 
                    type="text" 
                    placeholder="Search transactions, customers, or items (Press '/' to focus)" 
                    className="w-full pl-10 pr-4 py-2 bg-slate-100/50 border border-transparent rounded-full text-sm focus:bg-white focus:border-erp-primary focus:ring-4 focus:ring-erp-primary/10 transition-all outline-none placeholder:text-slate-400"
                  />
                  <div className="absolute right-3 px-1.5 py-0.5 rounded-md border border-slate-300 bg-white text-[10px] font-bold text-slate-400 shadow-sm">
                    /
                  </div>
                </div>
              </div>

              {/* Right Side: Quick Actions & Profile */}
              <div className="flex items-center gap-3 sm:gap-5">
                {/* Notifications */}
                <button className="relative p-2 text-slate-400 hover:text-erp-primary hover:bg-slate-50 rounded-full transition-colors">
                  <Bell className="w-5 h-5" />
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-erp-danger rounded-full ring-2 ring-white"></span>
                </button>

                <div className="w-px h-8 bg-slate-200 hidden sm:block"></div>

                {/* User Profile Pill */}
                <div className="flex items-center gap-3">
                  <div className="hidden sm:flex flex-col items-end">
                    <span className="text-sm font-bold text-slate-800 leading-tight">{user?.username || 'User'}</span>
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${getRoleBadgeColor(user?.role)} bg-transparent border-0 px-0`}>
                      {user?.role || 'Guest'}
                    </span>
                  </div>
                  
                  <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-erp-primary to-blue-400 p-[2px] shadow-sm cursor-pointer group">
                    <div className="h-full w-full rounded-full bg-white flex items-center justify-center relative overflow-hidden">
                      <User className="w-5 h-5 text-erp-primary group-hover:scale-110 transition-transform duration-300" />
                    </div>
                  </div>
                </div>

                {/* Logout Action */}
                <button
                  onClick={logout}
                  className="p-2 text-slate-400 hover:text-erp-danger hover:bg-red-50 rounded-full transition-colors ml-1"
                  title="Logout"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Workspace Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-x-hidden relative">
          <div className="max-w-[1400px] mx-auto w-full h-full flex flex-col">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
