import { NavLink } from 'react-router-dom';
import { LayoutDashboard, FileText, IndianRupee, RotateCcw, Camera, Users, BarChart3, Bell, BookOpen, FileSpreadsheet, Award } from 'lucide-react';
import './Sidebar.css';

const Sidebar = ({ isOpen, setIsOpen }) => {
  return (
    <>
      <div
        className={`sidebar-overlay ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(false)}
      />
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
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
              <span>Returns & Notes</span>
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
      </aside>
    </>
  );
};

export default Sidebar;
