import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FileText, 
  IndianRupee, 
  RotateCcw, 
  Camera, 
  Users, 
  BarChart3, 
  Bell, 
  BookOpen, 
  FileSpreadsheet, 
  Award,
  X,
  User
} from 'lucide-react';
import './Sidebar.css';

const Sidebar = ({ isOpen, setIsOpen }) => {
  const menuItems = [
    { to: '/', label: 'DASHBOARD', icon: LayoutDashboard, color: '#f97316' },
    { to: '/data-entry', label: 'INVOICE ENTRY', icon: FileText, color: '#3b82f6' },
    { to: '/collections', label: 'COLLECTIONS', icon: IndianRupee, color: '#10b981' },
    { to: '/returns', label: 'RETURNS ENTRY', icon: RotateCcw, color: '#0d9488' },
    { to: '/invoice-image', label: 'INVOICE SEARCH', icon: Camera, color: '#06b6d4' },
    { to: '/catalogues', label: 'CATALOGUES', icon: BookOpen, color: '#8b5cf6' },
    { to: '/price-lists', label: 'PRICE LISTS', icon: FileSpreadsheet, color: '#ec4899' },
    { to: '/credit-debit-notes', label: 'CREDIT & DEBIT NOTES', icon: FileText, color: '#6d28d9' },
    { to: '/schemes', label: 'SCHEMES', icon: Award, color: '#f59e0b' },
    { to: '/stock', label: 'STOCK FILES', icon: FileSpreadsheet, color: '#22c55e' },
    { to: '/dealers', label: 'DEALERS MASTER', icon: Users, color: '#0ea5e9' },
    { to: '/reports', label: 'REPORTS', icon: BarChart3, color: '#ef4444' },
    { to: '/alerts', label: 'ALERTS & RULES', icon: Bell, color: '#d946ef' },
  ];

  return (
    <>
      <div
        className={`sidebar-overlay ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(false)}
      />
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        
        {/* Desktop View Sidebar Content */}
        <div className="sidebar-desktop-content">
          <div className="sidebar-header">
            <div className="sidebar-brand-wrapper">
              <div className="sidebar-logo-mark">SF</div>
              <div>
                <h2>SalesFlow</h2>
                <span className="sidebar-subtitle">Tracker Portal</span>
              </div>
              <span className="sidebar-version-badge">v2.1</span>
            </div>
          </div>
          <nav className="sidebar-nav">
            <div className="sidebar-group">
              <span className="sidebar-group-title">Core Tracker</span>
              <NavLink to="/" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')} onClick={() => setIsOpen(false)}>
                <LayoutDashboard size={16} />
                <span>Dashboard</span>
              </NavLink>
              <NavLink to="/data-entry" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')} onClick={() => setIsOpen(false)}>
                <FileText size={16} />
                <span>Invoice Entry</span>
              </NavLink>
              <NavLink to="/collections" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')} onClick={() => setIsOpen(false)}>
                <IndianRupee size={16} />
                <span>Collections</span>
              </NavLink>
              <NavLink to="/returns" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')} onClick={() => setIsOpen(false)}>
                <RotateCcw size={16} />
                <span>Returns Entry</span>
              </NavLink>
              <NavLink to="/invoice-image" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')} onClick={() => setIsOpen(false)}>
                <Camera size={16} />
                <span>Invoice Search</span>
              </NavLink>
            </div>

            <div className="sidebar-group">
              <span className="sidebar-group-title">Document Center</span>
              <NavLink to="/catalogues" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')} onClick={() => setIsOpen(false)}>
                <BookOpen size={16} />
                <span>Catalogues</span>
              </NavLink>
              <NavLink to="/price-lists" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')} onClick={() => setIsOpen(false)}>
                <FileSpreadsheet size={16} />
                <span>Price Lists</span>
              </NavLink>
              <NavLink to="/credit-debit-notes" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')} onClick={() => setIsOpen(false)}>
                <FileText size={16} />
                <span>Credit & Debit Notes</span>
              </NavLink>
              <NavLink to="/schemes" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')} onClick={() => setIsOpen(false)}>
                <Award size={16} />
                <span>Schemes</span>
              </NavLink>
              <NavLink to="/stock" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')} onClick={() => setIsOpen(false)}>
                <FileSpreadsheet size={16} />
                <span>Stock Files</span>
              </NavLink>
            </div>

            <div className="sidebar-group">
              <span className="sidebar-group-title">Admin & Tools</span>
              <NavLink to="/dealers" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')} onClick={() => setIsOpen(false)}>
                <Users size={16} />
                <span>Dealers Master</span>
              </NavLink>
              <NavLink to="/reports" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')} onClick={() => setIsOpen(false)}>
                <BarChart3 size={16} />
                <span>Reports</span>
              </NavLink>
              <NavLink to="/alerts" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')} onClick={() => setIsOpen(false)}>
                <Bell size={16} />
                <span>Alerts & Rules</span>
              </NavLink>
            </div>
          </nav>
          <div className="sidebar-footer">
            <div className="sidebar-avatar-wrapper">
              <div className="sidebar-avatar">AD</div>
              <div className="sidebar-status-dot"></div>
            </div>
            <div className="sidebar-user-info">
              <span className="sidebar-user-name">Administrator</span>
              <span className="sidebar-user-role">System Admin</span>
            </div>
          </div>
        </div>

        {/* Mobile View App Menu Grid */}
        <div className="sidebar-mobile-content">
          <div className="mobile-menu-close-bar">
            <button className="close-menu-btn" onClick={() => setIsOpen(false)}>
              <X size={24} />
            </button>
          </div>

          <div className="mobile-brand-row">
            <div className="brand-logo-badge brand-prestige">SalesFlow</div>
            <div className="brand-logo-badge brand-judge">Tracker</div>
          </div>

          <div className="mobile-profile-card">
            <div className="profile-card-avatar">
              <User size={36} color="#3b82f6" />
              <div className="profile-status-online"></div>
            </div>
            <div className="profile-card-text">
              <h3>ADMINISTRATOR</h3>
              <p>SYSTEM ADMIN (PORTAL-2.1)</p>
            </div>
          </div>

          <div className="mobile-menu-grid">
            {menuItems.map((item, idx) => {
              const IconComp = item.icon;
              return (
                <NavLink 
                  key={idx} 
                  to={item.to} 
                  className={({ isActive }) => `mobile-grid-card ${isActive ? 'active' : ''}`}
                  onClick={() => setIsOpen(false)}
                >
                  <div className="grid-card-icon-container" style={{ backgroundColor: `${item.color}15`, color: item.color }}>
                    <IconComp size={28} strokeWidth={2.5} />
                  </div>
                  <span className="grid-card-label">{item.label}</span>
                </NavLink>
              );
            })}
          </div>
        </div>

      </aside>
    </>
  );
};

export default Sidebar;
