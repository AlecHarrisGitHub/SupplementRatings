import React, { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { logoutUser } from '../services/api';

function LogoutButton() {
  const { logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logoutUser();
    logout();
    navigate('/login', { state: { from: 'logout' } });
  };

  return (
    <button 
      onClick={handleLogout} 
      style={styles.button}
      type="button"
    >
      Logout
    </button>
  );
}

const styles = {
  button: {
    padding: '5px 10px',
    backgroundColor: '#dc3545',
    color: '#fff',
    border: 'none',
    borderRadius: '3px',
    cursor: 'pointer',
  },
};

export default LogoutButton;