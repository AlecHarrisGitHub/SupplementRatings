import React, { useState, useEffect } from 'react';
import { 
    TextField, 
    List, 
    ListItem, 
    ListItemText,
    Typography, 
    Box, 
    Paper,
    Rating,
    Button,
    Collapse
} from '@mui/material';
import { getSupplements, getSupplement } from '../services/api';

function SearchableSupplementList() {
    const [searchTerm, setSearchTerm] = useState('');
    const [supplements, setSupplements] = useState([]);
    const [selectedSupplement, setSelectedSupplement] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchSupplements = async () => {
            try {
                const params = searchTerm ? { name: searchTerm } : {};
                const data = await getSupplements(params);
                setSupplements(data);
                setSelectedSupplement(null); // Clear selected supplement when search changes
            } catch (error) {
                console.error('Error fetching supplements:', error);
            }
        };
        fetchSupplements();
    }, [searchTerm]);

    const handleSupplementClick = async (supplementId) => {
        try {
            setLoading(true);
            const data = await getSupplement(supplementId);
            setSelectedSupplement(data);
        } catch (error) {
            console.error('Error fetching supplement details:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
            <TextField
                fullWidth
                label="Search Supplements"
                variant="outlined"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                sx={{ mb: 3 }}
            />

            {selectedSupplement ? (
                <Paper elevation={3} sx={{ mb: 3, p: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="h5">{selectedSupplement.name}</Typography>
                        <Button onClick={() => setSelectedSupplement(null)}>
                            Back to Search
                        </Button>
                    </Box>
                    <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                        Category: {selectedSupplement.category}
                    </Typography>
                    
                    {/* Ratings Section */}
                    <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>Ratings & Reviews</Typography>
                    {selectedSupplement.ratings && selectedSupplement.ratings.length > 0 ? (
                        <List>
                            {selectedSupplement.ratings.map((rating) => (
                                <ListItem key={rating.id} sx={{ display: 'block', mb: 2 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                        <Rating value={rating.score} readOnly />
                                        <Typography variant="body2" sx={{ ml: 1 }}>
                                            by {rating.user.username} for {rating.condition_name}
                                        </Typography>
                                    </Box>
                                    {rating.comment && (
                                        <Typography variant="body2" color="text.secondary">
                                            {rating.comment}
                                        </Typography>
                                    )}
                                </ListItem>
                            ))}
                        </List>
                    ) : (
                        <Typography variant="body2" color="text.secondary">
                            No ratings yet
                        </Typography>
                    )}
                </Paper>
            ) : (
                <Paper elevation={2}>
                    <List>
                        {supplements.length > 0 ? (
                            supplements.map((supplement) => (
                                <ListItem
                                    key={supplement.id}
                                    onClick={() => handleSupplementClick(supplement.id)}
                                    sx={{
                                        cursor: 'pointer',
                                        '&:hover': {
                                            backgroundColor: 'rgba(0, 0, 0, 0.04)',
                                        },
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'flex-start',
                                    }}
                                >
                                    <Box sx={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Typography variant="h6">{supplement.name}</Typography>
                                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                            <Rating 
                                                value={supplement.avg_rating || 0} 
                                                readOnly 
                                                precision={0.1}
                                            />
                                            {supplement.avg_rating ? (
                                                <Typography variant="body2" sx={{ ml: 1 }}>
                                                    ({supplement.avg_rating.toFixed(1)})
                                                </Typography>
                                            ) : (
                                                <Typography variant="body2" sx={{ ml: 1, color: 'text.secondary' }}>
                                                    (No ratings)
                                                </Typography>
                                            )}
                                        </Box>
                                    </Box>
                                    <Typography variant="body2" color="text.secondary">
                                        Category: {supplement.category}
                                    </Typography>
                                </ListItem>
                            ))
                        ) : (
                            <ListItem>
                                <ListItemText primary="No supplements found" />
                            </ListItem>
                        )}
                    </List>
                </Paper>
            )}
        </Box>
    );
}

export default SearchableSupplementList; 