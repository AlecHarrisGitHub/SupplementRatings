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
    Autocomplete,
    RadioGroup,
    Radio
} from '@mui/material';
import { toast } from 'react-toastify';
import { getBrands, deleteBrand } from '../../services/api'; // getBrands fetches all brands for the dropdown

const DeleteBrandModal = ({ open, onClose, brand, onBrandDeleted }) => {
    const [deleteAction, setDeleteAction] = useState('remove_from_ratings'); // 'remove_from_ratings' or 'replace_with_another'
    const [allBrands, setAllBrands] = useState([]);
    const [targetBrand, setTargetBrand] = useState(null);
    const [loadingBrands, setLoadingBrands] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        if (open && deleteAction === 'replace_with_another') {
            setLoadingBrands(true);
            getBrands() // Assuming getBrands fetches all brands needed for selection
                .then(data => {
                    // Filter out the brand being deleted from the list of choices
                    const brandsArray = Array.isArray(data) ? data : (data.results || []);
                    setAllBrands(brandsArray.filter(b => b.id !== brand?.id));
                })
                .catch(error => {
                    toast.error("Failed to load brands for replacement.");
                    console.error("Failed to load brands:", error);
                })
                .finally(() => setLoadingBrands(false));
        }
        if (!open) {
            // Reset state when modal is closed
            setDeleteAction('remove_from_ratings');
            setTargetBrand(null);
        }
    }, [open, deleteAction, brand?.id]);

    const handleDelete = async () => {
        if (!brand) return;

        if (deleteAction === 'replace_with_another' && !targetBrand) {
            toast.error("Please select a target brand to replace with.");
            return;
        }

        setIsDeleting(true);
        const options = {};
        if (deleteAction === 'replace_with_another' && targetBrand) {
            options.replace_ratings_brand_with_id = targetBrand.id;
        } else {
            // This implies the default backend behavior (remove from ratings strings)
            // We can explicitly send a flag if the backend were to require it:
            // options.remove_from_ratings = true; 
        }

        try {
            const response = await deleteBrand(brand.id, options);
            toast.success(response.message || 'Brand deleted successfully and ratings updated!');
            onBrandDeleted(brand.id); // Callback to update parent list
            onClose(); // Close modal
        } catch (error) {
            toast.error(error.error || 'Failed to delete brand.');
            console.error("Delete brand error:", error);
        } finally {
            setIsDeleting(false);
        }
    };

    if (!brand) return null;

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>Delete Brand: {brand.name}</DialogTitle>
            <DialogContent>
                <DialogContentText sx={{ mb: 2 }}>
                    Are you sure you want to delete this brand? This action cannot be undone.
                    By default, the brand's name will be removed from any ratings that list it.
                </DialogContentText>
                
                <RadioGroup
                    aria-label="delete-action"
                    name="delete-action-radio-buttons-group"
                    value={deleteAction}
                    onChange={(e) => setDeleteAction(e.target.value)}
                >
                    <FormControlLabel value="remove_from_ratings" control={<Radio />} label="Remove brand name from associated ratings (default)" />
                    <FormControlLabel value="replace_with_another" control={<Radio />} label="Replace with another brand in associated ratings" />
                </RadioGroup>

                {deleteAction === 'replace_with_another' && (
                    loadingBrands ? (
                        <CircularProgress size={24} sx={{ ml: 2, mt: 1 }} />
                    ) : (
                        <Autocomplete
                            options={allBrands}
                            getOptionLabel={(option) => option.name || ''}
                            value={targetBrand}
                            onChange={(event, newValue) => {
                                setTargetBrand(newValue);
                            }}
                            isOptionEqualToValue={(option, value) => option.id === value.id}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="Select Target Brand"
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
                    {isDeleting ? <CircularProgress size={24} color="inherit" /> : 'Confirm Delete'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default DeleteBrandModal; 