import React from 'react';
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    CircularProgress
} from '@mui/material';

const DeleteConfirmationModal = ({ open, onClose, onConfirm, title, message, isDeleting = false }) => {
    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
            <DialogTitle>{title || 'Confirm Deletion'}</DialogTitle>
            <DialogContent>
                <DialogContentText>
                    {message || 'Are you sure you want to delete this item? This action cannot be undone.'}
                </DialogContentText>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} color="secondary" disabled={isDeleting}>
                    Cancel
                </Button>
                <Button onClick={onConfirm} color="error" variant="contained" disabled={isDeleting}>
                    {isDeleting ? <CircularProgress size={24} color="inherit" /> : 'Delete'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default DeleteConfirmationModal; 