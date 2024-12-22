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
    Autocomplete,
    Drawer,
    IconButton
} from '@mui/material';
import { getSupplements, getSupplement, getConditions, addRating } from '../services/api';
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import AddIcon from '@mui/icons-material/Add';
import FilterListIcon from '@mui/icons-material/FilterList';
import ReviewDetail from './ReviewDetail';

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
    
    // New state for filter drawer
    const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
    const [filterCondition, setFilterCondition] = useState(null);
    const [appliedFilter, setAppliedFilter] = useState(null);

    const [selectedReview, setSelectedReview] = useState(null);

    useEffect(() => {
        const fetchSupplements = async () => {
            try {
                const params = {
                    ...(currentSearch ? { name: currentSearch } : {}),
                    ...(appliedFilter ? { condition: appliedFilter.name } : {})
                };
                const data = await getSupplements(params);
                setSupplements(data);
            } catch (error) {
                console.error('Error fetching supplements:', error);
            }
        };
        fetchSupplements();
    }, [currentSearch, appliedFilter]);

    useEffect(() => {
        const fetchConditions = async () => {
            try {
                const response = await getConditions(searchCondition);
                setConditions(Array.isArray(response) ? response : []);
            } catch (error) {
                console.error('Error fetching conditions:', error);
                setConditions([]);
            }
        };

        fetchConditions();
    }, [searchCondition]);

    useEffect(() => {
        if (selectedSupplement && selectedSupplement.originalRatings) {
            if (appliedFilter) {
                setSelectedSupplement(prev => ({
                    ...prev,
                    ratings: prev.originalRatings.filter(
                        rating => rating.condition_name === appliedFilter.name
                    )
                }));
            } else {
                setSelectedSupplement(prev => ({
                    ...prev,
                    ratings: prev.originalRatings
                }));
            }
        }
    }, [appliedFilter]);

    const handleKeyDown = (event) => {
        if (event.key === 'Enter') {
            setCurrentSearch(searchTerm);
        }
    };

    const handleSupplementClick = async (supplementId) => {
        try {
            setLoading(true);
            const data = await getSupplement(supplementId);
            if (appliedFilter) {
                data.ratings = data.ratings.filter(
                    rating => rating.condition_name === appliedFilter.name
                );
            }
            setSelectedSupplement({
                ...data,
                originalRatings: data.ratings // Store original unfiltered ratings
            });
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
                ratings: [response, ...(prev.ratings || [])]
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

    const handleApplyFilter = () => {
        setAppliedFilter(filterCondition);
        setFilterDrawerOpen(false);
    };

    const handleClearFilter = () => {
        setFilterCondition(null);
        setAppliedFilter(null);
        setFilterDrawerOpen(false);
    };

    const handleFilterClick = async (e) => {
        e.stopPropagation();
        try {
            // Fetch fresh data for the supplement
            const refreshedData = await getSupplement(selectedSupplement.id);
            
            setAppliedFilter(null);
            setSelectedSupplement({
                ...refreshedData,
                originalRatings: refreshedData.ratings
            });
            
            console.log('Updated supplement data:', refreshedData); // Debug log
        } catch (error) {
            console.error('Error refreshing supplement data:', error);
        }
    };

    const refreshSupplementData = async () => {
        if (selectedSupplement) {
            try {
                const updatedSupplement = await getSupplement(selectedSupplement.id);
                setSelectedSupplement(updatedSupplement);
                // Update the selected review with fresh data
                if (selectedReview) {
                    const updatedReview = updatedSupplement.ratings.find(r => r.id === selectedReview.id);
                    setSelectedReview(updatedReview);
                }
            } catch (error) {
                console.error('Error refreshing supplement data:', error);
                toast.error('Failed to refresh data');
            }
        }
    };

    return (
        <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
            <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                <TextField
                    fullWidth
                    label="Search Supplements"
                    variant="outlined"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && setCurrentSearch(searchTerm)}
                />
                <Button
                    variant="outlined"
                    startIcon={<FilterListIcon />}
                    onClick={() => setFilterDrawerOpen(true)}
                >
                    Filter
                </Button>
            </Box>

            {/* Filter Drawer */}
            <Drawer
                anchor="left"
                open={filterDrawerOpen}
                onClose={() => setFilterDrawerOpen(false)}
            >
                <Box sx={{ width: 300, p: 3 }}>
                    <Typography variant="h6" gutterBottom>
                        Filter Supplements
                    </Typography>
                    
                    <Autocomplete
                        options={conditions}
                        getOptionLabel={(option) => option.name}
                        value={filterCondition}
                        onChange={(_, newValue) => setFilterCondition(newValue)}
                        onInputChange={(_, newInputValue) => setSearchCondition(newInputValue)}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                label="Filter by Condition"
                                margin="normal"
                            />
                        )}
                        sx={{ mb: 2 }}
                    />

                    {appliedFilter && (
                        <Typography variant="body2" color="primary" sx={{ mb: 2 }}>
                            Currently filtering by: {appliedFilter.name}
                        </Typography>
                    )}

                    <Box sx={{ display: 'flex', gap: 2, mt: 'auto' }}>
                        <Button
                            variant="outlined"
                            onClick={handleClearFilter}
                            fullWidth
                        >
                            Clear
                        </Button>
                        <Button
                            variant="contained"
                            onClick={handleApplyFilter}
                            fullWidth
                            disabled={!filterCondition}
                        >
                            Apply
                        </Button>
                    </Box>
                </Box>
            </Drawer>

            {/* Main Content */}
            {!selectedSupplement ? (
                // Supplement List
                <List>
                    {supplements.map((supplement) => (
                        <ListItem 
                            key={supplement.id}
                            onClick={() => handleSupplementClick(supplement.id)}
                            sx={{
                                mb: 1,
                                cursor: 'pointer',
                                '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.04)' },
                            }}
                            component={Paper}
                            elevation={1}
                        >
                            <Box sx={{ width: '100%' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                    <ListItemText primary={supplement.name} />
                                    {appliedFilter && (
                                        <Box
                                            sx={{
                                                ml: 2,
                                                px: 1,
                                                py: 0.5,
                                                bgcolor: 'primary.main',
                                                color: 'white',
                                                borderRadius: 1,
                                                fontSize: '0.8rem',
                                            }}
                                        >
                                            {appliedFilter.name}
                                        </Box>
                                    )}
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Rating 
                                        value={supplement.avg_rating || 0} 
                                        readOnly 
                                        precision={0.1}
                                    />
                                    <Typography variant="body2" color="text.secondary">
                                        {supplement.avg_rating ? (
                                            `${supplement.avg_rating.toFixed(1)} (${
                                                appliedFilter 
                                                ? supplement.ratings.filter(rating => 
                                                    rating.condition_name === appliedFilter.name
                                                ).length 
                                                : supplement.ratings.length
                                            } ratings)`
                                        ) : (
                                            'No ratings'
                                        )}
                                    </Typography>
                                </Box>
                            </Box>
                        </ListItem>
                    ))}
                </List>
            ) : (
                // Supplement Detail View
                <Box>
                    <Button 
                        onClick={() => setSelectedSupplement(null)}
                        sx={{ mb: 2 }}
                    >
                        Back to List
                    </Button>
                    
                    <Paper sx={{ p: 3, mb: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                            <Typography variant="h5">
                                {selectedSupplement.name}
                            </Typography>
                            {appliedFilter && (
                                <Box
                                    onClick={handleFilterClick}
                                    sx={{
                                        px: 2,
                                        py: 0.5,
                                        bgcolor: 'primary.main',
                                        color: 'white',
                                        borderRadius: 1,
                                        fontSize: '0.9rem',
                                        cursor: 'pointer',
                                        '&:hover': {
                                            bgcolor: 'primary.dark',
                                        },
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 1
                                    }}
                                >
                                    Showing ratings for: {appliedFilter.name}
                                    <span style={{ fontSize: '0.8rem' }}>(click to clear)</span>
                                </Box>
                            )}
                        </Box>

                        <Box sx={{ mb: 3 }}>
                            <Typography variant="subtitle1" gutterBottom>
                                {selectedSupplement.ratings.length > 0 ? (
                                    `Average Rating: ${(selectedSupplement.ratings.reduce((sum, rating) => sum + rating.score, 0) / selectedSupplement.ratings.length).toFixed(1)} (${selectedSupplement.ratings.length} ratings)`
                                ) : (
                                    'No ratings yet'
                                )}
                            </Typography>
                            {isAuthenticated && (
                                <Button
                                    startIcon={<AddIcon />}
                                    variant="contained"
                                    onClick={() => setRatingDialogOpen(true)}
                                    sx={{ mt: 1 }}
                                >
                                    Add Rating
                                </Button>
                            )}
                        </Box>

                        <List>
                            {!selectedReview ? (
                                selectedSupplement.ratings
                                    .filter(rating => rating.comment)
                                    .map((rating) => (
                                        <ListItem 
                                            key={rating.id}
                                            onClick={() => setSelectedReview(rating)}
                                            sx={{ 
                                                mb: 2,
                                                flexDirection: 'column',
                                                alignItems: 'flex-start',
                                                bgcolor: 'background.paper',
                                                borderRadius: 1,
                                                boxShadow: 1,
                                                p: 2,
                                                cursor: 'pointer',
                                                '&:hover': {
                                                    bgcolor: 'action.hover'
                                                }
                                            }}
                                        >
                                            <Box sx={{ 
                                                width: '100%',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                mb: 1
                                            }}>
                                                <Typography variant="subtitle2">
                                                    {rating.user.username}
                                                </Typography>
                                                <Rating value={rating.score} readOnly />
                                            </Box>
                                            <Typography variant="body2" color="text.secondary">
                                                {rating.comment}
                                            </Typography>
                                            {rating.comments?.length > 0 && (
                                                <Typography variant="caption" sx={{ mt: 1, color: 'primary.main' }}>
                                                    {rating.comments.length} comment(s)
                                                </Typography>
                                            )}
                                        </ListItem>
                                    ))
                            ) : (
                                <ReviewDetail 
                                    rating={selectedReview}
                                    onBack={() => setSelectedReview(null)}
                                    onCommentAdded={async (newComment) => {
                                        await refreshSupplementData();
                                        toast.success('Comment added successfully!');
                                    }}
                                />
                            )}
                        </List>
                    </Paper>
                </Box>
            )}

            <Dialog open={ratingDialogOpen} onClose={() => setRatingDialogOpen(false)}>
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
        </Box>
    );
}

export default SearchableSupplementList; 