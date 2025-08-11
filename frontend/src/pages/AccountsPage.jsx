// frontend/src/pages/AccountsPage.jsx

import React, { useEffect, useState, useRef, useCallback } from 'react';
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
    TextField as MuiTextField,
    Rating as MuiRating,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Divider,
    Link
} from '@mui/material';
import { format } from 'date-fns';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import API, { updateProfileImage as updateProfileImageAPI, getAllConditions, updateUserChronicConditions as updateUserChronicConditionsAPI, deleteMyRating, updateComment as updateCommentAPI, deleteComment as deleteCommentAPI } from '../services/api';
import { styled } from '@mui/material/styles';
import { toast } from 'react-toastify';

const Input = styled('input')({
    display: 'none',
});

const defaultProfileImage = 'http://localhost:8000/media/profile_pics/default.jpg';

function AccountsPage() {
    const { user, updateUser } = useAuth();
    const navigate = useNavigate();
    const [ratings, setRatings] = useState([]);
    const [loadingRatings, setLoadingRatings] = useState(true);
    const [ratingsError, setRatingsError] = useState(null);
    const [nextPage, setNextPage] = useState(null);
    const [loadingMore, setLoadingMore] = useState(false);

    // --- Start of new code for image upload ---
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState(null);
    const fileInputRef = useRef(null);
    // --- End of new code for image upload ---

    const [allConditions, setAllConditions] = useState([]);
    const [selectedConditions, setSelectedConditions] = useState([]);
    const [loadingAllConditions, setLoadingAllConditions] = useState(true);
    const [conditionsError, setConditionsError] = useState(null);
    const [savingConditions, setSavingConditions] = useState(false);
    const [saveConditionsSuccess, setSaveConditionsSuccess] = useState(false);

    const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
    const [ratingToDelete, setRatingToDelete] = useState(null);

    const [editingComment, setEditingComment] = useState(null);
    const [editedCommentContent, setEditedCommentContent] = useState('');
    const [commentToDelete, setCommentToDelete] = useState(null);
    const [showDeleteCommentDialog, setShowDeleteCommentDialog] = useState(false);

    const fetchRatings = useCallback(async (url, isInitialLoad = true) => {
        if (!user) {
            setRatingsError("User not found. Please log in.");
            if (isInitialLoad) setLoadingRatings(false);
            return;
        }
        if (!isInitialLoad) {
            setLoadingMore(true);
        } else {
            setLoadingRatings(true);
        }
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

            setRatings(prev => isInitialLoad ? newItems : [...(Array.isArray(prev) ? prev : []), ...newItems]);
            setNextPage(nextPageUrl);
        } catch (err) {
            console.error("Error fetching ratings:", err);
            setRatingsError(err.message);
        } finally {
            if (isInitialLoad) setLoadingRatings(false);
            setLoadingMore(false);
        }
    }, [user]);

    const fetchInitialData = useCallback(async () => {
        if (user) {
            fetchRatings('/api/ratings/my_ratings/', true);
            try {
                const response = await API.get('/user/me/');
                updateUser(response.data);
            } catch (error) {
                console.error("Failed to refetch user details on AccountsPage mount:", error);
            }
        }
    }, [user, fetchRatings, updateUser]);


    useEffect(() => {
        fetchInitialData();
    }, [fetchInitialData]);

    useEffect(() => {
        const handleFocus = async () => {
            if (user) {
                console.log('Accounts page focused, refetching data...');
                fetchInitialData();

                // Also refetch user details which includes comments and other profile info
                try {
                    const response = await API.get('/user/me/');
                    updateUser(response.data);
                } catch (error) {
                    console.error("Failed to refetch user details on focus:", error);
                }
            }
        };

        window.addEventListener('focus', handleFocus);

        return () => {
            window.removeEventListener('focus', handleFocus);
        };
    }, [user, fetchInitialData, updateUser]);


    useEffect(() => {
        const fetchAllConditions = async () => {
            try {
                setLoadingAllConditions(true);
                const conditionsData = await getAllConditions();
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

    // --- Start of new function for image upload ---
    const handleImageUpload = async (event) => {
        const file = event.target.files[0];
        if (file && user) {
            setIsUploading(true);
            setUploadError(null);
            const formData = new FormData();
            formData.append('image', file);
            try {
                const updatedProfileData = await updateProfileImageAPI(formData);
                if (updatedProfileData.image_url) {
                    updateUser({ profile_image_url: updatedProfileData.image_url });
                    toast.success("Profile picture updated!");
                }
            } catch (err) {
                const errorMessage = err.response?.data?.error || err.message || 'Failed to upload image.';
                setUploadError(errorMessage);
                toast.error(errorMessage);
            } finally {
                setIsUploading(false);
                if (fileInputRef.current) {
                    fileInputRef.current.value = "";
                }
            }
        }
    };
    // --- End of new function for image upload ---

    const handleSaveChronicConditions = async () => {
        setSavingConditions(true);
        setConditionsError(null);
        setSaveConditionsSuccess(false);
        const conditionIds = selectedConditions.map(c => c.id);
        try {
            const updatedConditionsData = await updateUserChronicConditionsAPI(conditionIds);
            updateUser({ chronic_conditions: updatedConditionsData });
            setSaveConditionsSuccess(true);
            toast.success("Chronic conditions saved!");
        } catch (err) {
            console.error("Error saving chronic conditions:", err);
            const errorMessage = err.response?.data?.error || err.message || "Failed to save chronic conditions.";
            setConditionsError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setSavingConditions(false);
        }
    };

    const handleEditRating = (rating) => {
        navigate(`/supplements/${rating.supplement}`, { 
            state: { 
                ratingId: rating.id, 
                openEditMode: true 
            }
        });
    };

    const confirmDeleteRating = (ratingId) => {
        setRatingToDelete(ratingId);
        setOpenDeleteDialog(true);
    };

    const handleDeleteRating = async () => {
        if (!ratingToDelete) return;
        try {
            await deleteMyRating(ratingToDelete);
            setRatings(prevRatings => prevRatings.filter(r => r.id !== ratingToDelete));
            toast.success("Rating deleted successfully!");
        } catch (err) {
            console.error("Error deleting rating:", err);
            toast.error(err.message || "Failed to delete rating.");
        } finally {
            setOpenDeleteDialog(false);
            setRatingToDelete(null);
        }
    };

    const handleCloseDeleteDialog = () => {
        setOpenDeleteDialog(false);
        setRatingToDelete(null);
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return format(date, 'MM/dd/yyyy');
    };

    const handleEditComment = (comment) => {
        setEditingComment(comment);
        setEditedCommentContent(comment.content);
    };

    const handleSaveEditedComment = async () => {
        if (!editingComment) return;
        try {
            const updatedComment = await updateCommentAPI(editingComment.id, editedCommentContent);
            const updatedComments = user.comments.map(c => c.id === editingComment.id ? updatedComment : c);
            updateUser({ ...user, comments: updatedComments });
            setEditingComment(null);
            toast.success("Comment updated successfully!");
        } catch (err) {
            console.error("Error updating comment:", err);
            toast.error(err.message || "Failed to update comment.");
        }
    };

    const handleCancelEditComment = () => {
        setEditingComment(null);
        setEditedCommentContent('');
    };

    const confirmDeleteComment = (commentId) => {
        setCommentToDelete(commentId);
        setShowDeleteCommentDialog(true);
    };

    const handleDeleteComment = async () => {
        if (!commentToDelete) return;
        try {
            await deleteCommentAPI(commentToDelete);
            const updatedComments = user.comments.filter(c => c.id !== commentToDelete);
            updateUser({ comments: updatedComments });
            toast.success("Comment deleted successfully!");
        } catch (err) {
            console.error("Error deleting comment:", err);
            toast.error(err.message || "Failed to delete comment.");
        } finally {
            setShowDeleteCommentDialog(false);
            setCommentToDelete(null);
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
                                disabled={isUploading}
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
                    open={saveConditionsSuccess}
                    autoHideDuration={4000}
                    onClose={() => setSaveConditionsSuccess(false)}
                    message={"Chronic conditions saved!"}
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
                            <Paper 
                                key={rating.id} 
                                elevation={1} 
                                sx={{ mb: 2, p: 2, cursor: 'pointer', '&:hover': { backgroundColor: 'rgba(0,0,0,0.02)' } }}
                                onClick={() => navigate(`/supplements/${rating.supplement}`, { state: { ratingId: rating.id } })}
                            >
                                <Typography variant="subtitle1" sx={{fontWeight: 'bold', color: 'primary.main'}}>
                                    {rating.supplement_display || 'Supplement Name Missing'} 
                                </Typography>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, mt: 0.5 }}>
                                    <MuiRating value={rating.score} readOnly size="small"/>
                                </Box>
                                {rating.comment && <Typography variant="body2" color="text.secondary" sx={{ mb: 1, whiteSpace: 'pre-wrap' }}>{rating.comment}</Typography>}
                                {rating.condition_names && rating.condition_names.length > 0 && 
                                    <Typography variant="caption" display="block" color="text.secondary">Intended Purpose: {rating.condition_names.join(', ')}</Typography>}
                                {rating.benefit_names && rating.benefit_names.length > 0 && 
                                    <Typography variant="caption" display="block" color="text.secondary">Benefits For: {rating.benefit_names.join(', ')}</Typography>}
                                {rating.side_effect_names && rating.side_effect_names.length > 0 && 
                                    <Typography variant="caption" display="block" color="text.secondary">Side Effects: {rating.side_effect_names.join(', ')}</Typography>}
                                {rating.brands && 
                                    <Typography variant="caption" display="block" color="text.secondary">Brand(s): {rating.brands}</Typography>}
                                {rating.dosage && (
                                    <Typography variant="caption" display="block" color="text.secondary">
                                        Dosage: {rating.dosage.replace(/\s+/g, '')}
                                        {(rating.dosage_frequency && rating.frequency_unit) ? 
                                            ` ${rating.dosage_frequency}x / ${rating.frequency_unit}` : ''}
                                    </Typography>
                                )}
                                {rating.image_url && (
                                    <Box sx={{ mt: 1, mb: 1, textAlign: 'left' }}>
                                        <img 
                                            src={rating.image_url} 
                                            alt={`Rating for ${rating.supplement_display}`}
                                            style={{ maxWidth: '150px', maxHeight: '150px', borderRadius: '4px' }}
                                        />
                                            </Box>
                                )}
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'right', mt: 1}}>
                                    {formatDate(rating.created_at)}
                                    {rating.is_edited && <Typography component="span" variant="caption" color="text.secondary"> (edited)</Typography>}
                                            </Typography>
                            </Paper>
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

            <Paper elevation={3} sx={{ p: { xs: 2, md: 4 }, mt: 3 }}>
                <Typography variant="h5" component="h2" sx={{ mb: 2, borderBottom: '1px solid #ddd', pb: 1 }}>
                    My Comments
                </Typography>
                {user && user.comments && user.comments.length > 0 ? (
                    <List>
                        {user.comments.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).map((comment) => (
                            <Paper 
                                key={comment.id} 
                                elevation={1} 
                                sx={{ mb: 2, p: 2, cursor: 'pointer', '&:hover': { backgroundColor: 'rgba(0,0,0,0.02)' } }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (!editingComment || editingComment.id !== comment.id) {
                                        navigate(`/supplements/${comment.supplement_id}`, { state: { commentId: comment.id, ratingId: comment.rating_id } });
                                    }
                                }}
                            >
                                {editingComment && editingComment.id === comment.id ? (
                                    <Box>
                                        <MuiTextField
                                            fullWidth
                                            multiline
                                            variant="outlined"
                                            size="small"
                                            value={editedCommentContent}
                                            onChange={(e) => setEditedCommentContent(e.target.value)}
                                            sx={{ mb: 1 }}
                                        />
                                        <Button size="small" onClick={(e) => {e.stopPropagation(); handleSaveEditedComment();}} variant="contained" sx={{ mr: 1}}>Save</Button>
                                        <Button size="small" onClick={(e) => {e.stopPropagation(); handleCancelEditComment();}}>Cancel</Button>
                                    </Box>
                                ) : (
                                    <ListItemText
                                        primary={
                                            <Typography variant="subtitle1" sx={{fontWeight: 'bold'}}>
                                                {comment.supplement_name || 'View Supplement'}
                                            </Typography>
                                        }
                                        secondaryTypographyProps={{ component: 'div' }}
                                        secondary={
                                            <Box>
                                                <Typography variant="body2" color="text.secondary" sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>{comment.content}</Typography>
                                                <Box sx={{ mt: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {comment.parent_comment && " (in reply to another comment)"}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'right' }}>
                                                        {formatDate(comment.created_at)}
                                                    </Typography>
                                                </Box>
                                            </Box>
                                        }
                                    />
                                )}
                            </Paper>
                        ))}
                    </List>
                ) : (
                    <Typography sx={{ textAlign: 'center', mt: 3 }}>You have not made any comments yet.</Typography>
                )}
            </Paper>

            <Dialog
                open={openDeleteDialog}
                onClose={handleCloseDeleteDialog}
                aria-labelledby="alert-dialog-title"
                aria-describedby="alert-dialog-description"
            >
                <DialogTitle id="alert-dialog-title">{"Confirm Deletion"}</DialogTitle>
                <DialogContent>
                    <DialogContentText id="alert-dialog-description">
                        Are you sure you want to delete this rating? This action cannot be undone.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDeleteDialog}>Cancel</Button>
                    <Button onClick={handleDeleteRating} color="error" autoFocus>
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog
                open={showDeleteCommentDialog}
                onClose={() => setShowDeleteCommentDialog(false)}
                aria-labelledby="delete-comment-dialog-title"
                aria-describedby="delete-comment-dialog-description"
            >
                <DialogTitle id="delete-comment-dialog-title">{"Confirm Comment Deletion"}</DialogTitle>
                <DialogContent>
                    <DialogContentText id="delete-comment-dialog-description">
                        Are you sure you want to delete this comment? This action cannot be undone.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setShowDeleteCommentDialog(false)}>Cancel</Button>
                    <Button onClick={handleDeleteComment} color="error" autoFocus>
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>

        </Container>
    );
}

export default AccountsPage;