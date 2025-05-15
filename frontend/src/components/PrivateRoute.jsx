import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // Your AuthContext
import { CircularProgress, Box } from '@mui/material';

const PrivateRoute = ({ children }) => {
    const { isAuthenticated, isAdmin, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        // Show a loading spinner while checking auth status
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <CircularProgress />
            </Box>
        );
    }

    if (!isAuthenticated) {
        // Redirect them to the /login page, but save the current location they were
        // trying to go to so we can send them along after they login.
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // For admin routes, also check if the user is an admin
    // This assumes routes like /admin-dashboard are only for admins
    // If a route is private but not specifically admin, you might omit this check or have different PrivateRoute types
    if (!isAdmin) {
        // Redirect to a generic page or home if not an admin (or show an access denied message)
        // For simplicity, redirecting to home. You could also have a dedicated "Access Denied" page.
        return <Navigate to="/" state={{ error: 'Access Denied' }} replace />;
    }

    return children;
};

export default PrivateRoute; 