import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

function DashboardLayout({ children, user }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleSidebar = () => {
    if (typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches) {
      setSidebarCollapsed((c) => !c);
    } else {
      setMobileOpen((o) => !o);
    }
  };

  let currentUser = user;
  if (!currentUser) {
    try {
      const token = localStorage.getItem('token');
      if (token) currentUser = JSON.parse(atob(token.split('.')[1]));
    } catch { currentUser = null; }
  }

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/');
  };

  const navSections = [
    {
      items: [
        {
          to: '/dashboard', label: 'Dashboard',
          icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1h-2z" /></svg>,
        },
      ],
    },
    {
      title: 'Sales',
      items: [
        { to: '/sales', label: 'Sale Invoices', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg> },
        { to: '/estimates', label: 'Estimates', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg> },
        { to: '/delivery-challans', label: 'Delivery Challans', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-6h13M9 17l-4-4m4 4l-4 4M3 5h18v6H3V5z" /></svg> },
        { to: '/payment-in', label: 'Payment In', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg> },
        { to: '/credit-notes', label: 'Credit Notes', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
      ],
    },
    {
      title: 'Purchase',
      items: [
        { to: '/purchases', label: 'Purchase Bills', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg> },
        { to: '/payment-out', label: 'Payment Out', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4" /></svg> },
        { to: '/debit-notes', label: 'Debit Notes', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
      ],
    },
    {
      title: 'Inventory',
      items: [
        { to: '/items', label: 'Items', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg> },
      ],
    },
    {
      title: 'Parties',
      items: [
        { to: '/parties', label: 'Customers & Suppliers', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg> },
      ],
    },
    {
      title: 'Reports',
      items: [
        { to: '/reports/profit-loss', label: 'Profit & Loss', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg> },
        { to: '/reports/stock', label: 'Stock Summary', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg> },
        { to: '/reports/day-book', label: 'Day Book', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg> },
        { to: '/reports/gst', label: 'GST Reports', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg> },
        { to: '/reports/party-ledger', label: 'Party Ledger', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h6l4 4v12a2 2 0 01-2 2z" /></svg> },
      ],
    },
    {
      title: 'Settings',
      items: [
        { to: '/settings', label: 'Company & Settings', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg> },
        { to: '/help', label: 'Help Center', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10a4 4 0 118 0c0 2-3 2.5-3 4m-.01 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
      ],
    },
  ];

  const isActive = (to) => {
    if (to === '/dashboard') return location.pathname === '/dashboard';
    return location.pathname === to || location.pathname.startsWith(to + '/');
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(180deg, #eef2ff 0%, #f8fafc 35%, #ffffff 100%)' }}>
      {/* Header */}
      <header
        className="w-full flex items-center justify-between px-3 sm:px-5 py-0 z-50 shadow-md"
        style={{
          background: 'linear-gradient(110deg, #312e81 0%, #4f46e5 58%, #0d9488 100%)',
          minHeight: '56px',
        }}
      >
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            onClick={toggleSidebar}
            className="p-1.5 rounded-lg hover:bg-white/15 transition text-white flex-shrink-0"
            title="Toggle sidebar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg bg-white flex items-center justify-center p-0.5 shadow-sm overflow-hidden flex-shrink-0">
              <img src="/logo.png" alt="Flowventory" className="w-full h-full object-contain scale-150" />
            </div>
            <div className="min-w-0">
              <span className="text-white font-bold text-base sm:text-lg leading-tight tracking-wide truncate block">Flowventory</span>
              <span className="hidden sm:block text-green-100 text-[10px] leading-tight tracking-wider uppercase">GST Billing &amp; Inventory</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          <div className="flex items-center gap-2 bg-white/15 rounded-lg px-2 sm:px-3 py-1.5">
            <div className="w-7 h-7 rounded-full bg-white/30 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {(currentUser?.username || 'U')[0].toUpperCase()}
            </div>
            <div className="hidden sm:flex flex-col">
              <span className="text-white text-sm font-semibold leading-tight">{currentUser?.username || 'User'}</span>
              <span className="text-green-100 text-[10px] leading-tight">{currentUser?.role_id === 1 ? 'Administrator' : 'User'}</span>
            </div>
          </div>
          <button
            onClick={() => navigate('/help')}
            className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 text-white px-2.5 sm:px-3 py-1.5 rounded-lg text-sm font-medium transition-all border border-white/20"
            title="Help Center"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10a4 4 0 118 0c0 2-3 2.5-3 4m-.01 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="hidden sm:inline">Help</span>
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 bg-white/15 hover:bg-red-600 text-white px-2.5 sm:px-3 py-1.5 rounded-lg text-sm font-medium transition-all border border-white/20 hover:border-red-600"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      <div className="flex flex-1 relative overflow-hidden">
        {/* Mobile backdrop */}
        {mobileOpen && (
          <div
            className="fixed inset-0 top-[56px] bg-black/40 z-30 lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
        )}
        {/* Sidebar */}
        <aside
          className={`fixed top-[56px] bottom-0 left-0 z-40 w-64 transform transition-transform duration-300
            ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
            lg:static lg:top-0 lg:translate-x-0 lg:z-auto lg:transition-all
            ${sidebarCollapsed ? 'lg:w-14' : 'lg:w-56'}
            bg-gradient-to-b from-[#312e81] via-[#3b35a8] to-[#1e1b4b] border-r border-white/10 flex flex-col overflow-y-auto flex-shrink-0`}
          style={{ minHeight: 'calc(100vh - 56px)' }}
        >
          <nav className="flex-1 py-3">
            {navSections.map((section, si) => (
              <div key={si} className={si > 0 ? 'mt-1' : ''}>
                {section.title && !sidebarCollapsed && (
                  <p className="text-[10px] font-semibold text-blue-200/80 uppercase tracking-wider px-4 pt-3 pb-1">
                    {section.title}
                  </p>
                )}
                {section.title && sidebarCollapsed && si > 0 && (
                  <div className="mx-3 my-1 border-t border-white/15 hidden lg:block" />
                )}
                {section.items.map(item => {
                  const active = isActive(item.to);
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => setMobileOpen(false)}
                      title={sidebarCollapsed ? item.label : ''}
                      className={`flex items-center gap-3 mx-2 my-0.5 px-3 py-2 rounded-lg text-sm font-medium transition-all
                        ${active
                          ? 'bg-white/20 text-white shadow-sm'
                          : 'text-blue-100/90 hover:bg-white/10 hover:text-white'
                        }`}
                    >
                      <span className={`flex-shrink-0 ${active ? 'text-white' : 'text-blue-200/80'}`}>
                        {item.icon}
                      </span>
                      <span className={`truncate ${sidebarCollapsed ? 'lg:hidden' : ''}`}>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>
          <div className={`p-4 border-t border-white/10 ${sidebarCollapsed ? 'lg:hidden' : ''}`}>
            <p className="text-[10px] text-blue-100/70 text-center">Flowventory v1.0</p>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto p-4 sm:p-6 w-full min-w-0">{children}</main>
      </div>
    </div>
  );
}

export default DashboardLayout;
