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
import { getSupplements, getSupplement, getConditions, getBrands, addRating, updateRating, upvoteRating, getCategories } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import AddIcon from '@mui/icons-material/Add';
import FilterListIcon from '@mui/icons-material/FilterList';
import ReviewDetail from './ReviewDetail';
import debounce from 'lodash/debounce';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import ImageUpload from './ImageUpload';

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

const FilterDrawer = ({
    open,
    onClose,
    conditions,
    selectedFilterConditions,
    setSelectedFilterConditions,
    brands,
    selectedFilterBrands,
    setSelectedFilterBrands,
    selectedFilterDosage,
    setSelectedFilterDosage,
    selectedFilterDosageUnit,
    setSelectedFilterDosageUnit,
    selectedFilterFrequency,
    setSelectedFilterFrequency,
    selectedFilterFrequencyUnit,
    setSelectedFilterFrequencyUnit,
    selectedSortBy,
    setSelectedSortBy,
    onApplyFilter,
    onClearFilter,
    selectedFilterCategory,
    setSelectedFilterCategory,
    categories
}) => (
    <Drawer
        anchor="left"
        open={open}
        onClose={onClose}
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
                renderInput={(params) => (
                    <TextField
                        {...params}
                        label="Filter by Purpose"
                        margin="normal"
                    />
                )}
                sx={{ mb: 2 }}
            />
            
            <TextField
                select
                label="Category"
                value={selectedFilterCategory}
                onChange={(e) => setSelectedFilterCategory(e.target.value)}
                fullWidth
                margin="normal"
            >
                <MenuItem value="">All Categories</MenuItem>
                {categories.map((category) => (
                    <MenuItem key={category} value={category}>
                        {category}
                    </MenuItem>
                ))}
            </TextField>

            <Autocomplete
                multiple
                options={brands}
                getOptionLabel={(option) => option.name}
                value={selectedFilterBrands}
                onChange={(_, newValue) => setSelectedFilterBrands(newValue)}
                renderInput={(params) => (
                    <TextField
                        {...params}
                        label="Filter by Brands"
                        margin="normal"
                    />
                )}
                sx={{ mb: 2 }}
            />

            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <TextField
                    label="Dosage"
                    type="number"
                    value={selectedFilterDosage}
                    onChange={(e) => setSelectedFilterDosage(e.target.value)}
                    sx={{ width: '50%' }}
                />
                <Select
                    value={selectedFilterDosageUnit}
                    onChange={(e) => setSelectedFilterDosageUnit(e.target.value)}
                    sx={{ width: '50%' }}
                >
                    <MenuItem value="mg">mg</MenuItem>
                    <MenuItem value="g">g</MenuItem>
                    <MenuItem value="mcg">mcg</MenuItem>
                    <MenuItem value="ml">ml</MenuItem>
                    <MenuItem value="IU">IU</MenuItem>
                </Select>
            </Box>

            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <TextField
                    label="Frequency"
                    type="number"
                    value={selectedFilterFrequency}
                    onChange={(e) => setSelectedFilterFrequency(e.target.value)}
                    sx={{ width: '50%' }}
                />
                <Select
                    value={selectedFilterFrequencyUnit}
                    onChange={(e) => setSelectedFilterFrequencyUnit(e.target.value)}
                    sx={{ width: '50%' }}
                >
                    <MenuItem value="day">Per Day</MenuItem>
                    <MenuItem value="week">Per Week</MenuItem>
                    <MenuItem value="month">Per Month</MenuItem>
                    <MenuItem value="year">Per Year</MenuItem>
                </Select>
            </Box>

            {/* Sort options moved to bottom */}
            <Typography variant="subtitle1" gutterBottom sx={{ mt: 3 }}>
                Sort By
            </Typography>
            <Select
                fullWidth
                value={selectedSortBy}
                onChange={(e) => setSelectedSortBy(e.target.value)}
                sx={{ mb: 3 }}
            >
                <MenuItem value="highest_rating">Highest Rating</MenuItem>
                <MenuItem value="most_ratings">Most Ratings</MenuItem>
            </Select>

            <Box sx={{ display: 'flex', gap: 2, mt: 'auto' }}>
                <Button
                    variant="outlined"
                    onClick={onClearFilter}
                    fullWidth
                >
                    Clear
                </Button>
                <Button
                    variant="contained"
                    onClick={onApplyFilter}
                    fullWidth
                >
                    Apply
                </Button>
            </Box>
        </Box>
    </Drawer>
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
    const [selectedFilterBrands, setSelectedFilterBrands] = useState([]);
    const [selectedFilterDosage, setSelectedFilterDosage] = useState('');
    const [selectedFilterDosageUnit, setSelectedFilterDosageUnit] = useState('mg');
    const [selectedFilterFrequency, setSelectedFilterFrequency] = useState('');
    const [selectedFilterFrequencyUnit, setSelectedFilterFrequencyUnit] = useState('day');
    const [selectedFilterCategory, setSelectedFilterCategory] = useState('');

    const [appliedFilterConditions, setAppliedFilterConditions] = useState([]);
    const [appliedFilterBrands, setAppliedFilterBrands] = useState([]);
    const [appliedFilterDosage, setAppliedFilterDosage] = useState('');
    const [appliedFilterDosageUnit, setAppliedFilterDosageUnit] = useState('mg');
    const [appliedFilterFrequency, setAppliedFilterFrequency] = useState('');
    const [appliedFilterFrequencyUnit, setAppliedFilterFrequencyUnit] = useState('day');
    const [appliedFilterCategory, setAppliedFilterCategory] = useState('');

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
    const [ratingDosageFrequency, setRatingDosageFrequency] = useState('1');
    const [ratingFrequencyUnit, setRatingFrequencyUnit] = useState('day');

    // Add new state for sort order near the other state declarations
    const [sortOrder, setSortOrder] = useState('likes'); // 'likes' or 'recent'

    // Add new state for sort selection
    const [selectedSortBy, setSelectedSortBy] = useState('highest_rating');
    const [appliedSortBy, setAppliedSortBy] = useState('highest_rating');

    const [categories, setCategories] = useState([]);

    // Add this useEffect after the other useEffect hooks
    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const data = await getCategories();
                setCategories(data);
            } catch (error) {
                console.error('Error fetching categories:', error);
                toast.error('Failed to fetch categories');
            }
        };
        fetchCategories();
    }, []);

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
                const params = {
                    ...(currentSearch ? { name: currentSearch } : {}),
                    ...(appliedFilterCategory ? { category: appliedFilterCategory } : {}),
                    ...(appliedFilterConditions.length > 0 ? { 
                        conditions: appliedFilterConditions.map(c => c.name).join(',') 
                    } : {}),
                    ...(appliedFilterBrands.length > 0 ? {
                        brands: appliedFilterBrands.map(b => b.name).join(',')
                    } : {}),
                    ...(appliedFilterDosage ? { 
                        dosage: `${appliedFilterDosage}${appliedFilterDosageUnit}` 
                    } : {}),
                    ...(appliedFilterFrequency ? { 
                        frequency: `${appliedFilterFrequency}_${appliedFilterFrequencyUnit}` 
                    } : {}),
                    sort_by: appliedSortBy,
                    offset: 0,
                    limit: 10
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
    }, [currentSearch, appliedFilterCategory, appliedFilterConditions, appliedFilterBrands, appliedFilterDosage, appliedFilterDosageUnit, appliedFilterFrequency, appliedFilterFrequencyUnit, appliedSortBy]);

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
            
            // Add console logs for debugging
            console.log('Applied filters:', {
                conditions: appliedFilterConditions,
                brands: appliedFilterBrands,
                dosage: appliedFilterDosage,
                dosageUnit: appliedFilterDosageUnit,
                frequency: appliedFilterFrequency,
                frequencyUnit: appliedFilterFrequencyUnit
            });
            console.log('Original ratings:', data.ratings);
            
            if (appliedFilterConditions.length > 0 || 
                appliedFilterBrands.length > 0 || 
                appliedFilterDosage || 
                appliedFilterFrequency) {
                
                filteredRatings = data.ratings.filter(rating => {
                    // Check conditions filter
                    if (appliedFilterConditions.length > 0) {
                        const conditionNames = appliedFilterConditions.map(c => c.name.toLowerCase());
                        if (!rating.condition_names.some(condition => 
                            conditionNames.includes(condition.toLowerCase())
                        )) {
                            return false;
                        }
                    }

                    // Check brands filter
                    if (appliedFilterBrands.length > 0) {
                        const brandNames = appliedFilterBrands.map(b => b.name.toLowerCase());
                        if (!rating.brands || !brandNames.includes(rating.brands.toLowerCase())) {
                            return false;
                        }
                    }

                    // Check dosage filter
                    if (appliedFilterDosage) {
                        const expectedDosage = `${appliedFilterDosage}${appliedFilterDosageUnit}`;
                        if (!rating.dosage || rating.dosage.toLowerCase() !== expectedDosage.toLowerCase()) {
                            return false;
                        }
                    }

                    // Check frequency filter
                    if (appliedFilterFrequency) {
                        console.log('Checking frequency for rating:', {
                            ratingFreq: rating.dosage_frequency,
                            ratingUnit: rating.frequency_unit,
                            appliedFreq: appliedFilterFrequency,
                            appliedUnit: appliedFilterFrequencyUnit
                        });
                        
                        // Convert all values to strings for comparison
                        const ratingFreq = String(rating.dosage_frequency);
                        const appliedFreq = String(appliedFilterFrequency);
                        
                        if (!rating.dosage_frequency || !rating.frequency_unit ||
                            ratingFreq !== appliedFreq ||
                            rating.frequency_unit !== appliedFilterFrequencyUnit) {
                            return false;
                        }
                    }

                    return true;
                });
                ratingCount = filteredRatings.length;
            }
            
            console.log('Filtered ratings:', filteredRatings);
            
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

    const handleBackToList = async () => {
        try {
            setLoading(true);
            const params = {
                ...(currentSearch ? { name: currentSearch } : {}),
                ...(appliedFilterConditions.length > 0 ? { 
                    conditions: appliedFilterConditions.map(c => c.name).join(',') 
                } : {}),
                ...(appliedFilterBrands.length > 0 ? {
                    brands: appliedFilterBrands.map(b => b.name).join(',')
                } : {}),
                ...(appliedFilterDosage ? { 
                    dosage: `${appliedFilterDosage}${appliedFilterDosageUnit}` 
                } : {}),
                ...(appliedFilterFrequency ? { 
                    frequency: `${appliedFilterFrequency}_${appliedFilterFrequencyUnit}` 
                } : {}),
                offset: 0,
                limit: 10
            };
            const data = await getSupplements(params);
            setSupplements(data);
            setSelectedSupplement(null);
            setOffset(10);
            setHasMore(data.length === 10);
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
        setRatingImage(null);
        
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

    const [ratingImage, setRatingImage] = useState(null);

    const handleRatingSubmit = async (e) => {
        e.preventDefault();
        try {
            const formData = new FormData();
            formData.append('supplement', selectedSupplement.id);
            formData.append('conditions', selectedConditions.map(c => c.id));
            formData.append('score', ratingScore);
            formData.append('comment', ratingComment || '');
            
            if (ratingDosage) {
                formData.append('dosage', `${ratingDosage}${selectedSupplement.dosage_unit || 'mg'}`);
            }
            if (ratingDosageFrequency) {
                formData.append('dosage_frequency', ratingDosageFrequency);
            }
            if (ratingFrequencyUnit) {
                formData.append('frequency_unit', ratingFrequencyUnit);
            }
            if (selectedBrand) {
                formData.append('brands', selectedBrand.name);
            }
            if (ratingImage) {
                formData.append('image', ratingImage);
            }

            if (editingRating) {
                await updateRating(editingRating.id, formData);
                toast.success('Rating updated successfully');
            } else {
                await addRating(formData);
                toast.success('Rating added successfully');
            }

            // Reset form and refresh data
            setSelectedConditions([]);
            setRatingScore(0);
            setRatingComment('');
            setRatingDosage('');
            setSelectedBrand(null);
            setRatingImage(null);
            setRatingDialogOpen(false);
            setEditingRating(null);
            
            await handleSupplementClick(selectedSupplement.id);
        } catch (error) {
            console.error('Error submitting rating:', error);
            toast.error(error.response?.data?.detail || 'Failed to submit rating');
        }
    };

    const handleApplyFilter = () => {
        setAppliedFilterCategory(selectedFilterCategory);
        setAppliedFilterConditions(selectedFilterConditions);
        setAppliedFilterBrands(selectedFilterBrands);
        setAppliedFilterDosage(selectedFilterDosage);
        setAppliedFilterDosageUnit(selectedFilterDosageUnit);
        setAppliedFilterFrequency(selectedFilterFrequency);
        setAppliedFilterFrequencyUnit(selectedFilterFrequencyUnit);
        setAppliedSortBy(selectedSortBy);
        setFilterDrawerOpen(false);
    };

    const handleClearFilter = () => {
        setSelectedFilterCategory('');
        setAppliedFilterCategory('');
        setSelectedFilterConditions([]);
        setSelectedFilterBrands([]);
        setSelectedFilterDosage('');
        setSelectedFilterDosageUnit('mg');
        setSelectedFilterFrequency('');
        setSelectedFilterFrequencyUnit('day');
        setSelectedSortBy('highest_rating');
        setAppliedFilterConditions([]);
        setAppliedFilterBrands([]);
        setAppliedFilterDosage('');
        setAppliedFilterDosageUnit('mg');
        setAppliedFilterFrequency('');
        setAppliedFilterFrequencyUnit('day');
        setAppliedSortBy('highest_rating');
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
                    <IconButton 
                        onClick={(e) => handleUpvoteRating(e, rating)}
                        color={rating.has_upvoted ? "primary" : "default"}
                        disabled={!user || rating.user.id === user?.id}
                        size="small"
                    >
                        <ThumbUpIcon fontSize="small" />
                        <Typography variant="caption" sx={{ ml: 0.5 }}>
                            {rating.upvotes}
                        </Typography>
                    </IconButton>
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
            {rating.image && (
                <Box sx={{ mt: 2 }}>
                    <img 
                        src={rating.image}
                        alt="Rating attachment"
                        style={{ 
                            maxWidth: '300px',
                            maxHeight: '300px',
                            borderRadius: '4px'
                        }}
                    />
                </Box>
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

    const handleLoadMore = async () => {
        try {
            setLoading(true);
            const params = {
                ...(currentSearch ? { name: currentSearch } : {}),
                ...(appliedFilterCategory ? { category: appliedFilterCategory } : {}),
                ...(appliedFilterConditions.length > 0 ? { 
                    conditions: appliedFilterConditions.map(c => c.name).join(',') 
                } : {}),
                ...(appliedFilterBrands.length > 0 ? {
                    brands: appliedFilterBrands.map(b => b.name).join(',')
                } : {}),
                ...(appliedFilterDosage ? { 
                    dosage: `${appliedFilterDosage}${appliedFilterDosageUnit}` 
                } : {}),
                ...(appliedFilterFrequency ? { 
                    frequency: `${appliedFilterFrequency}_${appliedFilterFrequencyUnit}` 
                } : {}),
                sort_by: appliedSortBy,
                offset: offset,
                limit: batchSize
            };
            const newData = await getSupplements(params);
            setSupplements(prevSupplements => [...prevSupplements, ...newData]);
            setOffset(offset + batchSize);
            setHasMore(newData.length === batchSize);
        } catch (error) {
            console.error('Error loading more supplements:', error);
            toast.error('Failed to load more supplements');
        } finally {
            setLoading(false);
        }
    };

    const LoadMoreButton = () => (
        hasMore && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2, mb: 4 }}>
                <Button
                    variant="outlined"
                    onClick={handleLoadMore}
                    disabled={loading}
                >
                    {loading ? 'Loading...' : 'Load More'}
                </Button>
            </Box>
        )
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

    const handleUpvoteRating = async (e, rating) => {
        e.stopPropagation(); // Prevent clicking into the review
        if (!user) {
            toast.error('Please log in to upvote');
            return;
        }
        if (rating.user.id === user.id) {
            toast.error('You cannot upvote your own rating');
            return;
        }

        try {
            const response = await upvoteRating(rating.id);
            // Update the rating in the list
            const updatedRatings = selectedSupplement.ratings.map(r => {
                if (r.id === rating.id) {
                    return {
                        ...r,
                        upvotes: response.upvotes,
                        has_upvoted: !r.has_upvoted
                    };
                }
                return r;
            });
            setSelectedSupplement(prev => ({
                ...prev,
                ratings: updatedRatings
            }));
        } catch (error) {
            toast.error('Failed to upvote rating');
        }
    };

    // Add this helper function before the return statement
    const getSortedRatings = (ratings) => {
        return [...ratings].sort((a, b) => {
            if (sortOrder === 'likes') {
                return b.upvotes - a.upvotes;
            } else {
                // Assuming ratings have a created_at or timestamp field
                return new Date(b.created_at) - new Date(a.created_at);
            }
        });
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
            <FilterDrawer
                open={filterDrawerOpen}
                onClose={() => setFilterDrawerOpen(false)}
                conditions={conditions}
                selectedFilterConditions={selectedFilterConditions}
                setSelectedFilterConditions={setSelectedFilterConditions}
                brands={brands}
                selectedFilterBrands={selectedFilterBrands}
                setSelectedFilterBrands={setSelectedFilterBrands}
                selectedFilterDosage={selectedFilterDosage}
                setSelectedFilterDosage={setSelectedFilterDosage}
                selectedFilterDosageUnit={selectedFilterDosageUnit}
                setSelectedFilterDosageUnit={setSelectedFilterDosageUnit}
                selectedFilterFrequency={selectedFilterFrequency}
                setSelectedFilterFrequency={setSelectedFilterFrequency}
                selectedFilterFrequencyUnit={selectedFilterFrequencyUnit}
                setSelectedFilterFrequencyUnit={setSelectedFilterFrequencyUnit}
                selectedSortBy={selectedSortBy}
                setSelectedSortBy={setSelectedSortBy}
                onApplyFilter={handleApplyFilter}
                onClearFilter={handleClearFilter}
                selectedFilterCategory={selectedFilterCategory}
                setSelectedFilterCategory={setSelectedFilterCategory}
                categories={categories}
            />

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
                        onClick={handleBackToList}
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
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <Typography variant="subtitle1">
                                        {selectedSupplement.ratings.length > 0 ? (
                                            `Average Rating: ${(selectedSupplement.ratings.reduce((sum, rating) => sum + rating.score, 0) / selectedSupplement.ratings.length).toFixed(1)} (${selectedSupplement.ratings.length} ${selectedSupplement.ratings.length === 1 ? 'rating' : 'ratings'})`
                                        ) : (
                                            'No ratings yet'
                                        )}
                                    </Typography>
                                    {user && !selectedSupplement.ratings.some(r => r.user.id === user.id) && (
                                        <Button
                                            startIcon={<AddIcon />}
                                            variant="contained"
                                            onClick={() => setRatingDialogOpen(true)}
                                        >
                                            Add Rating
                                        </Button>
                                    )}
                                </Box>
                                <Select
                                    size="small"
                                    value={sortOrder}
                                    onChange={(e) => setSortOrder(e.target.value)}
                                >
                                    <MenuItem value="likes">Most Liked</MenuItem>
                                    <MenuItem value="recent">Most Recent</MenuItem>
                                </Select>
                            </Box>
                            {user && selectedSupplement.ratings.map(rating => (
                                rating.user.id === user.id && !rating.comment && (
                                    <Button
                                        key={rating.id}
                                        startIcon={<AddIcon />}
                                        variant="contained"
                                        onClick={() => handleEditRating(rating)}
                                        sx={{ mt: 1 }}
                                    >
                                        Edit Rating
                                    </Button>
                                )
                            ))}
                        </Box>

                        <List>
                        {!selectedReview ? (
                            getSortedRatings(selectedSupplement.ratings)
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
                                                <IconButton 
                                                    onClick={(e) => handleUpvoteRating(e, rating)}
                                                    color={rating.has_upvoted ? "primary" : "default"}
                                                    disabled={!user || rating.user.id === user?.id}
                                                    size="small"
                                                >
                                                    <ThumbUpIcon fontSize="small" />
                                                    <Typography variant="caption" sx={{ ml: 0.5 }}>
                                                        {rating.upvotes}
                                                    </Typography>
                                                </IconButton>
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
                                        {rating.image && (
                                            <Box sx={{ mt: 2 }}>
                                                <img 
                                                    src={rating.image}
                                                    alt="Rating attachment"
                                                    style={{ 
                                                        maxWidth: '300px',
                                                        maxHeight: '300px',
                                                        borderRadius: '4px'
                                                    }}
                                                />
                                            </Box>
                                        )}
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
                                onUpvoteRating={async (rating) => {
                                    const response = await upvoteRating(rating.id);
                                    // Update the rating in both the detail view and the list
                                    const updatedRating = {
                                        ...rating,
                                        upvotes: response.upvotes,
                                        has_upvoted: !rating.has_upvoted
                                    };
                                    setSelectedReview(updatedRating);
                                    
                                    // Also update in the main list
                                    const updatedRatings = selectedSupplement.ratings.map(r => 
                                        r.id === rating.id ? updatedRating : r
                                    );
                                    setSelectedSupplement(prev => ({
                                        ...prev,
                                        ratings: updatedRatings
                                    }));
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
                                    label="Purpose *"
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
                            fullWidth
                            multiline
                            rows={4}
                            label="Comment"
                            value={ratingComment}
                            onChange={(e) => setRatingComment(e.target.value)}
                            sx={{ mb: 2 }}
                        />
                        <ImageUpload 
                            onImageSelect={(file) => setRatingImage(file)}
                            currentImage={editingRating?.image || null}
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