import React, { useContext } from 'react';
import { Container, Typography, Paper, Box, Grid, Alert } from '@mui/material';
import { useAuth } from '../context/AuthContext'; // Assuming you have an AuthContext that provides user info including isAdmin/is_staff
import ManageSupplements from '../components/admin/ManageSupplements';
import ManageBrands from '../components/admin/ManageBrands';
import ManageConditions from '../components/admin/ManageConditions';
import ManageRatings from '../components/admin/ManageRatings';
import ManageComments from '../components/admin/ManageComments';
// Import other admin components here as they are created
// import ManageConditions from '../components/admin/ManageConditions';
// import ManageRatings from '../components/admin/ManageRatings';
// import ManageComments from '../components/admin/ManageComments';

const AdminDashboard = () => {
    const { user, isAdmin } = useAuth(); // Adjust based on your AuthContext structure

    // If isAdmin is not directly available, you might check user.is_staff
    // const effectiveIsAdmin = isAdmin || (user && user.is_staff);

    if (!isAdmin) { // Or !effectiveIsAdmin
        return (
            <Container sx={{ py: 4 }}>
                <Alert severity="error">Access Denied. You must be an administrator to view this page.</Alert>
            </Container>
        );
    }

    return (
        <Container sx={{ py: 4 }}>
            <Typography variant="h4" gutterBottom component="h1" sx={{ mb: 3 }}>
                Admin Dashboard
            </Typography>
            
            <Grid container spacing={3}>
                <Grid item xs={12} md={6} lg={4}>
                    <ManageSupplements />
                </Grid>
                <Grid item xs={12} md={6} lg={4}>
                    <ManageBrands />
                </Grid>
                <Grid item xs={12} md={6} lg={4}>
                    <ManageConditions />
                </Grid>
                <Grid item xs={12} md={6}>
                    <ManageRatings />
                </Grid>
                <Grid item xs={12} md={6}>
                    <ManageComments />
                </Grid>
                {/* Future sections for other management components */}
                {/* 
                <Grid item xs={12} md={6}>
                     <Paper elevation={3} sx={{p:2}}> <Typography variant="h6">Manage Purposes</Typography> </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                     <Paper elevation={3} sx={{p:2}}> <Typography variant="h6">Manage Ratings</Typography> </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                     <Paper elevation={3} sx={{p:2}}> <Typography variant="h6">Manage Comments</Typography> </Paper>
                </Grid>
                */}
            </Grid>
        </Container>
    );
};

export default AdminDashboard; 