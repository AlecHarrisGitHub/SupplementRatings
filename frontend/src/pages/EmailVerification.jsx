import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { verifyEmail } from '../services/api';
import { Container, Paper, Typography, CircularProgress } from '@mui/material';
import { toast } from 'react-toastify';

function EmailVerification() {
    const [verifying, setVerifying] = useState(true);
    const { token } = useParams();
    const navigate = useNavigate();

    useEffect(() => {
        const verify = async () => {
            try {
                await verifyEmail(token);
                toast.success('Email verified successfully! You can now login.');
                setTimeout(() => navigate('/login'), 2000);
            } catch (error) {
                toast.error(error.response?.data?.error || 'Verification failed');
            } finally {
                setVerifying(false);
            }
        };

        verify();
    }, [token, navigate]);

    return (
        <Container maxWidth="sm">
            <Paper elevation={3} sx={{ p: 4, mt: 8, textAlign: 'center' }}>
                {verifying ? (
                    <>
                        <CircularProgress sx={{ mb: 2 }} />
                        <Typography>Verifying your email...</Typography>
                    </>
                ) : (
                    <Typography>
                        Redirecting to login page...
                    </Typography>
                )}
            </Paper>
        </Container>
    );
}

export default EmailVerification; 