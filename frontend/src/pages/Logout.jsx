import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { logoutUser } from '../services/api';

function Logout() {
    const navigate = useNavigate();
    const { logout } = useAuth();

    useEffect(() => {
        const handleLogout = async () => {
            try {
                await logoutUser();
                logout();
                navigate('/login', { state: { from: 'logout' } });
            } catch (error) {
                console.error('Logout error:', error);
                // Still logout the user on the frontend even if the API call fails
                logout();
                navigate('/login', { state: { from: 'logout' } });
            }
        };

        handleLogout();
    }, [navigate, logout]);

    return null;
}

export default Logout; 