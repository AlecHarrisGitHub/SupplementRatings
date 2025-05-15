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
    Pagination // For paginating supplements if there are many
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { toast } from 'react-toastify';
import { getSupplements } from '../../services/api'; // Assuming this is your existing function for fetching supplements
import DeleteSupplementModal from './DeleteSupplementModal';

const ManageSupplements = () => {
    const [supplements, setSupplements] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [selectedSupplement, setSelectedSupplement] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Pagination state
    const [page, setPage] = useState(1);
    const [count, setCount] = useState(0);
    const itemsPerPage = 10; // Or your preferred number

    const fetchSupplements = useCallback(async (currentPage) => {
        setIsLoading(true);
        setError(null);
        try {
            // Assuming getSupplements can take page and limit/offset
            // Adjust if your getSupplements signature is different
            const offset = (currentPage - 1) * itemsPerPage;
            const data = await getSupplements({ limit: itemsPerPage, offset: offset, sort_by: 'name' });
            
            if (data && data.results) {
                setSupplements(data.results);
                setCount(data.count || 0); // Assuming your API returns a total count for pagination
            } else if (Array.isArray(data)) { // Fallback if structure is just an array
                setSupplements(data); 
                setCount(data.length); // This might not be total count if API paginates
            } else {
                setSupplements([]);
                setCount(0);
            }
        } catch (err) {
            const errorMessage = err.message || 'Failed to fetch supplements.';
            setError(errorMessage);
            toast.error(errorMessage);
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, [itemsPerPage]);

    useEffect(() => {
        fetchSupplements(page);
    }, [page, fetchSupplements]);

    const handleDeleteClick = (supplement) => {
        setSelectedSupplement(supplement);
        setIsModalOpen(true);
    };

    const handleModalClose = () => {
        setIsModalOpen(false);
        setSelectedSupplement(null);
    };

    const handleSupplementDeleted = (deletedSupplementId) => {
        // Refetch or filter out locally - refetching is simpler for now to ensure data consistency
        fetchSupplements(page);
    };

    const handlePageChange = (event, value) => {
        setPage(value);
    };

    if (isLoading && !supplements.length) {
        return <CircularProgress sx={{ display: 'block', margin: '20px auto' }} />;
    }

    if (error && !supplements.length) {
        return <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>;
    }

    return (
        <Paper elevation={3} sx={{ p: 3, mt: 2 }}>
            <Typography variant="h5" gutterBottom component="div">
                Manage Supplements
            </Typography>
            {isLoading && <CircularProgress size={20} sx={{mb:1}}/>}
            {error && !isLoading && <Alert severity="warning" sx={{ mb: 2 }}>Could not refresh list: {error}</Alert>}
            <List>
                {supplements.map((supplement) => (
                    <ListItem key={supplement.id} divider>
                        <ListItemText 
                            primary={supplement.name} 
                            secondary={`ID: ${supplement.id} | Category: ${supplement.category}`}
                        />
                        <ListItemSecondaryAction>
                            <IconButton edge="end" aria-label="delete" onClick={() => handleDeleteClick(supplement)}>
                                <DeleteIcon />
                            </IconButton>
                        </ListItemSecondaryAction>
                    </ListItem>
                ))}
            </List>
            {supplements.length === 0 && !isLoading && (
                <Typography sx={{textAlign: 'center', mt: 2}}>No supplements found.</Typography>
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
            {selectedSupplement && (
                <DeleteSupplementModal
                    open={isModalOpen}
                    onClose={handleModalClose}
                    supplement={selectedSupplement}
                    onSupplementDeleted={handleSupplementDeleted}
                />
            )}
        </Paper>
    );
};

export default ManageSupplements; 