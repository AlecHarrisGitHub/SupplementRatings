import React from 'react';
import { Link } from 'react-router-dom';
import { AppBar, Toolbar, Typography, Button, Box } from '@mui/material';
import { useAuth } from '../context/AuthContext';

function Navbar() {
    const { isAuthenticated, isAdmin } = useAuth();
    
    console.log('Navbar Auth State:', { isAuthenticated, isAdmin });
    
    return (
        <AppBar position="static">
            <Toolbar>
                <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                    <Button color="inherit" component={Link} to="/supplements">
                        Supplements
                    </Button>
                </Typography>

                <Box sx={{ display: 'flex', gap: 2 }}>
                    {isAuthenticated ? (
                        <>
                            {isAdmin && (
                                <>
                                    <Button 
                                        color="inherit" 
                                        component={Link} 
                                        to="/upload-supplements"
                                    >
                                        Upload Supplements
                                    </Button>
                                    <Button 
                                        color="inherit" 
                                        component={Link} 
                                        to="/upload-conditions"
                                    >
                                        Upload Conditions
                                    </Button>
                                </>
                            )}
                            <Button 
                                color="inherit" 
                                component={Link} 
                                to="/logout"
                            >
                                Logout
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button 
                                color="inherit" 
                                component={Link} 
                                to="/login"
                            >
                                Login
                            </Button>
                            <Button 
                                color="inherit" 
                                component={Link} 
                                to="/signup"
                            >
                                Signup
                            </Button>
                        </>
                    )}
                </Box>
            </Toolbar>
        </AppBar>
    );
}

export default Navbar;