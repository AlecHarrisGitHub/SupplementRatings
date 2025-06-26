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
        console.log('Auto-saving rating form data...');
        return Promise.resolve();
    }, []);

    // Auto-save hook
    const { clearSavedData } = useAutoSave('rating_form', ratingFormData, autoSaveRating, {
        enableAutoSave: ratingDialogOpen,
        autoSaveInterval: 30000, // 30 seconds
        onRestoreData: (savedData) => {
            if (savedData) {
                setRatingScore(savedData.ratingScore || 1);
                setRatingComment(savedData.ratingComment || '');
                setSelectedConditions(savedData.selectedConditions || []);
                setSelectedBenefits(savedData.selectedBenefits || []);
                setSelectedSideEffects(savedData.selectedSideEffects || []);
                setRatingDosage(savedData.ratingDosage || '');
                setRatingDialogDosageUnit(savedData.ratingDialogDosageUnit || supplementDosageUnit || 'mg');
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
                console.error('Error fetching categories:', error);
                toast.error('Failed to fetch categories');
            }
        };
        fetchCategories();
    }, []);

    const debouncedSearch = useCallback(
        debounce((term) => {
            setCurrentSearch(term);
        }, 300),
        []
    );

    const memoizedHandleSearchChange = useCallback((e) => {
        setSearchTerm(e.target.value);
        debouncedSearch(e.target.value);
    }, [debouncedSearch]);

    useEffect(() => {
        const fetchSupplements = async () => {
            try {
                setLoading(true);
                const params = {
                    ...(currentSearch ? { search: currentSearch } : {}),
                    ...(appliedFilterCategory ? { category: appliedFilterCategory } : {}),
                    ...(appliedFilterConditions.length > 0 ? { 
                        conditions: appliedFilterConditions.map(c => c.name).join(',') 
                    } : {}),
                    ...(appliedFilterBenefits.length > 0 ? {
                        benefits: appliedFilterBenefits.map(b => b.name).join(',')
                    } : {}),
                    ...(appliedFilterSideEffects.length > 0 ? {
                        side_effects: appliedFilterSideEffects.map(se => se.name).join(',')
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
                setSupplements(data.results || []);
                setOffset(10);
                setHasMore(data.next !== null);
            } catch (error) {
                console.error('Error fetching supplements:', error);
                toast.error('Failed to fetch supplements');
            } finally {
                setLoading(false);
            }
        };
        fetchSupplements();
    }, [currentSearch, appliedFilterCategory, appliedFilterConditions, appliedFilterBrands, appliedFilterDosage, appliedFilterDosageUnit, appliedFilterFrequency, appliedFilterFrequencyUnit, appliedSortBy, appliedFilterBenefits, appliedFilterSideEffects]);

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
            let newFilteredRatings;
            if (appliedFilterConditions.length > 0 || appliedFilterBenefits.length > 0 || appliedFilterSideEffects.length > 0) {
                const lowercasedFilterConditionNames = appliedFilterConditions.map(c => c.name.toLowerCase());
                const lowercasedFilterBenefitNames = appliedFilterBenefits.map(b => b.name.toLowerCase());
                const lowercasedFilterSideEffectNames = appliedFilterSideEffects.map(se => se.name.toLowerCase());
                
                newFilteredRatings = selectedSupplement.originalRatings.filter(rating => {
                    const matchesConditions = appliedFilterConditions.length === 0 || (rating.condition_names && rating.condition_names.some(rn => 
                        lowercasedFilterConditionNames.includes(rn.toLowerCase())
                    ));
                    const matchesBenefits = appliedFilterBenefits.length === 0 || (rating.benefit_names && rating.benefit_names.some(bn => 
                        lowercasedFilterBenefitNames.includes(bn.toLowerCase())
                    ));
                    const matchesSideEffects = appliedFilterSideEffects.length === 0 || (rating.side_effect_names && rating.side_effect_names.some(sen => 
                        lowercasedFilterSideEffectNames.includes(sen.toLowerCase())
                    ));
                    return matchesConditions && matchesBenefits && matchesSideEffects;
                });
            } else {
                newFilteredRatings = selectedSupplement.originalRatings;
            }

            const currentRatings = selectedSupplement.ratings || [];
            const currentRatingIds = JSON.stringify(currentRatings.map(r => r.id).sort());
            const newRatingIds = JSON.stringify(newFilteredRatings.map(r => r.id).sort());

            if (currentRatingIds !== newRatingIds) {
                setSelectedSupplement(prev => ({
                    ...prev,
                    ratings: newFilteredRatings
                }));
            }
        }
    }, [appliedFilterConditions, appliedFilterBenefits, appliedFilterSideEffects, selectedSupplement]);

    useEffect(() => {
        const fetchBrands = async () => {
            try {
                const data = await getBrands();
                // Ensure brands are sorted before setting state if needed elsewhere,
                // but for the filter, we use sortedBrands directly in FilterDrawer.
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
                    if (appliedFilterFrequency) {
                        // Convert all values to strings for comparison
                        const ratingDosageFrequency = String(rating.dosage_frequency);
                        const filterFrequency = String(appliedFilterFrequency);
                        
                        if (!rating.dosage_frequency || !rating.frequency_unit ||
                            ratingDosageFrequency !== filterFrequency ||
                            rating.frequency_unit !== appliedFilterFrequencyUnit) {
                            return false;
                        }
                    }

                    return true;
                });
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
    }, [appliedFilterConditions, appliedFilterBrands, appliedFilterDosage, appliedFilterFrequency, appliedFilterDosageUnit, appliedFilterFrequencyUnit]);

    const handleBackToList = async () => {
        try {
            setLoading(true);
            const params = {
                ...(currentSearch ? { search: currentSearch } : {}),
                ...(appliedFilterCategory ? { category: appliedFilterCategory } : {}),
                ...(appliedFilterConditions.length > 0 ? { 
                    conditions: appliedFilterConditions.map(c => c.name).join(',') 
                } : {}),
                ...(appliedFilterBenefits.length > 0 ? {
                    benefits: appliedFilterBenefits.map(b => b.name).join(',')
                } : {}),
                ...(appliedFilterSideEffects.length > 0 ? {
                    side_effects: appliedFilterSideEffects.map(se => se.name).join(',')
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
            setSupplements(data.results || []);
            setSelectedSupplement(null);
            setOffset(10);
            setHasMore(data.next !== null);
        } catch (error) {
            console.error('Error refreshing supplements:', error);
            toast.error('Failed to refresh supplements list');
        } finally {
            setLoading(false);
        }
    };

    const parseDosage = useCallback((dosageString) => {
        if (!dosageString) return { value: '', unit: 'mg' };
        const match = dosageString.match(/^(\d*\.?\d+)\s*([a-zA-Zμg]+)$/);
        if (match) {
            return { value: match[1], unit: match[2] };
        }
        if (String(dosageString).match(/^(\d*\.?\d+)$/)) {
            return { value: dosageString, unit: 'mg' };
        }
        return { value: dosageString, unit: 'mg' };
    }, []);
    
    const handleEditRating = useCallback((rating) => {
        setEditingRating(rating);
        setSelectedConditions(rating.conditions.map(id => conditions.find(c => c.id === id)).filter(c => c));
        setSelectedBenefits(rating.benefits ? rating.benefits.map(id => conditions.find(c => c.id === id)).filter(c => c) : []);
        setSelectedSideEffects(rating.side_effects ? rating.side_effects.map(id => conditions.find(c => c.id === id)).filter(c => c) : []);
        setRatingScore(rating.score);
        setRatingComment(rating.comment || '');
        setRatingImage(null);
        
        const parsedDosage = parseDosage(rating.dosage);
        setRatingDosage(parsedDosage.value);
        setRatingDialogDosageUnit(supplementDosageUnit || parsedDosage.unit);
        
        setRatingDosageFrequency(rating.dosage_frequency || '1');
        setRatingFrequencyUnit(rating.frequency_unit || 'day');

        if (rating.brands) {
            const brandObj = brands.find(b => b.name.toLowerCase() === rating.brands.toLowerCase());
            setSelectedBrand(brandObj || { name: rating.brands });
        } else {
            setSelectedBrand(null);
        }
        
        setRatingDialogOpen(true);
        setRatingDialogAttemptedSubmit(false);
    }, [conditions, brands, parseDosage, supplementDosageUnit]);

    const handleAddRating = () => {
        resetFormState();
        setRatingDialogOpen(true);
    };

    const handleCloseRatingDialog = () => {
        // Check if there are unsaved changes
        const hasChanges = ratingScore !== 1 || 
                          ratingComment || 
                          selectedConditions.length > 0 || 
                          selectedBenefits.length > 0 || 
                          selectedSideEffects.length > 0 || 
                          ratingDosage || 
                          selectedBrand;
        
        if (hasChanges) {
            const confirmed = window.confirm('You have unsaved changes. Are you sure you want to close? Your work will be saved automatically.');
            if (!confirmed) {
                return;
            }
        }
        
        resetFormState();
        setRatingDialogOpen(false);
    };

    const handleRatingSubmit = useCallback(async (e) => {
        if (e) {
            e.preventDefault();
        }
        setRatingDialogAttemptedSubmit(true);

        const actualConditionsToSubmit = selectedConditions.filter(c => c.id !== SPECIAL_CHRONIC_CONDITIONS_ID);

        if (!ratingScore) {
            toast.error("Rating is required.");
            return;
        }

        try {
            const formData = new FormData();
            formData.append('supplement', selectedSupplement.id);
            
            actualConditionsToSubmit.forEach(condition => {
                formData.append('conditions', condition.id);
            });
            selectedBenefits.forEach(benefit => {
                formData.append('benefits', benefit.id);
            });
            selectedSideEffects.forEach(sideEffect => {
                formData.append('side_effects', sideEffect.id);
            });
            
            formData.append('score', ratingScore);
            formData.append('comment', ratingComment || '');
            
            // Dosage fields
            if (ratingDosage) {
                formData.append('dosage', `${ratingDosage}${ratingDialogDosageUnit}`);
                // Only send frequency and unit if dosage is present
                if (ratingDosageFrequency && ratingFrequencyUnit) {
                    formData.append('dosage_frequency', ratingDosageFrequency);
                    formData.append('frequency_unit', ratingFrequencyUnit);
                }
            } else if (editingRating && editingRating.dosage) {
                // If editing and ratingDosage is now empty, explicitly send empty to clear
                formData.append('dosage', ''); 
                // Backend will clear frequency/unit if dosage becomes null/empty
            }

            // Brands
            if (selectedBrand && selectedBrand.name) {
                formData.append('brands', selectedBrand.name);
            } else if (editingRating && editingRating.brands) {
                // If editing and selectedBrand is now null/empty, explicitly send empty to clear
                formData.append('brands', '');
            }

            // Image handling for create/update/clear
            if (ratingImage instanceof File) { // A new file is selected
                formData.append('image', ratingImage);
            } else if (editingRating && editingRating.image_url && ratingImage === null) {
                // User wants to remove the existing image, send an empty string for 'image'
                // The backend serializer will interpret this as None for the FileField if setup correctly,
                // or our pop('image', 'UNCHANGED') logic handles it via `image_data is None`.
                formData.append('image', ''); 
            }
            // If ratingImage is null and not editing, or ratingImage is undefined, 
            // do nothing, and the backend won't update the image (due to 'UNCHANGED' sentinel).

            if (editingRating) {
                await updateRating(editingRating.id, formData);
                toast.success('Rating updated successfully');
            } else {
                await addRating(formData);
                toast.success('Rating added successfully');
            }
            
            // Clear saved form data after successful submission
            clearSavedData();
            resetFormState();
            setRatingDialogOpen(false);
            
            if (selectedSupplement && selectedSupplement.id) {
                handleSupplementClick(selectedSupplement.id);
            }
        } catch (error) {
            toast.error(error.userMessage || 'Failed to submit rating. Please try again.');
        }
    }, [selectedConditions, ratingScore, selectedSupplement, selectedBenefits, selectedSideEffects, ratingDosage, ratingDialogDosageUnit, ratingDosageFrequency, ratingFrequencyUnit, selectedBrand, ratingImage, editingRating, resetFormState, handleSupplementClick, ratingComment, clearSavedData]);

    const handleApplyFilter = () => {
        setAppliedFilterCategory(selectedFilterCategory);
        setAppliedFilterConditions(selectedFilterConditions);
        setAppliedFilterBenefits(selectedFilterBenefits);
        setAppliedFilterSideEffects(selectedFilterSideEffects);
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
        setSelectedFilterBenefits([]);
        setSelectedFilterSideEffects([]);
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
        setAppliedFilterBenefits([]);
        setAppliedFilterSideEffects([]);
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
            
            // console.log('Updated supplement data:', refreshedData); // Debug log
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
                ...(currentSearch ? { search: currentSearch } : {}),
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
            const data = await getSupplements(params);
            setSupplements(prevSupplements => [...prevSupplements, ...(data.results || [])]);
            setOffset(offset + (data.results ? data.results.length : 0));
            setHasMore(data.next !== null);
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
                        upvotes: response.upvotes_count,
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

    const ratingDialogConditionOptions = useMemo(() => {
        let options = [...conditions];
        if (user && user.chronic_conditions && user.chronic_conditions.length > 0) {
            const specialOption = { 
                id: SPECIAL_CHRONIC_CONDITIONS_ID, 
                name: '✨ Use My Saved Chronic Conditions' 
            };
            // Check if special option is already effectively selected via all chronic conditions being present
            const allUserChronicSelected = user.chronic_conditions.every(uc => 
                selectedConditions.some(rc => rc.id === uc.id)
            );
            // Add special option if not all user chronic conditions are already selected
            // or if the special option itself is part of selectedConditions
            if (!allUserChronicSelected || selectedConditions.some(rc => rc.id === SPECIAL_CHRONIC_CONDITIONS_ID)) {
                 options.unshift(specialOption);
            }
        }
        return options.sort((a, b) => { // Sort with special option at top
            if (a.id === SPECIAL_CHRONIC_CONDITIONS_ID) return -1;
            if (b.id === SPECIAL_CHRONIC_CONDITIONS_ID) return 1;
            return a.name.localeCompare(b.name);
        });
    }, [conditions, user, selectedConditions]);

    const handleRatingConditionsChange = (event, newValue) => {
        const userChronicConditions = (user && user.chronic_conditions) || [];
        let newSelected = [...newValue];
        
        const specialOptionIsSelected = newValue.some(option => option.id === SPECIAL_CHRONIC_CONDITIONS_ID);
        const specialOptionWasSelected = selectedConditions.some(option => option.id === SPECIAL_CHRONIC_CONDITIONS_ID);

        if (specialOptionIsSelected && !specialOptionWasSelected) { // Special option was just added
            userChronicConditions.forEach(uc => {
                if (!newSelected.some(nc => nc.id === uc.id)) {
                    newSelected.push(uc); // Add user's chronic conditions
                }
            });
        } else if (!specialOptionIsSelected && specialOptionWasSelected) { // Special option was just removed
            // Remove user's chronic conditions, but keep the ones that might have been added individually
            // This logic can be tricky: if a user selected "Use My Saved" then deselected one of their chronic conditions,
            // then deselected "Use My Saved", should that one condition remain?
            // Simplest approach: remove all that match user.chronic_conditions unless they are in newValue explicitly
            newSelected = newSelected.filter(nc => {
                if (nc.id === SPECIAL_CHRONIC_CONDITIONS_ID) return false; // remove special option if present
                const isUserChronic = userChronicConditions.some(uc => uc.id === nc.id);
                if (isUserChronic) {
                    // Check if this condition is still in newValue (meaning it was re-selected or wasn't removed)
                    return newValue.some(val => val.id === nc.id && val.id !== SPECIAL_CHRONIC_CONDITIONS_ID);
                }
                return true; // keep non-chronic conditions
            });
             // Ensure the special option itself is not in the actual selected conditions list if deselected
            newSelected = newSelected.filter(c => c.id !== SPECIAL_CHRONIC_CONDITIONS_ID);
        }
        
        // Deduplicate and filter out the special option if it was only a trigger
        const finalSelected = [];
        const addedIds = new Set();
        // Add special option first if it's in newSelected, so it appears in the input field
        if (newSelected.some(c => c.id === SPECIAL_CHRONIC_CONDITIONS_ID)) {
            const specialOpt = ratingDialogConditionOptions.find(opt => opt.id === SPECIAL_CHRONIC_CONDITIONS_ID);
            if (specialOpt) {
                 finalSelected.push(specialOpt);
                 addedIds.add(SPECIAL_CHRONIC_CONDITIONS_ID);
            }
        }
        // Add other conditions
        newSelected.forEach(condition => {
            if (condition.id !== SPECIAL_CHRONIC_CONDITIONS_ID && !addedIds.has(condition.id)) {
                finalSelected.push(condition);
                addedIds.add(condition.id);
            }
        });
        
        setSelectedConditions(finalSelected);
    };

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