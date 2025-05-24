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
    Snackbar
} from '@mui/material';
import { format } from 'date-fns';
import { Link as RouterLink } from 'react-router-dom';
import { updateProfileImage as updateProfileImageAPI } from '../services/api';
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

    if (loadingRatings && ratings.length === 0) {
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

                <Snackbar
                    open={uploadSuccess}
                    autoHideDuration={4000}
                    onClose={() => setUploadSuccess(false)}
                    message="Profile picture updated!"
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