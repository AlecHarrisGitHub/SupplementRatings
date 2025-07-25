import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AppBar, Toolbar, Typography, Button, Box, Container, IconButton, Avatar, Menu, MenuItem } from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';

const defaultProfileImage = 'http://localhost:8000/media/profile_pics/default.jpg';

function Navbar() {
    const { isAuthenticated, isAdmin, user, logout } = useAuth();
    // console.log('Navbar Auth State:', { isAuthenticated, isAdmin });
    const navigate = useNavigate();
    const [anchorEl, setAnchorEl] = useState(null);
    const openUserMenu = Boolean(anchorEl);
    
    const handleUserMenuOpen = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleUserMenuClose = () => {
        setAnchorEl(null);
    };

    const handleLogout = () => {
        logout();
        toast.success('Logged out successfully!');
        handleUserMenuClose();
        navigate('/login');
    };

    const handleMyAccount = () => {
        navigate('/accounts');
        handleUserMenuClose();
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
                        {isAdmin && (
                            <>
                                <Button color="inherit" component={Link} to="/upload-supplements">Upload Supplements</Button>
                                <Button color="inherit" component={Link} to="/upload-conditions">Upload Purposes</Button>
                                <Button color="inherit" component={Link} to="/upload-brands">Upload Brands</Button>
                            </>
                        )}
                    </Box>

                    <Box sx={{ flexGrow: 0, display: 'flex', alignItems: 'center' }}>
                        {isAuthenticated && user ? (
                            <>
                                {isAdmin && (
                                    <IconButton component={Link} to="/admin-dashboard" color="inherit" title="Admin Dashboard" sx={{mr:1}}>
                                        <AdminPanelSettingsIcon />
                                    </IconButton>
                                )}
                                <IconButton
                                    onClick={handleUserMenuOpen}
                                    sx={{ p: 0.5, ml: 1, borderRadius: '8px' }}
                                    aria-controls={openUserMenu ? 'user-menu-appbar' : undefined}
                                    aria-haspopup="true"
                                    aria-expanded={openUserMenu ? 'true' : undefined}
                                >
                                    <Avatar 
                                        src={user.profile_image_url || defaultProfileImage} 
                                        alt={user.username} 
                                        sx={{ width: 32, height: 32 }}
                                    >
                                        {!user.profile_image_url && <AccountCircleIcon />}
                                    </Avatar>
                                    <Typography variant="subtitle1" component="span" sx={{ ml: 1, mr: 0.5, color: 'white' }}>
                                        {user.username}
                                    </Typography>
                                </IconButton>
                                <Menu
                                    id="user-menu-appbar"
                                    anchorEl={anchorEl}
                                    anchorOrigin={{
                                        vertical: 'bottom',
                                        horizontal: 'right',
                                    }}
                                    keepMounted
                                    transformOrigin={{
                                        vertical: 'top',
                                        horizontal: 'right',
                                    }}
                                    open={openUserMenu}
                                    onClose={handleUserMenuClose}
                                >
                                    <MenuItem onClick={handleMyAccount}>My Account</MenuItem>
                                    <MenuItem onClick={handleLogout}>Logout</MenuItem>
                                </Menu>
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