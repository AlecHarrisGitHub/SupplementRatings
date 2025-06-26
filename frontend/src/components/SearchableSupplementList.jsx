import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link as RouterLink, useLocation, useParams, useNavigate } from 'react-router-dom';
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
    MenuItem,
    Divider,
    Avatar,
    Chip,
    InputAdornment
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
import StarIcon from '@mui/icons-material/Star';
import ForumOutlinedIcon from '@mui/icons-material/ForumOutlined';
import { useAutoSave } from '../hooks/useAutoSave';

const SPECIAL_CHRONIC_CONDITIONS_ID = '__MY_CHRONIC_CONDITIONS__';

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
    categories,
    selectedFilterBenefits,
    setSelectedFilterBenefits,
    selectedFilterSideEffects,
    setSelectedFilterSideEffects
}) => {
    // Sort categories alphabetically
    const sortedCategories = React.useMemo(() => {
        if (Array.isArray(categories)) {
            return [...categories].sort((a, b) => a.localeCompare(b));
        }
        return [];
    }, [categories]);

    // Sort brands alphabetically by name
    const sortedBrands = React.useMemo(() => {
        if (Array.isArray(brands)) {
            return [...brands].sort((a, b) => a.name.localeCompare(b.name));
        }
        return [];
    }, [brands]);

    return (
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
                            label="Intended Purpose"
                            margin="normal"
                        />
                    )}
                    sx={{ mb: 2 }}
                />
                
                <Autocomplete
                    multiple
                    options={conditions}
                    getOptionLabel={(option) => option.name}
                    value={selectedFilterBenefits}
                    onChange={(_, newValue) => setSelectedFilterBenefits(newValue)}
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            label="Benefits For"
                            margin="normal"
                        />
                    )}
                    sx={{ mb: 2 }}
                />

                <Autocomplete
                    multiple
                    options={conditions}
                    getOptionLabel={(option) => option.name}
                    value={selectedFilterSideEffects}
                    onChange={(_, newValue) => setSelectedFilterSideEffects(newValue)}
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            label="Side Effects"
                            margin="normal"
                        />
                    )}
                    sx={{ mb: 2 }}
                />

                <Autocomplete
                    options={sortedCategories}
                    getOptionLabel={(option) => option}
                    value={selectedFilterCategory}
                    onChange={(_, newValue) => setSelectedFilterCategory(newValue || '')}
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            label="Category"
                            margin="normal"
                        />
                    )}
                    sx={{ mb: 2 }}
                />

                <Autocomplete
                    multiple
                    options={sortedBrands}
                    getOptionLabel={(option) => option.name}
                    value={selectedFilterBrands}
                    onChange={(_, newValue) => setSelectedFilterBrands(newValue)}
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            label="Brands"
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
};

const SupplementRatingItem = React.forwardRef(({ rating, user, handleEditRating, handleUpvoteRating, handleReviewClick, id }, ref) => {
    // Fallback for default image, ensure it's accessible
    const defaultProfileImage = 'http://localhost:8000/media/profile_pics/default.jpg'; 

    // Function to format the date
    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${month}/${day}/${year}`;
    };

    return (
        <Paper 
            id={id}
            ref={ref}
            elevation={3} 
            sx={{ 
                p: 2, 
                mb: 2,
                cursor: 'pointer',
                '&:hover': {
                    backgroundColor: 'rgba(0, 0, 0, 0.04)'
                }
            }}
            onClick={() => handleReviewClick(rating)}
        >
            {/* Top Section: User Info (Left) & Upvotes/Edit/Stars (Right) */}
            <Box sx={{ 
                display: 'flex', 
                flexDirection: { xs: 'column', sm: 'row' },
                justifyContent: { xs: 'flex-start', sm: 'space-between' },
                alignItems: { xs: 'flex-start', sm: 'center' },
                mb: 1,
                gap: { xs: 1, sm: 0 }
            }}>
                {/* Left Part: Avatar and Username */}
                <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 1.5,
                    maxWidth: '100%',
                    flexWrap: 'wrap'
                }}>
                    <RouterLink to={`/profile/${rating.user.username}`} style={{ textDecoration: 'none' }} onClick={(e) => e.stopPropagation()}>
                        <Avatar 
                            src={rating.user.profile_image_url || defaultProfileImage} 
                            alt={rating.user.username}
                            sx={{ width: 40, height: 40 }}
                        />
                    </RouterLink>
                    <Box sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                        flexWrap: 'wrap'
                    }}>
                        <RouterLink to={`/profile/${rating.user.username}`} style={{ textDecoration: 'none', color: 'inherit' }} onClick={(e) => e.stopPropagation()}>
                            <Typography variant="subtitle1" fontWeight="bold" sx={{
                                "&:hover": { textDecoration: 'underline'},
                                wordBreak: 'break-word'
                            }}>
                                {rating.user.username}
                            </Typography>
                        </RouterLink>
                        {rating.is_edited && (
                            <Typography component="span" variant="caption" color="text.secondary">
                                {" (edited)"}
                            </Typography>
                        )}
                    </Box>
                </Box>
                {/* Right Part: Upvotes, Comment Count (removed from here), Edit Button, Stars */}
                <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 1,
                    flexWrap: 'wrap',
                    maxWidth: '100%',
                    alignSelf: { xs: 'flex-start', sm: 'center' }
                }}>
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
                    {/* Comment count was previously here, now moved to bottom-left */}
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

            {/* Middle Section: Rating Details (Conditions, Benefits, etc.) */}
            <Box sx={{
                width: '100%',
                mb: 1,
                overflowX: 'hidden',
                wordWrap: 'break-word'
            }}>
                {rating.condition_names && rating.condition_names.length > 0 && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        Intended Purpose: {rating.condition_names.join(', ')}
                    </Typography>
                )}
                {rating.benefit_names && rating.benefit_names.length > 0 && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        Benefits For: {rating.benefit_names.join(', ')}
                    </Typography>
                )}
                {rating.side_effect_names && rating.side_effect_names.length > 0 && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        Side Effects: {rating.side_effect_names.join(', ')}
                    </Typography>
                )}
                {rating.dosage && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        Dosage: {rating.dosage.replace(/\s+/g, '')}
                        {(rating.dosage_frequency && rating.frequency_unit) ? 
                            ` ${rating.dosage_frequency}x / ${rating.frequency_unit}` : ''}
                    </Typography>
                )}
                {rating.brands && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        Brands Used: {rating.brands}
                    </Typography>
                )}
                {rating.comment && 
                    <Typography variant="body2" color="text.secondary" sx={{
                        mb: rating.image_url ? 1 : 0,
                        whiteSpace: 'pre-wrap',
                        wordWrap: 'break-word'
                    }}>
                        {rating.comment}
                    </Typography>
                }
            </Box>

            {rating.image_url && (
                <Box sx={{ 
                    mt: rating.comment ? 1 : 0, 
                    mb: 1,
                    maxWidth: '100%',
                    '& img': {
                        maxWidth: '100%',
                        height: 'auto',
                        objectFit: 'contain',
                        borderRadius: '4px',
                        cursor: 'pointer'
                    }
                }}>
                    <img 
                        src={rating.image_url}
                        alt="Rating attachment"
                        loading="lazy"
                        onClick={(e) => { 
                            e.stopPropagation(); 
                            // Implement image modal click if needed, e.g., handleImageClick(rating.image_url)
                        }}
                    />
                </Box>
            )}

            {/* Bottom Section: Comment Count (Left) & Date (Right) */}
            <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                mt: 1,
                flexWrap: 'wrap',
                gap: 1
            }}>
                {/* Left Part: Comment Count */}
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    {typeof rating.comments_count === 'number' && rating.comments_count >= 0 && (
                        <Box 
                            sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer', mr: 1 }} 
                            onClick={(e) => {
                                e.stopPropagation(); // Prevent triggering main card click
                                handleReviewClick(rating); // Navigate to review detail
                            }}
                        >
                            <ForumOutlinedIcon fontSize="small" sx={{ color: 'text.secondary', mr: 0.25 }} />
                            <Typography variant="caption" color="text.secondary">
                                {rating.comments_count}
                            </Typography>
                        </Box>
                    )}
                </Box>
                {/* Right Part: Date */}
                <Typography variant="caption" color="text.secondary">
                    {formatDate(rating.created_at)}
                </Typography>
            </Box>
        </Paper>
    );
});

function SearchableSupplementList() {
    const { user, isAuthenticated } = useAuth();
    const location = useLocation();
    const { id: supplementIdFromParams } = useParams();
    const navigate = useNavigate();
    const ratingRefs = useRef({});

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
    const [selectedBenefits, setSelectedBenefits] = useState([]);
    const [selectedSideEffects, setSelectedSideEffects] = useState([]);
    const [searchCondition, setSearchCondition] = useState('');
    const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
    const [selectedFilterConditions, setSelectedFilterConditions] = useState([]);
    const [selectedFilterBenefits, setSelectedFilterBenefits] = useState([]);
    const [selectedFilterSideEffects, setSelectedFilterSideEffects] = useState([]);
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
    const [appliedFilterBenefits, setAppliedFilterBenefits] = useState([]);
    const [appliedFilterSideEffects, setAppliedFilterSideEffects] = useState([]);

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
    const [sortOrder, setSortOrder] = useState('likes');
    const [selectedSortBy, setSelectedSortBy] = useState('highest_rating');
    const [appliedSortBy, setAppliedSortBy] = useState('highest_rating');
    const [categories, setCategories] = useState([]);
    const [ratingDialogAttemptedSubmit, setRatingDialogAttemptedSubmit] = useState(false);
    const [expandedReviews, setExpandedReviews] = useState({});
    const [selectedReviewDetail, setSelectedReviewDetail] = useState(null);
    const [nextPageUrl, setNextPageUrl] = useState(null);
    const [loadingMore, setLoadingMore] = useState(false);
    const [ratingDialogDosageUnit, setRatingDialogDosageUnit] = useState('mg');

    const [ratingImage, setRatingImage] = useState(null);

    const supplementDosageUnit = selectedSupplement?.dosage_unit;

    // Create form data object for auto-save
    const ratingFormData = useMemo(() => {
        if (!ratingDialogOpen) return null;
        
        return {
            ratingScore,
            ratingComment,
            selectedConditions: selectedConditions.map(c => ({ id: c.id, name: c.name })),
            selectedBenefits: selectedBenefits.map(b => ({ id: b.id, name: b.name })),
            selectedSideEffects: selectedSideEffects.map(s => ({ id: s.id, name: s.name })),
            ratingDosage,
            ratingDialogDosageUnit,
            selectedBrand: selectedBrand ? { id: selectedBrand.id, name: selectedBrand.name } : null,
            ratingDosageFrequency,
            ratingFrequencyUnit,
            editingRating: editingRating ? { id: editingRating.id } : null,
            supplementId: selectedSupplement?.id
        };
    }, [
        ratingDialogOpen,
        ratingScore,
        ratingComment,
        selectedConditions,
        selectedBenefits,
        selectedSideEffects,
        ratingDosage,
        ratingDialogDosageUnit,
        selectedBrand,
        ratingDosageFrequency,
        ratingFrequencyUnit,
        editingRating,
        selectedSupplement?.id
    ]);

    // Auto-save function for rating form
    const autoSaveRating = useCallback(async (formData) => {
        // Only auto-save if we have a supplement and some form data
        if (!formData || !formData.supplementId || !formData.ratingScore) {
            return;
        }

        // For auto-save, we'll just save to localStorage, not submit to server
        // This prevents partial submissions and allows users to continue editing
        
        return Promise.resolve();
    }, []);

    // Auto-save hook
    const { clearSavedData } = useAutoSave('rating_form', ratingFormData, autoSaveRating, {
        enableAutoSave: ratingDialogOpen,
        autoSaveInterval: 30000, // 30 seconds
        onRestoreData: (savedData) => {
            if (savedData && savedData.supplementId === selectedSupplement?.id) {
                setRatingScore(savedData.ratingScore || 1);
                setRatingComment(savedData.ratingComment || '');
                setSelectedConditions(savedData.selectedConditions || []);
                setSelectedBenefits(savedData.selectedBenefits || []);
                setSelectedSideEffects(savedData.selectedSideEffects || []);
                setRatingDosage(savedData.ratingDosage || '');
                setRatingDialogDosageUnit(savedData.ratingDialogDosageUnit || 'mg');
                setSelectedBrand(savedData.selectedBrand || null);
                setRatingDosageFrequency(savedData.ratingDosageFrequency || '1');
                setRatingFrequencyUnit(savedData.ratingFrequencyUnit || 'day');
                if (savedData.editingRating) {
                    setEditingRating(savedData.editingRating);
                }
            }
        }
    });

    const resetFormState = useCallback(() => {
        setRatingScore(1);
        setRatingComment('');
        setSelectedConditions([]);
        setSelectedBenefits([]);
        setSelectedSideEffects([]);
        setRatingDosage('');
        setRatingDialogDosageUnit(supplementDosageUnit || 'mg');
        setSelectedBrand(null);
        setRatingDosageFrequency('1');
        setRatingFrequencyUnit('day');
        setRatingImage(null);
        setEditingRating(null);
        setRatingDialogAttemptedSubmit(false);
        // Clear saved form data when resetting
        clearSavedData();
    }, [clearSavedData, supplementDosageUnit]);

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const data = await getCategories();
                setCategories(data);
            } catch (error) {
                
            }
        };

        const fetchInitialData = async () => {
            // ... existing code ...
        };

        const fetchSupplements = async () => {
            setLoading(true);
            try {
                const response = await getSupplements({ 
                    search: searchTerm, 
                    limit: supplements.length > 0 ? supplements.length + 20 : 20,
                    offset: 0, // Always fetch from start when searching
                    category: appliedFilterCategory || undefined,
                    conditions: appliedFilterConditions.map(c => c.name).join(',') || undefined,
                    benefits: appliedFilterBenefits.map(c => c.name).join(',') || undefined,
                    side_effects: appliedFilterSideEffects.map(c => c.name).join(',') || undefined,
                    brands: appliedFilterBrands.map(b => b.name).join(',') || undefined,
                    sort_by: appliedSortBy || undefined,
                });
                setSupplements(response.results);
                setHasMore(!!response.next);
            } catch (error) {
                
            } finally {
                setLoading(false);
            }
        };

        const fetchConditions = async () => {
            try {
                const data = await getConditions('');
                setConditions(data.results || data);
            } catch (error) {
                
            }
        };
        
        const fetchUserChronicConditions = async () => {
            // ... existing code ...
        };

        const fetchBrands = async () => {
            try {
                const data = await getBrands();
                setBrands(data.results || data);
            } catch (error) {
                
            }
        };

        fetchInitialData();
        // ... existing code ...
    };

    const handleSupplementClick = useCallback(async (supplementId) => {
        try {
            setLoading(true);
            setSelectedReview(null);
            const data = await getSupplement(supplementId);
            let filteredRatings = data.ratings;
            let ratingCount = data.rating_count;
            
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
                    if (appliedFilterFrequency && appliedFilterFrequencyUnit) {
                        if (!rating.dosage_frequency || !rating.frequency_unit || 
                            `${rating.dosage_frequency}` !== appliedFilterFrequency ||
                            rating.frequency_unit.toLowerCase() !== appliedFilterFrequencyUnit.toLowerCase()) {
                            return false;
                        }
                    }
                    
                    return true;
                });
                ratingCount = filteredRatings.length;
            }

            setSelectedSupplement({ ...data, ratings: filteredRatings, rating_count: ratingCount, originalRatings: data.ratings });
            setLoading(false);
        } catch (error) {
            
            setLoading(false);
            toast.error('Failed to load supplement details.');
        }
    }, [appliedFilterConditions, appliedFilterBrands, appliedFilterDosage, appliedFilterFrequency, appliedFilterDosageUnit, appliedFilterFrequencyUnit]);

    const debouncedSearch = useCallback(debounce(async (term) => {
        setLoading(true);
        try {
            const response = await getSupplements({ 
                search: term, 
                limit: 20, 
                offset: 0,
                category: appliedFilterCategory || undefined,
                conditions: appliedFilterConditions.map(c => c.name).join(',') || undefined,
                benefits: appliedFilterBenefits.map(c => c.name).join(',') || undefined,
                side_effects: appliedFilterSideEffects.map(c => c.name).join(',') || undefined,
                brands: appliedFilterBrands.map(b => b.name).join(',') || undefined,
                sort_by: appliedSortBy || undefined,
            });
            setSupplements(response.results);
            setHasMore(!!response.next);
        } catch (error) {
            
            toast.error('Failed to search supplements.');
        } finally {
            setLoading(false);
        }
    }, 500), [appliedFilterCategory, appliedFilterConditions, appliedFilterBenefits, appliedFilterSideEffects, appliedFilterBrands, appliedSortBy]);

    useEffect(() => {
        if (supplementIdFromParams) {
            // Check if the currently selected supplement is already the one from params
            // or if there's no selected supplement yet, to avoid redundant fetches if already loaded
            // by a previous click within the component.
            if (!selectedSupplement || selectedSupplement.id?.toString() !== supplementIdFromParams) {
                 handleSupplementClick(supplementIdFromParams);
            }
        }
    }, [supplementIdFromParams]); // Re-run if the ID in the URL changes

    useEffect(() => {
        if (location.state && location.state.ratingId && selectedSupplement && ratingRefs.current[location.state.ratingId]) {
            // let attempts = 0; // This was the original, correct placement
            const maxAttempts = 5;
            let attempts = 0; // Moved here to ensure it's reset for each run of tryScrollAndEdit logic if effect re-runs

            const tryScrollAndEdit = () => {
                const element = ratingRefs.current[location.state.ratingId];
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    
                    if (location.state.openEditMode) {
                        const ratingToEdit = selectedSupplement.ratings.find(r => r.id === location.state.ratingId);
                        if (ratingToEdit) {
                            handleEditRating(ratingToEdit);
                        }
                        navigate(location.pathname, { 
                            replace: true, 
                            state: { ...location.state, openEditMode: false } 
                        });
                    } else if (location.state && !location.state.hasOwnProperty('openEditMode')){
                        // If openEditMode was not part of the state, but ratingId was (for scrolling)
                        // no specific navigation state change needed here based on openEditMode.
                    }
                } else if (attempts < maxAttempts) {
                    attempts++; 
                    setTimeout(tryScrollAndEdit, 100);
                }
            };
            tryScrollAndEdit();
        }
    }, [location.state, selectedSupplement, navigate, handleEditRating, ratingRefs]);

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
                selectedFilterBenefits={selectedFilterBenefits}
                setSelectedFilterBenefits={setSelectedFilterBenefits}
                selectedFilterSideEffects={selectedFilterSideEffects}
                setSelectedFilterSideEffects={setSelectedFilterSideEffects}
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
                            {selectedConditions.length > 0 && (
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', mb: 2 }}>
                                    <Typography variant="body2" sx={{ mr: 1 }}>
                                        Showing ratings for:
                                    </Typography>
                                    {selectedConditions.map(condition => (
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
                                            onClick={handleAddRating}
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
                                .map((rating) => (
                                    <SupplementRatingItem 
                                        key={rating.id}
                                        id={`rating-${rating.id}`}
                                        ref={(el) => (ratingRefs.current[rating.id] = el)}
                                        rating={rating} 
                                        user={user}
                                        handleEditRating={(r) => {
                                            handleEditRating(r);
                                        }}
                                        handleUpvoteRating={(e, r) => {
                                            handleUpvoteRating(e, r);
                                        }}
                                        handleReviewClick={setSelectedReview} 
                                    />
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
                                        upvotes: response.upvotes_count,
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
                        <Box sx={{ mb: 2, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                            <Typography component="legend">Rating *</Typography>
                            <Rating
                                name="simple-controlled"
                                value={ratingScore}
                                onChange={(event, newValue) => {
                                    setRatingScore(newValue);
                                }}
                                sx={{mt:1}}
                            />
                            {ratingDialogAttemptedSubmit && !ratingScore && (
                                <Typography color="error" variant="caption" sx={{ mt: 1 }}>
                                    Rating is required.
                                </Typography>
                            )}
                        </Box>

                        <Divider sx={{ mt: 2, mb: 3 }}>
                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                OPTIONAL FIELDS
                            </Typography>
                        </Divider>

                        <Autocomplete
                            multiple
                            id="rating-conditions-autocomplete"
                            options={ratingDialogConditionOptions}
                            value={selectedConditions}
                            onChange={handleRatingConditionsChange}
                            onInputChange={(_, newInputValue) => setSearchCondition(newInputValue)}
                            getOptionLabel={(option) => option.name}
                            isOptionEqualToValue={(option, value) => option.id === value.id}
                            renderTags={(value, getTagProps) =>
                                value.map((option, index) => {
                                    const { key, ...otherTagProps } = getTagProps({ index });
                                    return (
                                        <Chip 
                                            key={key}
                                            variant="outlined" 
                                            label={option.name} 
                                            {...otherTagProps} 
                                            sx={option.id === SPECIAL_CHRONIC_CONDITIONS_ID ? {backgroundColor: '#e0e0e0'} : {}}
                                        />
                                    );
                                })
                            }
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    variant="outlined"
                                    label="Intended Purpose"
                                    placeholder="Select conditions"
                                    margin="normal"
                                />
                            )}
                            sx={{ mb: 2 }}
                        />

                        <Autocomplete
                            multiple
                            options={conditions}
                            getOptionLabel={(option) => option.name}
                            value={selectedBenefits}
                            onChange={(_, newValue) => setSelectedBenefits(newValue)}
                            onInputChange={(_, newInputValue) => setSearchCondition(newInputValue)}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="Benefits For"
                                    placeholder="Select benefits"
                                    margin="normal"
                                />
                            )}
                            sx={{ mb: 2 }}
                        />

                        <Autocomplete
                            multiple
                            options={conditions}
                            getOptionLabel={(option) => option.name}
                            value={selectedSideEffects}
                            onChange={(_, newValue) => setSelectedSideEffects(newValue)}
                            onInputChange={(_, newInputValue) => setSearchCondition(newInputValue)}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="Side Effects"
                                    placeholder="Select side effects"
                                    margin="normal"
                                />
                            )}
                            sx={{ mb: 2 }}
                        />

                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2 }}>
                            {supplementDosageUnit ? (
                                <TextField
                                    label="Dosage"
                                    type="number"
                                    variant="outlined"
                                    value={ratingDosage}
                                    onChange={(e) => setRatingDosage(e.target.value)}
                                    sx={{ width: '256px' }}
                                    placeholder="e.g., 500"
                                    InputProps={{
                                        inputProps: { min: 0 },
                                        endAdornment: <InputAdornment position="end">{supplementDosageUnit}</InputAdornment>,
                                    }}
                                />
                            ) : (
                                <>
                                    <TextField
                                        label="Dosage"
                                        type="number"
                                        variant="outlined"
                                        value={ratingDosage}
                                        onChange={(e) => setRatingDosage(e.target.value)}
                                        sx={{ width: '120px' }}
                                        placeholder="e.g., 500"
                                        InputProps={{ inputProps: { min: 0 } }}
                                    />
                                    <TextField
                                        select
                                        label="Unit"
                                        value={ratingDialogDosageUnit}
                                        onChange={(e) => setRatingDialogDosageUnit(e.target.value)}
                                        sx={{ width: '120px' }}
                                        variant="outlined"
                                    >
                                        <MenuItem value="mg">mg</MenuItem>
                                        <MenuItem value="g">g</MenuItem>
                                        <MenuItem value="mcg">mcg</MenuItem>
                                        <MenuItem value="ml">ml</MenuItem>
                                        <MenuItem value="IU">IU</MenuItem>
                                        <MenuItem value="µg">µg</MenuItem>
                                        <MenuItem value="tsp">tsp</MenuItem>
                                        <MenuItem value="tbsp">tbsp</MenuItem>
                                        <MenuItem value="drops">drops</MenuItem>
                                        <MenuItem value="capsule">capsule(s)</MenuItem>
                                        <MenuItem value="tablet">tablet(s)</MenuItem>
                                        <MenuItem value="piece">piece(s)</MenuItem>
                                        <MenuItem value="oz">oz</MenuItem>
                                        <MenuItem value="fl oz">fl oz</MenuItem>
                                        <MenuItem value="cc">cc</MenuItem>
                                        <MenuItem value="other">other</MenuItem>
                                    </TextField>
                                </>
                            )}
                            <TextField
                                label="Times"
                                type="number"
                                variant="outlined"
                                value={ratingDosageFrequency}
                                onChange={(e) => setRatingDosageFrequency(e.target.value)}
                                sx={{ width: '90px' }}
                                placeholder="e.g., 2"
                                InputProps={{ inputProps: { min: 1 } }}
                            />
                            <TextField
                                select
                                label="Frequency"
                                value={ratingFrequencyUnit}
                                onChange={(e) => setRatingFrequencyUnit(e.target.value)}
                                sx={{ width: '130px' }}
                                variant="outlined"
                            >
                                <MenuItem value="day">Per Day</MenuItem>
                                <MenuItem value="week">Per Week</MenuItem>
                                <MenuItem value="month">Per Month</MenuItem>
                                <MenuItem value="year">Per Year</MenuItem>
                            </TextField>
                        </Box>

                        <Autocomplete
                            options={brands}
                            getOptionLabel={(option) => option.name}
                            value={selectedBrand}
                            onChange={(_, newValue) => setSelectedBrand(newValue)}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="Brand Used"
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
                        disabled={!ratingScore}
                    >
                        Submit
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

export default SearchableSupplementList; 