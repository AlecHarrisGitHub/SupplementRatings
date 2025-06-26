import React, { useState, useEffect } from 'react';
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    TextField,
    FormControlLabel,
    Checkbox,
    CircularProgress,
    Autocomplete // For selecting target supplement
} from '@mui/material';
import { toast } from 'react-toastify';
import { getAllSupplements, deleteSupplement } from '../../services/api'; // Assuming getAllSupplements exists or will be created

const DeleteSupplementModal = ({ open, onClose, supplement, onSupplementDeleted }) => {
    const [transferRatings, setTransferRatings] = useState(false);
    const [allSupplements, setAllSupplements] = useState([]);
    const [targetSupplement, setTargetSupplement] = useState(null);
    const [loadingSupplements, setLoadingSupplements] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchSupplements = async () => {
            try {
                const data = await getAllSupplements();
                setAllSupplements(data);
            } catch (error) {
                
            }
        };

        if (open && transferRatings) {
            setLoadingSupplements(true);
            // Fetch all supplements to populate the dropdown for transferring ratings
            // Ensure getAllSupplements is implemented in api.js to fetch all supplements (not paginated for this purpose)
            fetchSupplements();
        }
        if (!open) {
            // Reset state when modal is closed
            setTransferRatings(false);
            setTargetSupplement(null);
        }
    }, [open, transferRatings]);

    const handleDelete = async () => {
        if (!supplement) return;

        if (transferRatings && !targetSupplement) {
            toast.error("Please select a target supplement to transfer ratings to.");
            return;
        }

        setIsDeleting(true);
        try {
            const transferToId = transferRatings && targetSupplement ? targetSupplement.id : null;
            await deleteSupplement(supplement.id, transferToId);
            toast.success(response.message || 'Supplement deleted successfully!');
            onSupplementDeleted(supplement.id); // Callback to update parent list
            onClose(); // Close modal
        } catch (error) {
            toast.error(error.message || 'Failed to delete supplement.');
            setError(error.message || "An error occurred during deletion.");
        } finally {
            setIsDeleting(false);
        }
    };

    if (!supplement) return null;

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>Delete Supplement: {supplement.name}</DialogTitle>
            <DialogContent>
                <DialogContentText sx={{ mb: 2 }}>
                    Are you sure you want to delete this supplement? This action cannot be undone.
                </DialogContentText>
                <FormControlLabel
                    control={
                        <Checkbox
                            checked={transferRatings}
                            onChange={(e) => setTransferRatings(e.target.checked)}
                            color="primary"
                        />
                    }
                    label="Transfer ratings to another supplement?"
                />
                {transferRatings && (
                    loadingSupplements ? (
                        <CircularProgress size={24} sx={{ ml: 2 }} />
                    ) : (
                        <Autocomplete
                            options={allSupplements}
                            getOptionLabel={(option) => option.name || ''}
                            value={targetSupplement}
                            onChange={(event, newValue) => {
                                setTargetSupplement(newValue);
                            }}
                            isOptionEqualToValue={(option, value) => option.id === value.id}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="Select Target Supplement"
                                    variant="outlined"
                                    margin="normal"
                                    fullWidth
                                />
                            )}
                            sx={{ mt: 1 }}
                        />
                    )
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} color="secondary" disabled={isDeleting}>
                    Cancel
                </Button>
                <Button onClick={handleDelete} color="error" variant="contained" disabled={isDeleting}>
                    {isDeleting ? <CircularProgress size={24} color="inherit" /> : 'Delete Supplement'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default DeleteSupplementModal; 