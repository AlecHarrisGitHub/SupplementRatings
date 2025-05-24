import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import {
    Typography,
    Container,
    List,
    ListItem,
    ListItemText,
    Paper,
    CircularProgress,
    Alert,
    Box,
    Chip,
    Button,
    Avatar,
    Snackbar,
    Autocomplete,
    TextField as MuiTextField
} from '@mui/material';
import { format } from 'date-fns';
import { Link as RouterLink } from 'react-router-dom';
import { updateProfileImage as updateProfileImageAPI, getAllConditions, updateUserChronicConditions as updateUserChronicConditionsAPI } from '../services/api';
import { styled } from '@mui/material/styles';

const Input = styled('input')({
    display: 'none',
});

const defaultProfileImage = 'http://localhost:8000/media/profile_pics/default.jpg';

function AccountsPage() {
    const { user, updateUser } = useAuth();
    const [ratings, setRatings] = useState([]);
    const [loadingRatings, setLoadingRatings] = useState(true);
    const [ratingsError, setRatingsError] = useState(null);
    const [nextPage, setNextPage] = useState(null);
    const [loadingMore, setLoadingMore] = useState(false);

    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState(null);
    const [uploadSuccess, setUploadSuccess] = useState(false);
    const fileInputRef = useRef(null);

    const [allConditions, setAllConditions] = useState([]);
    const [selectedConditions, setSelectedConditions] = useState([]);
    const [loadingAllConditions, setLoadingAllConditions] = useState(true);
    const [conditionsError, setConditionsError] = useState(null);
    const [savingConditions, setSavingConditions] = useState(false);
    const [saveConditionsSuccess, setSaveConditionsSuccess] = useState(false);

    const fetchRatings = async (url) => {
        if (!user) {
            setRatingsError("User not found. Please log in.");
            setLoadingRatings(false);
            return;
        }
        setLoadingMore(true);
        setRatingsError(null);

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            const newItems = Array.isArray(data.results) ? data.results :
                             (Array.isArray(data) ? data : []);
            const nextPageUrl = data.next || null;

            if (url.includes('/api/ratings/my_ratings/')) {
                setRatings(newItems);
            } else {
                setRatings(prev => [...(Array.isArray(prev) ? prev : []), ...newItems]);
            }
            setNextPage(nextPageUrl);
        } catch (err) {
            console.error("Error fetching ratings:", err);
            setRatingsError(err.message);
        } finally {
            setLoadingRatings(false);
            setLoadingMore(false);
        }
    };

    useEffect(() => {
        fetchRatings('/api/ratings/my_ratings/');
    }, [user]);

    useEffect(() => {
        const fetchAllConditions = async () => {
            try {
                setLoadingAllConditions(true);
                const conditionsData = await getAllConditions(); // Assuming this returns { results: [...] } or an array
                setAllConditions(Array.isArray(conditionsData) ? conditionsData : conditionsData.results || []);
                setConditionsError(null);
            } catch (err) {
                console.error("Error fetching all conditions:", err);
                setConditionsError(err.message || "Could not load conditions list.");
            } finally {
                setLoadingAllConditions(false);
            }
        };
        fetchAllConditions();
    }, []);

    useEffect(() => {
        // Initialize selectedConditions from user context when user data or allConditions are loaded
        if (user && user.chronic_conditions && allConditions.length > 0) {
            const userConditionIds = user.chronic_conditions.map(c => c.id);
            setSelectedConditions(allConditions.filter(c => userConditionIds.includes(c.id)));
        }
    }, [user, allConditions]);

    const handleLoadMore = () => {
        if (nextPage) {
            fetchRatings(nextPage);
        }
    };

    const handleImageUpload = async (event) => {
        const file = event.target.files[0];
        if (file && user) {
            setIsUploading(true);
            setUploadError(null);
            setUploadSuccess(false);

            const formData = new FormData();
            formData.append('image', file);

            try {
                const updatedProfileData = await updateProfileImageAPI(formData);
                if (updatedProfileData.image_url) {
                    updateUser({ profile_image_url: updatedProfileData.image_url });
                    setUploadSuccess(true);
                }
            } catch (err) {
                setUploadError(err.message || 'Failed to upload image.');
            } finally {
                setIsUploading(false);
                if (fileInputRef.current) {
                    fileInputRef.current.value = "";
                }
            }
        }
    };

    const handleSaveChronicConditions = async () => {
        setSavingConditions(true);
        setConditionsError(null);
        setSaveConditionsSuccess(false);
        const conditionIds = selectedConditions.map(c => c.id);
        try {
            const updatedConditionsData = await updateUserChronicConditionsAPI(conditionIds);
            // Update AuthContext with the new chronic conditions
            // The API returns the new list of condition objects for the user
            updateUser({ chronic_conditions: updatedConditionsData });
            setSaveConditionsSuccess(true);
        } catch (err) {
            console.error("Error saving chronic conditions:", err);
            setConditionsError(err.message || "Failed to save chronic conditions.");
        } finally {
            setSavingConditions(false);
        }
    };

    if (loadingRatings && ratings.length === 0 && loadingAllConditions) {
        return <Container sx={{ display: 'flex', justifyContent: 'center', mt: 5 }}><CircularProgress /></Container>;
    }

    return (
        <Container maxWidth="md" sx={{ my: 4 }}>
            <Paper elevation={3} sx={{ p: { xs: 2, md: 4 } }}>
                <Typography variant="h4" component="h1" gutterBottom sx={{ textAlign: 'center', mb: 1 }}>
                    My Account
                </Typography>
                {user && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
                        <label htmlFor="profile-image-upload-input" style={{ cursor: 'pointer' }} title="Click to change profile picture">
                            <Input 
                                accept="image/*" 
                                id="profile-image-upload-input" 
                                type="file" 
                                onChange={handleImageUpload}
                                ref={fileInputRef}
                            />
                            <Box sx={{position: 'relative', display: 'inline-block'}}>
                                <Avatar 
                                    src={user.profile_image_url || defaultProfileImage}
                                    alt={user.username}
                                    sx={{
                                        width: 100, 
                                        height: 100, 
                                        mb: 1, 
                                        border: isUploading ? '2px dashed grey' : '2px solid transparent' 
                                    }}
                                />
                                {isUploading && (
                                    <CircularProgress 
                                        size={100} 
                                        sx={{
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                            zIndex: 1,
                                            color: 'rgba(0,0,0,0.5)'
                                        }}
                                    />
                                )}
                            </Box>
                        </label>
                        <Typography variant="h6" gutterBottom>
                            Welcome back, {user.username}!
                        </Typography>
                        {uploadError && <Alert severity="error" sx={{mt: 1, width: '100%'}} onClose={() => setUploadError(null)}>{uploadError}</Alert>}
                    </Box>
                )}

                {/* Chronic Conditions Management Section */}
                <Box sx={{ mt: 4, mb: 3, p: 2, border: '1px solid #eee', borderRadius: '4px' }}>
                    <Typography variant="h5" component="h2" gutterBottom>
                        Manage Your Chronic Conditions
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Optionally, list any chronic conditions you manage. If you add conditions here, 
                        you'll see a quick-add option ("Use My Saved Chronic Conditions") when rating supplements, 
                        which will automatically include them as intended purposes for using the supplement.
                    </Typography>
                    {loadingAllConditions ? (
                        <CircularProgress size={24} />
                    ) : conditionsError && !allConditions.length ? (
                         <Alert severity="error">{conditionsError}</Alert>
                    ) : (
                        <Autocomplete
                            multiple
                            id="chronic-conditions-autocomplete"
                            options={allConditions}
                            getOptionLabel={(option) => option.name}
                            value={selectedConditions}
                            onChange={(event, newValue) => {
                                setSelectedConditions(newValue);
                            }}
                            isOptionEqualToValue={(option, value) => option.id === value.id}
                            renderInput={(params) => (
                                <MuiTextField
                                    {...params}
                                    variant="outlined"
                                    label="Select Chronic Conditions"
                                    placeholder="Type to search conditions..."
                                />
                            )}
                            sx={{ mb: 2 }}
                        />
                    )}
                    {conditionsError && allConditions.length > 0 && <Alert severity="error" sx={{mb:2}}>{conditionsError}</Alert>}
                    <Button 
                        variant="contained" 
                        onClick={handleSaveChronicConditions} 
                        disabled={loadingAllConditions || savingConditions}
                    >
                        {savingConditions ? <CircularProgress size={24} /> : 'Save Chronic Conditions'}
                    </Button>
                </Box>

                <Snackbar
                    open={uploadSuccess || saveConditionsSuccess}
                    autoHideDuration={4000}
                    onClose={() => {
                        setUploadSuccess(false);
                        setSaveConditionsSuccess(false);
                    }}
                    message={uploadSuccess ? "Profile picture updated!" : (saveConditionsSuccess ? "Chronic conditions saved!" : "")}
                />

                <Typography variant="h5" component="h2" sx={{ mt: 4, mb: 2, borderBottom: '1px solid #ddd', pb: 1 }}>
                    My Ratings & Reviews
                </Typography>
                {ratingsError && ratings.length === 0 && (
                     <Alert severity="error" sx={{ mt: 3, mb: 2 }}>{ratingsError}</Alert>
                )}
                {ratings.length === 0 && !loadingRatings && !ratingsError && (
                    <Typography sx={{ textAlign: 'center', mt: 3 }}>You have not made any ratings yet.</Typography>
                )}
                {ratingsError && ratings.length > 0 && (
                    <Alert severity="warning" sx={{ mb: 2 }}>Could not load all ratings: {ratingsError}</Alert>
                )}
                {ratings.length > 0 && (
                    <List>
                        {ratings.map((rating) => (
                            <ListItem key={rating.id} divider sx={{ alignItems: 'flex-start', py: 2 }}>
                                <ListItemText
                                    primaryTypographyProps={{ variant: 'h6', component: 'div' }}
                                    primary={`${rating.supplement_display || 'Supplement'} - Score: ${rating.score}/5`}
                                    secondaryTypographyProps={{ component: 'div' }}
                                    secondary={
                                        <>
                                            {rating.comment && <Typography variant="body1" sx={{ my: 1 }}>{rating.comment}</Typography>}
                                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1, mb: 0.5 }}>
                                                {Array.isArray(rating.condition_names) && rating.condition_names.map(cn => 
                                                    <Chip key={cn} label={`Used for: ${cn}`} size="small" variant="outlined" />
                                                )}
                                                {rating.brands && 
                                                    <Chip label={`Brand: ${rating.brands}`} size="small" variant="outlined" />
                                                }
                                            </Box>
                                            <Typography variant="caption" color="text.secondary">
                                                Rated on: {format(new Date(rating.created_at), 'PPpp')}
                                            </Typography>
                                        </>
                                    }
                                />
                            </ListItem>
                        ))}
                    </List>
                )}
                {loadingMore && <Box sx={{display: 'flex', justifyContent: 'center', my: 2}}><CircularProgress size={24} /></Box>}
                {nextPage && !loadingMore && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                        <Button variant="outlined" onClick={handleLoadMore}>
                            Load More Ratings
                        </Button>
                    </Box>
                )}
            </Paper>
        </Container>
    );
}

export default AccountsPage; 