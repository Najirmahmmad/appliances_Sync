import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ChevronDown, ChevronRight, X, LayoutDashboard } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { SIDEBAR_ITEMS, getFilteredMenuItems } from '../config/SidebarConfig';
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const Sidebar = ({ isOpen, onClose, isCollapsed, toggleCollapse }) => {
  const { user } = useAuth();
  const location = useLocation();
  const [expandedMenus, setExpandedMenus] = useState({});

  // Get filtered menu items based on user role
  const menuItems = user ? getFilteredMenuItems(SIDEBAR_ITEMS, user.role) : [];

  // Toggle submenu expansion
  const toggleSubmenu = (title) => {
    if (isCollapsed) {
      toggleCollapse(); // Auto-expand sidebar if clicking a submenu while collapsed
      setTimeout(() => {
        setExpandedMenus(prev => ({
          ...prev,
          [title]: true // Ensure it opens
        }));
      }, 50);
      return;
    }

    setExpandedMenus(prev => ({
      ...prev,
      [title]: !prev[title]
    }));
  };

  // Check if a submenu item is active
  const isSubmenuActive = (submenu) => {
    return submenu?.some(item => location.pathname === item.path);
  };

  // Auto-expand active submenu on load
  useEffect(() => {
    if (isCollapsed) return; // Don't auto-expand if collapsed to keep it clean

    menuItems.forEach(item => {
      if (item.submenu && isSubmenuActive(item.submenu)) {
        setExpandedMenus(prev => ({ ...prev, [item.title]: true }));
      }
    });
  }, [location.pathname, isCollapsed]); // Re-run when collapsed state changes

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-full bg-white border-r border-slate-200 shadow-sm",
          "transform transition-all duration-300 ease-in-out flex flex-col",
          "lg:translate-x-0 lg:static lg:z-0",
          isOpen ? "translate-x-0" : "-translate-x-full",
          isCollapsed ? "lg:w-20" : "lg:w-72",
          "w-[280px]"
        )}
      >
        {/* Header - Brand Logo */}
        <div className={cn(
          "flex items-center h-[72px] border-b border-slate-100 px-5",
          isCollapsed ? "justify-center" : "justify-between"
        )}>
          <div className="flex items-center gap-3 overflow-hidden whitespace-nowrap">
            <div className="min-w-[40px] w-10 h-10 bg-gradient-to-tr from-erp-primary to-blue-400 rounded-xl flex items-center justify-center shadow-md shadow-erp-primary/20">
              <span className="text-white font-black tracking-wider text-sm">IFB</span>
            </div>
            {!isCollapsed && (
              <div className="flex flex-col">
                <span className="font-extrabold text-slate-800 tracking-tight text-lg leading-tight">ERP SYSTEM</span>
                <span className="text-[10px] font-semibold text-erp-primary uppercase tracking-widest leading-none">Enterprise</span>
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-2 no-scrollbar">
          {menuItems.map((item) => (
            <div key={item.title}>
              {item.submenu ? (
                // Menu with submenu
                <div className="space-y-1">
                  <button
                    onClick={() => toggleSubmenu(item.title)}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-3 rounded-xl",
                      "text-sm font-semibold transition-all duration-200 group",
                      isSubmenuActive(item.submenu)
                        ? "bg-blue-50/80 text-erp-primary shadow-sm"
                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-800",
                      isCollapsed && "justify-center px-2"
                    )}
                    title={isCollapsed ? item.title : ''}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className={cn(
                        "w-[22px] h-[22px] min-w-[22px] transition-colors",
                        isSubmenuActive(item.submenu) ? "text-erp-primary" : "text-slate-400 group-hover:text-erp-primary"
                      )} />
                      {!isCollapsed && <span>{item.title}</span>}
                    </div>
                    {!isCollapsed && (
                      <div className={cn("transition-transform duration-200", expandedMenus[item.title] && "rotate-90")}>
                        <ChevronRight className="w-4 h-4 opacity-50" />
                      </div>
                    )}
                  </button>

                  {/* Submenu Items */}
                  {!isCollapsed && expandedMenus[item.title] && (
                    <div className="mt-1 ml-[22px] pl-4 border-l-2 border-slate-100 space-y-1 animate-in slide-in-from-top-2 relative">
                      {item.submenu.map((subItem) => (
                        <NavLink
                          key={subItem.path}
                          to={subItem.path}
                          onClick={() => {
                            if (window.innerWidth < 1024) onClose();
                          }}
                          className={({ isActive }) => cn(
                            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all relative overflow-hidden",
                            isActive
                              ? "text-erp-primary bg-erp-primary/5 shadow-sm"
                              : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                          )}
                        >
                          {({ isActive }) => (
                            <>
                              {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-erp-primary rounded-r-md"></div>}
                              <subItem.icon className={cn("w-4 h-4", isActive ? "text-erp-primary" : "text-slate-400")} />
                              <span>{subItem.title}</span>
                            </>
                          )}
                        </NavLink>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                // Single menu item (Dashboard)
                <NavLink
                  to={item.path}
                  onClick={() => {
                    if (window.innerWidth < 1024) onClose();
                  }}
                  className={({ isActive }) => cn(
                    "flex items-center gap-3 px-3 py-3 rounded-xl",
                    "text-sm font-semibold transition-all duration-200 relative overflow-hidden group",
                    isActive
                      ? "bg-erp-primary text-white shadow-md shadow-erp-primary/20"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-800",
                    isCollapsed && "justify-center px-2"
                  )}
                  title={isCollapsed ? item.title : ''}
                >
                  {({ isActive }) => (
                    <>
                      <item.icon className={cn(
                        "w-[22px] h-[22px] min-w-[22px] transition-colors",
                         isActive ? "text-white" : "text-slate-400 group-hover:text-erp-primary"
                      )} />
                      {!isCollapsed && <span>{item.title}</span>}
                    </>
                  )}
                </NavLink>
              )}
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;
