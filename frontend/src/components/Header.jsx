import { Bell, User, Menu } from 'lucide-react';
import './Header.css';

const Header = ({ toggleSidebar }) => {
  return (
    <header className="header">
      <button className="hamburger-btn" onClick={toggleSidebar}>
        <Menu size={24} />
      </button>
      <div className="header-actions">
        <button className="action-btn">
          <Bell size={20} />
        </button>
        <div className="user-profile">
          <div className="avatar">
            <User size={20} />
          </div>
          <span>Admin User</span>
        </div>
      </div>
    </header>
  );
};

export default Header;
