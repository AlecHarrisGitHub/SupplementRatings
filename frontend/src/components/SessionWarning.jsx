import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Box,
    LinearProgress
} from '@mui/material';
import { Warning as WarningIcon } from '@mui/icons-material';

const SessionWarning = ({ open, onExtend, onLogout, timeRemaining }) => {
    const [countdown, setCountdown] = useState(timeRemaining);

    useEffect(() => {
        if (!open) return;

        const interval = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(interval);
                    onLogout();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [open, onLogout]);

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const progress = ((timeRemaining - countdown) / timeRemaining) * 100;

    return (
        <Dialog 
            open={open} 
            maxWidth="sm" 
            fullWidth
            disableEscapeKeyDown
            disableBackdropClick
        >
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <WarningIcon color="warning" />
                Session Expiring Soon
            </DialogTitle>
            <DialogContent>
                <Typography variant="body1" sx={{ mb: 2 }}>
                    Your session will expire in <strong>{formatTime(countdown)}</strong>. 
                    Please save your work and refresh the page if needed.
                </Typography>
                <Box sx={{ width: '100%', mb: 2 }}>
                    <LinearProgress 
                        variant="determinate" 
                        value={progress} 
                        color="warning"
                        sx={{ height: 8, borderRadius: 4 }}
                    />
                </Box>
                <Typography variant="body2" color="text.secondary">
                    If you're currently writing a review, your work will be automatically saved.
                </Typography>
            </DialogContent>
            <DialogActions>
                <Button onClick={onLogout} color="error">
                    Logout Now
                </Button>
                <Button onClick={onExtend} variant="contained" color="primary">
                    Extend Session
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default SessionWarning; 