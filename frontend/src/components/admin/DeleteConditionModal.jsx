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
    Radio,
    Box
} from '@mui/material';
import { toast } from 'react-toastify';
import { getAllConditions, deleteCondition } from '../../services/api';

const DeleteConditionModal = ({ open, onClose, condition, onConditionDeleted }) => {
    const [deleteAction, setDeleteAction] = useState('delete_ratings'); // 'delete_ratings' or 'transfer_ratings'
    const [allConditions, setAllConditions] = useState([]);
    const [targetCondition, setTargetCondition] = useState(null);
    const [loadingConditions, setLoadingConditions] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        if (open && deleteAction === 'transfer_ratings') {
            setLoadingConditions(true);
            getAllConditions()
                .then(data => {
                    const conditionsArray = Array.isArray(data) ? data : (data.results || []);
                    setAllConditions(conditionsArray.filter(c => c.id !== condition?.id));
                })
                .catch(error => {
                    toast.error("Failed to load conditions for transfer.");
                    console.error("Failed to load conditions:", error);
                })
                .finally(() => setLoadingConditions(false));
        }
        if (!open) {
            setDeleteAction('delete_ratings');
            setTargetCondition(null);
        }
    }, [open, deleteAction, condition?.id]);

    const handleDelete = async () => {
        if (!condition) return;

        if (deleteAction === 'transfer_ratings' && !targetCondition) {
            toast.error("Please select a target condition/purpose to transfer ratings to.");
            return;
        }

        setIsDeleting(true);
        const options = {};
        if (deleteAction === 'transfer_ratings' && targetCondition) {
            options.transfer_ratings_to_condition_id = targetCondition.id;
        } else {
            // Backend default is to delete ratings if no transfer ID, matching our 'delete_ratings' state
        }

        try {
            const response = await deleteCondition(condition.id, options);
            toast.success(response.message || 'Condition/Purpose deleted successfully!');
            onConditionDeleted(condition.id);
            onClose();
        } catch (error) {
            toast.error(error.error || 'Failed to delete condition/purpose.');
            console.error("Delete condition error:", error);
        } finally {
            setIsDeleting(false);
        }
    };

    if (!condition) return null;

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>Delete Purpose: {condition.name}</DialogTitle>
            <DialogContent>
                <DialogContentText sx={{ mb: 1 }}>
                    Are you sure you want to delete this purpose? This action cannot be undone.
                </DialogContentText>
                
                <RadioGroup
                    aria-label="condition-delete-action"
                    name="condition-delete-action-radio-group"
                    value={deleteAction}
                    onChange={(e) => setDeleteAction(e.target.value)}
                    sx={{mb: 2}}
                >
                    <FormControlLabel 
                        value="delete_ratings" 
                        control={<Radio />} 
                        label="Delete all associated ratings (DEFAULT)" 
                    />
                    <DialogContentText sx={{ fontSize: '0.8rem', color: 'text.secondary', pl: 4, mb:1 }}>
                        Warning: This will permanently remove all ratings linked to this purpose.
                    </DialogContentText>
                    <FormControlLabel 
                        value="transfer_ratings" 
                        control={<Radio />} 
                        label="Transfer associated ratings to another purpose" 
                    />
                </RadioGroup>

                {deleteAction === 'transfer_ratings' && (
                    loadingConditions ? (
                        <CircularProgress size={24} sx={{ ml: 2, mt: 1 }} />
                    ) : (
                        <Autocomplete
                            options={allConditions}
                            getOptionLabel={(option) => option.name || ''}
                            value={targetCondition}
                            onChange={(event, newValue) => {
                                setTargetCondition(newValue);
                            }}
                            isOptionEqualToValue={(option, value) => option.id === value.id}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="Select Target Purpose"
                                    variant="outlined"
                                    margin="dense" // Changed to dense for better fit
                                    fullWidth
                                />
                            )}
                            sx={{ mt: 0 }}
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

export default DeleteConditionModal; 