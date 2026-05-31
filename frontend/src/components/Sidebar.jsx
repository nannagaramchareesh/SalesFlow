import { NavLink } from 'react-router-dom';
import { LayoutDashboard, FileText, IndianRupee, RotateCcw, Camera, Users } from 'lucide-react';
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
          <h2>DealerSales Tracker</h2>
        </div>
        <nav className="sidebar-nav">
          <NavLink to="/" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')} onClick={() => setIsOpen(false)}>
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </NavLink>
          <NavLink to="/data-entry" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')} onClick={() => setIsOpen(false)}>
            <FileText size={20} />
            <span>Data Entry</span>
          </NavLink>
          <NavLink to="/collections" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')} onClick={() => setIsOpen(false)}>
            <IndianRupee size={20} />
            <span>Collections</span>
          </NavLink>
          <NavLink to="/returns" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')} onClick={() => setIsOpen(false)}>
            <RotateCcw size={20} />
            <span>Returns</span>
          </NavLink>
          <NavLink to="/invoice-image" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')} onClick={() => setIsOpen(false)}>
            <Camera size={20} />
            <span>Invoice Image</span>
          </NavLink>
          <NavLink to="/dealers" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')} onClick={() => setIsOpen(false)}>
            <Users size={20} />
            <span>Dealers Master</span>
          </NavLink>
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;
