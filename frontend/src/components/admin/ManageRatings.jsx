import React, { useState, useEffect, useCallback } from 'react';
import {
    Box,
    Typography,
    List,
    ListItem,
    ListItemText,
    ListItemSecondaryAction,
    IconButton,
    CircularProgress,
    Alert,
    Paper,
    Pagination,
    TextField, // For searching ratings
    InputAdornment
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import { toast } from 'react-toastify';
// Import the new function for fetching all ratings and the existing delete function
import { searchAllRatings, deleteRatingByAdmin } from '../../services/api'; 
import DeleteConfirmationModal from './DeleteConfirmationModal';

const ManageRatings = () => {
    const [ratings, setRatings] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [selectedRating, setSelectedRating] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Search and Pagination state
    const [page, setPage] = useState(1);
    const [count, setCount] = useState(0);
    const [searchTerm, setSearchTerm] = useState(''); // e.g., search by supplement name or user
    const itemsPerPage = 10;

    // Your existing getRatings(supplementId) is for a specific supplement.
    // We need a way to get ratings across all supplements for admin management.
    // This might require backend changes if /api/ratings/ doesn't support general listing + search.
    // Let's assume for now the backend /api/ratings/ can list all ratings and supports a search param.
    const fetchRatings = useCallback(async (currentPage, currentSearchTerm) => {
        setIsLoading(true);
        setError(null);
        try {
            const offset = (currentPage - 1) * itemsPerPage;
            const params = { limit: itemsPerPage, offset };
            if (currentSearchTerm) {
                params.search = currentSearchTerm; 
            }
            // Use the new searchAllRatings function
            const data = await searchAllRatings(params); 
            
            if (data && (Array.isArray(data) || data.results)) {
                setRatings(data.results || data);
                setCount(data.count || (data.results || data).length);
            } else {
                setRatings([]);
                setCount(0);
            }
        } catch (err) {
            const errorMessage = err.message || 'Failed to fetch ratings.';
            setError(errorMessage);
            // toast.error(errorMessage); // Avoid toast for initial load error, Alert is enough
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, [itemsPerPage]);

    useEffect(() => {
        fetchRatings(page, searchTerm);
    }, [page, searchTerm, fetchRatings]);

    const handleDeleteClick = (rating) => {
        setSelectedRating(rating);
        setIsModalOpen(true);
    };

    const handleModalClose = () => {
        setIsModalOpen(false);
        setSelectedRating(null);
    };

    const confirmDeleteRating = async () => {
        if (!selectedRating) return;
        setIsDeleting(true);
        try {
            await deleteRatingByAdmin(selectedRating.id);
            toast.success(`Rating ID ${selectedRating.id} deleted successfully.`);
            fetchRatings(page, searchTerm); // Refresh list
            handleModalClose();
        } catch (err) {
            toast.error(err.error || 'Failed to delete rating.');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleSearchChange = (event) => {
        setSearchTerm(event.target.value);
        setPage(1); // Reset to first page on new search
    };
    
    const handlePageChange = (event, value) => {
        setPage(value);
    };

    return (
        <Paper elevation={3} sx={{ p: 3, mt: 2 }}>
            <Typography variant="h6" gutterBottom component="div">
                Manage Ratings
            </Typography>
            <TextField
                label="Search Ratings (e.g., by user, supplement, comment text)"
                variant="outlined"
                fullWidth
                margin="normal"
                value={searchTerm}
                onChange={handleSearchChange}
                InputProps={{
                    startAdornment: (
                        <InputAdornment position="start">
                            <SearchIcon />
                        </InputAdornment>
                    ),
                }}
            />
            {isLoading && <CircularProgress size={20} sx={{mb:1}}/>}
            {error && !isLoading && <Alert severity="warning" sx={{ mb: 2 }}>Could not load ratings: {error}</Alert>}
            <List sx={{maxHeight: 400, overflow: 'auto', border: '1px solid #ddd', borderRadius: '4px'}}>
                {ratings.map((rating) => (
                    <ListItem key={rating.id} divider>
                        <ListItemText 
                            primary={`Rating for: ${rating.supplement_name || rating.supplement} (Score: ${rating.score})`}
                            secondary={`User: ${rating.user?.username || rating.user} | ID: ${rating.id} | Comment: ${rating.comment?.substring(0,50)}...`}
                        />
                        <ListItemSecondaryAction>
                            <IconButton edge="end" aria-label="delete" onClick={() => handleDeleteClick(rating)}>
                                <DeleteIcon />
                            </IconButton>
                        </ListItemSecondaryAction>
                    </ListItem>
                ))}
            </List>
            {ratings.length === 0 && !isLoading && (
                 <Typography sx={{textAlign: 'center', mt: 2}}>No ratings found for the current search/filter.</Typography>
            )}
             {count > itemsPerPage && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                    <Pagination 
                        count={Math.ceil(count / itemsPerPage)} 
                        page={page} 
                        onChange={handlePageChange} 
                        color="primary" 
                    />
                </Box>
            )}
            {selectedRating && (
                <DeleteConfirmationModal
                    open={isModalOpen}
                    onClose={handleModalClose}
                    onConfirm={confirmDeleteRating}
                    title="Delete Rating"
                    message={`Are you sure you want to delete this rating (ID: ${selectedRating.id})? User: ${selectedRating.user?.username || selectedRating.user}, Supplement: ${selectedRating.supplement_name || selectedRating.supplement}`}
                    isDeleting={isDeleting}
                />
            )}
        </Paper>
    );
};

export default ManageRatings; 