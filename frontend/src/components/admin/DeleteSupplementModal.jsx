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

    useEffect(() => {
        if (open && transferRatings) {
            setLoadingSupplements(true);
            // Fetch all supplements to populate the dropdown for transferring ratings
            // Ensure getAllSupplements is implemented in api.js to fetch all supplements (not paginated for this purpose)
            getAllSupplements() // No need to pass params if api.js handles it, or pass {} if needed
                .then(data => {
                    // getAllSupplements now returns an array (results) directly
                    const filteredSupplements = Array.isArray(data) ? data.filter(s => s.id !== supplement?.id) : [];
                    setAllSupplements(filteredSupplements);
                })
                .catch(error => {
                    toast.error("Failed to load supplements for transfer.");
                    console.error("Failed to load supplements:", error);
                })
                .finally(() => setLoadingSupplements(false));
        }
        if (!open) {
            // Reset state when modal is closed
            setTransferRatings(false);
            setTargetSupplement(null);
        }
    }, [open, transferRatings, supplement?.id]);

    const handleDelete = async () => {
        if (!supplement) return;

        if (transferRatings && !targetSupplement) {
            toast.error("Please select a target supplement to transfer ratings to.");
            return;
        }

        setIsDeleting(true);
        try {
            const transferToId = transferRatings && targetSupplement ? targetSupplement.id : null;
            const response = await deleteSupplement(supplement.id, transferToId);
            toast.success(response.message || 'Supplement deleted successfully!');
            onSupplementDeleted(supplement.id); // Callback to update parent list
            onClose(); // Close modal
        } catch (error) {
            toast.error(error.error || 'Failed to delete supplement.');
            console.error("Delete error:", error);
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