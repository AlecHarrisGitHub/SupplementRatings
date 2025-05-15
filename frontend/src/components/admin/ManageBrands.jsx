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
import { getBrands } from '../../services/api'; // Fetches all brands
import DeleteBrandModal from './DeleteBrandModal';

const ManageBrands = () => {
    const [brands, setBrands] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [selectedBrand, setSelectedBrand] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const fetchBrands = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await getBrands();
            setBrands(Array.isArray(data) ? data : (data.results || [])); // Adjust based on getBrands response structure
        } catch (err) {
            const errorMessage = err.message || 'Failed to fetch brands.';
            setError(errorMessage);
            toast.error(errorMessage);
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchBrands();
    }, [fetchBrands]);

    const handleDeleteClick = (brand) => {
        setSelectedBrand(brand);
        setIsModalOpen(true);
    };

    const handleModalClose = () => {
        setIsModalOpen(false);
        setSelectedBrand(null);
    };

    const handleBrandDeleted = (deletedBrandId) => {
        fetchBrands(); // Refetch the list of brands
    };

    if (isLoading && !brands.length) {
        return <CircularProgress sx={{ display: 'block', margin: '20px auto' }} />;
    }

    // Keep displaying the list even if a refresh error occurs, but show the error
    // if (error && !brands.length) {
    //     return <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>;
    // }

    return (
        <Paper elevation={3} sx={{ p: 3, mt: 2 }}>
            <Typography variant="h6" gutterBottom component="div">
                Manage Brands
            </Typography>
            {isLoading && <CircularProgress size={20} sx={{mb:1}}/>}
            {error && !isLoading && <Alert severity="warning" sx={{ mb: 2 }}>Could not refresh brand list: {error}</Alert>}
            <List sx={{maxHeight: 300, overflow: 'auto', border: '1px solid #ddd', borderRadius: '4px'}}>
                {brands.map((brand) => (
                    <ListItem key={brand.id} divider>
                        <ListItemText 
                            primary={brand.name} 
                            secondary={`ID: ${brand.id}`}
                        />
                        <ListItemSecondaryAction>
                            <IconButton edge="end" aria-label="delete" onClick={() => handleDeleteClick(brand)}>
                                <DeleteIcon />
                            </IconButton>
                        </ListItemSecondaryAction>
                    </ListItem>
                ))}
            </List>
            {brands.length === 0 && !isLoading && (
                 <Typography sx={{textAlign: 'center', mt: 2}}>No brands found.</Typography>
            )}
            {selectedBrand && (
                <DeleteBrandModal
                    open={isModalOpen}
                    onClose={handleModalClose}
                    brand={selectedBrand}
                    onBrandDeleted={handleBrandDeleted}
                />
            )}
        </Paper>
    );
};

export default ManageBrands; 