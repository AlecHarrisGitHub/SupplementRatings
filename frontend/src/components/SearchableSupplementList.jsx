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
    Collapse,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Autocomplete
} from '@mui/material';
import { getSupplements, getSupplement, getConditions, addRating } from '../services/api';
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import AddIcon from '@mui/icons-material/Add';

function SearchableSupplementList() {
    const [searchTerm, setSearchTerm] = useState('');
    const [supplements, setSupplements] = useState([]);
    const [selectedSupplement, setSelectedSupplement] = useState(null);
    const [loading, setLoading] = useState(false);
    const [currentSearch, setCurrentSearch] = useState('');
    const [ratingDialogOpen, setRatingDialogOpen] = useState(false);
    const [ratingScore, setRatingScore] = useState(1);
    const [ratingComment, setRatingComment] = useState('');
    const [conditions, setConditions] = useState([]);
    const [selectedCondition, setSelectedCondition] = useState(null);
    const [searchCondition, setSearchCondition] = useState('');
    const { isAuthenticated } = useContext(AuthContext);

    useEffect(() => {
        const fetchSupplements = async () => {
            try {
                const params = currentSearch ? { name: currentSearch } : {};
                const data = await getSupplements(params);
                setSupplements(data);
                setSelectedSupplement(null); // Clear selected supplement when search changes
            } catch (error) {
                console.error('Error fetching supplements:', error);
            }
        };
        fetchSupplements();
    }, [currentSearch]);

    useEffect(() => {
        const fetchConditions = async () => {
            try {
                const response = await getConditions(searchCondition);
                setConditions(response.data);
            } catch (error) {
                console.error('Error fetching conditions:', error);
            }
        };

        if (searchCondition) {
            fetchConditions();
        }
    }, [searchCondition]);

    const handleKeyDown = (event) => {
        if (event.key === 'Enter') {
            setCurrentSearch(searchTerm);
        }
    };

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

    const handleRatingSubmit = async () => {
        if (!selectedCondition) {
            toast.error('Please select a condition');
            return;
        }

        if (!ratingScore) {
            toast.error('Please select a rating score');
            return;
        }

        try {
            const response = await addRating({
                supplement: selectedSupplement.id,
                condition: selectedCondition.id,
                score: ratingScore,
                comment: ratingComment || null,
            });
            
            // Update the selected supplement's ratings
            setSelectedSupplement(prev => ({
                ...prev,
                ratings: [response.data, ...(prev.ratings || [])]
            }));

            // Reset form
            setRatingScore(1);
            setRatingComment('');
            setSelectedCondition(null);
            setRatingDialogOpen(false);
            toast.success('Rating added successfully!');
        } catch (error) {
            console.error('Error details:', error.response?.data || error);
            toast.error(error.response?.data?.detail || 'Failed to add rating.');
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
                onKeyDown={handleKeyDown}
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
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 3, mb: 2 }}>
                        <Typography variant="h6">Ratings & Reviews</Typography>
                        {isAuthenticated && (
                            <Button 
                                variant="contained" 
                                onClick={() => setRatingDialogOpen(true)}
                                startIcon={<AddIcon />}
                            >
                                Add Rating
                            </Button>
                        )}
                    </Box>

                    <Dialog open={ratingDialogOpen} onClose={() => setRatingDialogOpen(false)} maxWidth="sm" fullWidth>
                        <DialogTitle>Add Your Rating</DialogTitle>
                        <DialogContent>
                            <Box component="form" onSubmit={handleRatingSubmit} sx={{ mt: 2 }}>
                                <Autocomplete
                                    options={conditions}
                                    getOptionLabel={(option) => option.name}
                                    value={selectedCondition}
                                    onChange={(_, newValue) => setSelectedCondition(newValue)}
                                    onInputChange={(_, newInputValue) => setSearchCondition(newInputValue)}
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            label="Condition *"
                                            required
                                            margin="normal"
                                            error={!selectedCondition}
                                            helperText={!selectedCondition ? "Condition is required" : ""}
                                        />
                                    )}
                                />
                                
                                <Box sx={{ my: 2 }}>
                                    <Typography component="legend">Rating *</Typography>
                                    <Rating
                                        value={ratingScore}
                                        onChange={(_, newValue) => {
                                            if (newValue !== null) {
                                                setRatingScore(newValue);
                                            }
                                        }}
                                        size="large"
                                        required
                                    />
                                    {!ratingScore && (
                                        <Typography color="error" variant="caption" sx={{ display: 'block' }}>
                                            Please select a rating
                                        </Typography>
                                    )}
                                </Box>
                                
                                <TextField
                                    label="Review (optional)"
                                    value={ratingComment}
                                    onChange={(e) => setRatingComment(e.target.value)}
                                    multiline
                                    rows={4}
                                    fullWidth
                                    sx={{ mb: 2 }}
                                />
                            </Box>
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={() => setRatingDialogOpen(false)}>Cancel</Button>
                            <Button 
                                onClick={handleRatingSubmit}
                                variant="contained" 
                                disabled={!selectedCondition || !ratingScore}
                            >
                                Submit
                            </Button>
                        </DialogActions>
                    </Dialog>

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