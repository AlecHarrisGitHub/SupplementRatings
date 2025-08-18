import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { getSupplement, addRating, updateRating, getConditions, getBrands } from '../services/api';
import ReviewDetail from '../components/ReviewDetail';
import ImageUpload from '../components/ImageUpload';
import { 
    Container, 
    CircularProgress, 
    Typography, 
    Alert, 
    Button, 
    Paper, 
    Rating, 
    Box, 
    Select, 
    MenuItem, 
    List, 
    Avatar,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Autocomplete,
    Divider,
    Chip,
    InputAdornment
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import ForumOutlinedIcon from '@mui/icons-material/ForumOutlined';
import AddIcon from '@mui/icons-material/Add';
import FilterListIcon from '@mui/icons-material/FilterList';
import { IconButton } from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

const defaultProfileImage = 'http://localhost:8000/media/profile_pics/default.jpg';
const SPECIAL_CHRONIC_CONDITIONS_ID = '__MY_CHRONIC_CONDITIONS__';

// Format date helper
const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${month}/${day}/${year}`;
};

// Rating item component (simplified version from SearchableSupplementList)
const SupplementRatingItem = ({ rating, handleReviewClick, user, handleEditRating }) => {
    return (
        <Paper 
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
            {/* Top Section: User Info & Rating */}
            <Box sx={{ 
                display: 'flex', 
                flexDirection: { xs: 'column', sm: 'row' },
                justifyContent: { xs: 'flex-start', sm: 'space-between' },
                alignItems: { xs: 'flex-start', sm: 'center' },
                mb: 1,
                gap: { xs: 1, sm: 0 }
            }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <RouterLink to={`/profile/${rating.user.username}`} style={{ textDecoration: 'none' }} onClick={(e) => e.stopPropagation()}>
                        <Avatar 
                            src={rating.user.profile_image_url || defaultProfileImage} 
                            alt={rating.user.username}
                            sx={{ width: 40, height: 40 }}
                        />
                    </RouterLink>
                    <Box>
                        <RouterLink to={`/profile/${rating.user.username}`} style={{ textDecoration: 'none', color: 'inherit' }} onClick={(e) => e.stopPropagation()}>
                            <Typography variant="subtitle1" fontWeight="bold" sx={{
                                "&:hover": { textDecoration: 'underline'}
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
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <IconButton size="small" disabled>
                        <ThumbUpIcon fontSize="small" />
                        <Typography variant="caption" sx={{ ml: 0.5 }}>
                            {rating.upvotes || 0}
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

            {/* Rating Details */}
            <Box sx={{ mb: 1 }}>
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
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1, whiteSpace: 'pre-wrap' }}>
                        {rating.comment}
                    </Typography>
                }
            </Box>

            {rating.image_url && (
                <Box sx={{ mt: 1, mb: 1 }}>
                    <img 
                        src={rating.image_url}
                        alt="Rating attachment"
                        style={{ maxWidth: '100%', height: 'auto', borderRadius: '4px' }}
                    />
                </Box>
            )}

            {/* Bottom Section: Comment Count & Date */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    {typeof rating.comments_count === 'number' && rating.comments_count >= 0 && (
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <ForumOutlinedIcon fontSize="small" sx={{ color: 'text.secondary', mr: 0.25 }} />
                            <Typography variant="caption" color="text.secondary">
                                {rating.comments_count}
                            </Typography>
                        </Box>
                    )}
                </Box>
                <Typography variant="caption" color="text.secondary">
                    {formatDate(rating.created_at)}
                </Typography>
            </Box>
        </Paper>
    );
};

function SupplementDetailPage() {
    const { user, isAuthenticated, updateUser } = useAuth();
    const { id: supplementId } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const [supplement, setSupplement] = useState(null);
    const [selectedReview, setSelectedReview] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [sortOrder, setSortOrder] = useState('likes');
    
    // Search state
    const [searchTerm, setSearchTerm] = useState('');
    
    // Rating dialog state
    const [ratingDialogOpen, setRatingDialogOpen] = useState(false);
    const [ratingScore, setRatingScore] = useState(1);
    const [ratingComment, setRatingComment] = useState('');
    const [conditions, setConditions] = useState([]);
    const [selectedConditions, setSelectedConditions] = useState([]);
    const [selectedBenefits, setSelectedBenefits] = useState([]);
    const [selectedSideEffects, setSelectedSideEffects] = useState([]);
    const [editingRating, setEditingRating] = useState(null);
    const [ratingDosage, setRatingDosage] = useState('');
    const [ratingDialogDosageUnit, setRatingDialogDosageUnit] = useState('mg');
    const [ratingDosageFrequency, setRatingDosageFrequency] = useState('1');
    const [ratingFrequencyUnit, setRatingFrequencyUnit] = useState('day');
    const [brands, setBrands] = useState([]);
    const [selectedBrand, setSelectedBrand] = useState(null);
    const [ratingImage, setRatingImage] = useState(null);
    const [searchCondition, setSearchCondition] = useState('');

    const { ratingId, commentId } = location.state || {};

    const supplementDosageUnit = supplement?.dosage_unit;

    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
    };

    const handleKeyDown = (event) => {
        if (event.key === 'Enter' && searchTerm.trim()) {
            // Navigate to supplements list with search term
            navigate('/supplements', { state: { searchTerm: searchTerm.trim() } });
        }
    };

    const handleFilterClick = () => {
        // Navigate back to supplements list to use filters
        navigate('/supplements');
    };

    useEffect(() => {
        const fetchSupplementDetails = async () => {
            setLoading(true);
            setError(null);
            try {
                const supplementData = await getSupplement(supplementId);
                setSupplement(supplementData);

                if (ratingId) {
                    const foundRating = supplementData.ratings?.find(r => String(r.id) === String(ratingId));
                    if (foundRating) {
                        setSelectedReview(foundRating);
                    } else {
                        console.warn(`Rating with ID ${ratingId} not found in supplement ${supplementId}`);
                        setSelectedReview(null);
                    }
                } else if (commentId && supplementData.ratings) {
                    // Find the rating that contains this comment
                    let containingRating = null;
                    for (const r of supplementData.ratings) {
                        if (r.comments?.some(c => String(c.id) === String(commentId))) {
                            containingRating = r;
                            break;
                        }
                    }
                    if (containingRating) {
                        setSelectedReview(containingRating);
                    }
                } else {
                    setSelectedReview(null);
                }

            } catch (err) {
                console.error("Error fetching supplement details:", err);
                setError(err.message || 'Failed to load supplement details.');
            } finally {
                setLoading(false);
            }
        };

        if (supplementId) {
            fetchSupplementDetails();
        }
    }, [supplementId, ratingId, commentId]);

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

    const getSortedRatings = (ratings) => {
        if (!ratings) return [];
        return [...ratings].sort((a, b) => {
            if (sortOrder === 'likes') {
                return (b.upvotes || 0) - (a.upvotes || 0);
            } else {
                return new Date(b.created_at) - new Date(a.created_at);
            }
        });
    };

    const handleAddRating = () => {
        resetFormState();
        setRatingDialogOpen(true);
    };

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
    }, [supplementDosageUnit]);

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
    }, [conditions, brands, parseDosage, supplementDosageUnit]);

    const handleRatingSubmit = useCallback(async (e) => {
        if (e) {
            e.preventDefault();
        }

        if (!ratingScore) {
            toast.error("Rating is required.");
            return;
        }

        try {
            const formData = new FormData();
            formData.append('supplement', supplement.id);
            
            selectedConditions.forEach(condition => {
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
            
            if (ratingDosage) {
                formData.append('dosage', `${ratingDosage}${ratingDialogDosageUnit}`);
                if (ratingDosageFrequency && ratingFrequencyUnit) {
                    formData.append('dosage_frequency', ratingDosageFrequency);
                    formData.append('frequency_unit', ratingFrequencyUnit);
                }
            }

            if (selectedBrand && selectedBrand.name) {
                formData.append('brands', selectedBrand.name);
            }

            if (ratingImage instanceof File) {
                formData.append('image', ratingImage);
            }

            if (editingRating) {
                await updateRating(editingRating.id, formData);
                toast.success('Rating updated successfully');
            } else {
                await addRating(formData);
                toast.success('Rating added successfully');
            }
            
            resetFormState();
            setRatingDialogOpen(false);
            
            // Refresh supplement data
            const refreshedData = await getSupplement(supplementId);
            setSupplement(refreshedData);
            
        } catch (error) {
            toast.error(error.userMessage || 'Failed to submit rating. Please try again.');
        }
    }, [selectedConditions, ratingScore, supplement, selectedBenefits, selectedSideEffects, ratingDosage, ratingDialogDosageUnit, ratingDosageFrequency, ratingFrequencyUnit, selectedBrand, ratingImage, editingRating, resetFormState, supplementId, ratingComment]);

    if (loading) {
        return (
            <Box sx={{ maxWidth: 800, mx: 'auto', p: 3, textAlign: 'center', mt: 5 }}>
                <CircularProgress />
                <Typography>Loading supplement details...</Typography>
            </Box>
        );
    }

    if (error) {
        return (
            <Box sx={{ maxWidth: 800, mx: 'auto', p: 3, textAlign: 'center', mt: 5 }}>
                <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
                <Button variant="outlined" onClick={() => navigate('/supplements')}>
                    Back to Supplements
                </Button>
            </Box>
        );
    }

    if (!supplement) {
        return (
            <Box sx={{ maxWidth: 800, mx: 'auto', p: 3, textAlign: 'center', mt: 5 }}>
                <Typography>Supplement not found.</Typography>
                <Button variant="outlined" onClick={() => navigate('/supplements')}>
                    Back to Supplements
                </Button>
            </Box>
        );
    }

    return (
        <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
            {/* Search Bar - Always visible at top */}
            <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                <TextField
                    fullWidth
                    label="Search Supplements"
                    variant="outlined"
                    value={searchTerm}
                    onChange={handleSearchChange}
                    onKeyDown={handleKeyDown}
                    placeholder="Press Enter to search"
                />
                <Button
                    variant="outlined"
                    startIcon={<FilterListIcon />}
                    onClick={handleFilterClick}
                >
                    Filter
                </Button>
            </Box>

            <Button 
                onClick={() => navigate('/supplements')}
                sx={{ mb: 2 }}
            >
                Back to List
            </Button>
            
            <Paper sx={{ p: 3, mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Typography variant="h5">
                        {supplement.name}
                    </Typography>
                </Box>

                <Box sx={{ mb: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Typography variant="subtitle1">
                                {supplement.ratings?.length > 0 ? (
                                    `Average Rating: ${(supplement.ratings.reduce((sum, rating) => sum + rating.score, 0) / supplement.ratings.length).toFixed(1)} (${supplement.ratings.length} ${supplement.ratings.length === 1 ? 'rating' : 'ratings'})`
                                ) : (
                                    'No ratings yet'
                                )}
                            </Typography>
                            {user && !supplement.ratings?.some(r => r.user.id === user.id) && (
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
                </Box>

                <List>
                    {!selectedReview ? (
                        // Show all reviews
                        getSortedRatings(supplement.ratings).map((rating) => (
                            <SupplementRatingItem 
                                key={rating.id}
                                rating={rating}
                                user={user}
                                handleReviewClick={setSelectedReview}
                                handleEditRating={handleEditRating}
                            />
                        ))
                    ) : (
                        // Show specific review detail
                        <ReviewDetail
                            key={selectedReview.id} 
                            rating={selectedReview}
                            onBack={() => setSelectedReview(null)}
                            onCommentAdded={(newComment) => {
                                console.log('Comment added:', newComment);
                                // Refresh supplement data to get updated comments
                                getSupplement(supplementId).then(data => setSupplement(data));
                            }}
                            onEditRating={(updatedRatingData, isTextOnlyUpdate) => {
                                setSelectedReview(prev => ({...prev, ...updatedRatingData}));
                                setSupplement(prevSup => ({
                                    ...prevSup,
                                    ratings: prevSup.ratings.map(r => r.id === updatedRatingData.id ? {...r, ...updatedRatingData} : r)
                                }));
                                console.log('Rating edited:', updatedRatingData);
                            }}
                            onCommentEdited={(updatedComment) => {
                                // Refresh the supplement data to ensure all comment states are updated
                                getSupplement(supplementId).then(data => {
                                    setSupplement(data);
                                    // If the currently selected review has comments, find the updated one
                                    const newSelectedReview = data.ratings.find(r => r.id === selectedReview.id);
                                    if (newSelectedReview) {
                                        setSelectedReview(newSelectedReview);
                                    }
                                });
                                // Also update the user context to refresh comment list on AccountsPage
                                updateUser({ 
                                    comments: user.comments.map(c => 
                                        c.id === updatedComment.id ? updatedComment : c
                                    ) 
                                });
                            }}
                        />
                    )}
                </List>
            </Paper>

            {/* Rating Dialog */}
            <Dialog 
                open={ratingDialogOpen} 
                onClose={() => setRatingDialogOpen(false)}
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
                        </Box>

                        <Divider sx={{ mt: 2, mb: 3 }}>
                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                OPTIONAL FIELDS
                            </Typography>
                        </Divider>

                        <TextField
                            fullWidth
                            multiline
                            rows={4}
                            label="Comment"
                            value={ratingComment}
                            onChange={(e) => setRatingComment(e.target.value)}
                            sx={{ mb: 2 }}
                        />

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

                        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>Dosage</Typography>
                        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'stretch', sm: 'flex-start' }, gap: 2, mb: 2 }}>
                            {supplementDosageUnit ? (
                                <TextField
                                    label="Amount"
                                    type="number"
                                    variant="outlined"
                                    value={ratingDosage}
                                    onChange={(e) => setRatingDosage(e.target.value)}
                                    sx={{ width: { xs: '100%', sm: '256px' } }}
                                    placeholder="e.g., 500"
                                    InputProps={{
                                        inputProps: { min: 0 },
                                        endAdornment: <InputAdornment position="end">{supplementDosageUnit}</InputAdornment>,
                                    }}
                                />
                            ) : (
                                <>
                                    <TextField
                                        label="Amount"
                                        type="number"
                                        variant="outlined"
                                        value={ratingDosage}
                                        onChange={(e) => setRatingDosage(e.target.value)}
                                        sx={{ width: { xs: '100%', sm: '120px' } }}
                                        placeholder="e.g., 500"
                                        InputProps={{ inputProps: { min: 0 } }}
                                    />
                                    <TextField
                                        select
                                        label="Unit"
                                        value={ratingDialogDosageUnit}
                                        onChange={(e) => setRatingDialogDosageUnit(e.target.value)}
                                        sx={{ width: { xs: '100%', sm: '120px' } }}
                                        variant="outlined"
                                    >
                                        <MenuItem value="mg">mg</MenuItem>
                                        <MenuItem value="g">g</MenuItem>
                                        <MenuItem value="mcg">mcg</MenuItem>
                                        <MenuItem value="ml">ml</MenuItem>
                                        <MenuItem value="IU">IU</MenuItem>
                                    </TextField>
                                </>
                            )}
                            <TextField
                                label="Times"
                                type="number"
                                variant="outlined"
                                value={ratingDosageFrequency}
                                onChange={(e) => setRatingDosageFrequency(e.target.value)}
                                sx={{ width: { xs: '100%', sm: '90px' } }}
                                placeholder="e.g., 2"
                                InputProps={{ inputProps: { min: 1 } }}
                            />
                            <TextField
                                select
                                label="Frequency"
                                value={ratingFrequencyUnit}
                                onChange={(e) => setRatingFrequencyUnit(e.target.value)}
                                sx={{ width: { xs: '100%', sm: '130px' } }}
                                variant="outlined"
                            >
                                <MenuItem value="day">Per Day</MenuItem>
                                <MenuItem value="week">Per Week</MenuItem>
                                <MenuItem value="month">Per Month</MenuItem>
                                <MenuItem value="year">Per Year</MenuItem>
                            </TextField>
                        </Box>

                        
                        
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

export default SupplementDetailPage; 