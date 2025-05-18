import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AppBar, Toolbar, Typography, Button, Box, Container, IconButton } from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';

function Navbar() {
    const { isAuthenticated, isAdmin, user, logout } = useAuth();
    // console.log('Navbar Auth State:', { isAuthenticated, isAdmin });
    const navigate = useNavigate();
    const [anchorEl, setAnchorEl] = useState(null);
    
    const handleLogout = () => {
        logout();
        toast.success('Logged out successfully!');
        navigate('/login');
    };

    return (
        <AppBar position="static">
            <Container maxWidth="xl">
                <Toolbar disableGutters>
                    <Typography
                        variant="h6"
                        noWrap
                        component={Link}
                        to="/"
                        sx={{
                            mr: 2,
                            display: { xs: 'none', md: 'flex' },
                            fontFamily: 'monospace',
                            fontWeight: 700,
                            letterSpacing: '.1rem',
                            color: 'inherit',
                            textDecoration: 'none',
                        }}
                    >
                        {/* SUPPLEMENTBASE removed as per user request */}
                    </Typography>

                    <Box sx={{ flexGrow: 1, display: { xs: 'flex', md: 'none' } }}>
                        {/* Hamburger menu icon could go here */}
                    </Box>
                    
                    <Typography
                        variant="h5"
                        noWrap
                        component={Link}
                        to="/"
                        sx={{
                            mr: 2,
                            display: { xs: 'flex', md: 'none' },
                            flexGrow: 1,
                            fontFamily: 'monospace',
                            fontWeight: 700,
                            letterSpacing: '.1rem',
                            color: 'inherit',
                            textDecoration: 'none',
                        }}
                    >
                        {/* SUPPLEMENTBASE (Mobile) removed as per user request */}
                    </Typography>

                    <Box sx={{ flexGrow: 1, display: { xs: 'none', md: 'flex' } }}>
                        <Button color="inherit" component={Link} to="/supplements">Supplements</Button>
                        {isAuthenticated && (
                             <Button color="inherit" component={Link} to="/accounts">My Account</Button>
                        )}
                        {isAdmin && (
                            <>
                                <Button color="inherit" component={Link} to="/upload-supplements">Upload Supplements</Button>
                                <Button color="inherit" component={Link} to="/upload-conditions">Upload Purposes</Button>
                                <Button color="inherit" component={Link} to="/upload-brands">Upload Brands</Button>
                                <Button color="inherit" component={Link} to="/admin-dashboard">Admin Dashboard</Button>
                            </>
                        )}
                    </Box>

                    <Box sx={{ flexGrow: 0 }}>
                        {isAuthenticated ? (
                            <>
                                {user && <Typography variant="subtitle1" component="span" sx={{ mr: 1 }}>{user.username}</Typography>}
                                {isAdmin && (
                                    <IconButton component={Link} to="/admin-dashboard" color="inherit" title="Admin Dashboard">
                                        <AdminPanelSettingsIcon />
                                    </IconButton>
                                )}
                                <Button color="inherit" onClick={handleLogout}>Logout</Button>
                            </>
                        ) : (
                            <>
                                <Button color="inherit" component={Link} to="/login">Login</Button>
                                <Button color="inherit" component={Link} to="/signup">Signup</Button>
                            </>
                        )}
                    </Box>
                </Toolbar>
            </Container>
        </AppBar>
    );
}

export default Navbar;