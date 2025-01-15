import React, { useState, useEffect, useCallback } from 'react';
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
    IconButton,
    Skeleton,
    Select,
    MenuItem
} from '@mui/material';
import { getSupplements, getSupplement, getConditions, getBrands, addRating, updateRating } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import AddIcon from '@mui/icons-material/Add';
import FilterListIcon from '@mui/icons-material/FilterList';
import ReviewDetail from './ReviewDetail';
import debounce from 'lodash/debounce';

const ConditionTag = ({ condition, onRemove }) => (
    <Box
        onClick={(e) => {
            e.stopPropagation();
            onRemove(condition);
        }}
        sx={{
            display: 'inline-flex',
            alignItems: 'center',
            m: 0.5,
            px: 1,
            py: 0.5,
            bgcolor: 'primary.main',
            color: 'white',
            borderRadius: 1,
            fontSize: '0.8rem',
            cursor: 'pointer',
            '&:hover': {
                bgcolor: 'primary.dark',
            },
        }}
    >
        {condition.name}
        <span style={{ marginLeft: '4px' }}>×</span>
    </Box>
);

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
    const [selectedConditions, setSelectedConditions] = useState([]);
    const [searchCondition, setSearchCondition] = useState('');
    const { user } = useAuth();
    
    // New state for filter drawer
    const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
    const [selectedFilterConditions, setSelectedFilterConditions] = useState([]);
    const [appliedFilterConditions, setAppliedFilterConditions] = useState([]);

    const [selectedReview, setSelectedReview] = useState(null);
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
    const [offset, setOffset] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [batchSize, setBatchSize] = useState(20);
    const [editingRating, setEditingRating] = useState(null);
    const [ratingDosage, setRatingDosage] = useState('');
    const [ratingBrands, setRatingBrands] = useState('');
    const [brands, setBrands] = useState([]);
    const [selectedBrand, setSelectedBrand] = useState(null);
    const [ratingDosageFrequency, setRatingDosageFrequency] = useState('');
    const [ratingFrequencyUnit, setRatingFrequencyUnit] = useState('');

    // Debounced search function
    const debouncedSearch = useCallback(
        debounce((term) => {
            setCurrentSearch(term);
        }, 300),
        []
    );

    // Add console log for debugging
    console.log('User in SearchableSupplementList:', user);
    console.log('Rating user:', selectedSupplement?.ratings?.[0]?.user);

    // Add this near the top of the component, after the state declarations
    const memoizedHandleSearchChange = useCallback((e) => {
        setSearchTerm(e.target.value);
        debouncedSearch(e.target.value);
    }, [debouncedSearch]);

    useEffect(() => {
        const fetchSupplements = async () => {
            try {
                setLoading(true);
                setBatchSize(20); // Reset batch size on new search
                const params = {
                    ...(currentSearch ? { name: currentSearch } : {}),
                    ...(appliedFilterConditions.length > 0 ? { 
                        conditions: appliedFilterConditions.map(c => c.name).join(',') 
                    } : {}),
                    offset: 0,
                    limit: 10 // Initial load is always 10
                };
                const data = await getSupplements(params);
                setSupplements(data);
                setOffset(10);
                setHasMore(data.length === 10);
            } catch (error) {
                console.error('Error fetching supplements:', error);
                toast.error('Failed to fetch supplements');
            } finally {
                setLoading(false);
            }
        };
        fetchSupplements();
    }, [currentSearch, appliedFilterConditions]);

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
            if (appliedFilterConditions.length > 0) {
                setSelectedSupplement(prev => ({
                    ...prev,
                    ratings: prev.originalRatings.filter(
                        rating => appliedFilterConditions.some(c => c.name === rating.condition_name)
                    )
                }));
            } else {
                setSelectedSupplement(prev => ({
                    ...prev,
                    ratings: prev.originalRatings
                }));
            }
        }
    }, [appliedFilterConditions]);

    useEffect(() => {
        const fetchBrands = async () => {
            try {
                const data = await getBrands();
                setBrands(data);
            } catch (error) {
                console.error('Error fetching brands:', error);
                toast.error('Failed to fetch brands');
            }
        };
        fetchBrands();
    }, []);

    const handleKeyDown = (event) => {
        if (event.key === 'Enter') {
            setCurrentSearch(searchTerm);
            setSelectedSupplement(null);
        }
    };

    const handleSupplementClick = async (supplementId) => {
        try {
            setLoading(true);
            setSelectedReview(null);
            const data = await getSupplement(supplementId);
            let filteredRatings = data.ratings;
            let ratingCount = data.rating_count;
            
            if (appliedFilterConditions.length > 0) {
                const conditionNames = appliedFilterConditions.map(c => c.name.toLowerCase());
                filteredRatings = data.ratings.filter(rating => 
                    rating.condition_names.some(condition => 
                        conditionNames.includes(condition.toLowerCase())
                    )
                );
                ratingCount = filteredRatings.length;
            }
            
            // Ensure all rating data is preserved
            filteredRatings = filteredRatings.map(rating => ({
                ...rating,
                dosage: rating.dosage || null,
                brands: rating.brands || null
            }));
            
            setSelectedSupplement({
                ...data,
                originalRatings: data.ratings,
                ratings: filteredRatings,
                rating_count: ratingCount
            });
        } catch (error) {
            console.error('Error fetching supplement details:', error);
        } finally {
            setLoading(false);
        }
    };

    const refreshSupplementsList = async () => {
        try {
            setLoading(true);
            const params = {
                ...(currentSearch ? { name: currentSearch } : {}),
                ...(appliedFilterConditions.length > 0 ? { conditions: appliedFilterConditions.map(c => c.name) } : {}),
                limit: 20
            };
            // Force skip cache when refreshing
            const data = await getSupplements(params, true);
            setSupplements(data);
        } catch (error) {
            console.error('Error refreshing supplements:', error);
            toast.error('Failed to refresh supplements list');
        } finally {
            setLoading(false);
        }
    };

    const handleEditRating = (rating) => {
        setEditingRating(rating);
        setSelectedConditions(rating.conditions.map(id => conditions.find(c => c.id === id)));
        setRatingScore(rating.score);
        setRatingComment(rating.comment || '');
        
        // Handle dosage - strip the unit if present
        if (rating.dosage) {
            const dosageValue = rating.dosage.replace(new RegExp(`${selectedSupplement.dosage_unit}$`), '').trim();
            setRatingDosage(dosageValue);
        } else {
            setRatingDosage('');
        }
        
        // Handle brand
        if (rating.brands) {
            setSelectedBrand({ id: null, name: rating.brands });
        } else {
            setSelectedBrand(null);
        }
        
        setRatingDialogOpen(true);
    };

    const handleRatingSubmit = async (e) => {
        e.preventDefault();
        try {
            const ratingData = {
                supplement: selectedSupplement.id,
                conditions: selectedConditions.map(c => c.id),
                score: ratingScore,
                comment: ratingComment,
                dosage: ratingDosage ? `${ratingDosage}${selectedSupplement.dosage_unit || 'mg'}` : null,
                dosage_frequency: ratingDosageFrequency || null,
                frequency_unit: ratingFrequencyUnit || null,
                brands: selectedBrand ? selectedBrand.name : null,
                is_edited: editingRating ? true : false
            };

            if (editingRating) {
                await updateRating(editingRating.id, ratingData);
                toast.success('Rating updated successfully');
            } else {
                await addRating(ratingData);
                toast.success('Rating added successfully');
            }

            // Reset form
            setSelectedConditions([]);
            setRatingScore(0);
            setRatingComment('');
            setRatingDosage('');
            setSelectedBrand(null);
            setRatingDialogOpen(false);
            setEditingRating(null);
            
            // Refresh supplement details
            await handleSupplementClick(selectedSupplement.id);
        } catch (error) {
            console.error('Error submitting rating:', error);
            toast.error(error.userMessage || 'Failed to submit rating');
        }
    };

    const handleApplyFilter = () => {
        setAppliedFilterConditions(selectedFilterConditions);
        setFilterDrawerOpen(false);
    };

    const handleClearFilter = () => {
        setSelectedFilterConditions([]);
        setAppliedFilterConditions([]);
        setFilterDrawerOpen(false);
    };

    const handleFilterClick = async (e) => {
        e.stopPropagation();
        try {
            // Fetch fresh data for the supplement
            const refreshedData = await getSupplement(selectedSupplement.id);
            
            setAppliedFilterConditions([]);
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
            const updatedData = await getSupplement(selectedSupplement.id);
            setSelectedSupplement(prev => ({
                ...updatedData,
                originalRatings: updatedData.ratings,
                ratings: updatedData.ratings,
            }));
        }
    };

    // Loading skeleton component
    const LoadingSkeleton = () => (
        <Box>
            {[...Array(5)].map((_, i) => (
                <Paper key={i} sx={{ mb: 1, p: 2 }}>
                    <Skeleton animation="wave" height={24} width="60%" />
                    <Skeleton animation="wave" height={20} width="40%" />
                </Paper>
            ))}
        </Box>
    );

    const RatingDisplay = ({ rating }) => (
        <Paper elevation={3} sx={{ p: 2, mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle1" fontWeight="bold">
                    {rating.user.username}
                    {rating.is_edited && (
                        <Typography component="span" variant="caption" color="text.secondary">
                            {" (edited)"}
                        </Typography>
                    )}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {user && user.id === rating.user.id && (
                        <Button 
                            size="small" 
                            onClick={(e) => {
                                e.stopPropagation();
                                handleEditRating(rating);
                            }}
                        >
                            Edit
                        </Button>
                    )}
                    <Rating value={rating.score} readOnly />
                </Box>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Conditions: {rating.condition_names.join(', ')}
            </Typography>
            {(rating.dosage || rating.dosage_frequency) && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Dosage: {rating.dosage?.replace(/\s+/g, '')}
                    {rating.dosage_frequency && rating.frequency_unit && 
                        ` ${rating.dosage_frequency}x / ${rating.frequency_unit}`}
                </Typography>
            )}
            {rating.brands && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Brands Used: {rating.brands}
                </Typography>
            )}
            {rating.comment && (
                <Typography variant="body1">
                    {rating.comment}
                </Typography>
            )}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                <Button size="small" onClick={() => handleReviewClick(rating)}>
                    View Details
                </Button>
            </Box>
        </Paper>
    );

    const handleRemoveCondition = (conditionToRemove) => {
        const updatedConditions = appliedFilterConditions.filter(
            c => c.id !== conditionToRemove.id
        );
        setAppliedFilterConditions(updatedConditions);
        setSelectedFilterConditions(updatedConditions);
    };

    const loadMore = async () => {
        try {
            setLoading(true);
            const params = {
                ...(currentSearch ? { name: currentSearch } : {}),
                ...(appliedFilterConditions.length > 0 ? { 
                    conditions: appliedFilterConditions.map(c => c.name).join(',') 
                } : {}),
                offset: offset,
                limit: batchSize
            };
            const newData = await getSupplements(params);
            setSupplements(prev => [...prev, ...newData]);
            setOffset(prev => prev + batchSize);
            setBatchSize(prev => prev * 2); // Double the batch size for next load
            setHasMore(newData.length === batchSize);
        } catch (error) {
            console.error('Error loading more supplements:', error);
            toast.error('Failed to load more supplements');
        } finally {
            setLoading(false);
        }
    };

    const LoadMoreButton = () => (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2, mb: 3 }}>
            <Button
                variant="contained"
                onClick={loadMore}
                disabled={loading || !hasMore}
            >
                {loading ? 'Loading...' : hasMore ? 'Load More' : 'No More Results'}
            </Button>
        </Box>
    );

    const handleCloseRatingDialog = () => {
        setRatingDialogOpen(false);
        setEditingRating(null);
        setRatingScore(1);
        setRatingComment('');
        setSelectedConditions([]);
        // Reset dosage and brand fields
        setRatingDosage('');
        setSelectedBrand(null);
    };

    return (
        <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
            <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                <TextField
                    fullWidth
                    label="Search Supplements"
                    variant="outlined"
                    value={searchTerm}
                    onChange={memoizedHandleSearchChange}
                    onKeyDown={handleKeyDown}
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
                        multiple
                        options={conditions}
                        getOptionLabel={(option) => option.name}
                        value={selectedFilterConditions}
                        onChange={(_, newValue) => setSelectedFilterConditions(newValue)}
                        onInputChange={(_, newInputValue) => setSearchCondition(newInputValue)}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                label="Filter by Conditions"
                                margin="normal"
                            />
                        )}
                        sx={{ mb: 2 }}
                    />

                    {appliedFilterConditions.length > 0 && (
                        <Typography variant="body2" color="primary" sx={{ mb: 2 }}>
                            Currently filtering by: {appliedFilterConditions.map(c => c.name).join(', ')}
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
                            disabled={selectedFilterConditions.length === 0}
                        >
                            Apply
                        </Button>
                    </Box>
                </Box>
            </Drawer>

            {/* Main Content */}
            {!selectedSupplement ? (
                // Supplement List
                <>
                    <List>
                        {loading ? (
                            <LoadingSkeleton />
                        ) : (
                            supplements.map((supplement) => (
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
                                            <ListItemText 
                                                primary={
                                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                        <Typography variant="subtitle1">
                                                            {supplement.name}
                                                        </Typography>
                                                        {supplement.is_edited && (
                                                            <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                                                                (edited)
                                                            </Typography>
                                                        )}
                                                    </Box>
                                                }
                                            />
                                        </Box>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Rating 
                                                value={supplement.avg_rating || 0} 
                                                readOnly 
                                                precision={0.1}
                                            />
                                            <Typography variant="body2" color="text.secondary">
                                                {supplement.avg_rating ? (
                                                    `${supplement.avg_rating.toFixed(1)} (${supplement.rating_count} ${supplement.rating_count === 1 ? 'rating' : 'ratings'})`
                                                ) : (
                                                    'No ratings'
                                                )}
                                            </Typography>
                                        </Box>
                                    </Box>
                                </ListItem>
                            ))
                        )}
                    </List>
                    <LoadMoreButton />
                </>
            ) : (
                // Supplement Detail View
                <Box>
                    <Button 
                        onClick={async () => {
                            try {
                                setLoading(true);
                                const params = {
                                    ...(currentSearch ? { name: currentSearch } : {}),
                                    ...(appliedFilterConditions.length > 0 ? { 
                                        conditions: appliedFilterConditions.map(c => c.name).join(',') 
                                    } : {})
                                };
                                const data = await getSupplements(params);
                                setSupplements(data);
                                setSelectedSupplement(null);
                            } catch (error) {
                                console.error('Error refreshing supplements:', error);
                                toast.error('Failed to refresh supplements list');
                            } finally {
                                setLoading(false);
                            }
                        }}
                        sx={{ mb: 2 }}
                    >
                        Back to List
                    </Button>
                    
                    <Paper sx={{ p: 3, mb: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                            <Typography variant="h5">
                                {selectedSupplement.name}
                            </Typography>
                            {appliedFilterConditions.length > 0 && (
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', mb: 2 }}>
                                    <Typography variant="body2" sx={{ mr: 1 }}>
                                        Showing ratings for:
                                    </Typography>
                                    {appliedFilterConditions.map(condition => (
                                        <ConditionTag
                                            key={condition.id}
                                            condition={condition}
                                            onRemove={handleRemoveCondition}
                                        />
                                    ))}
                                </Box>
                            )}
                        </Box>

                        <Box sx={{ mb: 3 }}>
                            <Typography variant="subtitle1" gutterBottom>
                                {selectedSupplement.ratings.length > 0 ? (
                                    `Average Rating: ${(selectedSupplement.ratings.reduce((sum, rating) => sum + rating.score, 0) / selectedSupplement.ratings.length).toFixed(1)} (${selectedSupplement.ratings.length} ${selectedSupplement.ratings.length === 1 ? 'rating' : 'ratings'})`
                                ) : (
                                    'No ratings yet'
                                )}
                            </Typography>
                            {user && (selectedSupplement.ratings.length === 0 || user.id !== selectedSupplement.ratings[0]?.user?.id) && (
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
                                                {rating.is_edited && (
                                                    <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                                                        (edited)
                                                    </Typography>
                                                )}
                                            </Typography>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                {user && user.id === rating.user.id && (
                                                    <Button 
                                                        size="small" 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleEditRating(rating);
                                                        }}
                                                    >
                                                        Edit
                                                    </Button>
                                                )}
                                                <Rating value={rating.score} readOnly />
                                            </Box>
                                        </Box>
                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                            Conditions: {rating.condition_names.join(', ')}
                                        </Typography>
                                        {(rating.dosage || rating.dosage_frequency) && (
                                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                                Dosage: {rating.dosage?.replace(/\s+/g, '')}
                                                {rating.dosage_frequency && rating.frequency_unit && 
                                                    ` ${rating.dosage_frequency}x / ${rating.frequency_unit}`}
                                            </Typography>
                                        )}
                                        {rating.brands && (
                                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                                Brands Used: {rating.brands}
                                            </Typography>
                                        )}
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
                                onEditRating={handleEditRating}
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

            <Dialog 
                open={ratingDialogOpen} 
                onClose={handleCloseRatingDialog}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>
                    {editingRating ? 'Edit Your Rating' : 'Add Your Rating'}
                </DialogTitle>
                <DialogContent>
                    <Box component="form" onSubmit={handleRatingSubmit} sx={{ mt: 2 }}>
                        <Autocomplete
                            multiple
                            options={conditions}
                            getOptionLabel={(option) => option.name}
                            value={selectedConditions}
                            onChange={(_, newValue) => setSelectedConditions(newValue)}
                            onInputChange={(_, newInputValue) => setSearchCondition(newInputValue)}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="Conditions *"
                                    required
                                    margin="normal"
                                    error={selectedConditions.length === 0}
                                    helperText={selectedConditions.length === 0 ? "At least one condition is required" : ""}
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

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                            <TextField
                                label="Dosage"
                                type="number"
                                value={ratingDosage}
                                onChange={(e) => setRatingDosage(e.target.value)}
                                sx={{ width: '150px' }}
                                placeholder="e.g., 500"
                            />
                            <Typography sx={{ ml: 1 }}>
                                {selectedSupplement?.dosage_unit || 'mg'}
                            </Typography>
                            <TextField
                                label="Frequency"
                                type="number"
                                value={ratingDosageFrequency}
                                onChange={(e) => setRatingDosageFrequency(e.target.value)}
                                sx={{ width: '100px' }}
                                placeholder="e.g., 2"
                            />
                            <Select
                                value={ratingFrequencyUnit}
                                onChange={(e) => setRatingFrequencyUnit(e.target.value)}
                                sx={{ width: '150px' }}
                                displayEmpty
                            >
                                <MenuItem value="">
                                    <em>Select unit</em>
                                </MenuItem>
                                <MenuItem value="day">Per Day</MenuItem>
                                <MenuItem value="week">Per Week</MenuItem>
                                <MenuItem value="month">Per Month</MenuItem>
                                <MenuItem value="year">Per Year</MenuItem>
                            </Select>
                        </Box>

                        <Autocomplete
                            options={brands}
                            getOptionLabel={(option) => option.name}
                            value={selectedBrand}
                            onChange={(_, newValue) => setSelectedBrand(newValue)}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="Brand Used (optional)"
                                    fullWidth
                                    sx={{ mb: 2 }}
                                />
                            )}
                        />
                        
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
                        disabled={selectedConditions.length === 0 || !ratingScore}
                    >
                        Submit
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

export default SearchableSupplementList; 