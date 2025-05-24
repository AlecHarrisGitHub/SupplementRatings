import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // Your AuthContext
import { CircularProgress, Box } from '@mui/material';

const PrivateRoute = ({ children, adminOnly = false }) => {
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

    // If the route requires admin privileges, and the user is not an admin, redirect.
    if (adminOnly && !isAdmin) {
        // Redirect to a generic page or home if not an admin for an adminOnly route.
        // Or show an "Access Denied" message/page.
        return <Navigate to="/" state={{ error: 'Access Denied - Admin Only' }} replace />;
    }

    return children;
};

export default PrivateRoute; 