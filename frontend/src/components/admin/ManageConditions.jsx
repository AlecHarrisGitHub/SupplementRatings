import React, { useState, useEffect, useCallback } from 'react';
import {
    Typography,
    List,
    ListItem,
    ListItemText,
    ListItemSecondaryAction,
    IconButton,
    CircularProgress,
    Alert,
    Paper
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { toast } from 'react-toastify';
import { getConditions } from '../../services/api'; // This is the existing search/list function
import DeleteConditionModal from './DeleteConditionModal';

const ManageConditions = () => {
    const [conditions, setConditions] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [selectedCondition, setSelectedCondition] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // fetchConditions can be adapted if getConditions needs specific params for listing all for admin
    const fetchConditions = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            // If getConditions is a search, call it without search term for all, or adapt.
            // If your getConditions from api.js is primarily for search with typeahead,
            // you might need to ensure it can also fetch all conditions for this admin list.
            // Or use the new getAllConditions if that's more suitable for a full list.
            const data = await getConditions(); // Or getAllConditions()
            setConditions(Array.isArray(data) ? data : (data.results || []));
        } catch (err) {
            const errorMessage = err.message || 'Failed to fetch conditions/purposes.';
            setError(errorMessage);
            toast.error(errorMessage);
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchConditions();
    }, [fetchConditions]);

    const handleDeleteClick = (condition) => {
        setSelectedCondition(condition);
        setIsModalOpen(true);
    };

    const handleModalClose = () => {
        setIsModalOpen(false);
        setSelectedCondition(null);
    };

    const handleConditionDeleted = (deletedConditionId) => {
        fetchConditions(); // Refetch the list
    };

    if (isLoading && !conditions.length) {
        return <CircularProgress sx={{ display: 'block', margin: '20px auto' }} />;
    }

    return (
        <Paper elevation={3} sx={{ p: 3, mt: 2 }}>
            <Typography variant="h6" gutterBottom component="div">
                Manage Purposes (Conditions)
            </Typography>
            {isLoading && <CircularProgress size={20} sx={{mb:1}}/>}
            {error && !isLoading && <Alert severity="warning" sx={{ mb: 2 }}>Could not refresh purpose list: {error}</Alert>}
            <List sx={{maxHeight: 300, overflow: 'auto', border: '1px solid #ddd', borderRadius: '4px'}}>
                {conditions.map((condition) => (
                    <ListItem key={condition.id} divider>
                        <ListItemText 
                            primary={condition.name} 
                            secondary={`ID: ${condition.id}`}
                        />
                        <ListItemSecondaryAction>
                            <IconButton edge="end" aria-label="delete" onClick={() => handleDeleteClick(condition)}>
                                <DeleteIcon />
                            </IconButton>
                        </ListItemSecondaryAction>
                    </ListItem>
                ))}
            </List>
            {conditions.length === 0 && !isLoading && (
                 <Typography sx={{textAlign: 'center', mt: 2}}>No purposes found.</Typography>
            )}
            {selectedCondition && (
                <DeleteConditionModal
                    open={isModalOpen}
                    onClose={handleModalClose}
                    condition={selectedCondition}
                    onConditionDeleted={handleConditionDeleted}
                />
            )}
        </Paper>
    );
};

export default ManageConditions; 